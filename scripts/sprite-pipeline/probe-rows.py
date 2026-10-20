from PIL import Image

def dump(path, name):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    # Save horizontal strips so the layout is readable.
    out = Image.new("RGB", (900, 140 * 6), (0, 0, 0))
    for i in range(6):
        y0 = int(h * i / 6)
        y1 = int(h * (i + 1) / 6)
        strip = im.crop((0, y0, w, y1))
        strip.thumbnail((900, 130))
        out.paste(strip, (0, i * 140))
    out.save(f"scripts/sprite-pipeline/aquatic-preview/{name}-strips.jpg", quality=80)
    print(name, im.size)

im = Image.open(r"public/arcade-bk/Aquatic Rush/player-sub.jpg").convert("RGB")
im.crop((0, 90, 1400, 430)).save(r"scripts/sprite-pipeline/aquatic-preview/sub-idle-l.jpg", quality=85)
im.crop((1350, 90, 2752, 430)).save(r"scripts/sprite-pipeline/aquatic-preview/sub-idle-r.jpg", quality=85)
l3 = Image.open(r"public/arcade-bk/Aquatic Rush/level-three-enemies.jpg").convert("RGB")
l3.crop((0, 90, 1400, 420)).save(r"scripts/sprite-pipeline/aquatic-preview/l3-top-l.jpg", quality=85)
l3.crop((1350, 90, 2752, 420)).save(r"scripts/sprite-pipeline/aquatic-preview/l3-top-r.jpg", quality=85)
print("crops", im.size)
dump(r"public/arcade-bk/Aquatic Rush/player-sub.jpg", "sub")
dump(r"public/arcade-bk/Aquatic Rush/level-three-enemies.jpg", "l3")
dump(r"public/arcade-bk/Aquatic Rush/treasures.jpg", "loot")
dump(r"public/arcade-bk/Aquatic Rush/level-two-enemies.jpg", "l2")
