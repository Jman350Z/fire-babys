#!/usr/bin/env python3
"""Assemble Fire Babys Book 4: pages + cover + PDF."""
from PIL import Image, ImageDraw, ImageFont
import glob, os

W, H = 2550, 3300
BASE = os.path.dirname(os.path.abspath(__file__))
PAGES = os.path.join(BASE, "pages")

def fit_on_canvas(src_path):
    im = Image.open(src_path).convert("RGB")
    im.thumbnail((W, H), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), "white")
    canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
    return canvas

# --- Pages 1..20 ---
srcs = sorted(glob.glob(os.path.join(PAGES, "media-generation-page-*.webp")))
assert len(srcs) == 20, f"expected 20 page sources, got {len(srcs)}"
page_files = []
for i, s in enumerate(srcs, 1):
    page = fit_on_canvas(s)
    out = os.path.join(PAGES, f"page-{i:02d}.jpg")
    page.save(out, "JPEG", quality=95)
    page_files.append(out)
    print("wrote", out, page.size)

# --- Cover ---
cover_src = glob.glob(os.path.join(BASE, "media-generation-cover-*.webp"))
assert cover_src, "cover source missing"
cover = fit_on_canvas(cover_src[0])
d = ImageDraw.Draw(cover)
fb = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
f_title = ImageFont.truetype(fb, 330)
f_sub = ImageFont.truetype(fb, 165)
f_small = ImageFont.truetype(fb, 120)

def centered(y, text, font, fill, stroke_w=6, stroke_fill="white"):
    d.text((W / 2, y), text, font=font, fill=fill, anchor="ma",
           stroke_width=stroke_w, stroke_fill=stroke_fill)

centered(120, "Fire Babys", f_title, "#C62828", stroke_w=10)
centered(560, "The Five Kingdoms", f_sub, "#4E342E", stroke_w=6)
centered(H - 260, "A Coloring Book", f_small, "#616161", stroke_w=4)

cover_out = os.path.join(BASE, "cover.jpg")
cover.save(cover_out, "JPEG", quality=95)
print("wrote", cover_out, cover.size)

# --- PDF: cover + pages 1..20 ---
imgs = [Image.open(cover_out)] + [Image.open(p) for p in page_files]
pdf_out = os.path.join(BASE, "book.pdf")
imgs[0].save(pdf_out, "PDF", resolution=300.0, save_all=True,
             append_images=imgs[1:])
print("wrote", pdf_out, "pages:", len(imgs))

# --- Verify ---
from PIL import Image as I
for p in [cover_out] + page_files:
    im = I.open(p)
    assert im.size == (W, H) and im.mode == "RGB", f"BAD {p}: {im.size} {im.mode}"
print("all 21 JPGs are 2550x3300 RGB OK")
