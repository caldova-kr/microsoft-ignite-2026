import sys
import textwrap
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))

from catalog_lib import normalize  # noqa: E402
from validate import check_note  # noqa: E402


def raw(code, start, **extra):
    base = {"sessionCode": code, "title": "T", "sessionType": {"displayValue": "Breakout"},
            "startDateTime": start, "endDateTime": start, "location": {"displayValue": "Room"}}
    base.update(extra)
    return base


def test_normalize_merges_repeats_and_keeps_media_from_any_instance():
    out = normalize([
        raw("LAB1", "2026-11-19T10:00:00Z"),
        raw("LAB1", "2026-11-18T10:00:00Z", onDemand="https://v", sessionLevel=[{"displayValue": "(300) Advanced"}]),
    ])
    assert len(out) == 1
    s = out[0]
    assert [x["start"] for x in s["slots"]] == ["2026-11-18T10:00:00Z", "2026-11-19T10:00:00Z"]
    assert s["video"] == "https://v"
    assert s["url"] == "https://ignite.microsoft.com/en-US/sessions/LAB1"


def test_repeat_instances_union_delivery_for_online_check():
    from catalog_lib import is_watchable

    offline = {"deliveryTypes": [{"displayValue": "In-person"}], "viewingOptions": [{"displayValue": "Will not be recorded"}]}
    out = normalize([
        raw("TH1", "2026-11-18T10:00:00Z", **offline),
        raw("TH1", "2026-11-19T10:00:00Z", deliveryTypes=[{"displayValue": "Online"}]),
        raw("TT1", "2026-11-18T10:00:00Z", **offline),
    ])
    assert [is_watchable(s) for s in out] == [True, False]


CATALOG = {
    "BRK1": {"code": "BRK1", "title": "Real title", "type": "Breakout", "topics": ["Data"], "tags": [],
             "level": 300, "speakers": ["A"], "url": "https://ignite.microsoft.com/en-US/sessions/BRK1",
             "video": "", "transcript": "", "slides": ""},
}


def note(tmp_path, title="Real title", status="draft", basis="[catalog]", extra_body=""):
    p = tmp_path / "BRK1-real-title.md"
    p.write_text(textwrap.dedent(f"""\
        ---
        session_code: BRK1
        title: "{title}"
        session_type: Breakout
        topics: [Data]
        catalog_tags: []
        level: 300
        speakers: [A]
        session_url: https://ignite.microsoft.com/en-US/sessions/BRK1
        video_url: ""
        source_basis: {basis}
        tags: []
        status: {status}
        last_updated: 2026-11-20
        ---

        # [BRK1] Real title

        ## TL;DR

        > x

        ## Why it matters

        - x
        @@EXTRA@@
        ## Resources

        - 🎥 Session: https://ignite.microsoft.com/en-US/sessions/BRK1
        """).replace("@@EXTRA@@", extra_body), encoding="utf-8")
    return p


def test_valid_draft_passes(tmp_path):
    errors, _ = check_note(note(tmp_path), CATALOG)
    assert errors == []


def test_catalog_mismatch_is_rejected(tmp_path):
    errors, _ = check_note(note(tmp_path, title="Edited title"), CATALOG)
    assert len(errors) == 1 and "title differs from catalog" in errors[0]


def test_review_requires_primary_source(tmp_path):
    errors, _ = check_note(note(tmp_path, status="review"), CATALOG)
    assert len(errors) == 1 and "primary source" in errors[0]
    errors, _ = check_note(note(tmp_path, status="review", basis="[catalog, transcript]"), CATALOG)
    assert errors == []


def test_other_event_only_allowed_inside_supplement(tmp_path):
    outside = "\nBuild 2026 에서도 발표됨.\n"
    errors, _ = check_note(note(tmp_path, extra_body=outside), CATALOG)
    assert len(errors) == 1 and "other-event reference" in errors[0]

    inside = '\n!!! supplement "세션 외 보충 · 이전 발표"\n    Build 2026 에서 처음 공개.\n\n'
    errors, _ = check_note(note(tmp_path, extra_body=inside), CATALOG)
    assert errors == []


def test_why_it_matters_optional_only_for_keynotes(tmp_path):
    p = note(tmp_path)
    p.write_text(p.read_text(encoding="utf-8").replace("## Why it matters\n\n- x\n", ""), encoding="utf-8")
    errors, _ = check_note(p, CATALOG)
    assert len(errors) == 1 and "Why it matters" in errors[0]

    keynote = {"BRK1": {**CATALOG["BRK1"], "type": "Keynote"}}
    p.write_text(p.read_text(encoding="utf-8").replace("session_type: Breakout", "session_type: Keynote"), encoding="utf-8")
    errors, _ = check_note(p, keynote)
    assert errors == []


