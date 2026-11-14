#!/usr/bin/env python3
"""Fire Babys Episode 1 'Melon Mayhem' - cutout build. 720x1280 @24fps."""
import math, os
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 720, 1280, 24
CD = os.path.expanduser("~/workspace/fire-babys-shows/characters")
BG = Image.open(os.path.expanduser(
    "~/workspace/fire-babys-shows/assets/media-generation-vertical-9-16-cartoon-backgrou-0-448584f2-6ed4-4095-a850-d64185a71783.webp")
).convert("RGB").resize((W, H)).convert("RGBA")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def load(p):
    return Image.open(os.path.join(CD, "cutouts", p + ".png"))
def loadp(p):
    return Image.open(os.path.join(CD, "props", p + ".png"))

SPR = {n: load(n) for n in ["blaze","ruko","boulder","sizzle","cinder","lord-inferno",
                             "aqua","splash","pebble","drift","bubble","lord-tidal"]}
MELON = loadp("melon"); BUSH = loadp("bush")

def scaled(im, w):
    return im.resize((max(1,int(w)), max(1,int(im.height*w/im.width))), Image.LANCZOS)

def xf(im, sx=1.0, sy=1.0, rot=0.0):
    out = im.resize((max(1,int(im.width*sx)), max(1,int(im.height*sy))), Image.LANCZOS)
    if rot:
        out = out.rotate(rot, resample=Image.BICUBIC, expand=True)
    return out

def put(frame, im, cx, yb):
    """paste sprite anchored by bottom-center (cx, yb)"""
    frame.alpha_composite(im, (int(cx - im.width/2), int(yb - im.height)))

def eo(u):  return 1-(1-u)**3
def eio(u): return u*u*(3-2*u)
def clamp(u): return max(0.0, min(1.0, u))
def arc(u, h): return -4*h*u*(1-u)

def bounce_y(t, t0, t1, h):
    if t0 <= t <= t1:
        return arc((t-t0)/(t1-t0), h)
    return 0.0

# ---------- layout for group scenes ----------
# name: (cx, y_bottom, width)
GROUP = {
    "sizzle": (70, 945, 168), "ruko": (177, 950, 180), "blaze": (285, 938, 198),
    "aqua": (435, 938, 198), "bubble": (545, 950, 168), "drift": (652, 945, 168),
    "lord-inferno": (55, 1055, 142), "cinder": (162, 1048, 165), "boulder": (268, 1065, 272),
    "pebble": (466, 1065, 258), "splash": (580, 1048, 172), "lord-tidal": (672, 1055, 142),
}
FIRE = ["blaze","ruko","sizzle","cinder","boulder","lord-inferno"]
WATER = ["aqua","splash","pebble","drift","bubble","lord-tidal"]

def draw_group(frame, t, t_start, falling=False, giggle_from=None):
    order = sorted(GROUP.items(), key=lambda kv: abs(kv[1][0]-360))
    for name, (cx, yb, w) in GROUP.items():
        base = scaled(SPR[name], w)
        side = -1 if name in FIRE else 1
        idx = (FIRE + WATER).index(name)
        et = t_start + 0.13*((FIRE.index(name)) if name in FIRE else (WATER.index(name)))
        u = clamp((t-et)/0.95)
        if u <= 0: continue
        x = (-180 if side<0 else 900) + (cx - (-180 if side<0 else 900)) * eo(u)
        y = yb + (bounce_y(t, et, et+0.95, 46) if u < 1 else math.sin(t*2.1+idx)*3)
        sx = sy = 1.0; rot = 0.0
        if falling and t > 5.0:
            # dominoes: center-out chain toward the middle... everyone tips inward
            center_gap = abs(cx-360)
            ft = 5.15 + (368-center_gap)/368.0 * 1.15
            fu = clamp((t-ft)/0.55)
            dirn = 1 if cx < 360 else -1
            if name == "boulder": dirn, ft = 1, 5.05; fu = clamp((t-ft)/0.7)
            rot = 36*dirn*eio(fu)
            y += 26*eio(fu); x += 20*dirn*eio(fu)
            if t > 7.1:
                ru = clamp((t-7.1)/0.5)
                rot *= (1-eio(ru)); 
            if t > 7.55:
                y += bounce_y(t, 7.6+idx*0.03, 8.15+idx*0.03, 22)
        if giggle_from and t > giggle_from:
            y += bounce_y(t, giggle_from+idx*0.05, giggle_from+0.55+idx*0.05, 26)
            y += bounce_y(t, giggle_from+0.8+idx*0.05, giggle_from+1.35+idx*0.05, 20)
        put(frame, xf(base, sx, sy, rot), x, y)

