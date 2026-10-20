from PIL import Image
from collections import Counter

im = Image.open(r"public/arcade-bk/Aquatic Rush/level-three-enemies.jpg").convert("RGB")
pix = im.load()
FIELD = (39, 66, 108)

def dist(c):
    return max(abs(c[0] - FIELD[0]), abs(c[1] - FIELD[1]), abs(c[2] - FIELD[2]))

# Find x of a shark by content in y 200-360
xs = []
for x in range(0, 2752, 2):
    n = sum(1 for y in range(200, 360, 2) if dist(pix[x, y]) > 26)
    if n > 20:
        xs.append(x)
# group
groups = []
for x in xs:
    if not groups or x - groups[-1][-1] > 8:
        groups.append([x])
    else:
        groups[-1].append(x)
print("groups", [(g[0], g[-1], g[-1] - g[0]) for g in groups])
if groups:
    x = (groups[0][0] + groups[0][-1]) // 2
    colors = Counter()
    for y in range(200, 380):
        c = pix[x, y]
        if dist(c) > 26:
            colors[(c[0] // 8 * 8, c[1] // 8 * 8, c[2] // 8 * 8)] += 1
    print("mid", x, colors.most_common(10))
