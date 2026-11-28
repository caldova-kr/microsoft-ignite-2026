#!/usr/bin/env python3
"""Read an official session deck (.pptx) without PowerPoint: slide order, text, notes and embedded media.

A .pptx is a ZIP of XML parts. Slide numbers here follow the presentation order (what PowerPoint shows),
not the slideN.xml file names.
"""
from __future__ import annotations

import html
import posixpath
import re
import zipfile
from pathlib import Path

PRES = "ppt/presentation.xml"
REL = re.compile(r"<Relationship\b[^>]*>")
ATTR = re.compile(r'(\w+)="([^"]*)"')
PARA = re.compile(r"<a:p\b.*?</a:p>", re.S)
RUN = re.compile(r"<a:t\b[^>]*>(.*?)</a:t>", re.S)
SHAPE = re.compile(r"<p:sp\b.*?</p:sp>", re.S)
TITLE = re.compile(r'<p:ph\b[^>]*\btype="(?:title|ctrTitle)"')
VIDEO_EXT = (".mp4", ".m4v", ".mov", ".wmv", ".avi")


def rels(zf: zipfile.ZipFile, part: str) -> list[dict[str, str]]:
    """Relationships of a part, with Target resolved to a package path (external links kept as-is)."""
    name = f"{posixpath.dirname(part)}/_rels/{posixpath.basename(part)}.rels"
    if name not in zf.namelist():
        return []
    out = []
    for tag in REL.findall(zf.read(name).decode("utf-8")):
        rel = {k: html.unescape(v) for k, v in ATTR.findall(tag)}
        target = rel.get("Target", "")
        external = rel.get("TargetMode") == "External"
        if not external:
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath(
                posixpath.join(posixpath.dirname(part), target))
        out.append({"id": rel.get("Id", ""), "type": rel.get("Type", "").rsplit("/", 1)[-1], "target": target,
                    "external": external})
    return out


def slide_parts(zf: zipfile.ZipFile) -> list[str]:
    """Slide part names in presentation order."""
    by_id = {r["id"]: r["target"] for r in rels(zf, PRES)}
    listed = re.search(r"<p:sldIdLst>(.*?)</p:sldIdLst>", zf.read(PRES).decode("utf-8"), re.S)
    return [by_id[i] for i in re.findall(r'r:id="([^"]+)"', listed.group(1) if listed else "")]


def paragraphs(xml: str) -> list[str]:
    out = []
    for p in PARA.findall(xml):
        p = re.sub(r"<a:t\b[^>]*/>", "", p)                    # empty run: would swallow XML up to the next </a:t>
        p = re.sub(r"<a:br\b[^>]*/>|<a:br\b.*?</a:br>", "<a:t> </a:t>", p, flags=re.S)  # line break inside a paragraph
        line = " ".join(html.unescape("".join(RUN.findall(p))).split())
        if line:
            out.append(line)
    return out


def slide_title(xml: str) -> str:
    """Text of the title placeholder — the first text on a slide is often a badge or label instead."""
    return next((" ".join(paragraphs(shape)) for shape in SHAPE.findall(xml) if TITLE.search(shape)), "")


def read_slides(path: Path) -> list[dict]:
    slides = []
    with zipfile.ZipFile(path) as zf:
        for number, part in enumerate(slide_parts(zf), 1):
            xml = zf.read(part).decode("utf-8")
            related = rels(zf, part)
            notes = next((r["target"] for r in related if r["type"] == "notesSlide"), None)
            note_lines = paragraphs(zf.read(notes).decode("utf-8")) if notes else []
            slides.append({
                "number": number,
                "part": part,
                "hidden": bool(re.search(r'<p:sld\b[^>]*\bshow="(?:0|false)"', xml)),  # xsd:boolean
                "title": slide_title(xml),
                "text": paragraphs(xml),
                "notes": [line for line in note_lines if not line.isdigit()],  # drop the slide-number placeholder
                "links": sorted({r["target"] for r in related if r["type"] == "hyperlink"}),
                # A video has two relationships (video + media) to one part: keep each once, in file order.
                "videos": list(dict.fromkeys(r["target"] for r in related
                                             if not r["external"] and r["target"].lower().endswith(VIDEO_EXT))),
            })
    return slides


def slides_markdown(path: Path) -> str:
    """Text dump for reading a deck: one block per slide, numbered as in the presentation."""
    blocks = []
    for s in read_slides(path):
        heading = f"## Slide {s['number']}" + (f" — {s['title']}" if s["title"] else "")
        lines = [heading + ("  (hidden)" if s["hidden"] else "")]
        lines += [f"- {line}" for line in s["text"]] or ["- (no text — image or video only)"]
        if s["notes"]:
            lines.append("Notes: " + " / ".join(s["notes"]))
        lines += [f"Link: {link}" for link in s["links"]]
        if s["videos"]:
            lines.append(f"Embedded video: {len(s['videos'])} — capture a frame with tools/capture_slide.py --at SECONDS")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks) + "\n"


def pdf_page(slides: list[dict], number: int) -> int:
    """Page of slide `number` in a PDF export, which leaves hidden slides out."""
    if slides[number - 1]["hidden"]:
        raise ValueError(f"slide {number} is hidden — it is not in the PDF export")
    return sum(1 for s in slides[:number] if not s["hidden"])
