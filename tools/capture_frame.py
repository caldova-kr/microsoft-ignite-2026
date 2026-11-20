#!/usr/bin/env python3
"""Capture a still frame from a session's official on-demand video into the note's image folder.

    python tools/capture_frame.py BRK243 18:40 foundry-voice-playground
    python tools/capture_frame.py BRK243 18:40 foundry-voice-playground --crop 1100:620:40:140

Seeks over HTTP (no full download), writes docs/sessions/<CODE>-<slug>/<name>.jpg and prints a
<figure> snippet with the required caption. Check the frame for tenant/subscription IDs, emails or
tokens before committing — use --crop (w:h:x:y in output pixels) to cut them out.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_lib import NOTES_DIR, RAW_CACHE, catalog_index, note_code, note_files  # noqa: E402

ASSET = "https://medius.microsoft.com/video/asset/HIGHMP4/{guid}"
GUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
NAME = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")


def parse_time(value: str) -> str:
    parts = value.split(":")
    if not 2 <= len(parts) <= 3 or not all(p.isdigit() for p in parts):
        raise SystemExit(f"time must be MM:SS or HH:MM:SS: {value}")
    nums = [int(p) for p in parts]
    if len(nums) == 2:
        nums.insert(0, 0)
    h, m, s = nums
    return f"{h:02d}:{m:02d}:{s:02d}"


def display_time(hms: str) -> str:
    h, m, s = hms.split(":")
    return f"{int(h)}:{m}:{s}" if int(h) else f"{m}:{s}"


def video_source(code: str, embed_url: str) -> str:
    if RAW_CACHE.exists():
        for r in json.loads(RAW_CACHE.read_text(encoding="utf-8")):
            if r.get("sessionCode") == code and r.get("downloadVideoLink"):
                return r["downloadVideoLink"]
    m = GUID.search(embed_url or "")
    if not m:
        raise SystemExit(f"{code}: no on-demand video in the catalog yet")
    return ASSET.format(guid=m.group(0))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("code")
    ap.add_argument("time", help="MM:SS or HH:MM:SS in the on-demand video")
    ap.add_argument("name", help="kebab-case file name without extension, e.g. agent-architecture")
    ap.add_argument("--crop", help="w:h:x:y applied after scaling (to remove IDs/emails or zoom into a slide)")
    ap.add_argument("--width", type=int, default=1600, help="max output width (default 1600)")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is required (brew install ffmpeg / apt-get install ffmpeg)")
    if not NAME.fullmatch(args.name):
        raise SystemExit(f"name must be lowercase kebab-case: {args.name}")
    catalog = catalog_index()
    s = catalog.get(args.code)
    if not s:
        raise SystemExit(f"{args.code} is not in catalog/sessions.json")
    notes = [p for p in note_files() if note_code(p, catalog) == s["code"]]
    if not notes:
        raise SystemExit(f"create the note first: python tools/new_session.py {s['code']}")
    folder = NOTES_DIR / notes[0].stem
    folder.mkdir(exist_ok=True)
    out = folder / f"{args.name}.jpg"

    hms = parse_time(args.time)
    vf = f"scale='min({args.width},iw)':-2" + (f",crop={args.crop}" if args.crop else "")
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", hms, "-user_agent", "Mozilla/5.0",
           "-i", video_source(s["code"], s["video"]), "-frames:v", "1", "-vf", vf, "-q:v", "3", str(out)]
    subprocess.run(cmd, check=True)
    rel = f"{notes[0].stem}/{out.name}"
    print(f"wrote {out.relative_to(NOTES_DIR.parent.parent)} ({out.stat().st_size // 1024} KB) — check it for IDs/emails before committing\n")
    print(f'<figure markdown="span">\n  ![<무엇을 보여 주는지>]({rel})\n'
          f"  <figcaption>▶ 영상 {display_time(hms)} — <한 줄 설명></figcaption>\n</figure>")


if __name__ == "__main__":
    main()
