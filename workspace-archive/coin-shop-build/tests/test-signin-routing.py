# Post-sign-in landing tests (Jeff's law, 2026-10-21) — Playwright.
# Runs against tests/signin-server.mjs (port 8941): staged hub + real
# staged backend Worker + intercepted Resend sends, so the REAL
# email-code sign-in is driven through the REAL gate UI.
#
# The law (widened 2026-10-21 ~23:08): the Creator profile is the
# signed-in HOME. EVERY interactive sign-in lands STRAIGHT on the
# Creator (3d.html), onboarded or not; the tour cards resume on
# the hub afterwards (fb_tour_step="cards"). A session restore
# that arrives at a home page from outside the site on a later
# visit (stale token stamp) also lands on the Creator — onboarded
# players only; a player still touring stays on the hub, where
# the tour overlay serves them (case D; tests/test-onboarding.py),
# and in-site navigation never bounces (case F).
#
# Start the server first:  node tests/signin-server.mjs
import json
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8941"

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


def get_code(email):
    for _ in range(50):
        with urllib.request.urlopen(BASE + "/__code?email=" + email) as r:
            c = json.loads(r.read()).get("code")
        if c:
            return c
        time.sleep(0.1)
    raise AssertionError("no code captured for " + email)


def create_account(email, name):
    """Create an account exactly like a player: code + verify."""
    r = api("/auth/code", {"email": email, "purpose": "verify"})
    assert r.get("ok"), r
    code = get_code(email)
    v = api("/auth/verify", {"email": email, "code": code, "name": name})
    assert v.get("ok") and v.get("token"), v
    return v["token"]


def new_page(browser):
    ctx = browser.new_context()
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    # FBLocker hardcodes the production Worker URL; keep the suite
    # hermetic — its designed failure path renders the offline note
    # (same as tests/test-onboarding.py).
    page.route("**://fire-babys-auth.jeffpruden288.workers.dev/**",
               lambda route: route.abort())
    return ctx, page, errors


def sign_in_via_gate(page, email):
    """Drive the real gate: email form -> code step -> verify."""
    page.goto(BASE + "/fire-world.html")
    page.wait_for_selector(".fbgate", state="visible")
    page.fill("#fbgate-email", email)
    page.click(".fbgate-btn")
    page.wait_for_selector("#fbgate-code", state="visible")
    page.fill("#fbgate-code", get_code(email))
    page.click(".fbgate-btn")


def ls(page, key):
    return page.evaluate("(k) => localStorage.getItem(k)", key)


