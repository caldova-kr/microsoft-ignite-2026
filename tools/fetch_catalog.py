#!/usr/bin/env python3
"""Fetch the official Microsoft Ignite 2026 session catalog and write catalog/sessions.json + sessions.csv.

Source: the same public endpoint the ignite.microsoft.com session catalog uses.
Nothing is invented here: every field is copied (or mechanically normalized) from the API response.
Each session gets `online` (see catalog_lib.is_watchable): in-person-only, unrecorded sessions
have no source material we could summarize, so the site hides them by default.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import csv
import hashlib
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_lib import (  # noqa: E402
    API_URL, CACHE_DIR, CATALOG_DIR, META_JSON, RAW_CACHE, SESSIONS_JSON, is_watchable, normalize,
)

MIN_EXPECTED = 1000  # guard against writing a partial/empty catalog
DETAIL_URL = "https://ignite.microsoft.com/api/session/en-US-{code}"
EXTRA_CODES = CATALOG_DIR / "extra-sessions.txt"
# Dense numeric ranges per code prefix, used by --probe to find sessions the list API omits.
PROBE_RANGES = {
    "BRK": [(101, 600)], "BRKSP": [(580, 650)], "LAB": [(640, 750)], "LABSP": [(820, 850)], "LIVE": [(40, 75)],
    "LTG": [(1150, 1490)], "LTGSP": [(1590, 1640)], "ODSP": [(2090, 2260)], "THR": [(840, 1060), (1795, 1815)],
    "THRSP": [(1040, 1170)], "TT": [(1640, 1900), (2490, 2545)], "TTSP": [(1860, 1895)], "INV": [(630, 650)],
    "KEY": [(1, 5)], "OD": [(1920, 1940)],
}


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


def fetch_detail(code: str) -> dict | None:
    req = urllib.request.Request(DETAIL_URL.format(code=code), headers={"User-Agent": "Mozilla/5.0 (ignite-2026-notes catalog sync)"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise


def extra_codes() -> list[str]:
    if not EXTRA_CODES.exists():
        return []
    return [line.split("#", 1)[0].strip() for line in EXTRA_CODES.read_text().splitlines() if line.split("#", 1)[0].strip()]


def supplement(raw: list[dict]) -> list[str]:
    """Add sessions listed in extra-sessions.txt that the list API currently omits."""
    have = {r.get("sessionCode") for r in raw}
    added = []
    for code in extra_codes():
        if code in have:
            continue
        rec = fetch_detail(code)
        if rec and rec.get("sessionCode") == code:
            raw.append(rec)
            added.append(code)
        else:
            print(f"warning: {code} listed in {EXTRA_CODES.name} but not found via the detail API", file=sys.stderr)
    return added


def probe(raw: list[dict]) -> list[str]:
    have = {r.get("sessionCode") for r in raw}
    cand = [f"{p}{n}" for p, spans in PROBE_RANGES.items() for lo, hi in spans for n in range(lo, hi + 1)
            if f"{p}{n}" not in have]
    with concurrent.futures.ThreadPoolExecutor(16) as ex:
        found = [c for c, rec in zip(cand, ex.map(fetch_detail, cand)) if rec]
    print(f"probed {len(cand)} codes; missing from the list API: {found or 'none'}")
    return found


def write_csv(sessions: list[dict], path: Path) -> None:
    cols = ["code", "online", "title", "type", "topics", "level", "tags", "speakers", "duration_min",
            "first_slot", "recorded", "video", "slides", "transcript", "url"]
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(cols)
        for s in sessions:
            w.writerow([
                s["code"], "yes" if s["online"] else "no", s["title"], s["type"], "; ".join(s["topics"]), s["level"] or "",
                "; ".join(s["tags"]), "; ".join(s["speakers"]), s["duration_min"] or "",
                s["slots"][0]["start"] if s["slots"] else "", "; ".join(s["recorded"]),
                s["video"], s["slides"], s["transcript"], s["url"],
            ])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--from-file", type=Path, help="use a saved raw API response instead of fetching")
    ap.add_argument("--probe", action="store_true",
                    help="look for sessions the list API omits (prints codes to add to catalog/extra-sessions.txt)")
    args = ap.parse_args()

    raw = json.loads(args.from_file.read_text()) if args.from_file else fetch(API_URL)
    if not isinstance(raw, list) or len(raw) < MIN_EXPECTED:
        raise SystemExit(f"unexpected catalog payload ({type(raw).__name__}, {len(raw) if isinstance(raw, list) else '-'} records)")
    if args.probe:
        probe(raw)
        return
    newly = set(supplement(raw))
    for r in raw:
        if r.get("sessionCode") in newly:
            r["_supplemented"] = True
    added = sorted({r["sessionCode"] for r in raw if r.get("_supplemented")})

    # Raw payload (incl. Microsoft's long-form session summaries) stays local; see fetch_sources.py.
    CACHE_DIR.mkdir(exist_ok=True)
    RAW_CACHE.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")

    sessions = normalize(raw)
    for s in sessions:
        s["online"] = is_watchable(s)
    body = json.dumps(sessions, ensure_ascii=False, indent=1) + "\n"
    digest = hashlib.sha256(body.encode()).hexdigest()

    CATALOG_DIR.mkdir(exist_ok=True)
    write_csv(sessions, CATALOG_DIR / "sessions.csv")
    old_meta = json.loads(META_JSON.read_text()) if META_JSON.exists() else {}
    if old_meta.get("sha256") == digest:
        print(f"catalog unchanged ({len(sessions)} sessions)")
        return

    SESSIONS_JSON.write_text(body, encoding="utf-8")
    meta = {
        "event": "Microsoft Ignite 2026",
        "source": API_URL,
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "raw_instances": len(raw),
        "sessions": len(sessions),
        "online_sessions": sum(1 for s in sessions if s["online"]),
        "supplemented": added,
        "with_video": sum(1 for s in sessions if s["video"]),
        "with_slides": sum(1 for s in sessions if s["slides"]),
        "with_transcript": sum(1 for s in sessions if s["transcript"]),
        "sha256": digest,
    }
    META_JSON.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    online = sum(1 for s in sessions if s["online"])
    print(f"wrote {len(sessions)} sessions ({online} online-accessible, {len(raw)} raw instances)")


if __name__ == "__main__":
    main()
