#!/usr/bin/env python3
"""
SUPERSEDED - public/planets/prime-portal-card.png is now cut from the photo of
the printed card by scripts/cut_node_artifacts.py. Kept for the record; running
this would put the painted stand-in back over the shipped asset.

PRIME PORTAL - the Dex promo card.

    "<comfy python>" scripts/make_dex_card.py

Reads   prime-portal-nexus/marketing/dex/masters/cutouts/dex.png  (Dex on his grey plate)
Writes  public/planets/prime-portal-card.png   (1000x1400 RGBA, transparent outside corners)
        logs/gen/pp/dexcard_preview.jpg         (viewer copy, flattened on near-black)

Why painted and not prompted: the Node select shows this card as a physical object.
Dex is locked (the turnaround kit in prime-portal-nexus/marketing/dex) and the chrome
is the house chrome - navy face, circuit grid, Prime Portal teal #2ee6d6, Press Start
2P labels. A prompt would re-roll both. So: paint the frame here, key Dex off his
plate with the same flood fill the house uses (savepoint-nexus lib/keying.ts recipe),
composite him into the window.

House rules: copy comes from content/lore.md, fonts are the files the site serves.
"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(r"C:\Users\jacob\OneDrive\Desktop\NEXUS NODES")
CORE = ROOT / "core-node"
FONT_DIR = ROOT / "save-point" / "identity-studio" / "fonts"

DEX_PLATE = ROOT / "prime-portal-nexus" / "marketing" / "dex" / "masters" / "cutouts" / "dex.png"
OUT = CORE / "public" / "planets" / "prime-portal-card.png"
PREVIEW = CORE / "logs" / "gen" / "pp" / "dexcard_preview.jpg"

W, H, R = 1000, 1400, 54              # 2.5 x 3.5
ACCENT = (46, 230, 214)               # Prime Portal #2ee6d6
FACE_TOP = (14, 19, 40)
FACE_BOTTOM = (7, 9, 19)
INK = (255, 255, 255, 255)
MUTE = (150, 172, 205, 230)
FLAVOR = (206, 217, 238, 255)
WINDOW = (56, 300, W - 56, 862)       # the art window

PIXEL = FONT_DIR / "press-start-2p" / "PressStart2P-Regular.ttf"
OUT_BLACK = FONT_DIR / "outfit" / "Outfit-Black.ttf"
OUT_BOLD = FONT_DIR / "outfit" / "Outfit-Bold.ttf"
NUNITO = FONT_DIR / "nunito-sans" / "NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf"


def key_out(img, tol=46, fringe_passes=2):
    """Flood fill the plate, border inward. Same recipe as the house keyer.

    A global colour key punches holes through anything on the character that
    matches the backdrop; a flood fill only removes backdrop CONNECTED to the
    border. Tolerance and fringe passes mirror savepoint-nexus lib/keying.ts.
    """
    im = img.convert("RGB")
    w, h = im.size
    px = im.load()

    rsum = gsum = bsum = n = 0
    for x in range(w):
        for y in (0, h - 1):
            p = px[x, y]
            rsum += p[0]; gsum += p[1]; bsum += p[2]; n += 1
    for y in range(h):
        for x in (0, w - 1):
            p = px[x, y]
            rsum += p[0]; gsum += p[1]; bsum += p[2]; n += 1
    br, bg, bb = rsum / n, gsum / n, bsum / n

    def near(p, k):
        return abs(p[0] - br) <= k and abs(p[1] - bg) <= k and abs(p[2] - bb) <= k

    filled = bytearray(w * h)
    q = deque()

    def consider(x, y):
        i = y * w + x
        if filled[i]:
            return
        if near(px[x, y], tol):
            filled[i] = 1
            q.append((x, y))

    for x in range(w):
        consider(x, 0)
        consider(x, h - 1)
    for y in range(h):
        consider(0, y)
        consider(w - 1, y)
    while q:
        x, y = q.popleft()
        if x > 0: consider(x - 1, y)
        if x < w - 1: consider(x + 1, y)
        if y > 0: consider(x, y - 1)
        if y < h - 1: consider(x, y + 1)

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            p = px[x, y]
            op[x, y] = (p[0], p[1], p[2], 0) if filled[row + x] else (p[0], p[1], p[2], 255)

    ftol = tol * 1.7
    for _ in range(fringe_passes):
        doomed = []
        for y in range(h):
            row = y * w
            for x in range(w):
                i = row + x
                if op[x, y][3] == 0:
                    continue
                touches = (
                    (x > 0 and filled[i - 1]) or (x < w - 1 and filled[i + 1])
                    or (y > 0 and filled[i - w]) or (y < h - 1 and filled[i + w])
                )
                if touches and near(px[x, y], ftol):
                    doomed.append((x, y))
        if not doomed:
            break
        for x, y in doomed:
            r, g, b, _ = op[x, y]
            op[x, y] = (r, g, b, 0)
            filled[y * w + x] = 1
    return out


def font(path, size):
    return ImageFont.truetype(str(path), size)


def star(d, cx, cy, r, fill, waist=0.30):
    """Four point sparkle - the diamond twinkle Dex's scenes carry."""
    pts = [(cx, cy - r), (cx + r * waist, cy - r * waist), (cx + r, cy),
           (cx + r * waist, cy + r * waist), (cx, cy + r),
           (cx - r * waist, cy + r * waist), (cx - r, cy),
           (cx - r * waist, cy - r * waist)]
    d.polygon(pts, fill=fill)


