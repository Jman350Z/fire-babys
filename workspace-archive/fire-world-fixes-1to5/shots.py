import os,threading,time,re
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
DEPLOY=os.path.expanduser("~/workspace/.deploy"); SHOTS=os.path.expanduser("~/workspace/fire-world-fixes-1to5/shots")
def serve():
    class H(SimpleHTTPRequestHandler):
        def __init__(self,*a,**k): super().__init__(*a,directory=DEPLOY,**k)
        def log_message(self,*a): pass
    ThreadingHTTPServer(("127.0.0.1",8943),H).serve_forever()
threading.Thread(target=serve,daemon=True).start(); time.sleep(0.6)
BASE="http://127.0.0.1:8943"
with sync_playwright() as p:
    b=p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    def mk():
        ctx=b.new_context(viewport={"width":1280,"height":800}); pg=ctx.new_page()
        def route(r):
            u=r.request.url
            if u.startswith("https://firebabys.io/"):
                path=u[len("https://firebabys.io/"):].split("?")[0]; local=os.path.join(DEPLOY,path)
                r.fulfill(path=local) if os.path.isfile(local) else r.abort(); return
            r.continue_() if u.startswith("http://127.0.0.1") else r.abort()
        pg.route("**/*",route); return ctx,pg
    def ungate(pg): pg.evaluate("document.querySelectorAll('.fbgate').forEach(e=>e.remove())")
    def gate(pg):
        q=pg.inner_text("#mq"); a,bb=[int(x) for x in re.findall(r"\d+",q)][:2]
        pg.fill("#ma",str(a+bb)); pg.evaluate("checkMath()")
    # slingshot
    ctx,pg=mk(); pg.goto(BASE+"/fire-world/slingshot-cascade/"); pg.wait_for_timeout(900); ungate(pg)
    pg.evaluate("selLevel(4)"); pg.wait_for_timeout(500); pg.screenshot(path=f"{SHOTS}/slingshot-L4-skeletons.png"); ctx.close()
    # ruko dash
    ctx,pg=mk(); pg.goto(BASE+"/fire-world/rukos-panic-dash/"); pg.wait_for_timeout(900); ungate(pg)
    pg.evaluate("selLevel(6)"); pg.wait_for_timeout(150); gate(pg); pg.wait_for_timeout(400)
    pg.evaluate("(()=>{G.obstacles.push({lane:G.lane,z:60,type:'barrier',w:60,h:60,passed:false,dead:false});doDash();})()")
    pg.wait_for_timeout(180); pg.screenshot(path=f"{SHOTS}/ruko-L6-dash-barrier.png"); ctx.close()
    # blaze with bird + platform + rocket
    ctx,pg=mk(); pg.goto(BASE+"/fire-world/game-02-blaze-runner.html"); pg.wait_for_timeout(900); ungate(pg)
    pg.evaluate("document.getElementById('startBtn').click()"); pg.wait_for_timeout(300)
    pg.evaluate("(()=>{birdT=0.01;holding=true;pressT=0;})()"); pg.wait_for_timeout(650)
    pg.screenshot(path=f"{SHOTS}/blaze-rocket-bird.png"); pg.evaluate("holding=false"); ctx.close()
    # ice rink
    ctx,pg=mk(); pg.goto(BASE+"/fire-world/games/game-04-cinders-ice-rink-chaos.html"); pg.wait_for_timeout(900); ungate(pg)
    pg.evaluate("selLevel(3)"); pg.wait_for_timeout(150); gate(pg); pg.wait_for_timeout(400)
    pg.screenshot(path=f"{SHOTS}/ice-L3-diamonds.png"); ctx.close()
    # ballista boss + ships
    ctx,pg=mk(); pg.goto(BASE+"/fire-world/games/game-05-lord-infernos-ballista-siege.html"); pg.wait_for_timeout(900); ungate(pg)
    pg.evaluate("selLevel(10)"); pg.wait_for_timeout(150); gate(pg); pg.wait_for_timeout(300)
    pg.evaluate("(()=>{G.enemies=[];G.boss=null;spawnBoss();G.boss.y=170;spawnEnemy();spawnEnemy();spawnEnemy();})()")
    pg.wait_for_timeout(500); pg.screenshot(path=f"{SHOTS}/ballista-L10-boss-ships.png"); ctx.close()
    b.close()
print("shots done")
