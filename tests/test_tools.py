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