def draw_window(card):
    """The art window - dark glass, circuit grid, glow, Dex, sparkles."""
    wx0, wy0, wx1, wy1 = WINDOW
    ww, wh = wx1 - wx0, wy1 - wy0

    win = Image.new("RGBA", (ww, wh), (8, 12, 27, 255))
    gd = ImageDraw.Draw(win)
    for x in range(0, ww, 44):
        gd.line([(x, 0), (x, wh)], fill=ACCENT + (13,))
    for y in range(0, wh, 44):
        gd.line([(0, y), (ww, y)], fill=ACCENT + (13,))

    glow = Image.new("RGBA", (ww, wh), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [ww * 0.5 - 270, wh * 0.28, ww * 0.5 + 270, wh * 1.08], fill=ACCENT + (58,))
    win = Image.alpha_composite(win, glow.filter(ImageFilter.GaussianBlur(70)))

    dex = key_out(Image.open(DEX_PLATE))
    dex = dex.crop(dex.getbbox())
    th = 470
    dex = dex.resize((round(dex.width * th / dex.height), th), Image.LANCZOS)
    dx = (ww - dex.width) // 2
    dy = wh - 26 - dex.height

    sh = Image.new("RGBA", (ww, wh), (0, 0, 0, 0))
    sh.paste(Image.new("RGBA", dex.size, (2, 6, 16, 255)), (dx, dy + 16), dex)
    win.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    win.alpha_composite(dex, (dx, dy))

    sp = ImageDraw.Draw(win)
    for fx, fy, r, col in [
        (0.30, 0.32, 21, INK), (0.72, 0.26, 15, ACCENT + (235,)),
        (0.80, 0.50, 11, INK[:3] + (205,)), (0.21, 0.60, 12, ACCENT + (215,)),
        (0.62, 0.16, 9, ACCENT + (190,)), (0.87, 0.70, 8, INK[:3] + (165,)),
        (0.13, 0.22, 7, ACCENT + (170,)),
    ]:
        star(sp, ww * fx, wh * fy, r, col)
    for fx, fy, r in [(0.38, 0.20, 3), (0.50, 0.60, 3), (0.90, 0.38, 2), (0.09, 0.46, 2)]:
        sp.ellipse([ww * fx - r, wh * fy - r, ww * fx + r, wh * fy + r], fill=INK[:3] + (160,))

    mask = Image.new("L", (ww, wh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, ww - 1, wh - 1], radius=26, fill=255)
    win.putalpha(mask)
    card.alpha_composite(win, (wx0, wy0))


