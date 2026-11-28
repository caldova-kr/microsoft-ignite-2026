#!/usr/bin/env python3
"""Export one slide of a session's official deck into the note's image folder.

    python tools/capture_slide.py BRK256 11 new-video-models
    python tools/capture_slide.py BRK256 30 one-car-three-models --at 11.2   # frame of the slide's embedded video
    python tools/capture_slide.py BRK256 11 new-video-models --pptx ~/Downloads/BRK256.pptx
    python tools/capture_slide.py BRK256 19 portal-deploy --at 4 --crop 1500:800:50:60   # cut IDs/emails out

Reads .cache/sources/<CODE>/slides.pptx (python tools/fetch_sources.py <CODE>), writes
docs/sessions/<CODE>-<slug>/<name>.jpg and prints a <figure> snippet with the required caption.
Slides are sharper than video frames, so prefer this when the deck is published.

Rendering needs PowerPoint (Windows) or LibreOffice + pdftoppm; --at and --crop need ffmpeg. Check the image
for tenant/subscription IDs, emails or tokens before committing — use --crop (w:h:x:y in output pixels).
"""
from __future__ import annotations

import argparse
import base64
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_lib import CACHE_DIR, NOTES_DIR, catalog_index, note_code, note_files  # noqa: E402
from capture_frame import NAME  # noqa: E402
from slides_lib import pdf_page, read_slides  # noqa: E402

# Exit code 3 = PowerPoint is not installed, so the caller can fall back to LibreOffice.
POWERPOINT = r"""
$ErrorActionPreference = 'Stop'
# PowerPoint is single-instance: New-Object attaches to one the user already has open, so only quit our own.
$wasRunning = [bool](Get-Process -Name POWERPNT -ErrorAction SilentlyContinue)
try { $app = New-Object -ComObject PowerPoint.Application } catch { exit 3 }
$src = $env:SLIDE_PPTX
$tmp = $null
$deck = $null
try {
  if (Get-Item -LiteralPath $src -Stream Zone.Identifier -ErrorAction SilentlyContinue) {
    # Downloaded files open in Protected View, where export fails — work on an unblocked copy.
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("capture-slide-" + [guid]::NewGuid() + ".pptx")
    Copy-Item -LiteralPath $src -Destination $tmp
    Unblock-File -LiteralPath $tmp
    $src = $tmp
  }
  $deck = $app.Presentations.Open($src, $true, $false, $false)
  $width = [int]$env:SLIDE_WIDTH
  $height = [int][math]::Round($width * $deck.PageSetup.SlideHeight / $deck.PageSetup.SlideWidth)
  $deck.Slides.Item([int]$env:SLIDE_NUMBER).Export($env:SLIDE_OUT, 'JPG', $width, $height)
} finally {
  if ($deck) { $deck.Close() }
  if (-not $wasRunning) { $app.Quit() }
  if ($tmp) { Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue }
}
"""
SOFFICE_PATHS = (
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
)


def with_powerpoint(pptx: Path, number: int, out: Path, width: int) -> bool:
    shell = shutil.which("pwsh") or shutil.which("powershell")
    if os.name != "nt" or not shell:
        return False
    env = {**os.environ, "SLIDE_PPTX": str(pptx), "SLIDE_NUMBER": str(number), "SLIDE_OUT": str(out),
           "SLIDE_WIDTH": str(width)}
    script = base64.b64encode(POWERPOINT.encode("utf-16-le")).decode("ascii")
    done = subprocess.run([shell, "-NoProfile", "-NonInteractive", "-EncodedCommand", script], env=env)
    if done.returncode == 3:
        return False
    if done.returncode or not out.exists():
        raise SystemExit("PowerPoint could not export the slide")
    return True


def with_libreoffice(pptx: Path, page: int, out: Path, width: int, pdf_dir: Path) -> bool:
    soffice = shutil.which("soffice") or next((p for p in SOFFICE_PATHS if Path(p).exists()), None)
    if not soffice or not shutil.which("pdftoppm"):
        return False
    pdf = pdf_dir / f"{pptx.stem}.pdf"
    if not pdf.exists() or pdf.stat().st_mtime < pptx.stat().st_mtime:  # converting a large deck is slow — keep it
        subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", str(pdf_dir), str(pptx)],
                       check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["pdftoppm", "-jpeg", "-singlefile", "-f", str(page), "-l", str(page),
                    "-scale-to-x", str(width), "-scale-to-y", "-1", str(pdf), str(out.with_suffix(""))], check=True)
    return out.exists()


def need_ffmpeg(option: str) -> None:
    if not shutil.which("ffmpeg"):
        raise SystemExit(f"ffmpeg is required for {option} (brew install ffmpeg / apt-get install ffmpeg)")


