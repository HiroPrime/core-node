#!/usr/bin/env python3
"""
SUPERSEDED - public/planets/savepoint-memcard.png is now cut from the render by
scripts/cut_node_artifacts.py. Kept for the record; running this would put the
painted stand-in back over the shipped asset.

SAVE POINT - the memory card.

    "<comfy python>" scripts/make_memcard.py

Writes  public/planets/savepoint-memcard.png  (1200x900 RGBA, transparent outside corners)
        logs/gen/pp/memcard_preview.jpg        (viewer copy, flattened on near-black)

A PS1-style save card, lit from the inside - the LED glows magenta through the
shell. The Node select shows it as a physical object, tilted in CSS 3D, so this
is a flat front view exactly like the Dex promo card, and the site supplies the
perspective.

Drawn, not generated: two DreamShaper passes both produced card READERS - the
real thing is too specific an object for a general checkpoint. Hand-painting it
the same way the Dex card is painted keeps the pair looking like one family.

House rules: fonts are the files the site serves, the label carries the house
chrome - pixel type, the save-block grid, Save Point magenta #FF00FF.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(r"C:\Users\jacob\OneDrive\Desktop\NEXUS NODES")
CORE = ROOT / "core-node"
FONT_DIR = ROOT / "save-point" / "identity-studio" / "fonts"

OUT = CORE / "public" / "planets" / "savepoint-memcard.png"
PREVIEW = CORE / "logs" / "gen" / "pp" / "memcard_preview.jpg"

W, H, R = 1200, 900, 64
MAGENTA = (255, 0, 255)
SHELL_TOP = (38, 30, 54)
SHELL_BOTTOM = (13, 10, 22)
PANEL_TOP = (30, 23, 44)
PANEL_BOTTOM = (18, 13, 30)
LABEL_TOP = (252, 252, 254)
LABEL_BOTTOM = (226, 227, 233)
LABEL_INK = (23, 20, 34)
LABEL_MUTE = (108, 110, 126)

PIXEL = FONT_DIR / "press-start-2p" / "PressStart2P-Regular.ttf"


def font(size):
    return ImageFont.truetype(str(PIXEL), size)


def vgrad(size, top, bottom):
    img = Image.new("RGBA", size)
    d = ImageDraw.Draw(img)
    for y in range(size[1]):
        t = y / (size[1] - 1)
        d.line([(0, y), (size[0], y)],
               fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,))
    return img


def star(d, cx, cy, r, fill, waist=0.30):
    pts = [(cx, cy - r), (cx + r * waist, cy - r * waist), (cx + r, cy),
           (cx + r * waist, cy + r * waist), (cx, cy + r),
           (cx - r * waist, cy + r * waist), (cx - r, cy),
           (cx - r * waist, cy - r * waist)]
    d.polygon(pts, fill=fill)


def glow(size, cx, cy, rx, ry, color, alpha, blur):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def build():
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # --- shell: translucent smoked plastic, lit from inside ----
    shell = vgrad((W, H), SHELL_TOP, SHELL_BOTTOM)
    shell.alpha_composite(glow((W, H), W * 0.5, H * 0.98, 540, 300, MAGENTA, 60, 110))
    shell.alpha_composite(glow((W, H), 965, 330, 320, 300, MAGENTA, 48, 90))
    tex = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(tex)
    for x in range(-H, W, 26):
        td.line([(x, 0), (x + H, H)], fill=(255, 255, 255, 7))
    shell = Image.alpha_composite(shell, tex)
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], radius=R, fill=255)
    shell.putalpha(mask)
    card.alpha_composite(shell)

    d = ImageDraw.Draw(card)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=R, outline=(6, 4, 10), width=3)

    # --- inner panel ----
    panel = vgrad((1080, 780), PANEL_TOP, PANEL_BOTTOM)
    pm = Image.new("L", (1080, 780), 0)
    ImageDraw.Draw(pm).rounded_rectangle([0, 0, 1079, 779], radius=40, fill=255)
    panel.putalpha(pm)
    card.alpha_composite(panel, (60, 60))

    # --- smoked window: the LED inside the shell ----
    win = vgrad((270, 560), (16, 11, 28), (8, 6, 16))
    wm = Image.new("L", (270, 560), 0)
    ImageDraw.Draw(wm).rounded_rectangle([0, 0, 269, 559], radius=28, fill=255)
    win.putalpha(wm)
    card.alpha_composite(win, (830, 100))

    traces = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    trd = ImageDraw.Draw(traces)
    for a, b in [((965, 320), (890, 420)), ((965, 320), (1090, 400)),
                 ((965, 320), (965, 560)), ((890, 420), (862, 560))]:
        trd.line([a, b], fill=MAGENTA + (70,), width=3)
    card.alpha_composite(traces.filter(ImageFilter.GaussianBlur(2)))

    card.alpha_composite(glow((W, H), 965, 320, 150, 150, MAGENTA, 110, 60))
    d.ellipse([965 - 11, 320 - 11, 965 + 11, 320 + 11], fill=(255, 255, 255))

    # --- label, with a shadow so it sits ON the shell ----
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([100, 110, 800, 668], radius=28, fill=(0, 0, 0, 130))
    card.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))

    label = vgrad((700, 560), LABEL_TOP, LABEL_BOTTOM)
    lm = Image.new("L", (700, 560), 0)
    ImageDraw.Draw(lm).rounded_rectangle([0, 0, 699, 559], radius=28, fill=255)
    label.putalpha(lm)
    card.alpha_composite(label, (100, 100))

    d.text((450, 178), "SAVE POINT", font=font(42), fill=LABEL_INK, anchor="mm")
    d.text((450, 236), "CHARACTER CONSISTENCY", font=font(14), fill=LABEL_MUTE, anchor="mm")
    d.line([(150, 272), (750, 272)], fill=(186, 188, 200), width=2)

    # The 15 blocks every PS1 kid knows. Five of them are hers.
    filled = {0, 1, 2, 6, 12}
    idx = 0
    for r_ in range(3):
        for c in range(5):
            x0 = 193 + c * 106
            y0 = 298 + r_ * 106
            if idx in filled:
                card.alpha_composite(glow((W, H), x0 + 45, y0 + 45, 80, 80, MAGENTA, 110, 30))
                d.rounded_rectangle([x0, y0, x0 + 90, y0 + 90], radius=16, fill=MAGENTA)
                star(d, x0 + 45, y0 + 45, 22, (255, 255, 255))
            else:
                d.rounded_rectangle([x0, y0, x0 + 90, y0 + 90], radius=16,
                                    fill=(216, 218, 226), outline=(174, 178, 192), width=3)
            idx += 1

    # --- bottom band: the connector edge ----
    d.rounded_rectangle([100, 700, 1100, 812], radius=24, fill=(9, 7, 16))
    d.rounded_rectangle([420, 736, 780, 776], radius=18, fill=(4, 3, 8))
    d.text((150, 758), "1 Mb", font=font(20), fill=MAGENTA, anchor="lm")
    for x, col in [(1000, MAGENTA), (1036, (128, 8, 128)), (1072, (58, 56, 70))]:
        d.ellipse([x - 9, 747, x + 9, 765], fill=col)

    # --- every translucent stroke, one overlay, composited last ----
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    od.rounded_rectangle([3, 3, W - 4, H - 4], radius=R - 2, outline=(255, 255, 255, 40), width=2)
    od.rounded_rectangle([60, 60, 1139, 839], radius=40, outline=(255, 255, 255, 22), width=2)
    od.rounded_rectangle([830, 100, 1099, 659], radius=28, outline=(255, 255, 255, 30), width=2)
    od.rounded_rectangle([100, 100, 799, 659], radius=28, outline=(40, 36, 56, 70), width=2)
    od.rounded_rectangle([100, 700, 1100, 812], radius=24, outline=(255, 255, 255, 26), width=2)
    od.rounded_rectangle([420, 736, 780, 776], radius=18, outline=(255, 255, 255, 26), width=2)
    od.ellipse([965 - 34, 320 - 34, 965 + 34, 320 + 34], outline=MAGENTA + (150,), width=3)
    return Image.alpha_composite(card, ov)


def main():
    card = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    card.save(OUT)
    flat = Image.new("RGBA", card.size, (8, 6, 10, 255))
    flat.alpha_composite(card)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    flat.convert("RGB").save(PREVIEW, quality=88)
    print("memcard", OUT, card.size, "alpha bbox:", card.getchannel("A").getbbox())
    print("preview", PREVIEW)


if __name__ == "__main__":
    main()