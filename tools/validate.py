#!/usr/bin/env python3
"""Validate session notes and triage against the official Ignite 2026 catalog.

Errors fail CI. Warnings are printed for reviewers.
"""
from __future__ import annotations

import datetime as dt
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_lib import (  # noqa: E402
    NOTE_STATUSES, is_official_url, REQUIRED_SECTIONS, ROOT, SECTION_ORDER, TRIAGE_STATUSES, catalog_index, load_triage,
    note_code, note_files, parse_note,
)

CATALOG_FIELDS = {  # frontmatter key -> catalog key; must match the catalog exactly
    "title": "title", "session_type": "type", "topics": "topics", "catalog_tags": "tags",
    "level": "level", "speakers": "speakers", "session_url": "url", "video_url": "video",
}
REQUIRED_KEYS = ["session_code", *CATALOG_FIELDS, "source_basis", "tags", "status", "last_updated"]
SOURCE_BASIS = {"catalog", "video", "transcript", "slides", "resources"}
PRIMARY_BASIS = {"video", "transcript", "slides"}
OTHER_EVENT = re.compile(r"build\.microsoft\.com|\bBuild 20\d\d\b|\bIgnite 20(?!26)\d\d\b")
MARKETING = re.compile(r"\b(revolutionary|game[- ]changing|seamless(ly)?|cutting[- ]edge|best[- ]in[- ]class)\b", re.I)
SUPPLEMENT = re.compile(r'^!!! \w+ "세션 외 보충', re.M)
SESSION_LINK = re.compile(r"https://ignite\.microsoft\.com/en-US/sessions/([A-Z0-9-]+)")
SLUG = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")
IMAGE = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)[^)]*\)")
FIGURE = re.compile(r"<figure\b[^>]*>(.*?)</figure>", re.S)
CAPTION = re.compile(r"<figcaption>(.*?)</figcaption>", re.S)
T1_CAPTION = re.compile(r"(영상|video)\s*\d{1,2}:\d{2}|슬라이드\s*#?\d+|slide\s*#?\d+", re.I)
LINK = re.compile(r"\]\((https://[^)\s]+)\)|<(https://[^>\s]+)>")
MAX_IMAGE_KB = 1024


def check_images(path: Path, body: str, status: str) -> tuple[list[str], list[str]]:
    """Images must be local files in the note folder, inside a <figure> whose caption names the source."""
    errors, warnings = [], []
    figures = FIGURE.findall(body)
    outside = FIGURE.sub("", body)
    for _alt, src in IMAGE.findall(outside):
        errors.append(f"image outside <figure> (needs a source caption): {src}")
    count = 0
    for fig in figures:
        m = CAPTION.search(fig)
        caption = m.group(1) if m else ""
        for alt, src in IMAGE.findall(fig):
            count += 1
            if src.startswith(("http://", "https://")):
                errors.append(f"hotlinked image — download it into {path.stem}/ (tools/fetch_image.py): {src}")
                continue
            if not src.startswith(f"{path.stem}/"):
                errors.append(f"image must live in the note folder {path.stem}/: {src}")
            file = path.parent / src
            if not file.exists():
                errors.append(f"image file not found: {src}")
            elif file.stat().st_size > MAX_IMAGE_KB * 1024:
                warnings.append(f"image larger than {MAX_IMAGE_KB} KB — re-capture with --width or crop: {src}")
            if not alt.strip() or alt.strip().startswith("<"):
                errors.append(f"image needs alt text describing what it shows: {src}")
            if not caption.strip():
                errors.append(f"figure without <figcaption> source: {src}")
            elif not T1_CAPTION.search(caption):
                links = [a or b for a, b in LINK.findall(caption)]
                if not any(is_official_url(u) for u in links):
                    errors.append(f"caption must cite '영상 MM:SS' / '슬라이드 #N' or link an official Microsoft blog post: {src}")
    if status in ("review", "done") and count == 0:
        warnings.append("no images — capture key frames (tools/capture_frame.py) or official blog images")
    return errors, warnings


def strip_supplements(body: str) -> str:
    """Drop `!!! ... "세션 외 보충"` admonitions (header + indented block) before other-event checks."""
    out, skipping = [], False
    for line in body.splitlines():
        if SUPPLEMENT.match(line):
            skipping = True
            continue
        if skipping and (line.startswith("    ") or not line.strip()):
            continue
        skipping = False
        out.append(line)
    return "\n".join(out)


