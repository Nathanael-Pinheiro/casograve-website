"""Generate web copies of the supplied images. Requires Pillow; originals are read-only."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PHOTOS = ROOT / "assets" / "fotos_originais"
OUT = ROOT / "src" / "assets" / "images"
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = {
    "nathan-fender-tagima": ("Nathan-Tagimatw 73 e fender ultra.png", (720, 1200, 1680)),
    "tagima-ultra": ("Tagima Ultra.png", (640, 1200)),
    "nathan": ("boa para um perfil e fazer um sobre.png", (520, 900)),
    "reviews": ("nathan-dois-baixos-original.jpeg", (600,)),
    "historias": ("nathan solo.png", (600,)),
    "upgrades": ("Nathan tarraxas baixo.png", (600,)),
    "estudio": ("foto boa para banner.png", (820,)),
}
RESAMPLE = Image.Resampling.LANCZOS
for slug, (name, widths) in SOURCES.items():
    with Image.open(PHOTOS / name) as original:
        photo = ImageOps.exif_transpose(original).convert("RGB")
        for width in widths:
            target = photo.resize((width, round(photo.height * width / photo.width)), RESAMPLE)
            target.save(OUT / f"{slug}-{width}.webp", quality=83, method=6)

logo = Image.open(ROOT / "assets" / "logo" / "caso-grave-logo-original.png").convert("RGBA")
logo = logo.crop(logo.getbbox())
logo.thumbnail((340, 220), RESAMPLE)
logo.save(OUT / "logo.webp", lossless=True)

icon = Image.new("RGBA", (192, 192))
ImageDraw.Draw(icon).rounded_rectangle((0, 0, 191, 191), radius=29, fill="#F9CB01")
mark = logo.copy()
mark.thumbnail((162, 160), RESAMPLE)
icon.alpha_composite(mark, ((192 - mark.width) // 2, (192 - mark.height) // 2))
icon.resize((64, 64), RESAMPLE).save(OUT / "favicon.png")
icon.save(OUT / "apple-touch-icon.png")

# Compose the sharing graphic with the supplied photography and logo.
with Image.open(PHOTOS / SOURCES["nathan-fender-tagima"][0]) as original:
    card = ImageOps.fit(original.convert("RGB"), (1200, 630), RESAMPLE)
card = card.convert("RGBA")
draw = ImageDraw.Draw(card)
draw.rectangle((0, 610, 1200, 629), fill="#F9CB01")
draw.rounded_rectangle((32, 33, 202, 145), radius=8, fill="#F9CB01")
card.alpha_composite(logo.resize((138, 81), RESAMPLE), (48, 48))
card.convert("RGB").save(OUT / "compartilhar.jpg", quality=90, optimize=True)
