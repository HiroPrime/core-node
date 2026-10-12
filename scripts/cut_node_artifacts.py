#!/usr/bin/env python3
"""
CORE NODE - the /select artifacts, cut from the real photographs.

    "<comfy python>" scripts/cut_node_artifacts.py

Reads   logs/src/nodes/dexcard-primeportal.jpg      photo of the printed promo
        logs/src/nodes/memorycard-savepoint.jpg     Save Point memory card render
Writes  public/planets/prime-portal-card.png        RGBA cutout, ~705 x 940
        public/planets/savepoint-memcard.png        RGBA cutout, ~620 x 940
        logs/gen/nodes/card_cut.jpg                 viewer copies
        logs/gen/nodes/memory_cut.jpg               (display size + shipped corners)

The cut is the house recipe - scripts/make_dex_card.py key_out(), itself the
savepoint-nexus lib/keying.ts flood: the backdrop keys from the border INWARD,
so only backdrop CONNECTED to the frame comes off and nothing on the object is
ever punched through. Photography needs two steps the flat masters never did:

  1. shadow pass - after the fill, light neutral pixels touching the keyed
     region are keyed too. The baked studio shadow comes off here, not to the
     site: the stage draws its own ground shadow, and a grey cloud on the dark
     backdrop would read as a halo.
  2. deskew - the print sat about a degree off under the camera, and the stage
     adds its own 3D tilt on top, so the slant is measured off the card's top
     edge and rotated out here. The memory card keeps its pose - it is a
     render, the angle is the art.

Sources live in logs/ (git-ignored) so the 14 MB of camera files never ship
with the site. The cutout PNGs are what gets committed.
"""

import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(r"C:\Users\jacob\OneDrive\Desktop\NEXUS NODES")
CORE = ROOT / "core-node"

CARD_SRC = CORE / "logs" / "src" / "nodes" / "dexcard-primeportal.jpg"
CARD_OUT = CORE / "public" / "planets" / "prime-portal-card.png"
MEM_SRC = CORE / "logs" / "src" / "nodes" / "memorycard-savepoint.jpg"
MEM_OUT = CORE / "public" / "planets" / "savepoint-memcard.png"
PREVIEW_DIR = CORE / "logs" / "gen" / "nodes"

STAGE = (8, 6, 10, 255)          # the select screen's dark, for the previews

def border_mean(raw, w, h):
    """Mean colour of the 1 px frame - the backdrop reading the fill keys to."""
    r = g = b = n = 0
    for x in range(w):
        for y in (0, h - 1):
            o = (y * w + x) * 3
            r += raw[o]; g += raw[o + 1]; b += raw[o + 2]; n += 1
    for y in range(h):
        for x in (0, w - 1):
            o = (y * w + x) * 3
            r += raw[o]; g += raw[o + 1]; b += raw[o + 2]; n += 1
    return r / n, g / n, b / n


