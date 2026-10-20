"""Flood-fill only the solid black corner diamond, then cover that blob."""

from PIL import Image

src = r"public/arcade-bk/Aquatic Rush/game-background.jpg"
out = r"public/arcade/aquatic-rush/background.jpg"
im = Image.open(src).convert("RGB")
pix = im.load()
w, h = im.size

def dark(x, y):
    r, g, b = pix[x, y]
    return r < 12 and g < 12 and b < 18

# Seed: darkest pixel in the corner.
seed = None
best = 999
for y in range(h - 280, h - 20):
    for x in range(w - 280, w - 20):
        r, g, b = pix[x, y]
        s = r + g + b
        if s < best:
            best = s
            seed = (x, y)
print("seed", seed, "sum", best)

stack = [seed]
seen = set()
blob = []
while stack:
    x, y = stack.pop()
    if (x, y) in seen or x < 0 or y < 0 or x >= w or y >= h:
        continue
    if not dark(x, y):
        continue
    seen.add((x, y))
    blob.append((x, y))
    stack.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
print("blob", len(blob))

# Grow two pixels so the soft edge goes too.
extra = []
for x, y in blob:
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            nx, ny = x + dx, y + dy
            if (nx, ny) not in seen and 0 <= nx < w and 0 <= ny < h:
                seen.add((nx, ny))
                extra.append((nx, ny))
blob.extend(extra)

# Bleed the surrounding rock inward so the hole takes the local color.
blob_set = set(blob)
for _ in range(48):
    nxt = {}
    for x, y in list(blob_set):
        cols = []
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) not in blob_set and 0 <= nx < w and 0 <= ny < h:
                cols.append(pix[nx, ny])
        if cols:
            nxt[(x, y)] = tuple(sum(c[i] for c in cols) // len(cols) for i in range(3))
    if not nxt:
        break
    for (x, y), color in nxt.items():
        pix[x, y] = color
        blob_set.discard((x, y))
print("left", len(blob_set))

im.save(out, quality=92)
im.crop((w - 220, h - 220, w, h)).resize((440, 440), Image.Resampling.NEAREST).save(
    r"scripts/sprite-pipeline/aquatic-preview/bg-clean.jpg", quality=90
)
