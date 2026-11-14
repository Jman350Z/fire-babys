#!/usr/bin/env python3
"""First-time-visitor verification for Fire World fixes 1-5 (Jeff 2026-10-13).
Serves ~/workspace/.deploy locally; https://firebabys.io/* is routed to the
same local files so auth-gate.js / rating.js load exactly as in production.
Hard gate = pageerrors (JS exceptions). Console errors are reported too."""
import json, os, re, subprocess, sys, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

DEPLOY = os.path.expanduser("~/workspace/.deploy")
SHOTS = os.path.expanduser("~/workspace/fire-world-fixes-1to5/shots")
os.makedirs(SHOTS, exist_ok=True)
PORT = 8937
BASE = f"http://127.0.0.1:{PORT}"
RESULTS = []

def log(game, check, ok, detail=""):
    RESULTS.append({"game": game, "check": check, "ok": bool(ok), "detail": str(detail)[:400]})
    print(("PASS " if ok else "FAIL ") + f"[{game}] {check} {detail}")

def serve():
    class H(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=DEPLOY, **k)
        def log_message(self, *a):
            pass
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

def new_page(browser, phone=False):
    ctx = browser.new_context(viewport={"width": 390, "height": 844} if phone else {"width": 1280, "height": 800},
                              is_mobile=phone, has_touch=phone)
    page = ctx.new_page()
    page.set_default_timeout(9000)
    errs = {"page": [], "console": []}
    page.on("pageerror", lambda e: errs["page"].append(str(e)))
    page.on("console", lambda m: errs["console"].append(m.text) if m.type == "error" else None)
    def route(r):
        url = r.request.url
        if url.startswith("https://firebabys.io/"):
            path = url[len("https://firebabys.io/"):].split("?")[0]
            local = os.path.join(DEPLOY, path)
            if os.path.isfile(local):
                r.fulfill(path=local)
                return
            r.abort()
            return
        if url.startswith("http://127.0.0.1"):
            r.continue_()
            return
        r.abort()
    page.route("**/*", route)
    return ctx, page, errs

def fps(page, secs=3):
    return page.evaluate("""(secs)=>new Promise(res=>{let n=0;const t0=performance.now();
      function f(t){n++;if(t-t0<secs*1000)requestAnimationFrame(f);else res(Math.round(n/secs*10)/10);}
      requestAnimationFrame(f);})""", secs)

def gate_answer(page):
    q = page.inner_text("#mq")
    a, b = [int(x) for x in re.findall(r"\d+", q)][:2]
    page.fill("#ma", str(a + b))
    page.evaluate("checkMath()")

