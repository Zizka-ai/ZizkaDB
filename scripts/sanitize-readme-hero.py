#!/usr/bin/env python3
"""Sanitize a dashboard screenshot for public README use.

Blurs only account-level identifiers (agent dropdown + profile badge).
Activity feed, events, reports, and suggestions stay fully visible.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"

# Fractional regions (x0, y0, x1, y1) — keep tight; do not blur Activity feed.
BLUR_REGIONS = [
    (0.66, 0.01, 0.995, 0.095),  # agent dropdown + account badge
]


def _blur_regions(im: Image.Image, *, radius: int = 14) -> Image.Image:
    out = im.copy()
    w, h = out.size
    for fx0, fy0, fx1, fy1 in BLUR_REGIONS:
        box = (int(fx0 * w), int(fy0 * h), int(fx1 * w), int(fy1 * h))
        crop = out.crop(box)
        out.paste(crop.filter(ImageFilter.GaussianBlur(radius=radius)), box)
    return out


def _save_png(im: Image.Image, path: Path, *, width: int) -> None:
    if im.width != width:
        height = int(im.height * (width / im.width))
        im = im.resize((width, height), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True, compress_level=9)


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if src is None or not src.is_file():
        print("Usage: python scripts/sanitize-readme-hero.py <screenshot.png>", file=sys.stderr)
        return 1

    im = Image.open(src).convert("RGB")
    clean = _blur_regions(im)

    _save_png(clean, ASSETS / "hero-dashboard.png", width=1200)
    _save_png(clean, ASSETS / "gallery-dashboard.png", width=640)

    hero_kb = (ASSETS / "hero-dashboard.png").stat().st_size // 1024
    gallery_kb = (ASSETS / "gallery-dashboard.png").stat().st_size // 1024
    print(f"Wrote {ASSETS / 'hero-dashboard.png'} ({hero_kb} KB)")
    print(f"Wrote {ASSETS / 'gallery-dashboard.png'} ({gallery_kb} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
