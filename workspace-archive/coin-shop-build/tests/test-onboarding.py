# First-run onboarding tests (2026-10-21) — Playwright/Chromium.
# Part A runs against tests/hub-server.mjs (real staged hub + real
# staged backend Worker). Part B runs the OFFLINE layout under file://
# with all network aborted (the coin-shop offline-suite pattern).
# Run hub-server first:  node tests/hub-server.mjs   (port 8940)
import json
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = "http://127.0.0.1:8940"
DISCORD = "https://discord.gg/sfdsWKzhWh"

passed = failed = 0
failures = []


def check(cond, label):
    global passed, failed
    if cond:
        passed += 1
        print("  PASS " + label)
    else:
        failed += 1
        failures.append(label)
        print("  FAIL " + label)


def api(path, body=None):
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(BASE + "/worker" + path, data=data,
                                 headers={"content-type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def register(email, name="Tester"):
    r = api("/auth/register", {"email": email, "name": name})
    assert r.get("ok") and r.get("token"), r
    return r["token"]


def seed_script(token, email, name="Tester"):
    user = json.dumps({"email": email, "name": name})
    return (
        "localStorage.setItem('fb_auth_token', %s);"
        "localStorage.setItem('fb_auth_user', %s);"
        "localStorage.setItem('fb_auth_token_at', String(Date.now()));"
        % (json.dumps(token), json.dumps(user))
    )


def new_page(browser, init=None, abort_prod_auth=True):
    ctx = browser.new_context()
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    if abort_prod_auth:
        # FBLocker hardcodes the production Worker URL; keep the suite
        # hermetic — its designed failure path renders the offline note.
        page.route("**://fire-babys-auth.jeffpruden288.workers.dev/**",
                   lambda route: route.abort())
    if init:
        ctx.add_init_script(init)
    return ctx, page, errors


def tour_visible(page):
    return page.locator("#fbtour").is_visible()


def tour_title(page):
    return page.locator(".fbt-title").inner_text()


def ls(page, key):
    return page.evaluate("(k) => localStorage.getItem(k)", key)


def main():
    # reset server state
    urllib.request.urlopen(BASE + "/__reset").read()

    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        print("S1: signed-out visitor — gate shows, tour never does")
        ctx, page, errs = new_page(browser)
        page.goto(BASE + "/fire-world.html")
        page.wait_for_selector(".fbgate", state="visible")
        check(True, "sign-in gate visible")
        check(page.locator("#fbtour").count() == 0, "no tour overlay for signed-out visitor")
        check(not page.locator("#fb-signout-btn").is_visible(), "sign-out button hidden while signed out")
        check(errs == [], "zero pageerrors (got %r)" % errs)
        ctx.close()

        print("S2: fresh sign-in (post-kick state) — tour appears, CREATE step first")
        token = register("fresh@example.com", "Fresh")
        ctx, page, errs = new_page(browser, seed_script(token, "fresh@example.com", "Fresh"))
        page.goto(BASE + "/fire-world.html")
        page.wait_for_selector("#fbtour", state="visible")
        check("CREATE YOUR FIRE BABY" in tour_title(page), "first step is CREATE YOUR FIRE BABY")
        check(page.locator("#fbt-primary").is_visible(), "create button present on step 1")
        prof = api("/profile/get", {"token": token})
        check(prof["profile"]["onboardedV1"] is False, "server profile starts onboardedV1=false")
        check(ls(page, "fb_onboarded_v1") is None, "local flag unset before the tour")

        print("S3: creator detour resumes at the cards; cards in Jeff's order; finish sets both flags")
        page.click("#fbt-primary")
        page.wait_for_url("**/3d.html")
        check("3D ARENA STUB" in page.content(), "create button lands on the real character surface (3d.html)")
        check(ls(page, "fb_tour_step") == "cards", "detour marker stored")
        page.goto(BASE + "/fire-world.html")
        page.wait_for_selector("#fbtour", state="visible")
        order = ["THE CHEST", "THE SHOPS", "SIGN IN & SIGN OUT", "THE MATH DOOR", "JOIN THE FAMILY"]
        for want in order:
            got = tour_title(page)
            check(want in got, "card shows %s (got %r)" % (want, got))
            if want == "JOIN THE FAMILY":
                href = page.locator("#fbtour a[href*='discord.gg']").first.get_attribute("href")
                check(href == DISCORD, "Discord link is the site's verbatim invite")
                bad = page.evaluate(
                    "() => [...document.querySelectorAll('#fbtour a')].map(a => a.href)"
                    ".filter(h => /tiktok|facebook|instagram/.test(h))")
                check(bad == [], "no invented TikTok/Facebook/Instagram URLs in the tour (got %r)" % bad)
            page.click("#fbt-next")
        check("TIKTOK" in tour_title(page), "final card is the TikTok card")
        body = page.locator(".fbt-body").inner_text()
        check("Look for us on TikTok soon" in body, "TikTok card says 'Look for us on TikTok soon'")
        page.click("#fbt-next")  # Finish
        page.wait_for_selector("#fbtour", state="hidden")
        check(ls(page, "fb_onboarded_v1") == "1", "completion sets the local flag")
        for _ in range(50):
            if api("/profile/get", {"token": token})["profile"]["onboardedV1"]:
                break
            time.sleep(0.1)
        check(api("/profile/get", {"token": token})["profile"]["onboardedV1"] is True,
              "completion sets the SERVER profile flag")
        page.reload()
        page.wait_for_timeout(1200)
        check(page.locator("#fbtour").count() == 0 or not tour_visible(page),
              "tour does not reappear on reload")
        check(errs == [], "zero pageerrors across S2+S3 (got %r)" % errs)
        ctx.close()

        print("S4: explicit Skip sets the flag too")
        token2 = register("skipper@example.com", "Skipper")
        ctx, page, errs = new_page(browser, seed_script(token2, "skipper@example.com", "Skipper"))
        page.goto(BASE + "/fire-world.html")
        page.wait_for_selector("#fbtour", state="visible")
        check("CREATE YOUR FIRE BABY" in tour_title(page), "skipper also starts at the create step")
        page.click("#fbt-skip")
        page.wait_for_selector("#fbtour", state="hidden")
        check(ls(page, "fb_onboarded_v1") == "1", "skip sets the local flag")
        for _ in range(50):
            if api("/profile/get", {"token": token2})["profile"]["onboardedV1"]:
                break
            time.sleep(0.1)
        check(api("/profile/get", {"token": token2})["profile"]["onboardedV1"] is True,
              "skip sets the SERVER profile flag")
        page.reload()
        page.wait_for_timeout(1200)
        check(page.locator("#fbtour").count() == 0 or not tour_visible(page),
              "no tour on reload after skip")
        check(errs == [], "zero pageerrors in S4 (got %r)" % errs)

        print("S5: Replay the tour link re-opens the flow for an onboarded player")
        page.click("#fb-tour-replay")
        page.wait_for_selector("#fbtour", state="visible")
        check("CREATE YOUR FIRE BABY" in tour_title(page), "replay starts again at the create step")
        page.click("#fbt-skip")
        page.wait_for_selector("#fbtour", state="hidden")
        check(errs == [], "zero pageerrors in S5 (got %r)" % errs)
        ctx.close()

        print("S6: top-bar Sign out is real — signs out, gate returns, tour stays away")
        token3 = register("outer@example.com", "Outer")
        ctx, page, errs = new_page(browser, seed_script(token3, "outer@example.com", "Outer"))
        page.goto(BASE + "/fire-world.html")
        page.wait_for_selector("#fbtour", state="visible")
        page.click("#fbt-skip")
        page.wait_for_selector("#fbtour", state="hidden")
        check(page.locator("#fb-signout-btn").is_visible(), "sign-out button visible while signed in")
        page.click("#fb-signout-btn")
        page.wait_for_selector(".fbgate", state="visible")
        check(ls(page, "fb_auth_token") is None, "sign-out cleared the stored token")
        check(page.locator("#fbtour").count() == 0 or not tour_visible(page),
              "tour does not appear for the signed-out state")
        check(errs == [], "zero pageerrors in S6 (got %r)" % errs)
        ctx.close()

        print("S7: OFFLINE build (file://, all network aborted) completes device-side")
        off = Path("/tmp/fb-offline-test")
        if off.exists():
            shutil.rmtree(off)
        off.mkdir(parents=True)
        skip_names = {"backend", "tests"}
        for item in ROOT.iterdir():
            if item.name in skip_names or item.name.startswith("fire-babys-offline.zip"):
                continue
            if item.is_dir():
                shutil.copytree(item, off / item.name)
            elif item.suffix in {".html", ".js", ".json", ".png", ".jpg"}:
                shutil.copy2(item, off / item.name)
        # The reseal rewrite (DEPLOY.md Step 3): absolute gate src -> relative.
        for html in off.rglob("*.html"):
            t = html.read_text(encoding="utf8", errors="ignore")
            if "https://firebabys.io/auth-gate.js" in t:
                html.write_text(t.replace("https://firebabys.io/auth-gate.js", "auth-gate.js"),
                                encoding="utf8")
        fake_token = "O" * 32
        init = (
            "localStorage.setItem('fb_auth_token', %s);"
            "localStorage.setItem('fb_auth_user', %s);"
            "localStorage.setItem('fb_auth_token_at', String(Date.now()));"
            % (json.dumps(fake_token),
               json.dumps(json.dumps({"email": "off@example.com", "name": "Off"})))
        )
        ctx = browser.new_context()
        ctx.add_init_script(init)
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.route("http://**", lambda r: r.abort())
        page.route("https://**", lambda r: r.abort())
        page.goto((off / "fire-world.html").as_uri())
        page.wait_for_selector("#fbtour", state="visible", timeout=15000)
        check("CREATE YOUR FIRE BABY" in tour_title(page),
              "offline: tour appears via the gate trust-cache + local-flag fallback")
        # Walk the whole tour offline: create step -> Next through every
        # card (7 steps total) -> Finish on the TikTok card.
        for _ in range(8):
            if not tour_visible(page):
                break
            page.click("#fbt-next")
            page.wait_for_timeout(150)
        page.wait_for_selector("#fbtour", state="hidden")
        check(ls(page, "fb_onboarded_v1") == "1", "offline: completion sets the local (device) flag")
        page.reload()
        page.wait_for_timeout(1500)
        check(page.locator("#fbtour").count() == 0 or not tour_visible(page),
              "offline: tour does not reappear on reload")
        check(errs == [], "offline: zero pageerrors (got %r)" % errs)
        ctx.close()

        browser.close()

    print("\n==== onboarding: %d passed, %d failed ====" % (passed, failed))
    if failures:
        print("failures:", *failures, sep="\n  - ")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