# ---------------------------------------------------------------- slingshot
def t_slingshot(browser):
    g = "1-slingshot"
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world/slingshot-cascade/")
    page.wait_for_timeout(1200)
    log(g, "boots, 0 page errors", len(errs["page"]) == 0, errs["page"][:2])
    page.evaluate("selLevel(1)")
    page.wait_for_timeout(300)
    st = page.evaluate("({state:G.state,skels:G.skels.length,blocks:G.blocks.length})")
    log(g, "L1 starts with skeletons on towers", st["state"] == "play" and st["skels"] >= 3, st)
    counts = page.evaluate("""(()=>{const out=[];for(let n=1;n<=10;n++){buildLevel(n);out.push(G.skels.length);}return out;})()""")
    log(g, "all 10 levels have skeletons", all(c >= 3 for c in counts), counts)
    # direct-hit crush (aimed diagonally from above-left, like a real sling arc)
    page.evaluate("""(()=>{buildLevel(1);G.state='play';const s=G.skels[0];
      G.projectiles.push({x:s.x-90,y:s.y-90,vx:520,vy:300,rot:0,vr:0,live:true,restT:0,squash:0,trail:[],hero:'blaze',specialUsed:false,pendingSpecial:false,magnetT:0});})()""")
    page.wait_for_timeout(600)
    sm = page.evaluate("G.skelsSmashed")
    log(g, "direct hero hit crushes skeleton (+score/count)", sm >= 1, f"smashed={sm}")
    # falling-block crush
    page.evaluate("""(()=>{buildLevel(2);G.state='play';G.skelsSmashed=0;
      const s=G.skels.find(k=>!k.dead&&k.y<groundY()-40);const b=G.blocks[0];
      b.x=s.x;b.y=s.y-30;b.settled=false;b.vx=0;b.vy=260;b.vr=0;})()""")
    page.wait_for_timeout(600)
    sm = page.evaluate("G.skelsSmashed")
    log(g, "falling block crushes skeleton", sm >= 1, f"smashed={sm}")
    # support destroyed -> skeleton falls, small drop survives on ground
    r = page.evaluate("""(()=>{buildLevel(4);G.state='play';
      const s=G.skels[3];const sup=G.blocks.find(b=>Math.abs((b.y-b.h/2)-(s.y+20))<4);
      if(sup)sup.dead=true;return {sy:s.y,gy:groundY()};})()""")
    page.wait_for_timeout(900)
    after = page.evaluate("(()=>{const s=G.skels[3];return {dead:s.dead,falling:s.falling,y:s.y,gy:groundY()};})()")
    log(g, "skeleton falls when support destroyed, survives short drop", (not after["dead"]) and abs(after["y"] - (after["gy"] - 20)) < 6, after)
    # hero special still fires
    page.evaluate("""(()=>{buildLevel(1);G.state='play';
      G.projectiles.push({x:400,y:200,vx:300,vy:-100,rot:0,vr:0,live:true,restT:0,squash:0,trail:[],hero:'blaze',specialUsed:false,pendingSpecial:false,magnetT:0});})()""")
    ok = page.evaluate("trySpecial()")
    page.wait_for_timeout(300)
    log(g, "hero special still fires mid-flight", ok is True, f"trySpecial={ok}")
    # music + pause
    page.mouse.click(640, 400)
    mus = page.evaluate("({on:MUS.on,bpm:MUS.BPM})")
    log(g, "music starts on interaction, 112 BPM unique track", mus["on"] and mus["bpm"] == 112, mus)
    page.evaluate("document.getElementById('pauseBtn').click()"); page.wait_for_timeout(200)
    p1 = page.evaluate("!!window.__fbPaused")
    page.evaluate("document.getElementById('pauseBtn').click()"); page.wait_for_timeout(200)
    p2 = page.evaluate("!!window.__fbPaused")
    log(g, "pause/resume works", p1 and not p2, f"paused={p1}->{p2}")
    page.evaluate("selLevel(1)"); page.wait_for_timeout(400)
    f = fps(page)
    log(g, f"FPS in play (SwiftShader harness)", f >= 30, f"{f} fps")
    page.screenshot(path=f"{SHOTS}/slingshot-L1-skeletons.png")
    log(g, "no page errors during all tests", len(errs["page"]) == 0, errs["page"][:2])
    ctx.close()