def pick_video(videos: list[str], index: int | None, slide: int) -> str:
    """The embedded video to capture; a slide with several needs an explicit --video."""
    if not videos:
        raise SystemExit(f"slide {slide} has no embedded video")
    if index is None:
        if len(videos) > 1:
            names = ", ".join(f"{i}={Path(v).name}" for i, v in enumerate(videos, 1))
            raise SystemExit(f"slide {slide} has {len(videos)} embedded videos — choose one with --video ({names})")
        index = 1
    if not 1 <= index <= len(videos):
        raise SystemExit(f"--video must be 1..{len(videos)}")
    return videos[index - 1]


def video_frame(pptx: Path, video: str, seconds: float, out: Path, width: int) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        clip = Path(tmp) / Path(video).name
        with zipfile.ZipFile(pptx) as zf:
            clip.write_bytes(zf.read(video))
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{seconds:.2f}", "-i", str(clip),
                        "-frames:v", "1", "-vf", f"scale='min({width},iw)':-2", "-q:v", "3", str(out)], check=True)


def crop(full: Path, box: str, out: Path) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(full), "-vf", f"crop={box}",
                    "-q:v", "3", str(out)], check=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("code")
    ap.add_argument("slide", type=int, help="slide number as shown in PowerPoint (see .cache/sources/<CODE>/slides.md)")
    ap.add_argument("name", help="kebab-case file name without extension, e.g. agent-architecture")
    ap.add_argument("--at", type=float, metavar="SECONDS", help="capture this moment of the slide's embedded video")
    ap.add_argument("--video", type=int, metavar="N", help="which embedded video to use with --at when the slide has several")
    ap.add_argument("--crop", help="w:h:x:y applied to the exported image (to remove IDs/emails or zoom in)")
    ap.add_argument("--pptx", type=Path, help="deck to read instead of .cache/sources/<CODE>/slides.pptx")
    ap.add_argument("--width", type=int, default=1600, help="output width (default 1600)")
    args = ap.parse_args()

    if not NAME.fullmatch(args.name):
        raise SystemExit(f"name must be lowercase kebab-case: {args.name}")
    if args.crop:
        need_ffmpeg("--crop")
    if args.at is not None:
        need_ffmpeg("--at")
    catalog = catalog_index()
    s = catalog.get(args.code)
    if not s:
        raise SystemExit(f"{args.code} is not in catalog/sessions.json")
    notes = [p for p in note_files() if note_code(p, catalog) == s["code"]]
    if not notes:
        raise SystemExit(f"create the note first: python tools/new_session.py {s['code']}")
    cache = CACHE_DIR / "sources" / s["code"]
    pptx = (args.pptx or cache / "slides.pptx").expanduser().resolve()
    if not pptx.exists():
        raise SystemExit(f"deck not found: {pptx} — run python tools/fetch_sources.py {s['code']} or pass --pptx")
    slides = read_slides(pptx)
    if not 1 <= args.slide <= len(slides):
        raise SystemExit(f"slide must be 1..{len(slides)}")
    slide = slides[args.slide - 1]

    folder = NOTES_DIR / notes[0].stem
    folder.mkdir(exist_ok=True)
    out = (folder / f"{args.name}.jpg").resolve()
    with tempfile.TemporaryDirectory() as tmp:
        # With --crop the full image stays in the temp folder, so a failed crop leaves nothing in the note folder.
        full = Path(tmp) / out.name if args.crop else out
        if args.at is not None:
            video_frame(pptx, pick_video(slide["videos"], args.video, args.slide), args.at, full, args.width)
        elif not with_powerpoint(pptx, args.slide, full, args.width):
            try:
                page = pdf_page(slides, args.slide)
            except ValueError as exc:
                raise SystemExit(f"{exc}; export it with PowerPoint") from exc
            # A deck passed with --pptx is converted fresh in the temp folder, never beside the deck.
            if not with_libreoffice(pptx, page, full, args.width, Path(tmp) if args.pptx else cache):
                raise SystemExit("rendering needs PowerPoint (Windows) or LibreOffice + pdftoppm on PATH")
        if args.crop:
            crop(full, args.crop, out)

    title = slide["title"] or "<슬라이드 제목>"
    where = f"슬라이드 #{args.slide}" + (f" (삽입 영상 {args.at:g}초)" if args.at is not None else "")
    rel = f"{notes[0].stem}/{out.name}"
    print(f"wrote {out.relative_to(NOTES_DIR.parent.parent)} ({out.stat().st_size // 1024} KB) — check it for IDs/emails before committing\n")
    print(f'<figure markdown="span">\n  ![<무엇을 보여 주는지>]({rel})\n'
          f"  <figcaption>{where} — {title}</figcaption>\n</figure>")


if __name__ == "__main__":
    main()
