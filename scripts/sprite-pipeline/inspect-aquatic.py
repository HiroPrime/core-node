from PIL import Image
import os

p = r"public/arcade-bk/Aquatic Rush"
for f in os.listdir(p):
    im = Image.open(os.path.join(p, f))
    print(f, im.size, im.mode)
    px = im.convert("RGB").getpixel((8, 8))
    print("  corner", px)
