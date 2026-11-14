#!/usr/bin/env python3
import os, re, json, glob
deploy=os.path.expanduser("~/workspace/.deploy")
files=[("SPLASH",deploy+"/play.html"),("3D",deploy+"/3d.html"),("game-02",deploy+"/fire-world/game-02-blaze-runner.html")]
for p in sorted(glob.glob(deploy+"/fire-world/games/*.html")):
    files.append((os.path.basename(p),p))
out=[]
for name,path in files:
    try: txt=open(path,encoding="utf-8",errors="ignore").read()
    except Exception as e: out.append({"name":name,"error":str(e)}); continue
    low=txt.lower()
    title=""
    m=re.search(r"<title>(.*?)</title>",txt,re.I|re.S)
    if m: title=re.sub(r"\s+"," ",m.group(1)).strip()
    # overlay/instruction text snippet
    ov=""
    m2=re.search(r'id="overlay".*?</div>\s*</div>',txt,re.S)
    if m2: ov=re.sub(r"<[^>]+>"," ",m2.group(0)); ov=re.sub(r"\s+"," ",ov).strip()[:400]
    out.append({
      "name":name,"title":title,"size_kb":round(len(txt.encode())/1024),
      "has_canvas":"<canvas" in low,
      "has_viewport_meta":"viewport" in low,
      "keyboard":"keydown" in low or "keyup" in low,
      "pointer":"pointerdown" in low or "pointermove" in low,
      "touch":"touchstart" in low or "touchmove" in low,
      "pointercancel":"pointercancel" in low,
      "pause": bool(re.search(r"pause|paused|\\bpause\\b|⏸",low)),
      "pause_word": "pause" in low,
      "restart": bool(re.search(r"restart|play again|try again|retry",low)),
      "mute": bool(re.search(r"mute|🔇|🔊|sound on|sound off",low)),
      "audio": bool(re.search(r"audiocontext|webaudio|new audio|\\.mp3|\\.wav|\\.ogg|sfx",low)),
      "score_hud": bool(re.search(r"score",low)),
      "health_hud": bool(re.search(r"health|hp|lives|❤|♥",low)),
      "instructions": bool(re.search(r"how to|instructions|tap to|drag|use .* keys|arrow|swipe",low)),
      "gameover": bool(re.search(r"game over|gameover|you win|victory|level complete",low)),
      "screenshake": bool(re.search(r"shake|screenshake",low)),
      "particles": bool(re.search(r"particle",low)),
      "overlay_text":ov,
      "inline_scripts": low.count("<script"),
      "external_scripts": len(re.findall(r'<script[^>]+src=',low)),
    })
for g in ["rukos-panic-dash","slingshot-cascade","trinitys-holy-lightning-rescue","tristans-dark-knight-rescue"]:
    d=os.path.join(deploy,"fire-world",g)
    total=sum(os.path.getsize(os.path.join(r,f)) for r,_,fs in os.walk(d) for f in fs) if os.path.isdir(d) else 0
    out.append({"name":g,"title":"Godot export","size_kb":round(total/1024),"godot":True,"has_index":os.path.exists(os.path.join(d,"index.html"))})
json.dump(out,open(os.path.expanduser("~/workspace/fire-babys-gamer-check/static-results.json"),"w"),indent=1)
for o in out: print(o)
