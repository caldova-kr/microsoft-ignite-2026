#!/usr/bin/env python3
"""Kanban board on GitHub Projects whose Status follows the work, not manual drags.

Every issue in the repo lives on one project. Its Status is *derived* from GitHub state each time
something happens, so the board can always be rebuilt and never drifts:

    issue closed (incl. by merging a PR with `Closes #N`)          → Done
    an open, ready-for-review PR closes the issue                  → In Review
    an open draft PR closes the issue, or the issue has an assignee → In Progress
    otherwise                                                      → Todo

"PR closes the issue" = closing keyword in the PR body (`Closes #N`) or a link in the issue's
Development sidebar. Dragging a card is overwritten on the next sync — change the issue/PR instead.

Stdlib only. Token comes from GH_TOKEN / GITHUB_TOKEN and needs project + repo (issues, PRs) access;
the default Actions GITHUB_TOKEN cannot write to Projects.

    python tools/project_board.py setup --repo OWNER/REPO [--title T] [--owner LOGIN] [--public]
    python tools/project_board.py sync --issue 12 [--issue 13] [--new]
    python tools/project_board.py sync --pr 34
    python tools/project_board.py sync --all

`setup` creates (or reuses) the project, sets the Status options, links the repo, adds views and
writes `.github/project-board.json`. To reuse elsewhere: copy this file and
`.github/workflows/project-board.yml`, run `setup`, commit the JSON, add the PROJECT_TOKEN secret.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = os.environ.get("GITHUB_API_URL", "https://api.github.com")
DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / ".github" / "project-board.json"
REST_VERSION = "2026-03-10"

TODO, IN_PROGRESS, IN_REVIEW, DONE = "todo", "in_progress", "in_review", "done"
STATUS_OPTIONS = {  # key: (name, color, description) — order is the column order
    TODO: ("Todo", "GRAY", "담당자도 PR 도 없음"),
    IN_PROGRESS: ("In Progress", "YELLOW", "assignee 지정 또는 Draft PR"),
    IN_REVIEW: ("In Review", "BLUE", "이 이슈를 닫는 PR 이 리뷰 대기"),
    DONE: ("Done", "GREEN", "이슈 닫힘 (PR 머지 포함)"),
}
VIEWS = [  # (name, layout, filter)
    ("Board", "board", ""),
    ("My work", "board", "assignee:@me"),
]


def derive_status(closed: bool, assigned: bool, open_pr_drafts: list[bool]) -> str:
    """open_pr_drafts: isDraft of each *open* PR that closes the issue."""
    if closed:
        return DONE
    if any(not draft for draft in open_pr_drafts):
        return IN_REVIEW
    if assigned or open_pr_drafts:
        return IN_PROGRESS
    return TODO


def nearest_milestone(milestones: list[dict]) -> dict | None:
    """The open milestone due soonest; ones without a due date come last (then lowest number)."""
    if not milestones:
        return None
    return min(milestones, key=lambda m: (m.get("dueOn") is None, m.get("dueOn") or "", m["number"]))


class GitHub:
    def __init__(self, token: str):
        self.token = token

    def _call(self, method: str, url: str, body: dict | None = None) -> dict:
        req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None)
        req.add_header("Authorization", f"Bearer {self.token}")
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", REST_VERSION)
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
        except urllib.error.HTTPError as e:
            sys.exit(f"{method} {url} → HTTP {e.code}: {e.read().decode(errors='replace')}")
        return json.loads(raw) if raw else {}

    def graphql(self, query: str, **variables) -> dict:
        out = self._call("POST", f"{API}/graphql", {"query": query, "variables": variables})
        if out.get("errors"):
            sys.exit("GraphQL error: " + "; ".join(e.get("message", str(e)) for e in out["errors"]))
        return out["data"]

    def rest(self, method: str, path: str, body: dict | None = None) -> dict:
        return self._call(method, f"{API}{path}", body)


ISSUE_FRAGMENT = """
fragment IssueState on Issue {
  id number state
  milestone { number }
  assignees(first: 1) { totalCount }
  closedByPullRequestsReferences(first: 20, includeClosedPrs: false) { nodes { state isDraft } }
  projectItems(first: 20, includeArchived: true) {
    nodes {
      id isArchived project { id }
      fieldValueByName(name: $field) { ... on ProjectV2ItemFieldSingleSelectValue { optionId } }
    }
  }
}
"""

Q_PROJECT = """
query($login: String!, $number: Int!, $field: String!) {
  repositoryOwner(login: $login) {
    ... on ProjectV2Owner {
      projectV2(number: $number) {
        id url
        field(name: $field) { ... on ProjectV2SingleSelectField { id options { id name } } }
      }
    }
  }
}
"""

Q_ISSUE = ISSUE_FRAGMENT + """
query($owner: String!, $name: String!, $number: Int!, $field: String!) {
  repository(owner: $owner, name: $name) { issue(number: $number) { ...IssueState } }
}
"""

Q_PR = ISSUE_FRAGMENT + """
query($owner: String!, $name: String!, $number: Int!, $field: String!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) { closingIssuesReferences(first: 50) { nodes { ...IssueState } } }
  }
}
"""

Q_OPEN_ISSUES = ISSUE_FRAGMENT + """
query($owner: String!, $name: String!, $after: String, $field: String!) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $after, states: OPEN) {
      pageInfo { hasNextPage endCursor }
      nodes { ...IssueState }
    }
  }
}
"""

Q_BOARD_ISSUES = ISSUE_FRAGMENT + """
query($project: ID!, $after: String, $field: String!) {
  node(id: $project) {
    ... on ProjectV2 {
      items(first: 50, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { content { ... on Issue { repository { nameWithOwner } ...IssueState } } }
      }
    }
  }
}
"""

Q_MILESTONES = """
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) { milestones(first: 100, states: OPEN) { nodes { id number title dueOn } } }
}
"""


class Board:
    def __init__(self, gh: GitHub, config: dict, repo: str):
        self.gh, self.config, self.repo = gh, config, repo
        self.owner, self.name = repo.split("/", 1)
        self.field_name = config.get("status_field", "Status")
        proj = config["project"]
        data = gh.graphql(Q_PROJECT, login=proj["owner"], number=proj["number"], field=self.field_name)
        project = (data.get("repositoryOwner") or {}).get("projectV2")
        if not project:
            sys.exit(f"project {proj['owner']}#{proj['number']} not found (token needs project access)")
        field = project.get("field") or {}
        if "options" not in field:
            sys.exit(f"single-select field {self.field_name!r} not found on {project['url']}")
        self.project_id, self.field_id = project["id"], field["id"]
        names = {o["name"]: o["id"] for o in field["options"]}
        statuses = config.get("statuses") or {k: v[0] for k, v in STATUS_OPTIONS.items()}
        missing = [n for n in statuses.values() if n not in names]
        if missing:
            sys.exit(f"Status options {missing} missing on {project['url']} — rerun setup or fix config")
        self.option_id = {key: names[name] for key, name in statuses.items()}
        self.status_name = statuses
        self._milestones: list[dict] | None = None

    def _vars(self, **extra) -> dict:
        return {"owner": self.owner, "name": self.name, "field": self.field_name, **extra}

    def sync(self, issue: dict, *, add_closed: bool = True, new: bool = False) -> None:
        closed = issue["state"] == "CLOSED"
        drafts = [p["isDraft"] for p in issue["closedByPullRequestsReferences"]["nodes"] if p["state"] == "OPEN"]
        status = derive_status(closed, issue["assignees"]["totalCount"] > 0, drafts)
        item = next((i for i in issue["projectItems"]["nodes"] if i["project"]["id"] == self.project_id), None)

        if new and not closed and not issue["milestone"] and self.config.get("auto_milestone"):
            self._assign_milestone(issue)

        if item is None:
            if closed and not add_closed:
                return
            item = self.gh.graphql(
                "mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: {projectId: $p, contentId: $c}) { item { id } } }",
                p=self.project_id, c=issue["id"],
            )["addProjectV2ItemById"]["item"]
            item = {"id": item["id"], "isArchived": False, "fieldValueByName": None}
        elif item["isArchived"]:
            if closed:
                return
            self.gh.graphql(
                "mutation($p: ID!, $i: ID!) { unarchiveProjectV2Item(input: {projectId: $p, itemId: $i}) { item { id } } }",
                p=self.project_id, i=item["id"],
            )

        current = (item.get("fieldValueByName") or {}).get("optionId")
        if current == self.option_id[status]:
            print(f"#{issue['number']}: {self.status_name[status]} (unchanged)")
            return
        self.gh.graphql(
            """mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) {
              updateProjectV2ItemFieldValue(input: {projectId: $p, itemId: $i, fieldId: $f,
                value: {singleSelectOptionId: $o}}) { projectV2Item { id } } }""",
            p=self.project_id, i=item["id"], f=self.field_id, o=self.option_id[status],
        )
        print(f"#{issue['number']}: → {self.status_name[status]}")

    def _assign_milestone(self, issue: dict) -> None:
        if self._milestones is None:
            data = self.gh.graphql(Q_MILESTONES, owner=self.owner, name=self.name)
            self._milestones = data["repository"]["milestones"]["nodes"]
        ms = nearest_milestone(self._milestones)
        if ms:
            self.gh.graphql(
                "mutation($i: ID!, $m: ID!) { updateIssue(input: {id: $i, milestoneId: $m}) { issue { id } } }",
                i=issue["id"], m=ms["id"],
            )
            print(f"#{issue['number']}: milestone → {ms['title']}")

    def sync_issue(self, number: int, new: bool = False) -> None:
        issue = self.gh.graphql(Q_ISSUE, **self._vars(number=number))["repository"]["issue"]
        if issue is None:
            sys.exit(f"#{number} is not an issue in {self.repo}")
        self.sync(issue, new=new)

    def sync_pr(self, number: int) -> None:
        pr = self.gh.graphql(Q_PR, **self._vars(number=number))["repository"]["pullRequest"]
        if pr is None:
            sys.exit(f"#{number} is not a pull request in {self.repo}")
        issues = pr["closingIssuesReferences"]["nodes"]
        if not issues:
            print(f"PR #{number} closes no issue — nothing to move")
        for issue in issues:
            self.sync(issue)

    def sync_all(self) -> None:
        """Every open issue, plus closed ones already on the board (old closed issues aren't added)."""
        seen: set[int] = set()
        for issue in self._paginate(Q_OPEN_ISSUES, lambda d: d["repository"]["issues"], **self._vars()):
            seen.add(issue["number"])
            self.sync(issue)
        for node in self._paginate(Q_BOARD_ISSUES, lambda d: d["node"]["items"], project=self.project_id, field=self.field_name):
            issue = node.get("content") or {}
            if issue.get("repository", {}).get("nameWithOwner") == self.repo and issue["number"] not in seen:
                self.sync(issue, add_closed=False)

    def _paginate(self, query: str, pick, **variables):
        after = None
        while True:
            conn = pick(self.gh.graphql(query, after=after, **variables))
            yield from conn["nodes"]
            if not conn["pageInfo"]["hasNextPage"]:
                return
            after = conn["pageInfo"]["endCursor"]


def project_readme(repo: str) -> str:
    rows = "\n".join(f"| **{name}** | {desc} |" for name, _, desc in STATUS_OPTIONS.values())
    return f"""이 보드는 [{repo}](https://github.com/{repo}) 이슈의 진행을 자동으로 추적합니다.

| Status | 조건 |
|---|---|
{rows}

- 카드를 끌어서 옮기지 마세요 — 다음 동기화 때 GitHub 상태 기준으로 되돌아갑니다. 이슈에 assignee 를 지정하거나 PR 본문에 `Closes #이슈번호` 를 쓰면 움직입니다.
- 릴리스 범위는 이슈의 **Milestone** 으로 관리합니다. 새 이슈는 마감일이 가장 가까운 열린 마일스톤에 자동으로 들어갑니다.
- 동기화: `.github/workflows/project-board.yml` (이벤트마다 + 매시간 전체 재조정), 스크립트 `tools/project_board.py`.
"""


def setup(gh: GitHub, args) -> None:
    owner, name = args.repo.split("/", 1)
    login = args.owner or owner
    title = args.title or name
    repo = gh.graphql(
        "query($o: String!, $n: String!) { repository(owner: $o, name: $n) { id projectsV2(first: 100) { nodes { id } } } }",
        o=owner, n=name,
    )["repository"]
    found = gh.graphql(
        """query($login: String!, $q: String!) { repositoryOwner(login: $login) { id __typename
          ... on ProjectV2Owner { projectsV2(first: 50, query: $q) { nodes { id number title url } } } } }""",
        login=login, q=title,
    )["repositoryOwner"]
    project = next((p for p in found["projectsV2"]["nodes"] if p["title"] == title), None)
    if project:
        print(f"reusing project {project['url']}")
    else:
        project = gh.graphql(
            """mutation($o: ID!, $t: String!, $r: ID!) { createProjectV2(input: {ownerId: $o, title: $t, repositoryId: $r}) {
              projectV2 { id number title url } } }""",
            o=found["id"], t=title, r=repo["id"],
        )["createProjectV2"]["projectV2"]
        print(f"created project {project['url']}")
    if project["id"] not in {p["id"] for p in repo["projectsV2"]["nodes"]}:
        gh.graphql(
            "mutation($p: ID!, $r: ID!) { linkProjectV2ToRepository(input: {projectId: $p, repositoryId: $r}) { repository { id } } }",
            p=project["id"], r=repo["id"],
        )

    field = gh.graphql(
        """query($p: ID!, $f: String!) { node(id: $p) { ... on ProjectV2 {
          field(name: $f) { ... on ProjectV2SingleSelectField { id options { name } } } } } }""",
        p=project["id"], f=args.field,
    )["node"]["field"]
    wanted = [n for n, _, _ in STATUS_OPTIONS.values()]
    if [o["name"] for o in field["options"]] != wanted:
        # Replaces the option list: cards holding a removed option lose their value until the next sync.
        gh.graphql(
            """mutation($f: ID!, $o: [ProjectV2SingleSelectFieldOptionInput!]) {
              updateProjectV2Field(input: {fieldId: $f, singleSelectOptions: $o}) { projectV2Field { __typename } } }""",
            f=field["id"],
            o=[{"name": n, "color": c, "description": d} for n, c, d in STATUS_OPTIONS.values()],
        )
        print(f"{args.field} options → {', '.join(wanted)}")

    gh.graphql(
        """mutation($p: ID!, $pub: Boolean!, $d: String!, $r: String!) {
          updateProjectV2(input: {projectId: $p, public: $pub, shortDescription: $d, readme: $r}) { projectV2 { id } } }""",
        p=project["id"], pub=args.public, d=f"{args.repo} 이슈 진행 보드 — 상태는 이슈/PR 에서 자동 반영", r=project_readme(args.repo),
    )

    views = gh.graphql(
        "query($p: ID!) { node(id: $p) { ... on ProjectV2 { views(first: 50) { nodes { name } } } } }", p=project["id"]
    )["node"]["views"]["nodes"]
    have = {v["name"] for v in views}
    base = f"/orgs/{login}" if found["__typename"] == "Organization" else f"/users/{login}"
    for view_name, layout, flt in VIEWS:
        if view_name not in have:
            body = {"name": view_name, "layout": layout}
            if flt:
                body["filter"] = flt
            gh.rest("POST", f"{base}/projectsV2/{project['number']}/views", body)
            print(f"view {view_name!r} added")

    config = {
        "project": {"owner": login, "number": project["number"], "url": project["url"]},
        "status_field": args.field,
        "statuses": {key: n for key, (n, _, _) in STATUS_OPTIONS.items()},
        "auto_milestone": not args.no_auto_milestone,
    }
    args.config.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.config}")


