"""Cut the ten arcade cabinets off the sprite sheet onto transparent PNGs."""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "arcade-bk" / "arcade-sprites.jpg"
OUT = ROOT / "public" / "arcade" / "cabinets"
NAMES = [
    "neon-chase",
    "void-beast",
    "hyruletown-girl",
    "dungeon-delve",
    "spin-ball",
    "mecha-force",
    "tomb-crusade",
    "aquatic-rush",
    "fast-food-fight",
    "steel-samurai",
]


def close(c, bg, tol):
    return abs(c[0] - bg[0]) <= tol and abs(c[1] - bg[1]) <= tol and abs(c[2] - bg[2]) <= tol


def main():
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = px[4, 4][:3]
    print("sheet", w, h, "bg", bg)

    seen = bytearray(w * h)
    q = deque()

    def consider(x, y):
        i = y * w + x
        if seen[i]:
            return
        r, g, b, a = px[x, y]
        if a == 0 or close((r, g, b), bg, 42):
            seen[i] = 1
            q.append((x, y))

    for x in range(w):
        consider(x, 0)
        consider(x, h - 1)
    for y in range(h):
        consider(0, y)
        consider(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        if x + 1 < w:
            consider(x + 1, y)
        if x > 0:
            consider(x - 1, y)
        if y + 1 < h:
            consider(x, y + 1)
        if y > 0:
            consider(x, y - 1)

    # Eat the jpeg fringe sitting on the new transparent edge.
    for _ in range(2):
        kill = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0 or not close((r, g, b), bg, 28):
                    continue
                edge = False
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h or px[nx, ny][3] == 0:
                        edge = True
                        break
                if edge:
                    kill.append((x, y))
        for x, y in kill:
            px[x, y] = (0, 0, 0, 0)

    visited = bytearray(w * h)
    boxes = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if visited[i] or px[x, y][3] == 0:
                continue
            q = deque([(x, y)])
            visited[i] = 1
            minx = maxx = x
            miny = maxy = y
            area = 0
            while q:
                cx, cy = q.popleft()
                area += 1
                if cx < minx:
                    minx = cx
                if cx > maxx:
                    maxx = cx
                if cy < miny:
                    miny = cy
                if cy > maxy:
                    maxy = cy
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    j = ny * w + nx
                    if visited[j] or px[nx, ny][3] == 0:
                        continue
                    visited[j] = 1
                    q.append((nx, ny))
            bw = maxx - minx + 1
            bh = maxy - miny + 1
            if area > 4000 and bh > 120 and bw > 60:
                boxes.append((minx, miny, maxx, maxy, area))

    boxes.sort(key=lambda b: (b[1] // 80, b[0]))
    print("blobs", len(boxes))
    for b in boxes:
        print(b)

    cabinets = [b for b in boxes if (b[3] - b[1]) > (b[2] - b[0]) * 0.85]
    cabinets.sort(key=lambda b: (b[1], b[0]))
    if len(cabinets) != 10:
        raise SystemExit(f"expected 10 cabinets, found {len(cabinets)}")

    OUT.mkdir(parents=True, exist_ok=True)
    thumbs = []
    for name, (x0, y0, x1, y1, _area) in zip(NAMES, cabinets):
        pad = 2
        crop = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + 1 + pad), min(h, y1 + 1 + pad)))
        crop.save(OUT / f"{name}.png")
        thumbs.append(crop.resize((crop.width // 3, crop.height // 3), Image.Resampling.NEAREST))
        print(name, crop.size)

    sheet = Image.new("RGBA", (sum(t.width for t in thumbs) + 20, max(t.height for t in thumbs) + 10), (20, 24, 40, 255))
    x = 4
    for t in thumbs:
        sheet.paste(t, (x, 4), t)
        x += t.width + 2
    sheet.convert("RGB").save(OUT / "_contact.jpg", quality=90)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