def key_photo(path, tol=20, sat_max=30, lum_floor=165, fringe_passes=3,
              fringe_gain=1.7, absorb_y_min=0, light_floor=222, light_sat=40,
              island_max=6000, island_sat=80, island_lum=130, trace=None):
    """Backdrop out of a photograph. House flood, plus the shadow absorb.

    flood    border seeds, per-channel tolerance against the border mean,
             only backdrop CONNECTED to the frame comes off (house recipe).
    shadow   expansion through light neutral pixels (sat <= sat_max, mean lum
             >= lum_floor) touching the keyed region - a studio shadow is a
             soft grey gradient, so the ramp ends where the object starts.
    fringe   the 1-2 px blend ring: keyed pixels' neighbours within tol * 1.7
             of the backdrop come off too (house key_out recipe).
    """
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    w, h = im.size
    raw = im.tobytes()
    n = w * h
    mr, mg, mb = border_mean(raw, w, h)

    def near(i, k):
        o = i * 3
        return (abs(raw[o] - mr) <= k and abs(raw[o + 1] - mg) <= k
                and abs(raw[o + 2] - mb) <= k)

    def soft(i):
        o = i * 3
        r, g, b = raw[o], raw[o + 1], raw[o + 2]
        return max(r, g, b) - min(r, g, b) <= sat_max and r + g + b >= 3 * lum_floor

    def neighbours(i):
        x = i % w
        return (i - 1 if x else -1,
                i + 1 if x < w - 1 else -1,
                i - w if i >= w else -1,
                i + w if i < n - w else -1)

    filled = bytearray(n)
    q = deque()

    def consider(i):
        if not filled[i] and near(i, tol):
            filled[i] = 1
            q.append(i)

    for x in range(w):
        consider(x); consider((h - 1) * w + x)
    for y in range(h):
        consider(y * w); consider(y * w + w - 1)
    while q:
        for j in neighbours(q.popleft()):
            if j >= 0:
                consider(j)

    # Shadow: keep expanding through light neutral pixels touching the fill.
    absorb = deque()
    absorbed_mask = bytearray(n)
    fringe_mask = bytearray(n)
    for i in range(n):
        if filled[i] or i < absorb_y_min * w or not soft(i):
            continue
        if any(filled[j] for j in neighbours(i) if j >= 0):
            filled[i] = 1
            absorbed_mask[i] = 1
            absorb.append(i)
    while absorb:
        for j in neighbours(absorb.popleft()):
            if j >= absorb_y_min * w and not filled[j] and soft(j):
                filled[j] = 1
                absorbed_mask[j] = 1
                absorb.append(j)

    # Light expansion: very light neutral pixels still touching the keyed
    # region - floor grain and pale shadow in the contact zone. Cannot touch
    # the object: its light edges sit below light_floor, interiors are
    # unreachable.
    def very_light(i):
        o = i * 3
        r, g, b = raw[o], raw[o + 1], raw[o + 2]
        return max(r, g, b) - min(r, g, b) <= light_sat and r + g + b >= 3 * light_floor

    light = deque()
    for i in range(n):
        if filled[i] or i < absorb_y_min * w or not very_light(i):
            continue
        if any(filled[j] for j in neighbours(i) if j >= 0):
            filled[i] = 1
            absorbed_mask[i] = 1
            light.append(i)
    while light:
        for j in neighbours(light.popleft()):
            if j >= absorb_y_min * w and not filled[j] and very_light(j):
                filled[j] = 1
                absorbed_mask[j] = 1
                light.append(j)

    # Fringe: the blend ring left along the silhouette.
    ftol = tol * fringe_gain
    for _ in range(fringe_passes):
        doomed = [i for i in range(n)
                  if not filled[i] and near(i, ftol)
                  and any(filled[j] for j in neighbours(i) if j >= 0)]
        if not doomed:
            break
        for i in doomed:
            filled[i] = 1
            fringe_mask[i] = 1

    # Islands: small opaque flecks that survived everything are shadow grain on
    # the floor, not object - the object is one big region. Mean colour decides,
    # so a detached saturated fragment of the artwork is never dropped.
    seen = bytearray(n)
    for start in range(n):
        if filled[start] or seen[start]:
            continue
        comp = [start]
        seen[start] = 1
        head = 0
        rsum = gsum = bsum = 0
        while head < len(comp):
            i = comp[head]
            head += 1
            o = i * 3
            rsum += raw[o]; gsum += raw[o + 1]; bsum += raw[o + 2]
            for j in neighbours(i):
                if j >= 0 and not filled[j] and not seen[j]:
                    seen[j] = 1
                    comp.append(j)
        if len(comp) < island_max:
            cr, cg, cb = rsum / len(comp), gsum / len(comp), bsum / len(comp)
            if (max(cr, cg, cb) - min(cr, cg, cb) <= island_sat
                    and (cr + cg + cb) / 3 >= island_lum):
                for i in comp:
                    filled[i] = 1

    if trace is not None:
        trace["filled"] = filled
        trace["absorbed"] = absorbed_mask
        trace["fringe"] = fringe_mask

    out = im.convert("RGBA")
    out.putalpha(Image.frombytes("L", (w, h), bytes(0 if f else 255 for f in filled)))
    print(f"  {w}x{h}  keyed {100 * sum(filled) / n:.1f}%  backdrop {mr:.0f},{mg:.0f},{mb:.0f}")
    return out

def top_slope(alpha, w, h):
    """Least-squares slope of the object's top edge, mid 64% of the frame."""
    px = alpha.load()
    xs, ys = [], []
    for x in range(round(w * 0.18), round(w * 0.82), 2):
        for y in range(h):
            if px[x, y] > 127:
                xs.append(x); ys.append(y)
                break
    if len(xs) < 40:
        return 0.0
    xm, ym = sum(xs) / len(xs), sum(ys) / len(ys)
    den = sum((x - xm) ** 2 for x in xs)
    if not den:
        return 0.0
    return sum((x - xm) * (y - ym) for x, y in zip(xs, ys)) / den