def main(argv: list[str] | None = None) -> None:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    common.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY"), help="OWNER/REPO (default: $GITHUB_REPOSITORY)")
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("setup", parents=[common], help="create/reuse the project and write the config")
    s.add_argument("--owner", help="project owner login (default: repo owner)")
    s.add_argument("--title", help="project title (default: repo name)")
    s.add_argument("--field", default="Status")
    s.add_argument("--public", action="store_true")
    s.add_argument("--no-auto-milestone", action="store_true", help="don't put new issues in the nearest open milestone")

    y = sub.add_parser("sync", parents=[common], help="recompute Status")
    y.add_argument("--issue", type=int, action="append", default=[])
    y.add_argument("--pr", type=int, action="append", default=[])
    y.add_argument("--all", action="store_true", help="reconcile every open issue and every card on the board")
    y.add_argument("--new", action="store_true", help="issue was just opened (applies auto_milestone)")

    args = ap.parse_args(argv)
    if not args.repo or "/" not in args.repo:
        ap.error("--repo OWNER/REPO is required")
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        sys.exit("set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token))")
    gh = GitHub(token)

    if args.cmd == "setup":
        setup(gh, args)
        return
    if not (args.issue or args.pr or args.all):
        ap.error("sync needs --issue, --pr or --all")
    board = Board(gh, json.loads(args.config.read_text(encoding="utf-8")), args.repo)
    for n in args.issue:
        board.sync_issue(n, new=args.new)
    for n in args.pr:
        board.sync_pr(n)
    if args.all:
        board.sync_all()


if __name__ == "__main__":
    main()
