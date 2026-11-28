import re
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


def note(tmp_path, title="Real title", status="draft", basis="[catalog]", extra_body="", description="한 문장 요약"):
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
        @@DESC@@
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
        """).replace("@@EXTRA@@", extra_body).replace("@@DESC@@", "" if description is None else f'description: "{description}"'), encoding="utf-8")
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

        <!-- 예: ![x](BRK000-x/agent-architecture.jpg) -->
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


def test_tldr_prefers_the_blockquote_summary():
    from build_pages import tldr

    body = "## TL;DR\n\n> 키노트는 **세 가지** 의제였습니다. [노트](x/)\n\n- bullet\n\n## Top highlights\n\n> other\n"
    assert tldr(body) == "키노트는 세 가지 의제였습니다. 노트"


def test_llm_text_drops_markup_but_keeps_meaning():
    from build_pages import llm_text

    body = textwrap.dedent('''\
        # [KEY01] Title

        `Keynote` · 120 min
        { .dg-factsheet }

        <!-- 범위: 내부 메모 -->

        ## TL;DR

        <figure markdown="span">
          ![세 기둥 슬라이드](KEY01/a.jpg)
          <figcaption>▶ 영상 2:21 — 세 기둥</figcaption>
        </figure>

        !!! supplement "세션 외 보충 · 블로그"
            [포스트](https://example.com)

        [버튼](a.md){ .dg-button }
        ''')
    out = llm_text(body)
    assert out.startswith("## TL;DR")
    assert "(이미지: 세 기둥 슬라이드 — ▶ 영상 2:21 — 세 기둥)" in out
    assert "**세션 외 보충 · 블로그**\n[포스트](https://example.com)" in out
    assert "<!--" not in out and "{ ." not in out and "내부 메모" not in out
    assert "[버튼](a.md)\n" in out


def test_review_notes_need_a_short_description(tmp_path):
    errors, _ = check_note(note(tmp_path, status="review", basis="[transcript]", description=""), CATALOG)
    assert len(errors) == 1 and "description" in errors[0]
    errors, _ = check_note(note(tmp_path, description=""), CATALOG)
    assert errors == []
    errors, _ = check_note(note(tmp_path, description=None), CATALOG)
    assert errors == []
    errors, warnings = check_note(note(tmp_path, description="가" * 200), CATALOG)
    assert errors == [] and any("160" in w for w in warnings)


def test_exported_note_links_point_at_the_deployed_pages():
    from build_pages import DOCS_DIR, absolute_links

    site = "https://example.github.io/notes/"
    path = DOCS_DIR / "sessions" / "KEY01-x.md"
    body = "[사례](#case-a) · [다른 노트](BRK1-y.md#ga) · [홈](../index.md) · [외부](https://ignite.microsoft.com) · ![img](KEY01-x/a.jpg)"
    out = absolute_links(body, path, site)
    assert "[사례](https://example.github.io/notes/sessions/KEY01-x/#case-a)" in out
    assert "[다른 노트](https://example.github.io/notes/sessions/BRK1-y/#ga)" in out
    assert "[홈](https://example.github.io/notes/)" in out
    assert "[외부](https://ignite.microsoft.com)" in out
    assert "![img](https://example.github.io/notes/sessions/KEY01-x/a.jpg)" in out


def deck(tmp_path):
    """Minimal .pptx: presentation order is slide2 then slide1; slide1 is hidden and has notes, a link and a video."""
    import zipfile

    def slide(text, hidden=False):
        show = ' show="0"' if hidden else ""
        badge = "<p:sp><p:txBody><a:p><a:pPr/><a:r><a:t>Badge</a:t></a:r></a:p></p:txBody></p:sp>"
        title = f'<p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>{text}</a:t></a:r></a:p></p:txBody></p:sp>'
        return f'<p:sld{show}><p:spTree>{badge}{title}<p:sp><p:txBody><a:p><a:r><a:t>A &amp; B</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:sld>'

    rel = '<Relationship Id="{}" Type="http://x/relationships/{}" Target="{}"{}/>'
    path = tmp_path / "deck.pptx"
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("ppt/presentation.xml", '<p:sldIdLst><p:sldId id="1" r:id="rId2"/><p:sldId id="2" r:id="rId1"/></p:sldIdLst>')
        zf.writestr("ppt/_rels/presentation.xml.rels",
                    rel.format("rId1", "slide", "slides/slide1.xml", "") + rel.format("rId2", "slide", "slides/slide2.xml", ""))
        zf.writestr("ppt/slides/slide1.xml", slide("Hidden one", hidden=True))
        zf.writestr("ppt/slides/slide2.xml", slide("Shown first"))
        zf.writestr("ppt/slides/_rels/slide1.xml.rels",
                    rel.format("rId1", "notesSlide", "../notesSlides/notesSlide1.xml", "")
                    + rel.format("rId2", "hyperlink", "https://aka.ms/x", ' TargetMode="External"')
                    + rel.format("rId3", "video", "../media/media1.mp4", ""))
        zf.writestr("ppt/notesSlides/notesSlide1.xml", "<p:notes><a:p><a:r><a:t>say this</a:t></a:r></a:p><a:p><a:r><a:t>2</a:t></a:r></a:p></p:notes>")
    return path


def test_slides_are_read_in_presentation_order_with_notes_links_and_videos(tmp_path):
    from slides_lib import read_slides, slides_markdown

    first, second = read_slides(deck(tmp_path))
    assert (first["number"], first["title"], first["text"], first["hidden"]) == (1, "Shown first", ["Badge", "Shown first", "A & B"], False)
    assert second == {"number": 2, "part": "ppt/slides/slide1.xml", "hidden": True, "title": "Hidden one",
                      "text": ["Badge", "Hidden one", "A & B"], "notes": ["say this"], "links": ["https://aka.ms/x"],
                      "videos": ["ppt/media/media1.mp4"]}
    text = slides_markdown(deck(tmp_path))
    assert text.index("## Slide 1 — Shown first\n- Badge") < text.index("## Slide 2 — Hidden one  (hidden)")
    assert "Notes: say this" in text and "Link: https://aka.ms/x" in text and "Embedded video: 1" in text


def test_pdf_page_skips_hidden_slides():
    import pytest
    from slides_lib import pdf_page

    slides = [{"hidden": False}, {"hidden": True}, {"hidden": False}]
    assert [pdf_page(slides, 1), pdf_page(slides, 3)] == [1, 2]
    with pytest.raises(ValueError):
        pdf_page(slides, 2)


VTT = """WEBVTT