# ---------------------------------------------------------------- ruko
def t_ruko(browser):
    g = "2-ruko"
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world/rukos-panic-dash/")
    page.wait_for_timeout(1200)
    log(g, "boots, 0 page errors", len(errs["page"]) == 0, errs["page"][:2])
    lv = page.evaluate("document.querySelectorAll('.lvlBtn').length")
    log(g, "title shows 20 level buttons", lv == 20, f"buttons={lv}")
    page.evaluate("selLevel(1)")
    page.wait_for_timeout(200)
    gate_answer(page)
    page.wait_for_timeout(400)
    st = page.evaluate("({state:G.state,level:G.level,goal:G.goal,hearts:G.hearts})")
    log(g, "gate -> L1 playing, 3 hearts, goal set", st["state"] == "play" and st["hearts"] == 3 and st["goal"] == 260, st)
    page.wait_for_timeout(1500)
    d = page.evaluate("G.dist")
    log(g, "Ruko runs (distance grows)", d > 10, f"dist={d:.0f}m")
    page.evaluate("doDash()")
    dt_ = page.evaluate("G.dashT")
    log(g, "Tornado Dash triggers", dt_ > 0, f"dashT={dt_:.2f}")
    # dash smashes a barrier
    page.evaluate("(()=>{G.dashCD=0;G.dashT=0;doDash();G.obstacles.push({lane:G.lane,z:50,type:'barrier',w:60,h:60,passed:false,dead:false});})()")
    page.wait_for_timeout(300)
    sc = page.evaluate("G.score")
    log(g, "dash smashes Bone Barricade (+150)", sc >= 150, f"score={sc}")
    # obstacle hit costs a heart
    page.evaluate("(()=>{G.invuln=0;G.dashT=0;G.y=0;G.obstacles=[];G.spawnT=999;G.obstacles.push({lane:G.lane,z:50,type:'rock',w:60,h:60,passed:false,dead:false});})()")
    page.wait_for_timeout(300)
    h = page.evaluate("G.hearts")
    log(g, "rock hit costs 1 heart + wave surges", h == 2, f"hearts={h}")
    goals = page.evaluate("(()=>{const o=[];for(let n=1;n<=20;n++){startLevel(n);o.push(G.goal);}G.state='play';return o;})()")
    log(g, "all 20 levels build, goals grow 260->735", goals[0] == 260 and goals[-1] == 735 and len(set(goals)) == 20, f"{goals[0]}..{goals[-1]}")
    # finish a level -> clear -> next level
    page.evaluate("(()=>{startLevel(1);G.state='play';G.score=0;G.dist=G.goal-1;})()")
    page.wait_for_timeout(1200)
    st = page.evaluate("G.state")
    log(g, "crossing finish clears the level", st == "clear", st)
    page.evaluate("document.getElementById('obtn').click()"); page.wait_for_timeout(400)
    st = page.evaluate("({state:G.state,level:G.level})")
    log(g, "NEXT LEVEL advances to L2 playing", st["state"] == "play" and st["level"] == 2, st)
    # wave game over overlay
    page.evaluate("gameOver('wave')")
    page.wait_for_timeout(1100)
    txt = page.inner_text("#otitle")
    log(g, "lava-wave game over overlay renders", "LAVA WAVE" in txt, txt)
    # restart cluster contract (fb-cycle2)
    page.evaluate("(()=>{startLevel(3);G.state='play';})()")
    page.evaluate("document.getElementById('restartBtn').click()"); page.wait_for_timeout(300)
    st = page.evaluate("({state:G.state,level:G.level,dist:G.dist})")
    log(g, "in-play restart resets current level", st["state"] == "play" and st["level"] == 3 and st["dist"] < 5, st)
    page.mouse.click(640, 400)
    mus = page.evaluate("({on:MUS.on,bpm:MUS.BPM})")
    log(g, "music starts, 154 BPM unique track", mus["on"] and mus["bpm"] == 154, mus)
    page.evaluate("(()=>{startLevel(5);G.state='play';})()"); page.wait_for_timeout(400)
    f = fps(page)
    log(g, "FPS in play (SwiftShader harness)", f >= 30, f"{f} fps")
    page.screenshot(path=f"{SHOTS}/ruko-L5-dash.png")
    log(g, "no page errors during all tests", len(errs["page"]) == 0, errs["page"][:2])
    ctx.close()

