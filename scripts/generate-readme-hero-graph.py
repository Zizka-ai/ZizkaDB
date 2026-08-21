#!/usr/bin/env python3
"""Generate README hero — causal audit graph (Graphify-style, not fake terminal)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets" / "readme-hero-causal-graph.png"

W, H = 1280, 720
BG = (8, 8, 12)
GRID = (22, 22, 30)
BRAND = (249, 115, 22)
BRAND_GLOW = (249, 115, 22, 80)
TEXT = (245, 245, 250)
MUTED = (161, 161, 170)
NODE_FILL = (18, 18, 24)
NODE_BORDER = (249, 115, 22)
EDGE = (249, 115, 22)
EDGE_DIM = (60, 55, 50)

FONT_PATHS = [
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
MONO = [
    "/System/Library/Fonts/Menlo.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
]


def load_font(size: int, mono: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    paths = MONO if mono else FONT_PATHS
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_grid(draw: ImageDraw.ImageDraw) -> None:
    for x in range(0, W, 40):
        draw.line((x, 0, x, H), fill=GRID, width=1)
    for y in range(0, H, 40):
        draw.line((0, y, W, y), fill=GRID, width=1)


def arrow(draw: ImageDraw.ImageDraw, x0: int, y0: int, x1: int, y1: int, color: tuple, width: int = 3) -> None:
    draw.line((x0, y0, x1, y1), fill=color, width=width)
    # arrowhead
    import math

    angle = math.atan2(y1 - y0, x1 - x0)
    for da in (2.6, -2.6):
        ax = x1 - 14 * math.cos(angle + da)
        ay = y1 - 14 * math.sin(angle + da)
        draw.line((x1, y1, ax, ay), fill=color, width=width)


def node(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    title: str,
    subtitle: str,
    accent: tuple = NODE_BORDER,
    highlight: bool = False,
) -> None:
    x0, y0, x1, y1 = xy
    pad = 6 if highlight else 0
    if highlight:
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.rounded_rectangle((x0 - pad, y0 - pad, x1 + pad, y1 + pad), radius=18, fill=(249, 115, 22, 45))
        # paste glow handled by caller
    draw.rounded_rectangle((x0, y0, x1, y1), radius=14, fill=NODE_FILL, outline=accent, width=3 if highlight else 2)
    draw.text((x0 + 20, y0 + 16), title, fill=TEXT, font=load_font(20, True))
    draw.text((x0 + 20, y0 + 48), subtitle, fill=MUTED, font=load_font(13, mono=True))


def main() -> None:
    base = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(base)
    draw_grid(draw)

    # Header strip
    draw.rounded_rectangle((32, 28, 320, 72), radius=10, fill=(20, 20, 26))
    draw.text((48, 40), "ZizkaDB · session audit", fill=MUTED, font=load_font(14))
    draw.text((900, 38), "db.why(event_id)", fill=BRAND, font=load_font(16, mono=True))
    draw.text((900, 62), "walk backward → root cause", fill=MUTED, font=load_font(12))

    # Nodes (left → right causal flow, why walks backward)
    nodes = [
        (80, 280, 340, 380, "user_message", "Why was my order delayed?", False),
        (420, 220, 680, 320, "llm_response", "gpt-4o · 412 tokens", False),
        (760, 160, 1020, 260, "tool_call", "lookup_order · ORD-8842", True),
    ]

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    hx0, hy0, hx1, hy1 = nodes[2][:4]
    gd.rounded_rectangle((hx0 - 8, hy0 - 8, hx1 + 8, hy1 + 8), radius=20, fill=(249, 115, 22, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=12))
    base = base.convert("RGBA")
    base = Image.alpha_composite(base, glow)
    draw = ImageDraw.Draw(base)

    arrow(draw, 340, 330, 420, 270, EDGE, 4)
    arrow(draw, 680, 240, 760, 210, EDGE, 4)

    # why() backward path (dashed feel — lighter reverse arrows)
    arrow(draw, 760, 280, 680, 340, EDGE_DIM, 2)
    arrow(draw, 680, 350, 420, 390, EDGE_DIM, 2)
    arrow(draw, 420, 400, 340, 400, EDGE_DIM, 2)

    for x0, y0, x1, y1, title, sub, hi in nodes:
        node(draw, (x0, y0, x1, y1), title, sub, highlight=hi)

    draw.text((780, 290), "← audit here", fill=BRAND, font=load_font(14, True))

    # Legend
    draw.rounded_rectangle((80, 520, 560, 640), radius=12, fill=(14, 14, 18), outline=(40, 40, 48))
    draw.text((100, 538), "Replay any production session", fill=TEXT, font=load_font(18, True))
    draw.text(
        (100, 572),
        "Linked events · drift baselines · dashboard replay",
        fill=MUTED,
        font=load_font(14),
    )
    draw.rounded_rectangle((100, 602, 260, 628), radius=6, fill=BRAND)
    draw.text((118, 606), "Try free → curl quickstart", fill=(255, 255, 255), font=load_font(13, True))

    # Mini terminal strip (real output, not full fake window)
    draw.rounded_rectangle((600, 520, 1200, 640), radius=12, fill=(16, 16, 22), outline=(40, 40, 48))
    term = load_font(13, mono=True)
    lines = [
        "$ zizkadb demo",
        "tool_call · lookup_order · ORD-8842",
        "  └── llm_response · gpt-4o",
        "        └── user_message · Why was my order delayed?",
    ]
    ty = 542
    for i, line in enumerate(lines):
        c = (166, 227, 161) if line.startswith("$") else BRAND if "tool_call" in line else TEXT
        draw.text((620, ty), line, fill=c, font=term)
        ty += 24

    OUT.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(OUT, quality=94, optimize=True)
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
