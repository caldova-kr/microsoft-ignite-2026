#!/usr/bin/env python3
"""Write docs/catalog/issues.json from open `session` issues (deploy-time only, git-ignored).

Issue title must start with `[<SESSION_CODE>]`. The site catalog shows each session's issue
and assignee (= who claimed it). Runs in CI with GH_TOKEN; works unauthenticated for public repos.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_lib import DOCS_DIR, catalog_index  # noqa: E402

OUT = DOCS_DIR / "catalog" / "issues.json"
TITLE = re.compile(r"^\s*\[([A-Za-z0-9-]+)\]")


def fetch(repo: str) -> list[dict]:
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "ignite-2026-notes"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    items, page = [], 1
    while True:
        url = f"https://api.github.com/repos/{repo}/issues?state=open&labels=session&per_page=100&page={page}"
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as resp:
            batch = json.loads(resp.read())
        items += [i for i in batch if "pull_request" not in i]
        if len(batch) < 100:
            return items
        page += 1


def build(issues: list[dict], catalog: dict) -> tuple[dict, list[str]]:
    out, problems = {}, []
    for i in sorted(issues, key=lambda x: x["number"]):
        m = TITLE.match(i["title"])
        code = m.group(1).upper() if m else None
        if not code or code not in catalog:
            problems.append(f"#{i['number']} title has no valid session code: {i['title']!r}")
            continue
        if code in out:
            problems.append(f"#{i['number']} duplicates #{out[code]['n']} for {code}")
            continue
        out[code] = {"n": i["number"], "u": i["html_url"], "a": [a["login"] for a in i.get("assignees") or []]}
    return out, problems


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "caldova-kr/microsoft-ignite-2026"))
    args = ap.parse_args()
    data, problems = build(fetch(args.repo), catalog_index())
    for p in problems:
        print(f"WARN {p}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    claimed = sum(1 for v in data.values() if v["a"])
    print(f"wrote {OUT.relative_to(DOCS_DIR.parent)}: {len(data)} session issues ({claimed} claimed)")


if __name__ == "__main__":
    main()
