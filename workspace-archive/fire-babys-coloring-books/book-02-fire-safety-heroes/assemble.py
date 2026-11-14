#!/usr/bin/env python3
"""Assemble Fire Babys Coloring Book 2: pages + cover + PDF."""
import glob, os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.expanduser("~/workspace/fire-babys-coloring-books/book-02-fire-safety-heroes")
PAGES_DIR = os.path.join(BASE, "pages")
W, H = 2550, 3300  # 8.5x11" @ 300dpi
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def to_canvas(src_path):
    img = Image.open(src_path).convert("RGB")
    img.thumbnail((W, H), Image.LANCZOS)  # preserve aspect
    canvas = Image.new("RGB", (W, H), "white")
    canvas.paste(img, ((W - img.width) // 2, (H - img.height) // 2))
    return canvas

# --- 1) Interior pages -> page-NN.jpg ---
page_files = []
for n in range(1, 21):
    nn = f"{n:02d}"
    raws = sorted(glob.glob(os.path.join(PAGES_DIR, f"media-generation-page-{nn}-raw-*.jpg")))
    if not raws:
        raise SystemExit(f"MISSING raw art for page {nn}")
    out = os.path.join(PAGES_DIR, f"page-{nn}.jpg")
    to_canvas(raws[0]).save(out, "JPEG", quality=95)
    page_files.append(out)
    print("wrote", out)

# --- 2) Cover: full color + title text via PIL ---
cover_raws = sorted(glob.glob(os.path.join(BASE, "media-generation-cover-art-raw-*.jpg")))
if not cover_raws:
    raise SystemExit("MISSING raw cover art")
cover = to_canvas(cover_raws[0])
d = ImageDraw.Draw(cover)

def centered(text, y, size, fill, stroke_w=0, stroke_fill="black"):
    f = ImageFont.truetype(FONT, size)
    bbox = d.textbbox((0, 0), text, font=f, stroke_width=stroke_w)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, y), text, font=f, fill=fill,
           stroke_width=stroke_w, stroke_fill=stroke_fill)

# Top-third sky zone
centered("Fire Babys", 120, 230, (255, 69, 0), stroke_w=6, stroke_fill=(120, 30, 0))
centered("Fire Safety Heroes", 420, 130, (255, 140, 0), stroke_w=4, stroke_fill=(120, 40, 0))
centered("A Coloring Book", 600, 80, (60, 60, 60))

cover_out = os.path.join(BASE, "cover.jpg")
cover.save(cover_out, "JPEG", quality=95)
print("wrote", cover_out)

# --- 3) book.pdf: cover + 20 pages ---
imgs = [Image.open(cover_out)] + [Image.open(p) for p in page_files]
pdf_out = os.path.join(BASE, "book.pdf")
imgs[0].save(pdf_out, "PDF", save_all=True, append_images=imgs[1:], resolution=300.0)
print("wrote", pdf_out)

# --- 4) Verify ---
for f in [cover_out] + page_files:
    im = Image.open(f)
    assert im.size == (W, H), f"SIZE BAD {f}: {im.size}"
    assert im.mode == "RGB", f"MODE BAD {f}"
print("All 21 JPGs verified 2550x3300 RGB.")

try:
    from pypdf import PdfReader
    n = len(PdfReader(pdf_out).pages)
except ImportError:
    import subprocess
    subprocess.run(["pip", "install", "pypdf", "-q"], check=True)
    from pypdf import PdfReader
    n = len(PdfReader(pdf_out).pages)
assert n == 21, f"PDF page count {n} != 21"
print(f"book.pdf verified: {n} pages.")
