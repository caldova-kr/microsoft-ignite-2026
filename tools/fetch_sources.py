#!/usr/bin/env python3
"""Download the official source material for one session into .cache/sources/<CODE>/ (git-ignored).

Writes:
  catalog.md      catalog record (title, type, topics, tags, abstract, Microsoft AI summary, links)
  transcript.txt  official transcript (from the catalog's caption file), if published
  slides.pptx     official slide deck, if published

These files are the evidence a session note must be based on. They are Microsoft-owned
material and are never committed; notes cite the public URLs instead.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.request
import zipfile
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_lib import API_URL, CACHE_DIR, RAW_CACHE, catalog_index, html_to_text  # noqa: E402

UA = {"User-Agent": "Mozilla/5.0 (ignite-2026-notes source fetch)"}


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as resp:
        return resp.read()


def raw_records(code: str, refresh: bool) -> list[dict]:
    if refresh or not RAW_CACHE.exists():
        CACHE_DIR.mkdir(exist_ok=True)
        RAW_CACHE.write_bytes(get(API_URL))
    data = json.loads(RAW_CACHE.read_text(encoding="utf-8"))
    return [r for r in data if r.get("sessionCode") == code]


def docx_to_text(blob: bytes) -> str:
    xml = zipfile.ZipFile(BytesIO(blob)).read("word/document.xml").decode("utf-8")
    paras = re.findall(r"<w:p[ >].*?</w:p>", xml, re.S)
    lines = [html.unescape("".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S))).strip() for p in paras]
    return "\n".join(line for line in lines if line) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("codes", nargs="+", help="session codes, e.g. KEY01 BRK220")
    ap.add_argument("--refresh", action="store_true", help="re-download the raw catalog first")
    args = ap.parse_args()

    catalog = catalog_index()
    for code in args.codes:
        s = catalog.get(code)
        if not s:
            print(f"[{code}] not in catalog/sessions.json — check the code", file=sys.stderr)
            continue
        out = CACHE_DIR / "sources" / code
        out.mkdir(parents=True, exist_ok=True)

        raws = raw_records(code, args.refresh)
        ai_summary = next((html_to_text(r.get("aiDescription")) for r in raws if r.get("aiDescription")), "")
        lines = [
            f"# [{code}] {s['title']}", "",
            f"- Type: {s['type']}", f"- Topics: {', '.join(s['topics'])}", f"- Tags: {', '.join(s['tags'])}",
            f"- Level: {s['level'] or ''}", f"- Speakers: {', '.join(s['speakers'])}",
            f"- Session page: {s['url']}", f"- Video: {s['video']}", f"- Slides: {s['slides']}",
            f"- Transcript: {s['transcript']}", "",
            "## Abstract (catalog)", "", s["description"], "",
            "## Microsoft AI-generated summary (catalog `aiDescription`)", "",
            "> 카탈로그가 제공하는 AI 생성 요약. 사실 확인의 1차 근거가 아니라 탐색용 — 주장은 transcript/영상/슬라이드로 확인할 것.",
            "", ai_summary or "(none)", "",
            "## Related resources (catalog)", "",
            *[f"- {r['label']}: {r['link']}" for r in s["resources"]],
        ]
        (out / "catalog.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        got = ["catalog.md"]

        if s["transcript"]:
            try:
                (out / "transcript.txt").write_text(docx_to_text(get(s["transcript"])), encoding="utf-8")
                got.append("transcript.txt")
            except Exception as exc:  # noqa: BLE001
                print(f"[{code}] transcript download failed: {exc}", file=sys.stderr)
        if s["slides"]:
            try:
                (out / "slides.pptx").write_bytes(get(s["slides"]))
                got.append("slides.pptx")
            except Exception as exc:  # noqa: BLE001
                print(f"[{code}] slides download failed: {exc}", file=sys.stderr)
        print(f"[{code}] {out.relative_to(CACHE_DIR.parent)}: {', '.join(got)}"
              + ("" if s["video"] else "  (no on-demand video yet)"))


if __name__ == "__main__":
    main()
