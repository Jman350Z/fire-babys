#!/usr/bin/env python3
"""Fire Babys Episode 1 'Melon Mayhem' — REAL CARTOON build.
Pose-swap animation + squash & stretch + speed lines + impact flashes. 720x1280 @24fps."""
import math, os
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 720, 1280, 24
CD = os.path.expanduser("~/workspace/fire-babys-shows/characters")
BG = Image.open(os.path.expanduser(
    "~/workspace/fire-babys-shows/assets/media-generation-vertical-9-16-cartoon-backgrou-0-448584f2-6ed4-4095-a850-d64185a71783.webp")
).convert("RGB").resize((W, H)).convert("RGBA")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MELON = Image.open(os.path.join(CD, "props", "melon.png"))
BUSH = Image.open(os.path.join(CD, "props", "bush.png"))

def load_sprite(name, pose):
    return Image.open(os.path.join(CD, "poses", "sprites", name, pose + ".png"))

POSES = {}
for n in ["blaze","ruko","boulder","sizzle","cinder","lord-inferno",
          "aqua","splash","pebble","drift","bubble","lord-tidal"]:
    POSES[n] = {p: load_sprite(n, p) for p in ["laugh","shocked","dizzy","sleepy","run","happy"]}

def scaled(im, w):
    return im.resize((max(1,int(w)), max(1,int(im.height*w/im.width))), Image.LANCZOS)

def xf(im, sx=1.0, sy=1.0, rot=0.0):
    out = im.resize((max(1,int(im.width*sx)), max(1,int(im.height*sy))), Image.LANCZOS)
    if rot:
        out = out.rotate(rot, resample=Image.BICUBIC, expand=True)
    return out

