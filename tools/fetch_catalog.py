#!/usr/bin/env python3
"""Fetch the official Microsoft Ignite 2026 session catalog and write catalog/sessions.json + sessions.csv.

Source: the same public endpoint the ignite.microsoft.com session catalog uses.
Nothing is invented here: every field is copied (or mechanically normalized) from the API response.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_lib import API_URL, CACHE_DIR, CATALOG_DIR, META_JSON, RAW_CACHE, SESSIONS_JSON, normalize  # noqa: E402

MIN_EXPECTED = 1000  # guard against writing a partial/empty catalog


def fetch(url: str, retries: int = 3) -> list[dict]:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (ignite-2026-notes catalog sync)"})
    last: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(2 ** attempt * 3)
    raise SystemExit(f"catalog fetch failed: {last}")


def write_csv(sessions: list[dict], path: Path) -> None:
    cols = ["code", "title", "type", "topics", "level", "tags", "speakers", "duration_min",
            "first_slot", "recorded", "video", "slides", "transcript", "url"]
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(cols)
        for s in sessions:
            w.writerow([
                s["code"], s["title"], s["type"], "; ".join(s["topics"]), s["level"] or "",
                "; ".join(s["tags"]), "; ".join(s["speakers"]), s["duration_min"] or "",
                s["slots"][0]["start"] if s["slots"] else "", "; ".join(s["recorded"]),
                s["video"], s["slides"], s["transcript"], s["url"],
            ])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--from-file", type=Path, help="use a saved raw API response instead of fetching")
    args = ap.parse_args()

    raw = json.loads(args.from_file.read_text()) if args.from_file else fetch(API_URL)
    if not isinstance(raw, list) or len(raw) < MIN_EXPECTED:
        raise SystemExit(f"unexpected catalog payload ({type(raw).__name__}, {len(raw) if isinstance(raw, list) else '-'} records)")

    # Raw payload (incl. Microsoft's long-form session summaries) stays local; see fetch_sources.py.
    CACHE_DIR.mkdir(exist_ok=True)
    RAW_CACHE.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")

    sessions = normalize(raw)
    body = json.dumps(sessions, ensure_ascii=False, indent=1) + "\n"
    digest = hashlib.sha256(body.encode()).hexdigest()

    CATALOG_DIR.mkdir(exist_ok=True)
    old_meta = json.loads(META_JSON.read_text()) if META_JSON.exists() else {}
    if old_meta.get("sha256") == digest:
        print(f"catalog unchanged ({len(sessions)} sessions)")
        return

    SESSIONS_JSON.write_text(body, encoding="utf-8")
    write_csv(sessions, CATALOG_DIR / "sessions.csv")
    meta = {
        "event": "Microsoft Ignite 2026",
        "source": API_URL,
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "raw_instances": len(raw),
        "sessions": len(sessions),
        "with_video": sum(1 for s in sessions if s["video"]),
        "with_slides": sum(1 for s in sessions if s["slides"]),
        "with_transcript": sum(1 for s in sessions if s["transcript"]),
        "sha256": digest,
    }
    META_JSON.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(sessions)} sessions ({len(raw)} raw instances)")


if __name__ == "__main__":
    main()