def test_unknown_session_link_is_rejected(tmp_path):
    body = "\n- 관련: https://ignite.microsoft.com/en-US/sessions/BRK999\n"
    errors, _ = check_note(note(tmp_path, extra_body=body), CATALOG)
    assert len(errors) == 1 and "BRK999" in errors[0]


def test_issue_titles_map_to_catalog_codes():
    from fetch_issues import build

    def issue(n, title, assignees=()):
        return {"number": n, "title": title, "html_url": f"u{n}", "assignees": [{"login": a} for a in assignees]}

    data, problems = build(
        [issue(3, "[BRK1] dup"), issue(1, "[brk1] Real title", ["me"]), issue(2, "no code"), issue(4, "[NOPE] x")],
        CATALOG,
    )
    assert data == {"BRK1": {"n": 1, "u": "u1", "a": ["me"]}}
    assert len(problems) == 3


def figure(src, caption):
    cap = f"  <figcaption>{caption}</figcaption>\n" if caption is not None else ""
    return f'\n<figure markdown="span">\n  ![아키텍처 슬라이드]({src})\n{cap}</figure>\n'


def test_image_rules(tmp_path):
    (tmp_path / "BRK1-real-title").mkdir()
    (tmp_path / "BRK1-real-title" / "arch.jpg").write_bytes(b"x")
    ok_video = figure("BRK1-real-title/arch.jpg", "▶ 영상 18:40 — 구조")
    ok_blog = figure("BRK1-real-title/arch.jpg", "📰 공식 블로그 · [Post](https://azure.microsoft.com/en-us/blog/post/) (2026-11-18)")
    for body in (ok_video, ok_blog):
        errors, _ = check_note(note(tmp_path, extra_body=body), CATALOG)
        assert errors == [], errors

    cases = {
        "hotlinked": figure("https://example.com/a.png", "▶ 영상 01:00"),
        "without <figcaption>": figure("BRK1-real-title/arch.jpg", None),
        "official Microsoft blog": figure("BRK1-real-title/arch.jpg", "[Post](https://medium.com/x)"),
        "outside <figure>": "\n![아키텍처](BRK1-real-title/arch.jpg)\n",
        "not found": figure("BRK1-real-title/missing.jpg", "▶ 영상 01:00"),
    }
    for expected, body in cases.items():
        errors, _ = check_note(note(tmp_path, extra_body=body), CATALOG)
        assert len(errors) == 1 and expected in errors[0], (expected, errors)


def test_project_board_status_follows_issue_and_pr_state():
    from project_board import DONE, IN_PROGRESS, IN_REVIEW, TODO, derive_status

    assert derive_status(False, False, []) == TODO
    assert derive_status(False, True, []) == IN_PROGRESS
    assert derive_status(False, False, [True]) == IN_PROGRESS      # draft PR = still being written
    assert derive_status(False, True, [True, False]) == IN_REVIEW  # any ready PR wins
    assert derive_status(True, True, [False]) == DONE              # closed (e.g. PR merged) beats open PRs


def test_new_issues_go_to_the_milestone_due_soonest():
    from project_board import nearest_milestone

    ms = [{"number": 3, "dueOn": None}, {"number": 2, "dueOn": "2026-12-04T00:00:00Z"},
          {"number": 1, "dueOn": "2026-11-27T00:00:00Z"}]
    assert nearest_milestone(ms)["number"] == 1
    assert nearest_milestone([{"number": 5, "dueOn": None}, {"number": 4, "dueOn": None}])["number"] == 4
    assert nearest_milestone([]) is None


def test_note_preview_uses_first_local_image_and_plain_tldr():
    from build_pages import note_preview
    body = textwrap.dedent("""\
        ## TL;DR

        > **Decision 1.1** 은 [판단](https://x) 전용 `모델` 입니다.
        > 둘째 줄.

        <figure markdown="span">
          ![a](https://example.com/hot.jpg)
          ![b](BRK1-x/slide.jpg)
        </figure>
        """)
    thumb, excerpt = note_preview(body)
    assert thumb == "BRK1-x/slide.jpg"
    assert excerpt == "Decision 1.1 은 판단 전용 모델 입니다. 둘째 줄."
    assert note_preview(body, limit=10)[1] == "Decision 1…"
    assert note_preview("no tldr here") == ("", "")


def test_topic_cards_count_online_sessions_and_link_filtered_catalog():
    from build_pages import topics_block
    sessions = [
        {"online": True, "topics": ["Cloud & AI"], "video": "v", "note_path": None},
        {"online": True, "topics": ["Cloud & AI", "Data"], "video": "", "note_path": Path("n.md")},
        {"online": False, "topics": ["Data"], "video": "v", "note_path": None},
    ]
    out = topics_block(sessions)
    assert out.index("Cloud &amp; AI") < out.index(">Data<")
    assert 'href="catalog/?topic=Cloud%20%26%20AI"' in out
    assert "2<small> sessions</small>" in out and "▶ 1 · 📝 노트 1" in out
