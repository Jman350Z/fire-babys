#!/usr/bin/env python3
"""Proof #2 side-by-side sheets: approved 2D master (left) vs 3D front (right),
same presentation as proof #1's side-by-side images."""
from PIL import Image
import os

BASE = os.path.expanduser("~/workspace/fire-babys-shows")
NAMES = ["ruko", "boulder", "sizzle", "cinder", "lord-inferno",
         "splash", "pebble", "drift", "bubble", "lord-tidal"]
H = 1100

for name in NAMES:
    master_path = os.path.join(BASE, "characters", f"{name}.png")
    still_path = os.path.join(BASE, "3d-overhaul", "proof-2", name, f"{name}-front.png")
    out_path = os.path.join(BASE, "3d-overhaul", "proof-2", name, f"{name}-side-by-side.png")
    m = Image.open(master_path).convert("RGB")
    s = Image.open(still_path).convert("RGB")
    # Crop the 3D still to the character (center band) so both read at same scale.
    w, h = s.size
    s_crop = s.crop((int(w * 0.08), int(h * 0.30), int(w * 0.92), int(h * 0.86)))
    def fit(img):
        r = H / img.size[1]
        return img.resize((int(img.size[0] * r), H))
    m2, s2 = fit(m), fit(s_crop)
    sheet = Image.new("RGB", (m2.size[0] + s2.size[0] + 12, H), (255, 255, 255))
    sheet.paste(m2, (0, 0))
    sheet.paste(s2, (m2.size[0] + 12, 0))
    sheet.save(out_path)
    print("wrote", out_path, sheet.size)