def main():
    urllib.request.urlopen(BASE + "/__reset").read()

    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        print("A: THE JEFF CASE — pre-existing account, no onboardedV1, "
              "fresh sign-in -> straight to the Creator")
        tok = create_account("jeffcase@example.com", "JeffCase")
        prof = api("/profile/get", {"token": tok})
        check(prof["profile"]["onboardedV1"] is False,
              "pre-existing account starts with onboardedV1=false")
        ctx, page, errs = new_page(browser)
        sign_in_via_gate(page, "jeffcase@example.com")
        page.wait_for_url("**/3d.html")
        check("3D ARENA STUB" in page.content(),
              "existing non-onboarded account lands on the Creator (3d.html)")
        check(ls(page, "fb_tour_step") == "cards",
              "tour marker set: hub tour resumes at the cards")
        check(errs == [], "zero pageerrors in A (got %r)" % errs)
        ctx.close()

        print("B: onboarded account signs in fresh -> Creator (it is home now)")
        urllib.request.urlopen(BASE + "/__reset").read()
        tok2 = create_account("veteran@example.com", "Veteran")
        r = api("/profile/onboarded", {"token": tok2})
        check(r.get("ok"), "account marked onboarded server-side")
        ctx, page, errs = new_page(browser)
        sign_in_via_gate(page, "veteran@example.com")
        page.wait_for_url("**/3d.html")
        check("3D ARENA STUB" in page.content(),
              "onboarded player ALSO lands on the Creator after a fresh sign-in")
        check(errs == [], "zero pageerrors in B (got %r)" % errs)
        ctx.close()

        print("C: brand-new account (created by this very sign-in) -> Creator")
        urllib.request.urlopen(BASE + "/__reset").read()
        ctx, page, errs = new_page(browser)
        sign_in_via_gate(page, "brandnew@example.com")
        page.wait_for_url("**/3d.html")
        check("3D ARENA STUB" in page.content(),
              "brand-new account lands on the Creator")
        check(ls(page, "fb_tour_step") == "cards",
              "tour marker set for the brand-new account")
        check(errs == [], "zero pageerrors in C (got %r)" % errs)
        ctx.close()

        print("D: session restore (stored token) -> NO reroute; hub tour serves them")
        urllib.request.urlopen(BASE + "/__reset").read()
        tok4 = create_account("restore@example.com", "Restore")
        user = json.dumps({"email": "restore@example.com", "name": "Restore"})
        init = (
            "localStorage.setItem('fb_auth_token', %s);"
            "localStorage.setItem('fb_auth_user', %s);"
            "localStorage.setItem('fb_auth_token_at', String(Date.now()));"
            % (json.dumps(tok4), json.dumps(user))
        )
        ctx = browser.new_context()
        ctx.add_init_script(init)
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.route("**://fire-babys-auth.jeffpruden288.workers.dev/**",
                   lambda route: route.abort())
        page.goto(BASE + "/fire-world.html")
        page.wait_for_selector("#fbtour", state="visible")
        check(page.url.endswith("/fire-world.html"),
              "restored session is NOT rerouted to the Creator")
        check("CREATE YOUR FIRE BABY" in page.locator(".fbt-title").inner_text(),
              "restore player gets the tour's CREATE step on the hub")
        check(errs == [], "zero pageerrors in D (got %r)" % errs)
        ctx.close()

        print("E: session restore, onboarded, LATER visit (stale token "
              "stamp), cold arrival at the hub -> Creator is home")
        urllib.request.urlopen(BASE + "/__reset").read()
        tok5 = create_account("regular@example.com", "Regular")
        r = api("/profile/onboarded", {"token": tok5})
        check(r.get("ok"), "regular marked onboarded server-side")
        old_stamp = str(int(time.time() * 1000) - 48 * 3600 * 1000)
        user5 = json.dumps({"email": "regular@example.com", "name": "Regular"})
        init5 = (
            "localStorage.setItem('fb_auth_token', %s);"
            "localStorage.setItem('fb_auth_user', %s);"
            "localStorage.setItem('fb_auth_token_at', %s);"
            % (json.dumps(tok5), json.dumps(user5), json.dumps(old_stamp))
        )

        def seeded_page():
            c = browser.new_context()
            c.add_init_script(init5)
            p = c.new_page()
            e = []
            p.on("pageerror", lambda err: e.append(str(err)))
            p.route("**://fire-babys-auth.jeffpruden288.workers.dev/**",
                    lambda route: route.abort())
            return c, p, e

        ctx, page, errs = seeded_page()
        page.goto(BASE + "/fire-world.html")
        page.wait_for_url("**/3d.html")
        check("3D ARENA STUB" in page.content(),
              "returning onboarded player lands on the Creator as home")
        check(errs == [], "zero pageerrors in E (got %r)" % errs)

        print("F: from the Creator, navigating to the hub STAYS (no trap)")
        page.evaluate("() => { location.href = '/fire-world.html'; }")
        page.wait_for_load_state("load")
        page.wait_for_timeout(2500)
        check(page.url.endswith("/fire-world.html"),
              "hub navigation from the Creator does not bounce (url %s)" % page.url)
        check(errs == [], "zero pageerrors in F (got %r)" % errs)
        ctx.close()

        print("G: session restore at the site's front door (/) -> Creator")
        ctx, page, errs = seeded_page()
        page.goto(BASE + "/")
        page.wait_for_url("**/3d.html")
        check("3D ARENA STUB" in page.content(),
              "front-door arrival with a live session lands on the Creator")
        check(errs == [], "zero pageerrors in G (got %r)" % errs)
        ctx.close()

        browser.close()

    print("\n==== signin-routing: %d passed, %d failed ====" % (passed, failed))
    if failures:
        print("failures:", *failures, sep="\n  - ")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