def put(frame, im, cx, yb, alpha=255):
    if alpha < 255:
        im = im.copy(); a = im.split()[3].point(lambda v: v*alpha//255); im.putalpha(a)
    frame.alpha_composite(im, (int(cx - im.width/2), int(yb - im.height)))

def eo(u): return 1-(1-u)**3
def eio(u): return u*u*(3-2*u)
def clamp(u): return max(0.0, min(1.0, u))
def arc(u, h): return -4*h*u*(1-u)
def bounce_y(t, t0, t1, h):
    return arc((t-t0)/(t1-t0), h) if t0 <= t <= t1 else 0.0

# name: (cx, y_bottom, width)
GROUP = {
    "sizzle": (70, 945, 168), "ruko": (177, 950, 180), "blaze": (285, 938, 198),
    "aqua": (435, 938, 198), "bubble": (545, 950, 168), "drift": (652, 945, 168),
    "lord-inferno": (55, 1055, 142), "cinder": (162, 1048, 165), "boulder": (268, 1065, 272),
    "pebble": (466, 1065, 258), "splash": (580, 1048, 172), "lord-tidal": (672, 1055, 142),
}
FIRE = ["blaze","ruko","sizzle","cinder","boulder","lord-inferno"]
WATER = ["aqua","splash","pebble","drift","bubble","lord-tidal"]
NAMES = FIRE + WATER

def speed_lines(frame, d, x, y, w, n=7):
    for k in range(n):
        lx = x - w*0.55 - k*16 - ((int(y+k*37)) % 23)
        ly = y - k*34 - 60
        d.line([lx, ly, lx+52, ly-10], fill=(255,255,255,120), width=4)

def impact_flash(frame, d, x, y, t, t0):
    if t0 <= t <= t0+0.22:
        u = (t-t0)/0.22
        r = int(20 + 130*u)
        d.ellipse([x-r, y-r, x+r, y+r], outline=(255,255,255,int(210*(1-u))), width=int(10*(1-u))+2)
        d.ellipse([x-r//2, y-r//2, x+r//2, y+r//2], outline=(255,220,80,int(170*(1-u))), width=5)

def draw_group(frame, d, t, t_start, pose_run=True, falling=False, giggle_from=None):
    for idx, name in enumerate(NAMES):
        cx, yb, w = GROUP[name]
        side = -1 if name in FIRE else 1
        ci = (FIRE.index(name) if name in FIRE else WATER.index(name))
        et = t_start + 0.13*ci
        u = clamp((t-et)/0.95)
        if u <= 0: continue
        x = (-180 if side < 0 else 900) + (cx - (-180 if side < 0 else 900)) * eo(u)
        y = yb + (bounce_y(t, et, et+0.95, 46) if u < 1 else math.sin(t*2.1+idx)*3)
        sx = sy = 1.0; rot = 0.0
        pose = "run" if (u < 1 and pose_run) else "happy"
        if 0.5 < u < 1:  # mid-run stretch
            sx, sy = 1.18, 0.85
            if side < 0: speed_lines(frame, d, x, y, w)
        if u >= 1 and (et+0.95) <= t <= (et+0.95)+0.16:  # landing squash
            sx, sy = 1.14, 0.86
        if falling and t > 5.2:
            gap = abs(cx-360)
            ft = 5.35 + (368-gap)/368.0 * 1.15
            fu = clamp((t-ft)/0.55)
            dirn = 1 if cx < 360 else -1
            if name == "boulder": dirn, ft = 1, 5.25; fu = clamp((t-ft)/0.7)
            rot = 36*dirn*eio(fu); y += 26*eio(fu); x += 20*dirn*eio(fu)
            pose = "sleepy" if name == "boulder" else "dizzy"
            if t > 7.3:
                ru = clamp((t-7.3)/0.5); rot *= (1-eio(ru)); pose = "happy"
            if t > 7.85:
                y += bounce_y(t, 7.85+idx*0.03, 8.35+idx*0.03, 22); pose = "laugh"
        if giggle_from and t > giggle_from:
            y += bounce_y(t, giggle_from+idx*0.05, giggle_from+0.55+idx*0.05, 26)
            y += bounce_y(t, giggle_from+0.8+idx*0.05, giggle_from+1.35+idx*0.05, 20)
            pose = "laugh"
        put(frame, xf(scaled(POSES[name][pose], w), sx, sy, rot), x, y)

def text_card(frame, t, tc, big, small=None):
    frame.alpha_composite(Image.new("RGBA", (W, H), (16, 22, 48, 255)), (0, 0))
    d = ImageDraw.Draw(frame)
    u = clamp((t-tc)/0.35)
    f = ImageFont.truetype(FONT, int(96*(0.6+0.4*eo(u))))
    d.text((W//2, 560), big, font=f, fill=(255, 170, 50, 255), anchor="mm",
           stroke_width=6, stroke_fill=(120, 40, 10, 255))
    if small and t > tc+0.3:
        d.text((W//2, 665), small, font=ImageFont.truetype(FONT, 40), fill=(140, 210, 255, 255), anchor="mm")

def melon_flight(t, legs):
    for (t0,t1,x0,y0,x1,y1,ap) in legs:
        if t0 <= t <= t1:
            u = (t-t0)/(t1-t0)
            return x0+(x1-x0)*u, y0+(y1-y0)*u+arc(u, ap), 170*u
    return None

def stars(frame, d, cx, cy, t, t0):
    if not (t0 <= t <= t0+1.3): return
    for k in range(3):
        ang = (t-t0)*4.2 + k*2.094
        sx, sy = cx + 52*math.cos(ang), cy - 30 + 16*math.sin(ang)
        pts = []
        for i in range(10):
            a = ang + i*math.pi/5 - math.pi/2
            rr = 11 if i % 2 == 0 else 5
            pts.append((sx+rr*math.cos(a), sy+rr*math.sin(a)))
        d.polygon(pts, fill=(255, 214, 64, 255))

def render(t):
    fr = BG.copy()
    d = ImageDraw.Draw(fr)
    jx = jy = 0
    for it0 in (11.05, 13.5, 18.1, 19.2, 20.3, 21.4, 22.5, 30.55):
        if it0 <= t <= it0+0.12:
            jx, jy = 7*math.sin(t*90), 7*math.cos(t*80)
    if t < 4.8:
        draw_group(fr, d, t, 0.05)
    elif t < 8.8:
        draw_group(fr, d, t, -10, falling=True)
    elif t < 10.0:
        text_card(fr, t, 8.8, "FIRE BABYS", "Melon Mayhem")
    elif t < 17.8:
        # Melon kick: Ruko (run/laugh) vs Boulder (dizzy)
        ry = 1050 + math.sin(t*2.2)*3; by = 1068 + math.sin(t*1.9)*3
        rpose = "run" if 10.0 < t < 10.35 or 12.55 < t < 12.75 or 15.9 < t < 16.25 else ("laugh" if t > 11.0 else "happy")
        rsx, rsy = (1.14, 0.86) if 15.9 < t < 16.25 else (1.0, 1.0)
        put(fr, xf(scaled(POSES["ruko"][rpose], 275), rsx, rsy), 175, ry)
        bpose = "dizzy" if (11.0 < t < 11.55 or 13.45 < t < 14.0) else "happy"
        bsy = 0.88 if (11.05 < t < 11.3 or 13.5 < t < 13.75) else 1.0
        put(fr, xf(scaled(POSES["boulder"][bpose], 335), 1.0, bsy), 520, by)
        legs = [(10.35, 11.05, 300, 985, 505, 745, 120),
                (11.05, 11.85, 505, 745, 295, 975, 130),
                (11.85, 12.55, 295, 975, 300, 985, 26),
                (12.55, 13.5, 300, 985, 508, 738, 175),
                (13.5, 14.5, 508, 738, 352, 1000, 120),
                (16.25, 17.7, 300, 985, 900, 600, 220)]
        m = melon_flight(t, legs)
        if t < 10.35: m = (300, 985 + bounce_y(t, 10.0, 10.3, 12), 0)
        if m:
            mel = xf(scaled(MELON, 118), 1.0, 1.0, m[2])
            fr.alpha_composite(mel, (int(m[0]-mel.width/2), int(m[1]-mel.height/2)))
        impact_flash(fr, d, 505, 745, t, 11.05)
        impact_flash(fr, d, 508, 738, t, 13.5)
    elif t < 25.8:
        # Headbutt rally: Splash & Drift
        sy = 1045 + math.sin(t*2.4)*3 + sum(bounce_y(t, a, b, 60) for a, b in [(18.1,18.5),(20.3,20.7),(22.5,22.9)])
        dy = 1045 + math.sin(t*2.1)*3 + sum(bounce_y(t, a, b, 60) for a, b in [(19.2,19.6),(21.4,21.8),(23.6,24.0)])
        spose = "dizzy" if 23.1 < t < 24.4 else ("shocked" if (17.9 < t < 18.3 or 20.1 < t < 20.5 or 22.3 < t < 22.7) else "happy")
        dpose = "dizzy" if 23.9 < t < 24.9 else ("shocked" if (19.0 < t < 19.4 or 21.2 < t < 21.6) else ("laugh" if t > 24.5 else "happy"))
        put(fr, xf(scaled(POSES["splash"][spose], 265)), 180, sy)
        put(fr, xf(scaled(POSES["drift"][dpose], 265)), 548, dy)
        legs = [(18.1, 19.2, 205, 760, 520, 752, 150),
                (19.2, 20.3, 520, 752, 205, 760, 150),
                (20.3, 21.4, 205, 760, 520, 752, 165),
                (21.4, 22.5, 520, 752, 205, 760, 150),
                (22.5, 23.05, 205, 760, 190, 800, 60)]
        m = melon_flight(t, legs)
        if 17.5 < t < 18.1: m = (205, 820 + (t-17.5)*140, 0)
        if m and t < 23.05:
            mel = xf(scaled(MELON, 112), 1.0, 1.0, m[2])
            fr.alpha_composite(mel, (int(m[0]-mel.width/2), int(m[1]-mel.height/2)))
        stars(fr, d, 180, 745, t, 23.1)
        if t >= 23.05:
            u = clamp((t-23.05)/1.4)
            mx = 190 + (505-190)*eo(u)
            mel = xf(scaled(MELON, 112), 1.0, 1.0, 540*u)
            fr.alpha_composite(mel, (int(mx-mel.width/2), int(1000-mel.height/2)))
        for it in (18.1, 19.2, 20.3, 21.4, 22.5):
            impact_flash(fr, d, 363, 755, t, it)
    elif t < 33.8:
        # Cinder rocket + bush crash
        bush = scaled(BUSH, 340)
        put(fr, bush, 595, 1085)
        def cinder_pos(t):
            if t < 28.2:
                u = clamp((t-25.9)/2.3)
                return -140 + 1000*u, 1055 + 26*math.sin(t*10), 14*math.sin(t*16)
            if t < 29.3:
                u = clamp((t-28.2)/1.1)
                return 860 - 330*eio(u), 1055 - 190*math.sin(u*math.pi), -320*u
            if t < 30.55:
                u = clamp((t-29.3)/1.25)
                return 530 + 70*u, 865 + 110*eio(u), 260*u
            return None
        cp = cinder_pos(t)
        if cp and t < 30.55:
            for k in range(1, 9):
                past = cinder_pos(t-k*0.045) if t-k*0.045 >= 25.9 else None
                if past:
                    r = 20 - k*2
                    col = (255, 140, 30, 200-k*20) if k % 2 else (255, 205, 60, 200-k*20)
                    d.ellipse([past[0]-r, past[1]-60-r, past[0]+r, past[1]-60+r], fill=col)
            put(fr, xf(scaled(POSES["cinder"]["run"], 250), rot=cp[2]), cp[0], cp[1])
            if t >= 29.3:
                mel = scaled(MELON, 105)
                fr.alpha_composite(mel, (int(cp[0]-mel.width/2), int(cp[1]-250-52)))
        if 30.3 < t < 31.15:
            put(fr, xf(bush, 1.06, 0.94), 595 + 6*math.sin(t*40), 1085)
            for k in range(6):
                ang = k*1.05 + 0.4
                lx = 595 + 150*math.cos(ang)*(t-30.3)*2.2
                ly = 940 + 90*math.sin(ang)*(t-30.3)*2.2
                d.ellipse([lx-13, ly-9, lx+13, ly+9], fill=(64, 168, 74, 255))
        impact_flash(fr, d, 595, 950, t, 30.55)
        if t >= 31.1:
            u = clamp((t-31.1)/0.55); pop = eo(u)
            cim = xf(scaled(POSES["cinder"]["laugh"], 250), 0.3+0.7*pop, 0.3+0.7*pop)
            yb = 1035 - abs(bounce_y(t, 31.1, 31.65, 130)) + (bounce_y(t, 31.9, 32.4, 30) + bounce_y(t, 32.7, 33.2, 30))
            put(fr, cim, 595, yb)
            mel = scaled(MELON, 105)
            fr.alpha_composite(mel, (int(595-mel.width/2), int(yb-cim.height-58)))
    elif t < 37.8:
        draw_group(fr, d, t, 33.5-4.8, giggle_from=34.3)
    else:
        draw_group(fr, d, t, -10)
        fr.alpha_composite(Image.new("RGBA", (W, H), (10, 14, 34, int(200*clamp((t-37.8)/0.6)))), (0, 0))
        d2 = ImageDraw.Draw(fr)
        f = ImageFont.truetype(FONT, 92)
        d2.text((W//2, 540), "FIRE BABYS", font=f, fill=(255, 170, 50, 255), anchor="mm",
                stroke_width=6, stroke_fill=(120, 40, 10, 255))
        d2.text((W//2, 640), "The future is BLAZING FOR FIRE BABYS",
                font=ImageFont.truetype(FONT, 34), fill=(240, 244, 255, 255), anchor="mm")
    if jx or jy:  # impact frame jitter
        fr = fr.transform((W, H), Image.AFFINE, (1, 0, jx, 0, 1, jy))
    return fr

OUT = os.path.expanduser("~/workspace/fire-babys-shows/episodes/ep01/frames2")
os.makedirs(OUT, exist_ok=True)
TOTAL = int(39.6 * FPS)
for f in range(TOTAL):
    render(f / FPS).convert("RGB").save(f"{OUT}/f{f:04d}.jpg", quality=92)
print("frames:", TOTAL)
