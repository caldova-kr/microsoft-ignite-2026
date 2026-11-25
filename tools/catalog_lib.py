"""Shared helpers for the Microsoft Ignite 2026 session catalog and notes."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
CATALOG_DIR = ROOT / "catalog"
SESSIONS_JSON = CATALOG_DIR / "sessions.json"
META_JSON = CATALOG_DIR / "meta.json"
TRIAGE_YML = CATALOG_DIR / "triage.yml"
DOCS_DIR = ROOT / "docs"
NOTES_DIR = DOCS_DIR / "sessions"
CACHE_DIR = ROOT / ".cache"
RAW_CACHE = CACHE_DIR / "catalog-raw.json"

EVENT_NAME = "Microsoft Ignite 2026"
API_URL = "https://ignite.microsoft.com/api/session/all/en-US"
SESSION_URL = "https://ignite.microsoft.com/en-US/sessions/{code}"

NOTE_STATUSES = ("draft", "review", "done")
TRIAGE_STATUSES = ("hold", "skip")  # proposing/claiming a session is done with GitHub issues

# Canonical section order of a session note (see .github/copilot-instructions.md).
SECTION_ORDER = [
    "TL;DR",
    "Top highlights",
    "Why it matters",
    "Customer scenarios",
    "Key announcements",
    "Session summary",
    "Architecture",
    "Demo highlights",
    "Code & samples",
    "Caveats & open questions",
    "Resources",
    "Related sessions",
]
REQUIRED_SECTIONS = ["TL;DR", "Why it matters", "Resources"]
# Keynote notes carry the "why" inside each product highlight, so the separate section is optional there.
OPTIONAL_SECTIONS_BY_TYPE = {"Keynote": {"Why it matters"}}

# Official Microsoft announcement sources whose images may be reused (contributors are Microsoft employees).
OFFICIAL_DOMAINS = (
    "news.microsoft.com", "blogs.microsoft.com", "azure.microsoft.com", "techcommunity.microsoft.com",
    "devblogs.microsoft.com", "github.blog", "www.microsoft.com",
)


def is_official_url(url: str) -> bool:
    from urllib.parse import urlparse

    u = urlparse(url)
    if u.scheme != "https" or u.hostname not in OFFICIAL_DOMAINS:
        return False
    # www.microsoft.com hosts many things; only its blogs count (e.g. /en-us/security/blog/, /en-us/microsoft-365/blog/).
    return u.hostname != "www.microsoft.com" or "/blog" in u.path

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def html_to_text(value: str | None) -> str:
    if not value:
        return ""
    text = re.sub(r"(?i)<br\s*/?>|</p>|</li>", "\n", value)
    text = _TAG_RE.sub("", text)
    text = html.unescape(text)
    lines = [_WS_RE.sub(" ", line).strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def _display(value: Any) -> str:
    if isinstance(value, dict):
        return (value.get("displayValue") or value.get("logicalValue") or "").strip()
    return (value or "").strip() if isinstance(value, str) else ""


def _display_list(values: Any) -> list[str]:
    out: list[str] = []
    for v in values or []:
        d = _display(v)
        if d and d not in out:
            out.append(d)
    return out


def _level(values: Any) -> int | None:
    for v in _display_list(values):
        m = re.match(r"\((\d{3})\)", v)
        if m:
            return int(m.group(1))
    return None


def normalize(raw_records: list[dict]) -> list[dict]:
    """Collapse raw catalog instances (repeats share a sessionCode) into one record per session."""
    by_code: dict[str, dict] = {}
    for r in raw_records:
        code = (r.get("sessionCode") or "").strip()
        if not code:
            continue
        slot = None
        if r.get("startDateTime"):
            slot = {
                "start": r["startDateTime"],
                "end": r.get("endDateTime") or "",
                "location": _display(r.get("location")),
            }
        rec = by_code.get(code)
        if rec is None:
            rec = {
                "code": code,
                "title": (r.get("title") or "").strip(),
                "type": _display(r.get("sessionType")),
                "topics": _display_list(r.get("topic")),
                "tags": _display_list(r.get("tags")),
                "level": _level(r.get("sessionLevel")),
                "audiences": _display_list(r.get("audienceTypes")),
                "industries": _display_list(r.get("industry")),
                "delivery": _display_list(r.get("deliveryTypes")),
                "speakers": [s.strip() for s in (r.get("speakerNames") or "").split(",") if s.strip()],
                "duration_min": r.get("durationInMinutes") or None,
                "recorded": _display_list(r.get("viewingOptions")),
                "url": SESSION_URL.format(code=code),
                "video": r.get("onDemand") or "",
                "transcript": r.get("captionFileLink") or "",
                "slides": r.get("slideDeck") or "",
                "resources": [
                    {"label": (x.get("label") or "").strip(), "link": x.get("link") or ""}
                    for x in (r.get("relatedResources") or [])
                    if x.get("link")
                ],
                "description": html_to_text(r.get("description")),
                "has_ai_summary": bool(r.get("aiDescription")),
                "catalog_id": r.get("sessionId") or "",
                "slots": [],
            }
            by_code[code] = rec
        else:
            # Repeats may be the only instance that has media attached.
            for key, src in (("video", "onDemand"), ("transcript", "captionFileLink"), ("slides", "slideDeck")):
                if not rec[key] and r.get(src):
                    rec[key] = r[src]
            rec["has_ai_summary"] = rec["has_ai_summary"] or bool(r.get("aiDescription"))
            for key, src in (("delivery", "deliveryTypes"), ("recorded", "viewingOptions")):
                for v in _display_list(r.get(src)):
                    if v not in rec[key]:
                        rec[key].append(v)
        if slot and slot not in rec["slots"]:
            rec["slots"].append(slot)
    for rec in by_code.values():
        rec["slots"].sort(key=lambda s: s["start"])
    return sorted(by_code.values(), key=lambda x: x["code"])


def is_watchable(s: dict) -> bool:
    """Online-accessible: streamed online, already has on-demand video, or will be recorded.

    In-person-only sessions that are not recorded cannot be summarized from source material,
    so the site catalog hides them by default.
    """
    return "Online" in s["delivery"] or bool(s["video"]) or "Will be recorded" in s["recorded"]


def load_catalog() -> list[dict]:
    return json.loads(SESSIONS_JSON.read_text(encoding="utf-8"))


def catalog_index() -> dict[str, dict]:
    return {s["code"]: s for s in load_catalog()}


def load_triage() -> dict[str, dict]:
    import yaml

    if not TRIAGE_YML.exists():
        return {}
    data = yaml.safe_load(TRIAGE_YML.read_text(encoding="utf-8")) or {}
    out = {}
    for code, value in data.items():
        if isinstance(value, str):
            value = {"status": value}
        out[str(code)] = value or {}
    return out


_FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.S)


def parse_note(path: Path) -> tuple[dict, str]:
    import yaml

    text = path.read_text(encoding="utf-8")
    m = _FM_RE.match(text)
    if not m:
        return {}, text
    return yaml.safe_load(m.group(1)) or {}, text[m.end():]


def note_files() -> list[Path]:
    return sorted(p for p in NOTES_DIR.glob("*.md") if not p.name.startswith(("_", "index")))


def note_code(path: Path, catalog: dict[str, dict]) -> str | None:
    """Return the longest catalog code that prefixes the note filename (codes may contain '-')."""
    stem = path.stem
    best = None
    for code in catalog:
        if stem == code or stem.startswith(code + "-"):
            if best is None or len(code) > len(best):
                best = code
    return best


def slugify(title: str, max_words: int = 8) -> str:
    words = re.findall(r"[a-z0-9]+", title.lower().replace("&", " and "))
    stop = {"a", "an", "the", "of", "for", "to", "and", "with", "in", "on", "your", "at", "by"}
    kept = [w for w in words if w not in stop] or words
    return "-".join(kept[:max_words])
