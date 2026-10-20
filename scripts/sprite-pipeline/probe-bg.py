from PIL import Image
im = Image.open(r"public/arcade-bk/Aquatic Rush/game-background.jpg").convert("RGB")
w, h = im.size
im.crop((w - 180, h - 180, w, h)).resize((360, 360), Image.Resampling.NEAREST).save(
    r"scripts/sprite-pipeline/aquatic-preview/bg-corner.jpg", quality=90
)
print(im.size, im.getpixel((w - 30, h - 30)), im.getpixel((w - 80, h - 80)))