def check_note(path: Path, catalog: dict) -> tuple[list[str], list[str]]:
    errors, warnings = [], []
    code = note_code(path, catalog)
    if not code:
        return [f"filename must start with a catalog session code: {path.name}"], []
    slug = path.stem[len(code) + 1:]
    if not SLUG.fullmatch(slug):
        errors.append(f"slug must be lowercase kebab-case: '{slug}'")

    fm, body = parse_note(path)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)  # template guidance comments are not content
    s = catalog[code]
    for key in REQUIRED_KEYS:
        if key not in fm:
            errors.append(f"frontmatter key missing: {key}")
    if fm.get("session_code") != code:
        errors.append(f"session_code '{fm.get('session_code')}' != filename code '{code}'")
    for key, ckey in CATALOG_FIELDS.items():
        want, got = s[ckey], fm.get(key)
        if (want in ("", None, [])) and (got in ("", None, [])):
            continue
        if got != want:
            errors.append(f"{key} differs from catalog (expected {want!r}, got {got!r}) — re-run new_session.py values")

    status = fm.get("status")
    if status not in NOTE_STATUSES:
        errors.append(f"status must be one of {NOTE_STATUSES}")
    updated = fm.get("last_updated")
    if not isinstance(updated, dt.date):
        errors.append("last_updated must be YYYY-MM-DD")
    basis = set(fm.get("source_basis") or [])
    if basis - SOURCE_BASIS:
        errors.append(f"unknown source_basis: {sorted(basis - SOURCE_BASIS)}")
    if status in ("review", "done") and not basis & PRIMARY_BASIS:
        errors.append("review/done notes need a primary source in source_basis (video | transcript | slides)")
    if "transcript" in basis and not s["transcript"]:
        warnings.append("source_basis has 'transcript' but the catalog publishes no transcript for this session")
    if "slides" in basis and not s["slides"]:
        warnings.append("source_basis has 'slides' but the catalog publishes no slide deck for this session")
    if "video" in basis and not s["video"]:
        warnings.append("source_basis has 'video' but the catalog publishes no on-demand video for this session")

    img_errors, img_warnings = check_images(path, body, status)
    errors += img_errors
    warnings += img_warnings

    if not re.search(rf"^# \[{re.escape(code)}\] ", body, re.M):
        errors.append(f"H1 must start with '# [{code}] '")
    headings = re.findall(r"^## (.+?)\s*(?:<!--.*)?$", body, re.M)
    unknown = [h for h in headings if h not in SECTION_ORDER]
    if unknown:
        errors.append(f"unknown section headings (rename/remove): {unknown}")
    known = [h for h in headings if h in SECTION_ORDER]
    if known != sorted(known, key=SECTION_ORDER.index):
        errors.append("sections are out of canonical order")
    for h in REQUIRED_SECTIONS:
        if h not in headings:
            errors.append(f"required section missing: ## {h}")
    if s["url"] not in body:
        errors.append(f"Resources must link the session page: {s['url']}")

    for linked in set(SESSION_LINK.findall(body)):
        if linked not in catalog:
            errors.append(f"links a session code that is not in the Ignite 2026 catalog: {linked}")
    scoped = strip_supplements(body)
    for m in sorted({x.group(0) for x in OTHER_EVENT.finditer(scoped)}):
        errors.append(f"other-event reference outside a '세션 외 보충' block: {m!r}")
    for m in {x.group(0) for x in MARKETING.finditer(body)}:
        warnings.append(f"marketing wording: {m!r}")
    if status == "done" and re.search(r"^\s*(-|>|\|\s*\|)\s*$", body, re.M):
        warnings.append("done note still has empty template bullets/quotes/rows")
    return errors, warnings


def main() -> int:
    catalog = catalog_index()
    n_err = 0
    for path in note_files():
        errors, warnings = check_note(path, catalog)
        rel = path.relative_to(ROOT)
        for e in errors:
            print(f"ERROR {rel}: {e}")
        for w in warnings:
            print(f"WARN  {rel}: {w}")
        n_err += len(errors)

    for code, t in load_triage().items():
        if code not in catalog:
            print(f"ERROR catalog/triage.yml: unknown session code {code}")
            n_err += 1
        if t.get("status") not in TRIAGE_STATUSES:
            print(f"ERROR catalog/triage.yml: {code} status must be one of {TRIAGE_STATUSES}")
            n_err += 1

    print(f"validated {len(note_files())} notes — {n_err} error(s)")
    return 1 if n_err else 0


if __name__ == "__main__":
    sys.exit(main())