def text_card(frame, t, tc, big, small=None):
    dark = Image.new("RGBA", (W, H), (16, 22, 48, 255))
    frame.alpha_composite(dark, (0, 0))
    d = ImageDraw.Draw(frame)
    u = clamp((t-tc)/0.35)
    size = int(96 * (0.6 + 0.4*eo(u)))
    f = ImageFont.truetype(FONT, size)
    d.text((W//2, 560), big, font=f, fill=(255, 170, 50, 255), anchor="mm",
           stroke_width=6, stroke_fill=(120, 40, 10, 255))
    if small and t > tc+0.3:
        f2 = ImageFont.truetype(FONT, 40)
        d.text((W//2, 665), small, font=f2, fill=(140, 210, 255, 255), anchor="mm")

def melon_flight(t, legs):
    """legs: list of (t0,t1,x0,y0,x1,y1,apex). returns (x,y,rot) or None"""
    for (t0,t1,x0,y0,x1,y1,ap) in legs:
        if t0 <= t <= t1:
            u = (t-t0)/(t1-t0)
            x = x0 + (x1-x0)*u
            y = y0 + (y1-y0)*u + arc(u, ap)
            return x, y, 160*u
    return None

def stars(frame, cx, cy, t, t0):
    if not (t0 <= t <= t0+1.3): return
    d = ImageDraw.Draw(frame)
    for k in range(3):
        ang = (t-t0)*4.2 + k*2.094
        sx, sy = cx + 52*math.cos(ang), cy - 30 + 16*math.sin(ang)
        r = 11
        pts = []
        for i in range(10):
            a = ang + i*math.pi/5 - math.pi/2
            rr = r if i % 2 == 0 else r*0.45
            pts.append((sx+rr*math.cos(a), sy+rr*math.sin(a)))
        d.polygon(pts, fill=(255, 214, 64, 255))

def render(t):
    fr = BG.copy()
    if t < 4.5:
        draw_group(fr, t, 0.05)
        if t > 3.7:
            for i, (name, (cx, yb, w)) in enumerate(GROUP.items()): pass
    elif t < 8.5:
        draw_group(fr, t, -10, falling=True)
    elif t < 9.7:
        text_card(fr, t, 8.5, "FIRE BABYS", "Melon Mayhem")
    elif t < 17.7:
        # Melon kick: Ruko vs Boulder
        ruko = scaled(SPR["ruko"], 275); bould = scaled(SPR["boulder"], 335)
        ry = 1050 + math.sin(t*2.2)*3; by = 1068 + math.sin(t*1.9)*3
        rsq = 1.0
        if 15.9 < t < 16.25: rsq = 0.85  # wind-up squash before big launch
        put(fr, xf(ruko, 2-rsq if rsq<1 else 1.0, rsq), 175, ry)
        bsy = 0.88 if (11.05 < t < 11.3 or 13.5 < t < 13.75) else 1.0
        put(fr, xf(bould, 1.0, bsy), 520, by)
        legs = [
            (10.35, 11.05, 300, 985, 505, 745, 120),
            (11.05, 11.85, 505, 745, 295, 975, 130),
            (11.85, 12.55, 295, 975, 300, 985, 26),   # dribble hop
            (12.55, 13.5, 300, 985, 508, 738, 175),
            (13.5, 14.5, 508, 738, 352, 1000, 120),
            (16.25, 17.55, 300, 985, 890, 620, 210),  # LAUNCH off-screen
        ]
        m = melon_flight(t, legs)
        if t < 10.35:
            m = (300, 985 + bounce_y(t, 9.8, 10.3, 12), 0)
        if m:
            mel = xf(scaled(MELON, 118), 1.0, 1.0, m[2] if len(m) > 2 else 0)
            fr.alpha_composite(mel, (int(m[0]-mel.width/2), int(m[1]-mel.height/2)))
        if t > 14.8:
            pass
    elif t < 25.7:
        # Headbutt rally: Splash & Drift
        spl = scaled(SPR["splash"], 265); drf = scaled(SPR["drift"], 265)
        syb, dyb = 1045, 1045
        jump_s = -abs(bounce_y(t, 18.15, 18.5, 55)) + bounce_y(t, 18.15, 18.5, 55)*0
        sy = syb + math.sin(t*2.4)*3 + (bounce_y(t, 18.1, 18.5, 60) + bounce_y(t, 20.3, 20.7, 60) + bounce_y(t, 22.5, 22.9, 60))
        dy = dyb + math.sin(t*2.1)*3 + (bounce_y(t, 19.2, 19.6, 60) + bounce_y(t, 21.4, 21.8, 60) + bounce_y(t, 23.6, 24.0, 60))
        wob = 6*math.sin(t*9) if 23.1 < t < 24.3 else 0
        put(fr, xf(spl, rot=wob), 180, sy)
        put(fr, xf(drf), 548, dy)
        legs = [
            (18.1, 19.2, 205, 760, 520, 752, 150),
            (19.2, 20.3, 520, 752, 205, 760, 150),
            (20.3, 21.4, 205, 760, 520, 752, 165),
            (21.4, 22.5, 520, 752, 205, 760, 150),
            (22.5, 23.05, 205, 760, 190, 800, 60),  # bonk, drops at Splash
        ]
        m = melon_flight(t, legs)
        if 17.7 < t < 18.1:
            m = (205, 820 + (t-17.7)*140, 0)
        if m and t < 23.05:
            mel = xf(scaled(MELON, 112), 1.0, 1.0, m[2] if len(m) > 2 else 0)
            fr.alpha_composite(mel, (int(m[0]-mel.width/2), int(m[1]-mel.height/2)))
        stars(fr, 180, 745, t, 23.1)
        if t >= 23.05:  # melon rolls to Drift's feet
            u = clamp((t-23.05)/1.4)
            mx = 190 + (505-190)*eo(u); my = 1000
            mel = xf(scaled(MELON, 112), 1.0, 1.0, 540*u)
            fr.alpha_composite(mel, (int(mx-mel.width/2), int(my-mel.height/2)))
    elif t < 33.7:
        # Cinder rocket + bush crash
        cin = scaled(SPR["cinder"], 250)
        bush = scaled(BUSH, 340)
        put(fr, bush, 595, 1085)
        d = ImageDraw.Draw(fr)
        def cinder_pos(t):
            if t < 28.2:
                u = clamp((t-25.9)/2.3)
                x = -140 + (860+140)*u
                y = 1055 + 26*math.sin(t*10)
                return x, y, 14*math.sin(t*16)
            if t < 29.3:
                u = clamp((t-28.2)/1.1)
                x = 860 - 330*eio(u)
                y = 1055 - 190*math.sin(u*math.pi)
                return x, y, -320*u
            if t < 30.55:
                u = clamp((t-29.3)/1.25)
                x = 530 + (600-530)*u
                y = 865 + (975-865)*eio(u)
                return x, y, 260*u
            return None  # in the bush
        cp = cinder_pos(t)
        if cp and t < 30.55:
            # flame trail
            for k in range(1, 9):
                tt = t - k*0.045
                past = cinder_pos(tt) if tt >= 25.9 else None
                if past:
                    r = 20 - k*2
                    col = (255, 140, 30, 200-k*20) if k % 2 else (255, 205, 60, 200-k*20)
                    d.ellipse([past[0]-r, past[1]-60-r, past[0]+r, past[1]-60+r], fill=col)
            put(fr, xf(cin, rot=cp[2]), cp[0], cp[1])
            if t >= 29.3:  # carrying the melon overhead
                mel = scaled(MELON, 105)
                fr.alpha_composite(mel, (int(cp[0]-mel.width/2), int(cp[1]-cin.height-52)))
        if 30.3 < t < 31.1:  # bush shake burst
            fr2 = fr
            put(fr2, xf(bush, 1.06, 0.94), 595 + 6*math.sin(t*40), 1085)
            for k in range(6):
                ang = k*1.05 + 0.4
                lx = 595 + 150*math.cos(ang)*(t-30.3)*2.2; ly = 940 + 90*math.sin(ang)*(t-30.3)*2.2
                d.ellipse([lx-13, ly-9, lx+13, ly+9], fill=(64, 168, 74, 255))
        if t >= 31.05:  # Cinder pops out of the bush, melon overhead
            u = clamp((t-31.05)/0.55)
            pop = eo(u)
            cim = xf(cin, 0.3+0.7*pop, 0.3+0.7*pop)
            put(fr, cim, 595, 1035 - abs(bounce_y(t, 31.05, 31.6, 130)) + (bounce_y(t, 31.9, 32.4, 30) + bounce_y(t, 32.7, 33.2, 30)))
            mel = scaled(MELON, 105)
            fr.alpha_composite(mel, (int(595-mel.width/2), int(1035-abs(bounce_y(t,31.05,31.6,130))-cim.height-58)))
    elif t < 37.7:
        draw_group(fr, t, 33.7-4.6, giggle_from=34.3)  # already in place; gentle giggles
        # NOTE: draw_group entries replayed instantly since t_start far past
    else:
        fr2 = BG.copy()
        draw_group(fr2, t, -10)
        ov = Image.new("RGBA", (W, H), (10, 14, 34, int(200*clamp((t-37.7)/0.6))))
        fr2.alpha_composite(ov, (0, 0))
        fr = fr2
        d = ImageDraw.Draw(fr)
        f = ImageFont.truetype(FONT, 92)
        d.text((W//2, 540), "FIRE BABYS", font=f, fill=(255, 170, 50, 255), anchor="mm",
               stroke_width=6, stroke_fill=(120, 40, 10, 255))
        f2 = ImageFont.truetype(FONT, 34)
        d.text((W//2, 640), "The future is BLAZING FOR FIRE BABYS", font=f2,
               fill=(240, 244, 255, 255), anchor="mm")
    return fr

OUT = os.path.expanduser("~/workspace/fire-babys-shows/episodes/ep01/frames")
os.makedirs(OUT, exist_ok=True)
TOTAL = int(39.7 * FPS)
for f in range(TOTAL):
    render(f / FPS).convert("RGB").save(f"{OUT}/f{f:04d}.jpg", quality=92)
print("frames:", TOTAL)