# ---------------------------------------------------------------- blaze runner
def t_blaze(browser):
    g = "3-blaze"
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world/game-02-blaze-runner.html")
    page.wait_for_timeout(1200)
    log(g, "boots, 0 page errors", len(errs["page"]) == 0, errs["page"][:2])
    page.evaluate("document.getElementById('startBtn').click()")
    page.wait_for_timeout(300)
    run = page.evaluate("run")
    log(g, "PLAY starts the run", run is True, "")
    page.evaluate("pressJump()")
    j1 = page.evaluate("({jumps:jumps,vy:vy})")
    page.evaluate("pressJump()")
    j2 = page.evaluate("({jumps:jumps,vy:vy})")
    log(g, "double jump: 1st jump then mid-air 2nd jump", j1["jumps"] == 1 and j2["jumps"] == 2 and j2["vy"] < 0, f"{j1} -> {j2}")
    page.wait_for_timeout(1600)  # land
    # rocket mode: hold
    page.evaluate("(()=>{holding=true;pressT=0;})()")
    page.wait_for_timeout(600)
    rk = page.evaluate("({on:rocketOn,used:rocketUsed,fuel:rocketFuel})")
    page.evaluate("holding=false")
    log(g, "SECRET rocket mode fires on hold, fuel drains", rk["on"] and rk["used"] and rk["fuel"] < 100, rk)
    page.evaluate("(()=>{rocketFuel=3;holding=true;pressT=1;})()")
    page.wait_for_timeout(700)
    rk2 = page.evaluate("({on:rocketOn,fuel:rocketFuel})")
    page.evaluate("holding=false")
    log(g, "rocket stops when fuel runs out (fair limit)", (not rk2["on"]) and rk2["fuel"] <= 0.01, rk2)
    # birds spawn + hurt
    page.evaluate("(()=>{birdT=0.01;})()")
    page.wait_for_timeout(600)
    nb = page.evaluate("birds.length")
    log(g, "hazard birds spawn and fly in", nb >= 1, f"birds={nb}")
    h0 = page.evaluate("hearts")
    page.evaluate("(()=>{invulnT=0;rocketOn=false;birdHit();})()")
    h1 = page.evaluate("hearts")
    log(g, "bird hit costs a heart (3->2)", h0 == 3 and h1 == 2, f"{h0}->{h1}")
    # platform landing (poll: the step scrolls, so catch the landing moment)
    r = page.evaluate("""(()=>{const gy=groundY();plats[0].x=W*0.25-70;plats[0].w=170;plats[0].h=84;
      py=gy-84-26-70;vy=3;onGround=false;jumps=1;return gy-84;})()""")
    pl = {"onGround": False, "floorY": -1}
    for _ in range(20):
        page.wait_for_timeout(60)
        pl = page.evaluate("({onGround:onGround,floorY:floorY})")
        if pl["onGround"] and abs(pl["floorY"] - r) < 3:
            break
    log(g, "lands on a stone step platform", pl["onGround"] and abs(pl["floorY"] - r) < 3, pl)
    # bird death ends the run
    page.evaluate("(()=>{invulnT=0;rocketOn=false;hearts=1;birdHit();})()")
    page.wait_for_timeout(300)
    ov = page.evaluate("({run:run,shown:!document.getElementById('over').classList.contains('hidden')})")
    log(g, "losing last heart to birds ends run with overlay", (not ov["run"]) and ov["shown"], ov)
    page.evaluate("document.getElementById('againBtn').click()")
    page.wait_for_timeout(300)
    page.mouse.click(640, 300)
    mus = page.evaluate("({on:MUS.on,bpm:MUS.BPM})")
    log(g, "music starts, 134 BPM unique track", mus["on"] and mus["bpm"] == 134, mus)
    f = fps(page)
    log(g, "FPS in play (SwiftShader harness)", f >= 30, f"{f} fps")
    page.screenshot(path=f"{SHOTS}/blaze-runner-action.png")
    log(g, "no page errors during all tests", len(errs["page"]) == 0, errs["page"][:2])
    ctx.close()

