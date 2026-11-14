# Password sign-in gate tests (2026-10-21) — Playwright.
# Sibling of tests/test-signin-routing.py, against
# tests/password-server.mjs (port 8942), which the suite starts
# and stops itself in each mode.
#
# LOCAL phase (hermetic): the REAL gate UI drives the REAL staged
# backend, with a seeded account whose record carries a
# passwordHash (a DUMMY password, seeded via /__seed-password):
#   A correct password (+ main-form email prefill) -> Creator-first
#   B wrong password -> generic error, stays on the gate
#   C unknown email -> the SAME generic error (no existence leak)
#   D back link restores the first step; reopening the password
#     step and signing in still works (no stale-listener traps)
#   E full email-code flow still completes after all of the above
#
# LIVE phase (only when FB_PW_TEST_EMAIL / FB_PW_TEST_PASSWORD are
# in the environment): Jeff's real account signs in through the
# real gate UI against the LIVE /auth/password endpoint (proxied
# by password-server in FB_AUTH_TARGET=live mode). The credentials
# are read from the environment only — never printed, never
# written anywhere; the token value is asserted for presence only.
#
# Usage: python3 tests/test-password-signin.py [local|live|all]
import json
import os
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8942"
DUMMY_PW = "local-dummy-pw-456"
GENERIC_SNIPPET = "don't match"

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
    req = urllib.request.Request(BASE + path, data=data,
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


def start_server(live=False):
    env = dict(os.environ)
    if live:
        env["FB_AUTH_TARGET"] = "live"
    proc = subprocess.Popen(
        ["node", "tests/password-server.mjs"],
        cwd=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."),
        env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(100):
        try:
            urllib.request.urlopen(BASE + "/__code?email=nobody@example.com",
                                   timeout=1).read()
            return proc
        except Exception:
            time.sleep(0.1)
    proc.kill()
    raise AssertionError("password-server did not come up")


def new_page(browser):
    ctx = browser.new_context()
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    # FBLocker hardcodes the production Worker URL; keep the suite
    # hermetic — its designed failure path renders the offline note
    # (same pattern as tests/test-signin-routing.py).
    page.route("**://fire-babys-auth.jeffpruden288.workers.dev/**",
               lambda route: route.abort())
    return ctx, page, errors


def ls(page, key):
    return page.evaluate("(k) => localStorage.getItem(k)", key)


def open_password_step(page, email=None):
    page.wait_for_selector(".fbgate", state="visible")
    if email:
        page.fill("#fbgate-email", email)
    page.click("#fbgate-pw-open")
    page.wait_for_selector("#fbgate-pw-pass", state="visible")


def local_phase(browser):
    print("LOCAL: hermetic gate UI vs staged backend")
    api("/__reset")
    r = api("/__seed-password", {"email": "pwcase@example.com",
                                 "name": "PwCase", "password": DUMMY_PW})
    assert r.get("ok"), r

    print("A: correct password (email prefilled from the main form) "
          "-> Creator-first routing")
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world.html")
    open_password_step(page, "pwcase@example.com")
    check(page.input_value("#fbgate-pw-email") == "pwcase@example.com",
          "password step prefilled the email typed on the first step")
    page.fill("#fbgate-pw-pass", DUMMY_PW)
    page.click(".fbgate-btn")
    page.wait_for_url("**/3d.html")
    check("3D ARENA STUB" in page.content(),
          "password sign-in lands on the Creator (3d.html)")
    check(ls(page, "fb_tour_step") == "cards",
          "tour marker set: hub tour resumes at the cards")
    check(bool(ls(page, "fb_auth_token")), "session token stored")
    check(errs == [], "zero pageerrors in A (got %r)" % errs)
    ctx.close()

    print("B: wrong password -> generic error, stays on the gate")
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world.html")
    open_password_step(page)
    page.fill("#fbgate-pw-email", "pwcase@example.com")
    page.fill("#fbgate-pw-pass", "definitely-wrong")
    page.click(".fbgate-btn")
    page.wait_for_selector(".fbgate-err", state="visible")
    err_b = page.inner_text(".fbgate-err")
    check(GENERIC_SNIPPET in err_b,
          "wrong password shows the generic error (%r)" % err_b)
    check(page.url.endswith("/fire-world.html"),
          "still on the hub after a wrong password")
    check(page.locator(".fbgate").is_visible(), "gate still up")
    check(not ls(page, "fb_auth_token"), "no token stored on failure")
    check(errs == [], "zero pageerrors in B (got %r)" % errs)
    ctx.close()

    print("C: unknown email -> SAME generic error (no existence leak)")
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world.html")
    open_password_step(page)
    page.fill("#fbgate-pw-email", "ghost@example.com")
    page.fill("#fbgate-pw-pass", "whatever-123")
    page.click(".fbgate-btn")
    page.wait_for_selector(".fbgate-err", state="visible")
    err_c = page.inner_text(".fbgate-err")
    check(err_c == err_b,
          "unknown-email error is identical to wrong-password error")
    check(not ls(page, "fb_auth_token"), "no token stored for ghost")
    check(errs == [], "zero pageerrors in C (got %r)" % errs)
    ctx.close()

    print("D: back link restores the first step; reopen + sign-in works")
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world.html")
    open_password_step(page)
    page.click("#fbgate-pw-back")
    page.wait_for_selector("#fbgate-email", state="visible")
    check(page.locator("#fbgate-name").count() == 1,
          "first step fully restored (email + name fields back)")
    open_password_step(page)
    page.fill("#fbgate-pw-email", "pwcase@example.com")
    page.fill("#fbgate-pw-pass", DUMMY_PW)
    page.click(".fbgate-btn")
    page.wait_for_url("**/3d.html")
    check("3D ARENA STUB" in page.content(),
          "second open of the password step signs in cleanly")
    check(errs == [], "zero pageerrors in D (got %r)" % errs)
    ctx.close()

    print("E: email-code flow still completes end to end")
    ctx, page, errs = new_page(browser)
    page.goto(BASE + "/fire-world.html")
    page.wait_for_selector(".fbgate", state="visible")
    page.fill("#fbgate-email", "codeflow@example.com")
    page.click(".fbgate-btn")
    page.wait_for_selector("#fbgate-code", state="visible")
    page.fill("#fbgate-code", get_code("codeflow@example.com"))
    page.click(".fbgate-btn")
    page.wait_for_url("**/3d.html")
    check("3D ARENA STUB" in page.content(),
          "email-code sign-in still lands on the Creator")
    check(errs == [], "zero pageerrors in E (got %r)" % errs)
    ctx.close()


def live_phase(browser):
    email = os.environ.get("FB_PW_TEST_EMAIL", "")
    password = os.environ.get("FB_PW_TEST_PASSWORD", "")
    if not email or not password:
        print("LIVE: skipped (FB_PW_TEST_EMAIL / FB_PW_TEST_PASSWORD "
              "not in env)")
        return
    print("LIVE: Jeff's account through the real gate UI against "
          "the live /auth/password endpoint")
    ctx, page, errs = new_page(browser)
    captured = {}

    def on_response(resp):
        if "/worker/auth/password" in resp.url:
            try:
                captured["password"] = resp.json()
            except Exception:
                pass

    page.on("response", on_response)
    page.goto(BASE + "/fire-world.html")
    open_password_step(page)
    page.fill("#fbgate-pw-email", email)
    page.fill("#fbgate-pw-pass", password)
    page.click(".fbgate-btn")
    # Non-onboarded profile -> Creator-first routing (3d stub here);
    # give the router a moment either way before asserting.
    try:
        page.wait_for_url("**/3d.html", timeout=15000)
    except Exception:
        pass
    pw = captured.get("password") or {}
    check(pw.get("ok") is True, "live /auth/password answered ok:true")
    check(pw.get("role") == "top_admin",
          "live response carries role top_admin")
    check(pw.get("isAdmin") is True,
          "live response carries isAdmin true")
    check(bool(pw.get("token")), "live response carries a token")
    check(bool(ls(page, "fb_auth_token")), "gate stored the live token")
    # Premise check, deterministically: read Jeff's live profile
    # back through the proxy with the token the gate just stored
    # (the token value is used, never printed).
    token = ls(page, "fb_auth_token")
    prof_resp = api("/worker/profile/get", {"token": token})
    prof = prof_resp.get("profile") or {}
    print("  (live /profile/get ok=%r onboardedV1=%r)"
          % (prof_resp.get("ok"), prof.get("onboardedV1", "<absent>")))
    check(prof_resp.get("ok") is True and not prof.get("onboardedV1"),
          "Jeff's live profile is non-onboarded (premise of the law)")
    check(page.url.endswith("/3d.html")
          and "3D ARENA STUB" in page.content(),
          "Jeff lands on the Creator after password sign-in")
    check(ls(page, "fb_tour_step") == "cards",
          "tour marker set for Jeff's sign-in")
    check(errs == [], "zero pageerrors in LIVE (got %r)" % errs)
    ctx.close()


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        if mode in ("local", "all"):
            proc = start_server(live=False)
            try:
                local_phase(browser)
            finally:
                proc.terminate()
        if mode in ("live", "all"):
            proc = start_server(live=True)
            try:
                live_phase(browser)
            finally:
                proc.terminate()
        browser.close()
    print("\n==== password-signin: %d passed, %d failed ===="
          % (passed, failed))
    if failures:
        print("failures:", *failures, sep="\n  - ")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