def deskew(img):
    """Rotate the slant out of the top edge. Self-checking: both directions are
    tried and whichever actually levels the edge wins."""
    def slope(im):
        mask = im.getchannel("A").point(lambda v: 255 if v > 127 else 0)
        return top_slope(mask, im.width, im.height)

    before = slope(img)
    if abs(before) < 0.0012:
        return img, before, before, 0.0
    guess = math.degrees(math.atan(before))
    best = None
    for angle in (guess, -guess):
        rot = img.rotate(angle, resample=Image.BICUBIC, expand=True,
                         fillcolor=(0, 0, 0, 0))
        after = slope(rot)
        if best is None or abs(after) < abs(best[2]):
            best = (rot, angle, after)
    return best[0], before, best[2], best[1]


def finish(img, target_h=None, target_w=None, pad=14):
    """Trim to the silhouette, one soft pixel of edge, resize, leave a margin."""
    img = img.crop(img.getchannel("A").getbbox())
    img.putalpha(img.getchannel("A").filter(ImageFilter.GaussianBlur(0.8)))
    scale = (target_h / img.height) if target_h else (target_w / img.width)
    img = img.resize((max(1, round(img.width * scale)),
                      max(1, round(img.height * scale))), Image.LANCZOS)
    out = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
    out.alpha_composite(img, (pad, pad))
    return out


def qa_sheet(img, path):
    """Viewer copy: the cutout at true display size on dark / mid / white, plus
    the four shipped corners at 1:1 - a halo or a fringe shows up here or not."""
    band = 470
    small = img.resize((round(img.width * band / img.height), band), Image.LANCZOS)
    cols = []
    for bgc in (STAGE, (86, 88, 96, 255), (255, 255, 255, 255)):
        col = Image.new("RGBA", (small.width + 24, band + 24), bgc)
        col.alpha_composite(small, (12, 12))
        cols.append(col)
    top = Image.new("RGBA", (sum(c.width for c in cols), cols[0].height), (18, 18, 22, 255))
    x = 0
    for col in cols:
        top.alpha_composite(col, (x, 0))
        x += col.width

    cw, ch = 240, 170
    strip = Image.new("RGBA", ((cw + 16) * 4 + 16, ch + 32), STAGE)
    for i, (x0, y0) in enumerate([(0, 0), (img.width - cw, 0),
                                  (0, img.height - ch), (img.width - cw, img.height - ch)]):
        strip.alpha_composite(img.crop((x0, y0, x0 + cw, y0 + ch)),
                              (16 + i * (cw + 16), 16))

    sheet = Image.new("RGBA", (max(top.width, strip.width), top.height + strip.height),
                      (18, 18, 22, 255))
    sheet.alpha_composite(top, (0, 0))
    sheet.alpha_composite(strip, (0, top.height))
    sheet.convert("RGB").save(path, quality=88)
    print("  preview", path.name, sheet.size)


def main():
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    print("card  ", CARD_SRC.name)
    card, before, after, used = deskew(key_photo(CARD_SRC, tol=20))
    print(f"  deskew {before:+.4f} -> {after:+.4f}  ({used:+.2f} deg)")
    card = finish(card, target_h=940)
    card.save(CARD_OUT, optimize=True)
    print("  wrote", CARD_OUT.name, card.size, f"{CARD_OUT.stat().st_size / 1024:.0f} KB")
    qa_sheet(card, PREVIEW_DIR / "card_cut.jpg")

    print("memory", MEM_SRC.name)
    mem = key_photo(MEM_SRC, tol=18, sat_max=28, lum_floor=138,
                    fringe_passes=2, fringe_gain=1.3, absorb_y_min=400,
                    light_floor=200, light_sat=60)
    mem = finish(mem, target_h=940)
    mem.save(MEM_OUT, optimize=True)
    print("  wrote", MEM_OUT.name, mem.size, f"{MEM_OUT.stat().st_size / 1024:.0f} KB")
    qa_sheet(mem, PREVIEW_DIR / "memory_cut.jpg")


if __name__ == "__main__":
    main()