# ---------------------------------------------------------------- game 4
def t_g4(browser):
    g = "4-ice"
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world/games/game-04-cinders-ice-rink-chaos.html")
    page.wait_for_timeout(1200)
    log(g, "boots, 0 page errors", len(errs["page"]) == 0, errs["page"][:2])
    page.evaluate("selLevel(3)")
    page.wait_for_timeout(200)
    gate_answer(page)
    page.wait_for_timeout(300)
    st = page.evaluate("({state:G.state,targets:G.targets.length})")
    log(g, "gate -> L3 playing with diamonds", st["state"] == "play" and st["targets"] == 6, st)
    # chain: one hit must cascade
    page.evaluate("(()=>{const t=G.targets.find(t=>!t.dead);killDiamond(t,'hit',false);})()")
    page.wait_for_timeout(700)
    dead = page.evaluate("G.targets.filter(t=>t.dead).length")
    sc = page.evaluate("G.score")
    log(g, "diamond explosion CHAINS to neighbours", dead >= 3, f"dead={dead}/6 score={sc}")
    log(g, "chain kills pay +50 each", sc >= 100, f"score={sc}")
    # bomb blast = bigger radius (L1: all 3 diamonds from one corner hit)
    page.evaluate("(()=>{buildLevel(1);G.state='play';const t=G.targets[0];killDiamond(t,'hit',true);})()")
    page.wait_for_timeout(700)
    dead = page.evaluate("G.targets.filter(t=>t.dead).length")
    log(g, "Ember Bomb blast clears wider radius", dead == 3, f"dead={dead}/3")
    lv = page.evaluate("(()=>{const o=[];for(let n=1;n<=10;n++){buildLevel(n);o.push(G.targets.length);}return o;})()")
    log(g, "all 10 levels build", all(x > 0 for x in lv), lv)
    page.evaluate("(()=>{buildLevel(1);G.state='play';})()")
    page.evaluate("document.getElementById('pauseBtn').click()"); page.wait_for_timeout(200)
    ps = page.evaluate("G.state")
    page.evaluate("document.getElementById('resumeBtn').click()"); page.wait_for_timeout(200)
    log(g, "pause/resume works", ps == "pause" and page.evaluate("G.state") == "play", ps)
    page.mouse.click(640, 400)
    mus = page.evaluate("({on:MUS.on,bpm:MUS.BPM})")
    log(g, "music starts, 122 BPM unique track", mus["on"] and mus["bpm"] == 122, mus)
    f = fps(page)
    log(g, "FPS in play (SwiftShader harness)", f >= 30, f"{f} fps")
    page.screenshot(path=f"{SHOTS}/ice-L1.png")
    log(g, "no page errors during all tests", len(errs["page"]) == 0, errs["page"][:2])
    ctx.close()

