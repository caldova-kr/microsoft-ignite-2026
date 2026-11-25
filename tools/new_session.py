#!/usr/bin/env python3
"""Scaffold docs/sessions/<CODE>-<slug>.md from _TEMPLATE.md with catalog fields pre-filled."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_lib import NOTES_DIR, catalog_index, note_code, note_files, slugify  # noqa: E402

TEMPLATE = NOTES_DIR / "_TEMPLATE.md"


def yaml_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, dt.date)):
        return str(value)
    # JSON is valid YAML and keeps titles with ':' or quotes safe.
    return json.dumps(value, ensure_ascii=False)


def frontmatter(s: dict) -> str:
    rows = [
        ("session_code", s["code"]),
        ("title", s["title"]),
        ("session_type", s["type"]),
        ("topics", s["topics"]),
        ("catalog_tags", s["tags"]),
        ("level", s["level"]),
        ("speakers", s["speakers"]),
        ("session_url", s["url"]),
        ("video_url", s["video"]),
        ("source_basis", ["catalog"]),
        ("description", ""),
        ("tags", []),
        ("status", "draft"),
        ("last_updated", dt.date.today()),
    ]
    return "---\n" + "\n".join(f"{k}: {yaml_value(v)}".rstrip() for k, v in rows) + "\n---\n"


def resources(s: dict) -> str:
    lines = [f"- 🎥 Session: {s['url']}"]
    if s["video"]:
        lines.append(f"- ▶️ Video: {s['video']}")
    if s["slides"]:
        lines.append(f"- 🖼️ Slides: {s['slides']}")
    for r in s["resources"]:
        lines.append(f"- 📚 {r['label'] or 'Resource'}: {r['link']}")
    return "\n".join(lines)


def factsheet(s: dict) -> str:
    parts = [f"`{s['type']}`"]
    if s["level"]:
        parts.append(f"`L{s['level']}`")
    parts += s["topics"]
    if s["duration_min"]:
        parts.append(f"{s['duration_min']} min")
    if s["speakers"]:
        parts.append("Speakers: " + ", ".join(s["speakers"]))
    return " · ".join(parts) + "\n{ .dg-factsheet }"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("code")
    ap.add_argument("--slug", help="kebab-case slug (default: derived from the title)")
    args = ap.parse_args()

    catalog = catalog_index()
    s = catalog.get(args.code)
    if not s:
        raise SystemExit(f"{args.code} is not in catalog/sessions.json")
    if not s.get("online", True):
        raise SystemExit(f"{s['code']} is in-person only and not recorded — no source material to summarize")
    existing = [p for p in note_files() if note_code(p, catalog) == s["code"]]
    if existing:
        raise SystemExit(f"note already exists: {existing[0].relative_to(NOTES_DIR.parent.parent)}")

    slug = args.slug or slugify(s["title"])
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
        raise SystemExit(f"invalid slug: {slug}")
    stem = f"{s['code']}-{slug}"

    body = TEMPLATE.read_text(encoding="utf-8").split("\n---\n", 1)[1]
    body = body.replace("# [BRK000] <Session Title>", f"# [{s['code']}] {s['title']}\n\n{factsheet(s)}", 1)
    body = re.sub(r"- 🎥 Session: \S+", lambda _: resources(s), body, count=1)
    body = body.replace("BRK000-slug/", f"{stem}/").replace("BRK000", s["code"])

    path = NOTES_DIR / f"{stem}.md"
    path.write_text(frontmatter(s) + body, encoding="utf-8")
    print(path.relative_to(NOTES_DIR.parent.parent))


if __name__ == "__main__":
    main()
