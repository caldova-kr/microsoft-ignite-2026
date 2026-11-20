#!/usr/bin/env python3
"""Save an image from an official Microsoft announcement post into the note's image folder.

    python tools/fetch_image.py BRK243 \\
        --page https://azure.microsoft.com/en-us/blog/<post>/ \\
        --image https://.../figure.png --name foundry-agent-service-overview

The --page must be an official Microsoft blog/news domain (see OFFICIAL_DOMAINS). Prints a
<figure> snippet whose caption links back to the post — fill in the post title and date.
"""
from __future__ import annotations

import argparse
import mimetypes
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_lib import NOTES_DIR, OFFICIAL_DOMAINS, catalog_index, is_official_url, note_code, note_files  # noqa: E402

NAME = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")
EXT = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg"}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("code")
    ap.add_argument("--page", required=True, help="URL of the official announcement post the image appears in")
    ap.add_argument("--image", required=True, help="direct image URL (right-click → copy image address)")
    ap.add_argument("--name", required=True, help="kebab-case file name without extension")
    args = ap.parse_args()

    if not is_official_url(args.page):
        raise SystemExit(f"--page must be on an official Microsoft blog/news domain: {', '.join(OFFICIAL_DOMAINS)}")
    if not NAME.fullmatch(args.name):
        raise SystemExit(f"name must be lowercase kebab-case: {args.name}")
    catalog = catalog_index()
    if args.code not in catalog:
        raise SystemExit(f"{args.code} is not in catalog/sessions.json")
    notes = [p for p in note_files() if note_code(p, catalog) == args.code]
    if not notes:
        raise SystemExit(f"create the note first: python tools/new_session.py {args.code}")

    req = urllib.request.Request(args.image, headers={"User-Agent": "Mozilla/5.0", "Referer": args.page})
    with urllib.request.urlopen(req, timeout=60) as resp:
        ctype = resp.headers.get_content_type()
        blob = resp.read()
    ext = EXT.get(ctype) or mimetypes.guess_extension(ctype) or Path(urlparse(args.image).path).suffix
    if not ctype.startswith("image/"):
        raise SystemExit(f"not an image ({ctype}): {args.image}")

    folder = NOTES_DIR / notes[0].stem
    folder.mkdir(exist_ok=True)
    out = folder / f"{args.name}{ext}"
    out.write_bytes(blob)
    rel = f"{notes[0].stem}/{out.name}"
    print(f"wrote {out.relative_to(NOTES_DIR.parent.parent)} ({len(blob) // 1024} KB)\n")
    print(f'<figure markdown="span">\n  ![<무엇을 보여 주는지>]({rel})\n'
          f"  <figcaption>📰 공식 블로그 · [<포스트 제목>]({args.page}) (YYYY-MM-DD)</figcaption>\n</figure>")


if __name__ == "__main__":
    main()
