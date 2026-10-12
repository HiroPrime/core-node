from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "me"
OUT.mkdir(parents=True, exist_ok=True)
FONT = Path(r"C:\Windows\Fonts\segoeuib.ttf")

colors = {
    "hero-pink-dress.webp": ("#ff3d7f", "PINK WIG"),
    "desk-talk.webp": ("#2ee6d6", "TALKING"),
    "no-wig-skirt.webp": ("#ffe14d", "NO WIG"),
    "hoodie.webp": ("#7a4dff", "HOODIE"),
    "bangs.webp": ("#ff6a1a", "BANGS"),
}


def main() -> None:
    face = ImageFont.truetype(str(FONT), 54) if FONT.exists() else ImageFont.load_default()
    for name, (hex_color, label) in colors.items():
        img = Image.new("RGB", (960, 1200), hex_color)
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle((40, 40, 920, 1160), radius=48, outline="#21143a", width=10)
        draw.text((480, 600), label, font=face, fill="#21143a", anchor="mm")
        img.save(OUT / name, "WEBP", quality=80)
        print("placeholder", name)


if __name__ == "__main__":
    main()
