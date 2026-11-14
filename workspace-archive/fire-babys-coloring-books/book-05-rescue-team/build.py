#!/usr/bin/env python3
"""Build Book 5 'Fire Babys: Rescue Team' KDP paperback files."""
import glob, os
from PIL import Image, ImageDraw, ImageFont, ImageOps

BASE = os.path.expanduser("~/workspace/fire-babys-coloring-books/book-05-rescue-team")
RAW = os.path.join(BASE, "raw")
PAGES = os.path.join(BASE, "pages")
W, H = 2550, 3300  # 8.5x11 @ 300dpi
os.makedirs(PAGES, exist_ok=True)


def find_raw(stem):
    hits = glob.glob(os.path.join(RAW, f"media-generation-{stem}-0-*.webp"))
    assert hits, f"no raw file for {stem}"
    hits.sort(key=os.path.getmtime)  # regenerated files are newest
    return hits[-1]


def clean_lineart(img):
    """Fit to page, white background, crush light gray noise to pure white, deepen lines."""
    img = img.convert("L")
    img = ImageOps.fit(img, (W, H), Image.LANCZOS)
    def f(p):
        if p > 215:
            return 255
        if p < 90:
            return 0
        return int(255 - (255 - p) * 1.25)  # deepen mid grays
    img = img.point(f)
    return img.convert("RGB")


page_imgs = []
for n in range(1, 21):
    stem = f"page-{n:02d}"
    raw = Image.open(find_raw(stem))
    done = clean_lineart(raw)
    out = os.path.join(PAGES, f"page-{n:02d}.jpg")
    done.save(out, "JPEG", quality=95)
    page_imgs.append(done)
    print("saved", out, done.size)

# ---- Cover ----
cov_raw = Image.open(find_raw("cover-art")).convert("RGB")
cover = ImageOps.fit(cov_raw, (W, H), Image.LANCZOS)
d = ImageDraw.Draw(cover)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
f1 = ImageFont.truetype(FB, 300)
f2 = ImageFont.truetype(FB, 170)
f3 = ImageFont.truetype(FB, 105)

def centered(y, text, font, fill, stroke):
    bb = d.textbbox((0, 0), text, font=font)
    tw = bb[2] - bb[0]
    d.text(((W - tw) / 2, y), text, font=font, fill=fill,
           stroke_width=stroke, stroke_fill=(30, 20, 10))

# dark scrim behind title block so white text pops
d.rectangle([0, 60, W, 760], fill=(0, 0, 0, 0))  # placeholder for band
overlay = Image.new("RGBA", cover.size, (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
od.rectangle([0, 40, W, 800], fill=(20, 10, 40, 110))
cover = Image.alpha_composite(cover.convert("RGBA"), overlay).convert("RGB")
d = ImageDraw.Draw(cover)

centered(90,  "Fire Babys",      f1, (255, 255, 255), 10)
centered(430, "Rescue Team",     f2, (255, 210, 80),  7)
centered(640, "A Coloring Book", f3, (255, 255, 255), 5)

cover_out = os.path.join(BASE, "cover.jpg")
cover.save(cover_out, "JPEG", quality=95)
print("saved", cover_out, cover.size)

# ---- PDF: cover first, then pages 1-20 ----
pdf_out = os.path.join(BASE, "book.pdf")
all_imgs = [Image.open(cover_out)] + [Image.open(os.path.join(PAGES, f"page-{n:02d}.jpg")) for n in range(1, 21)]
all_imgs[0].save(pdf_out, "PDF", resolution=300.0, save_all=True, append_images=all_imgs[1:])
print("saved", pdf_out)