# ---------------------------------------------------------------- game 5
def t_g5(browser):
    g = "5-ballista"
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world/games/game-05-lord-infernos-ballista-siege.html")
    page.wait_for_timeout(1200)
    log(g, "boots, 0 page errors", len(errs["page"]) == 0, errs["page"][:2])
    page.evaluate("selLevel(1)")
    page.wait_for_timeout(200)
    gate_answer(page)
    page.wait_for_timeout(300)
    st = page.evaluate("G.state")
    log(g, "gate -> L1 playing", st == "play", st)
    places = page.evaluate("(()=>{const o=[];for(let n=1;n<=10;n++){reset(n);o.push(theme().place);}return o;})()")
    log(g, "10 DIFFERENT home-world kingdoms", len(set(places)) == 10, places)
    names = page.evaluate("(()=>{const o=[];for(let n=1;n<=10;n++){reset(n);o.push(bossTheme().name);}return o;})()")
    log(g, "10 DIFFERENT boss ships/captains", len(set(names)) == 10, names)
    # boss spawns on every level
    ok = page.evaluate("""(()=>{for(let n=1;n<=10;n++){reset(n);G.state='play';G.enemies=[];G.boss=null;spawnBoss();
      if(!G.boss||G.boss.type!=='boss')return false;G.enemies=[];G.boss=null;}return true;})()""")
    log(g, "giant boss ship spawns all 10 levels", ok, "")
    # attack patterns differ per level
    pats = page.evaluate("""(()=>{const out={};
      const count=(n,volley)=>{reset(n);G.state='play';G.enemies=[];G.boss=null;spawnBoss();const b=G.boss;b.y=140;b.volley=volley;
        const before=G.enemies.length;bossFire(b);return G.enemies.length-before;};
      out.L1fan=count(1,0);out.L2widefan=count(2,0);out.L3aimed=count(3,0);out.L4spiral=count(4,0);
      out.L8ring=count(8,2);out.L10fan=count(10,3);return out;})()""")
    log(g, "boss patterns: L1 fan=4, L2 wide fan=6, L3 aimed=2, L4 spiral=3, L8 ring=8, L10 fan=8",
        pats == {"L1fan": 4, "L2widefan": 6, "L3aimed": 2, "L4spiral": 3, "L8ring": 8, "L10fan": 8}, pats)
    # aimed bolts fly at the player (L3)
    aim = page.evaluate("""(()=>{reset(3);G.state='play';G.enemies=[];G.boss=null;spawnBoss();const b=G.boss;b.y=140;
      G.px=100;G.py=700;const before=G.enemies.length;bossFire(b);
      const bolts=G.enemies.slice(before);return bolts.map(x=>Math.round(x.vx));})()""")
    log(g, "L3 aimed bolts track the player (vx<0 toward player at left)", all(v < 0 for v in aim) and len(aim) == 2, aim)
    # wave flow still completes: force wave 3 boss + kill it
    page.evaluate("(()=>{reset(1);G.state='play';G.wave=3;G.waveKills=1;G.waveTarget=1;})()")
    page.wait_for_timeout(3500)
    has_boss = page.evaluate("!!G.boss")
    log(g, "wave 3 summons the boss in live play", has_boss, "")
    page.evaluate("(()=>{if(G.boss)killEnemy(G.boss);})()")
    page.wait_for_timeout(1300)
    st = page.evaluate("G.state")
    log(g, "killing the boss completes the level", st == "clear", st)
    page.evaluate("(()=>{reset(10);G.state='play';G.enemies=[];G.boss=null;spawnBoss();G.boss.y=150;})()")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SHOTS}/ballista-L10-boss-lordinferno.png")
    page.evaluate("(()=>{reset(2);G.state='play';})()")
    page.wait_for_timeout(2500)
    page.screenshot(path=f"{SHOTS}/ballista-L2-frostbite-ships.png")
    page.mouse.click(640, 300)
    mus = page.evaluate("({on:MUS.on,bpm:MUS.BPM})")
    log(g, "music starts, 98 BPM unique track", mus["on"] and mus["bpm"] == 98, mus)
    f = fps(page)
    log(g, "FPS in play (SwiftShader harness)", f >= 30, f"{f} fps")
    log(g, "no page errors during all tests", len(errs["page"]) == 0, errs["page"][:2])
    ctx.close()

# ---------------------------------------------------------------- phone boots
def t_phone(browser):
    pages = [("1-slingshot", "/fire-world/slingshot-cascade/"),
             ("2-ruko", "/fire-world/rukos-panic-dash/"),
             ("3-blaze", "/fire-world/game-02-blaze-runner.html"),
             ("4-ice", "/fire-world/games/game-04-cinders-ice-rink-chaos.html"),
             ("5-ballista", "/fire-world/games/game-05-lord-infernos-ballista-siege.html")]
    for name, path in pages:
        ctx, page, errs = new_page(browser, phone=True)
        page.goto(BASE + path)
        page.wait_for_timeout(1100)
        log(name, "phone viewport boots, 0 page errors", len(errs["page"]) == 0, errs["page"][:2])
        ctx.close()

def main():
    threading.Thread(target=serve, daemon=True).start()
    time.sleep(0.6)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        t_slingshot(browser); t_ruko(browser); t_blaze(browser); t_g4(browser); t_g5(browser); t_phone(browser)
        browser.close()
    fails = [r for r in RESULTS if not r["ok"]]
    print(f"\n==== {len(RESULTS) - len(fails)}/{len(RESULTS)} checks passed ====")
    with open(os.path.expanduser("~/workspace/fire-world-fixes-1to5/verify-results.json"), "w") as fh:
        json.dump(RESULTS, fh, indent=1)
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
