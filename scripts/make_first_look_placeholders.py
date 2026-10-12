from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "me"
OUT.mkdir(parents=True, exist_ok=True)
FONT = Path(r"C:\Windows\Fonts\segoeuib.ttf")


def plate(name: str, size: tuple[int, int], color: str, label: str) -> None:
    img = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(img)
    face = ImageFont.truetype(str(FONT), 48) if FONT.exists() else ImageFont.load_default()
    draw.rectangle((16, 16, size[0] - 16, size[1] - 16), outline="#21143a", width=8)
    draw.text((size[0] // 2, size[1] // 2), label, font=face, fill="#21143a", anchor="mm")
    img.save(OUT / name, "WEBP", quality=80)


if __name__ == "__main__":
    plate("cinematic.webp", (1280, 768), "#ffd0e8", "CINEMATIC")
    plate("tpose.webp", (1280, 1024), "#c8f6ff", "T-POSE")
    print("placeholders")