def build():
    # Face: vertical gradient + the Grid's circuit lines, rounded corners.
    face = Image.new("RGBA", (W, H))
    fd = ImageDraw.Draw(face)
    for y in range(H):
        t = y / (H - 1)
        fd.line([(0, y), (W, y)],
                fill=tuple(round(FACE_TOP[i] + (FACE_BOTTOM[i] - FACE_TOP[i]) * t) for i in range(3)) + (255,))
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W, 50):
        gd.line([(x, 0), (x, H)], fill=ACCENT + (12,))
    for y in range(0, H, 50):
        gd.line([(0, y), (W, y)], fill=ACCENT + (12,))
    face = Image.alpha_composite(face, grid)
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], radius=R, fill=255)
    face.putalpha(mask)
    card = face

    draw_window(card)

    # Chrome: borders, strip, name row, flavor, columns, footer.
    ch = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ch)

    d.rounded_rectangle([2, 2, W - 3, H - 3], radius=R, outline=ACCENT + (195,), width=3)
    d.rounded_rectangle([18, 18, W - 19, H - 19], radius=R - 14, outline=(255, 255, 255, 26), width=1)
    d.rounded_rectangle(WINDOW, radius=26, outline=ACCENT + (80,), width=2)

    d.text((58, 63), "PRIME PORTAL", font=font(PIXEL, 19), fill=ACCENT + (255,), anchor="lm")
    pw, ph = 158, 46
    px1, py0 = W - 56, 40
    d.rounded_rectangle([px1 - pw, py0, px1, py0 + ph], radius=15,
                        fill=ACCENT + (36,), outline=ACCENT + (150,), width=2)
    d.text(((px1 - pw + px1) // 2, py0 + ph // 2 + 1), "PROMO",
           font=font(PIXEL, 17), fill=INK, anchor="mm")

    d.text((58, 192), "Dex", font=font(OUT_BLACK, 100), fill=INK, anchor="lm")
    nw = d.textlength("Dex", font=font(OUT_BLACK, 100))
    d.text((58 + nw + 20, 208), "the portal ghost", font=font(NUNITO, 40), fill=MUTE, anchor="lm")
    d.text((58, 262), "MASCOT / GHOST", font=font(PIXEL, 17), fill=MUTE, anchor="lm")

    d.text((W / 2, 918), "\u201cA deck that reads itself.\u201d",
           font=font(NUNITO, 38), fill=FLAVOR, anchor="mm")

    d.text((250, 1008), "ARTIST", font=font(PIXEL, 13), fill=MUTE, anchor="mm")
    d.text((250, 1048), "BasicHiro", font=font(OUT_BOLD, 30), fill=INK, anchor="mm")
    d.line([(500, 986), (500, 1066)], fill=(120, 150, 190, 60), width=1)
    d.text((750, 1008), "RARITY", font=font(PIXEL, 13), fill=MUTE, anchor="mm")
    d.text((750, 1048), "Promo", font=font(OUT_BOLD, 30), fill=INK, anchor="mm")

    d.line([(150, 1150), (W - 150, 1150)], fill=(120, 150, 190, 50), width=1)
    d.text((W / 2, 1196), "TCG SEARCH AND DATA CLUB",
           font=font(PIXEL, 14), fill=MUTE, anchor="mm")

    d.text((58, 1306), "NX-001", font=font(PIXEL, 18), fill=MUTE, anchor="lm")
    bw, bh = 104, 54
    bx1, by0 = W - 58, 1279
    d.rounded_rectangle([bx1 - bw, by0, bx1, by0 + bh], radius=15,
                        fill=ACCENT + (32,), outline=ACCENT + (145,), width=2)
    d.text(((bx1 - bw + bx1) // 2, by0 + bh // 2 + 1), "060",
           font=font(PIXEL, 21), fill=INK, anchor="mm")

    return Image.alpha_composite(card, ch)


def main():
    card = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    card.save(OUT)
    flat = Image.new("RGBA", card.size, (8, 6, 10, 255))
    flat.alpha_composite(card)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    flat.convert("RGB").save(PREVIEW, quality=88)
    print("card   ", OUT, card.size)
    print("preview", PREVIEW)


if __name__ == "__main__":
    main()
