from PIL import Image
from collections import Counter

im = Image.open(r"public/arcade/aquatic-rush/loot-0-0.png").convert("RGBA")
pix = im.load()
c = Counter()
for y in range(0, 36):
    for x in range(0, im.size[0]):
        r, g, b, a = pix[x, y]
        if a > 180 and max(r, g, b) > 80:
            c[(r // 8 * 8, g // 8 * 8, b // 8 * 8)] += 1
print(im.size, c.most_common(8))