00:00:01.000 --> 00:00:04.000
Good morning.

2
00:00:29.500 --> 00:00:31.000 align:middle
<v Speaker>Still the first
half minute.

00:01:05.000 --> 00:01:07.000
Later on.
"""


def test_captions_become_timestamped_text():
    from fetch_sources import vtt_to_text

    assert vtt_to_text(VTT) == "[00:00] Good morning. Still the first half minute.\n[01:00] Later on.\n"


def test_player_caption_track_is_picked_by_language():
    from fetch_sources import captions_url

    page = 'var captionsConfiguration = {"languageList":[{"src":"https://h/Caption_ko-KR.vtt?sig=a"},{"src":"https://h/Caption_en-US.vtt?sig=b\\u0026x=1"}]};'
    assert captions_url(page) == "https://h/Caption_en-US.vtt?sig=b&x=1"
    assert captions_url("<html>no captions</html>") is None


def test_media_links_fall_back_to_raw_catalog_when_snapshot_is_older():
    from fetch_sources import links

    snapshot = {"video": "https://v", "transcript": "", "slides": ""}
    raws = [{"sessionCode": "BRK1"}, {"captionFileLink": "https://t", "slideDeck": "https://s", "onDemand": "https://other"}]
    assert links(snapshot, raws) == {"video": "https://v", "transcript": "https://t", "slides": "https://s"}


def test_unreadable_transcript_falls_back_to_player_captions(monkeypatch):
    import fetch_sources

    pages = {"https://t": b"\xd0\xcf\x11\xe0 rights-protected",
             "https://v": b'captionsConfiguration = {"languageList":[{"src":"https://c/Caption_en-US.vtt"}]};',
             "https://c/Caption_en-US.vtt": VTT.encode()}
    monkeypatch.setattr(fetch_sources, "get", pages.__getitem__)
    text, source = fetch_sources.fetch_transcript({"video": "https://v", "transcript": "https://t", "slides": ""})
    assert source == "player captions" and "[00:00] Good morning." in text
    assert fetch_sources.fetch_transcript({"video": "", "transcript": "", "slides": ""}) is None
