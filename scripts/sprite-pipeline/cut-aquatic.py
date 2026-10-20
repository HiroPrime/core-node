"""Cut Aquatic Rush sheets into transparent frames.

The sheets sit on a flat blue field with pale corner brackets. Ink is any
pixel that is not that field and not a low-saturation bracket. Rows come
from the vertical ink profile. Frames come from gaps inside each row.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path("public/arcade-bk/Aquatic Rush")
OUT = Path("public/arcade/aquatic-rush")
PREVIEW = Path("scripts/sprite-pipeline/aquatic-preview")

SHEETS = {
    "sub": "player-sub.jpg",
    "l1": "level-one-enemies.jpg",
    "l2": "level-two-enemies.jpg",
    "l3": "level-three-enemies.jpg",
    "loot": "treasures.jpg",
}


FIELD = (39, 66, 108)


def is_field(r: int, g: int, b: int) -> bool:
    return max(abs(r - FIELD[0]), abs(g - FIELD[1]), abs(b - FIELD[2])) <= 28


def is_ink(r: int, g: int, b: int) -> bool:
    if is_field(r, g, b):
        return False
    if r < 12 and g < 12 and b < 20:
        return False
    return True


def bands(profile: list[int], min_run: int, min_ink: int) -> list[tuple[int, int]]:
    found = []
    start = None
    for i, v in enumerate(profile):
        hot = v >= min_ink
        if hot and start is None:
            start = i
        elif not hot and start is not None:
            if i - start >= min_run:
                found.append((start, i))
            start = None
    if start is not None and len(profile) - start >= min_run:
        found.append((start, len(profile)))
    return found


def cut_sheet(im: Image.Image) -> list[list[tuple[int, int, int, int]]]:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    pix = rgba.load()
    ink = [[False] * w for _ in range(h)]
    col = [0] * w
    row = [0] * h
    for y in range(h):
        line = ink[y]
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a > 20 and is_ink(r, g, b):
                line[x] = True
                row[y] += 1
                col[x] += 1
    # Sprite rows are tall. Labels are short, so a 70px minimum drops them.
    raw_rows = bands(row, 70, 12)
    frames: list[list[tuple[int, int, int, int]]] = []
    for y0, y1 in raw_rows:
        if y0 < 80 or y1 > h - 40:
            continue
        local = [0] * w
        for y in range(y0, y1):
            line = ink[y]
            for x in range(w):
                if line[x]:
                    local[x] += 1
        # A real gap between cells, not the few pixels inside a bubble trail.
        cols = bands(local, 8, 4)
        merged: list[tuple[int, int]] = []
        for x0, x1 in cols:
            if x1 - x0 < 56:
                continue
            if merged and x0 - merged[-1][1] < 18:
                merged[-1] = (merged[-1][0], x1)
            else:
                merged.append((x0, x1))
        # A glow bridge can glue several sprites into one wide blob. Split
        # those on the thinnest columns.
        split: list[tuple[int, int]] = []
        for x0, x1 in merged:
            width = x1 - x0
            if width < 520:
                split.append((x0, x1))
                continue
            window = 8
            valley = []
            for x in range(x0 + 40, x1 - 40):
                ink_here = sum(local[x:x + window]) / window
                valley.append((ink_here, x))
            valley.sort()
            cuts = []
            for ink_here, x in valley:
                if ink_here > 6:
                    break
                if all(abs(x - c) > 80 for c in cuts):
                    cuts.append(x)
                if len(cuts) >= max(1, width // 280 - 1):
                    break
            if not cuts:
                split.append((x0, x1))
                continue
            edges = [x0, *sorted(cuts), x1]
            for a, b in zip(edges, edges[1:]):
                if b - a > 40:
                    split.append((a, b))
        row_boxes = []
        for x0, x1 in split:
            if x1 - x0 < 48:
                continue
            top = y1
            bot = y0
            left = x1
            right = x0
            for y in range(y0, y1):
                line = ink[y]
                for x in range(x0, x1):
                    if line[x]:
                        if y < top:
                            top = y
                        if y > bot:
                            bot = y
                        if x < left:
                            left = x
                        if x > right:
                            right = x
            if bot <= top or right <= left:
                continue
            if (bot - top) < 36 or (right - left) < 28:
                continue
            row_boxes.append((left, top, right, bot))
        if row_boxes:
            frames.append(row_boxes)
    return frames


def trim(im: Image.Image, box: tuple[int, int, int, int], pad: int = 4) -> Image.Image:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    x0 = max(0, box[0] - pad)
    y0 = max(0, box[1] - pad)
    x1 = min(w, box[2] + 1 + pad)
    y1 = min(h, box[3] + 1 + pad)
    crop = rgba.crop((x0, y0, x1, y1))
    pix = crop.load()
    cw, ch = crop.size
    for y in range(ch):
        for x in range(cw):
            r, g, b, a = pix[x, y]
            if a < 20 or is_field(r, g, b):
                pix[x, y] = (0, 0, 0, 0)
    return crop


def contact(rows: list[list[Image.Image]], path: Path) -> None:
    pad = 8
    cell_h = 96
    width = 0
    for row in rows:
        width = max(width, sum(int(im.width * (cell_h / im.height)) + pad for im in row) + pad)
    height = pad + len(rows) * (cell_h + pad)
    sheet = Image.new("RGB", (max(width, 64), max(height, 64)), (12, 18, 36))
    draw = ImageDraw.Draw(sheet)
    y = pad
    for ri, row in enumerate(rows):
        x = pad
        for im in row:
            scale = cell_h / im.height
            dw = max(1, int(im.width * scale))
            frame = im.resize((dw, cell_h), Image.Resampling.NEAREST)
            sheet.paste(frame, (x, y), frame)
            draw.rectangle((x, y, x + dw - 1, y + cell_h - 1), outline=(255, 80, 160))
            x += dw + pad
        y += cell_h + pad
    sheet.save(path, quality=85)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, list] = {}
    for key, name in SHEETS.items():
        im = Image.open(ROOT / name)
        rows = cut_sheet(im)
        manifest[key] = []
        previews: list[list[Image.Image]] = []
        print(f"\n{key}")
        for ri, row in enumerate(rows):
            saved = []
            pics = []
            print(f"  row {ri} n={len(row)}")
            for fi, box in enumerate(row):
                sprite = trim(im, box)
                rel = f"{key}-{ri}-{fi}.png"
                sprite.save(OUT / rel)
                saved.append({"file": rel, "w": sprite.width, "h": sprite.height})
                pics.append(sprite)
                print(f"    {fi} {sprite.size}")
            manifest[key].append(saved)
            previews.append(pics)
        contact(previews, PREVIEW / f"{key}-cut.jpg")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
