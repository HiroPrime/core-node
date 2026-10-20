"""Knock the sheet brackets and labels off cut frames, then split glued sprites."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

SRC = Path("public/arcade/aquatic-rush")
OUT = Path("public/arcade/aquatic-rush-clean")


def is_bracket(r: int, g: int, b: int) -> bool:
    return (
        max(abs(r - 96), abs(g - 128), abs(b - 176)) <= 42
        and b > r + 22
        and b > 130
        and g > r
    )


def is_label(r: int, g: int, b: int) -> bool:
    if g > 220 and b > 200 and 150 < r < 230 and g >= b - 16 and g > r + 20:
        return True
    # White sheet labels ("SINKING", "RISING") sit above the sprite.
    span = max(r, g, b) - min(r, g, b)
    return min(r, g, b) > 165 and span < 48


def clean(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    pix = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a < 16:
                pix[x, y] = (0, 0, 0, 0)
                continue
            if is_bracket(r, g, b) or (y < h * 0.34 and is_label(r, g, b)):
                pix[x, y] = (0, 0, 0, 0)
    # Sheet labels float above the sprite. Drop any blob that never
    # reaches the lower half, then crop to what's left.
    w, h = im.size
    pix = im.load()
    seen = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if seen[i] or pix[x, y][3] < 20:
                continue
            stack = [i]
            seen[i] = 1
            cells = [i]
            max_y = y
            while stack:
                cur = stack.pop()
                cx = cur % w
                cy = cur // w
                if cy > max_y:
                    max_y = cy
                for nxt, nx, ny in (
                    (cur - 1, cx - 1, cy),
                    (cur + 1, cx + 1, cy),
                    (cur - w, cx, cy - 1),
                    (cur + w, cx, cy + 1),
                ):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[nxt]:
                        continue
                    if pix[nx, ny][3] < 20:
                        continue
                    seen[nxt] = 1
                    stack.append(nxt)
                    cells.append(nxt)
            if max_y < h * 0.46:
                for cur in cells:
                    pix[cur % w, cur // w] = (0, 0, 0, 0)
    bbox = im.getbbox()
    if not bbox:
        return im
    return im.crop(bbox)


def split_wide(im: Image.Image) -> list[Image.Image]:
    if im.width < 500 or im.width < im.height * 1.65:
        return [im]
    pix = im.load()
    w, h = im.size
    ink = []
    for x in range(w):
        n = 0
        for y in range(h):
            if pix[x, y][3] > 16:
                n += 1
        ink.append(n)
    # Cut on the quietest columns, keeping cuts a sprite apart.
    cuts = []
    span = max(80, w // 5)
    for _ in range(max(1, w // 300 - 1)):
        window = ink[span:w - span]
        if not window:
            break
        x = span + min(range(len(window)), key=lambda i: window[i])
        if ink[x] > h * 0.35:
            break
        if any(abs(x - c) < span for c in cuts):
            ink[max(0, x - 10):x + 10] = [h] * (min(w, x + 10) - max(0, x - 10))
            continue
        cuts.append(x)
    if not cuts:
        return [im]
    edges = [0, *sorted(cuts), w]
    parts = []
    for a, b in zip(edges, edges[1:]):
        part = im.crop((a, 0, b, h))
        box = part.getbbox()
        if not box:
            continue
        part = part.crop(box)
        if part.width >= 36 and part.height >= 36:
            parts.append(part)
    return parts or [im]


def keep(im: Image.Image) -> bool:
    if im.width < 24 or im.height < 24:
        return False
    # Leftover label strips.
    if im.height < 70 and im.width > im.height * 2.4:
        return False
    return True


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    groups: dict[str, list[str]] = {}
    for path in sorted(SRC.glob("*.png")):
        frames = [p for p in split_wide(clean(Image.open(path))) if keep(p)]
        names = []
        for i, frame in enumerate(frames):
            name = f"{path.stem}-{i}.png" if len(frames) > 1 else path.name
            frame.save(OUT / name)
            names.append(name)
        key = "-".join(path.stem.split("-")[:2])
        groups.setdefault(key, []).extend(names)
        print(f"{path.name} -> {len(frames)} {[(Image.open(OUT/n).size) for n in names]}")
    print("--- groups ---")
    for key, names in groups.items():
        print(key, len(names))


if __name__ == "__main__":
    main()
