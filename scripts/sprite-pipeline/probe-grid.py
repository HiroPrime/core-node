"""Find the corner-bracket grid on an Aquatic Rush sheet."""
from PIL import Image
from collections import Counter

im = Image.open(r"public/arcade-bk/Aquatic Rush/player-sub.jpg").convert("RGB")
w, h = im.size
pix = im.load()

# Bracket marks are pale, low-saturation, and not the field blue.
hits = []
for y in range(0, h, 2):
    for x in range(0, w, 2):
        r, g, b = pix[x, y]
        if b < 150 or r < 90:
            continue
        if abs(r - g) > 40 or abs(g - b) > 50:
            continue
        if r > 210 and g > 210 and b > 210:
            hits.append((x, y))
            continue
        # pale steel
        if 120 < r < 210 and 140 < g < 220 and 160 < b < 235 and b >= g >= r - 10:
            hits.append((x, y))

print("hits", len(hits))
# Cluster into points by bucketing 24px.
buckets = Counter()
for x, y in hits:
    buckets[(x // 24 * 24, y // 24 * 24)] += 1
strong = [(k, v) for k, v in buckets.items() if v >= 3]
strong.sort(key=lambda t: (t[0][1], t[0][0]))
print("clusters", len(strong))
ys = Counter(k[1] for k, _ in strong)
print("y bands:")
for y, n in sorted(ys.items()):
    if n >= 4:
        xs = sorted(k[0] for k, v in strong if k[1] == y)
        print(f"  y={y} n={n} xs={xs[:24]}")
