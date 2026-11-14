#!/usr/bin/env python3
"""
Fire Babys Automated Game Test Harness
=======================================
Loads each game in headless Chromium, captures console/page errors,
simulates gameplay (title dismissal, parental math gate solving,
keyboard/touch inputs), and verifies game flow (title -> gameplay
-> game over -> restart). Runs each game N times and writes JSON reports.

Usage:
    python3 test-games.py --games urls.txt --runs 100
    python3 test-games.py --url https://... --runs 100

Reports saved to reports/<slug>.json
"""
import argparse
import json
import os
import random
import re
import sys
import time
import traceback
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

REPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")

GAMEPLAY_SECONDS = 10
PAGE_LOAD_TIMEOUT_MS = 30000

# ---------------------------------------------------------------- helpers

def slugify(url: str) -> str:
    m = re.search(r"/fire-world/(?:games/)?([^/]+?)(?:\.html)?/?$", url.rstrip("/"))
    if m:
        return re.sub(r"[^a-z0-9]+", "-", m.group(1).lower()).strip("-")
    return re.sub(r"[^a-z0-9]+", "-", url.lower()).strip("-")[:60]


def solve_math_gate(page) -> bool:
    """Try to find and solve a parental math gate. Returns True if solved or none found."""
    try:
        # Look for common math-gate patterns
        for _ in range(3):
            # Pattern: element with id like mq showing "3 + 4", input id ma
            q_el = page.query_selector("#mq")
            inp = page.query_selector("#ma")
            if q_el and inp:
                q_text = q_el.inner_text()
                m = re.search(r"(\d+)\s*([+\-x×])\s*(\d+)", q_text)
                if m:
                    a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
                    ans = a + b if op == "+" else (a - b if op == "-" else a * b)
                    inp.fill(str(ans))
                    # click unlock button
                    for sel in ["#mathgate button", "button:has-text('UNLOCK')",
                                "button:has-text('unlock')"]:
                        btn = page.query_selector(sel)
                        if btn:
                            btn.click()
                            page.wait_for_timeout(500)
                            break
                    return True
            # Generic: look for "a + b" text near an input
            break
        return False
    except Exception:
        return False


def dismiss_title(page) -> dict:
    """Click through title/start overlays. Returns info about what was found."""
    info = {"overlay_found": False, "start_clicked": False, "math_solved": False}
    try:
        overlay = page.query_selector("#overlay")
        if overlay and overlay.is_visible():
            info["overlay_found"] = True
            # First try math gate (it may block the start button)
            if page.query_selector("#mathgate:not(.hidden)"):
                info["math_solved"] = solve_math_gate(page)
            # Click the main button
            btn = page.query_selector("#obtn")
            if btn and btn.is_visible():
                btn.click()
                info["start_clicked"] = True
                page.wait_for_timeout(800)
                # A math gate may appear after clicking start
                if page.query_selector("#mathgate:not(.hidden)"):
                    info["math_solved"] = solve_math_gate(page)
                    page.wait_for_timeout(500)
        else:
            # No overlay: try clicking canvas center / common start buttons
            for sel in ["button:has-text('START')", "button:has-text('PLAY')",
                        "button:has-text('▶')"]:
                try:
                    b = page.query_selector(sel)
                    if b and b.is_visible():
                        b.click()
                        info["start_clicked"] = True
                        page.wait_for_timeout(600)
                        break
                except Exception:
                    pass
    except Exception as e:
        info["error"] = str(e)[:200]
    return info


def simulate_gameplay(page, seconds: int, errors: list) -> dict:
    """Send random inputs for `seconds`. Returns activity observations."""
    obs = {"keys_sent": 0, "clicks_sent": 0, "game_over_seen": False,
           "restart_clicked": False, "canvas_visible": False}
    try:
        canvas = page.query_selector("canvas")
        obs["canvas_visible"] = bool(canvas and canvas.is_visible())
    except Exception:
        pass

    key_choices = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "x", "z", "a", "d", "w"]
    end = time.time() + seconds
    try:
        box = page.viewport_size
        w, h = box["width"], box["height"]
    except Exception:
        w, h = 390, 844

    while time.time() < end:
        try:
            action = random.random()
            if action < 0.55:
                page.keyboard.press(random.choice(key_choices))
                obs["keys_sent"] += 1
            elif action < 0.8:
                # tap random screen position (touch-like)
                page.mouse.click(random.randint(20, w - 20), random.randint(int(h * 0.3), h - 20))
                obs["clicks_sent"] += 1
            else:
                # check for game-over overlay with restart
                try:
                    overlay = page.query_selector("#overlay")
                    if overlay and overlay.is_visible():
                        txt = (overlay.inner_text() or "").upper()
                        if any(k in txt for k in ["GAME OVER", "DEFEATED", "RESTART", "TRY AGAIN", "PLAY AGAIN"]):
                            obs["game_over_seen"] = True
                            btn = page.query_selector("#obtn")
                            if btn and btn.is_visible():
                                btn.click()
                                obs["restart_clicked"] = True
                                page.wait_for_timeout(700)
                                # re-solve math gate if it reappears
                                if page.query_selector("#mathgate:not(.hidden)"):
                                    solve_math_gate(page)
                except Exception:
                    pass
            page.wait_for_timeout(random.randint(80, 250))
        except Exception as e:
            errors.append({"type": "input_error", "message": str(e)[:300]})
            break
    return obs


def get_proxy_config():
    """Local copy: no proxy — games are served from localhost."""
    return None


def run_once(pw, url: str, run_idx: int) -> dict:
    """Run a single test pass against a game URL (fresh browser per run)."""
    result = {
        "run": run_idx,
        "loaded": False,
        "console_errors": [],
        "page_errors": [],
        "title_info": {},
        "gameplay": {},
        "failed": False,
        "fail_reason": None,
    }
    browser = None
    try:
        launch_kwargs = {
            "headless": True,
            "args": ["--no-sandbox", "--disable-dev-shm-usage",
                     "--autoplay-policy=no-user-gesture-required",
                     "--ignore-certificate-errors"],
        }
        proxy_cfg = get_proxy_config()
        if proxy_cfg:
            launch_kwargs["proxy"] = proxy_cfg
        browser = pw.chromium.launch(**launch_kwargs)
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            has_touch=True, is_mobile=True,
            user_agent=("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
                        "Mobile/15E148 Safari/604.1"),
        )
        page = context.new_page()

        page.on("console", lambda msg: (
            result["console_errors"].append({
                "type": msg.type,
                "text": msg.text[:500],
                "location": str(msg.location)[:200],
            }) if msg.type in ("error",) else None
        ))
        page.on("pageerror", lambda exc: result["page_errors"].append(str(exc)[:500]))

        try:
            resp = page.goto(url, timeout=PAGE_LOAD_TIMEOUT_MS, wait_until="load")
            if resp is None or resp.status >= 400:
                result["failed"] = True
                result["fail_reason"] = f"HTTP {resp.status if resp else 'no-response'}"
                return result
            result["loaded"] = True
        except PlaywrightTimeout:
            result["failed"] = True
            result["fail_reason"] = "page load timeout"
            return result
        except Exception as e:
            result["failed"] = True
            result["fail_reason"] = f"goto failed: {str(e)[:200]}"
            return result

        page.wait_for_timeout(2500)  # let boot scripts run

        result["title_info"] = dismiss_title(page)
        result["gameplay"] = simulate_gameplay(page, GAMEPLAY_SECONDS, result["page_errors"])

        # final settle: wait a beat and re-check for late errors
        page.wait_for_timeout(1000)
        context.close()
    except Exception as e:
        result["failed"] = True
        result["fail_reason"] = f"harness exception: {str(e)[:300]}"
        result["traceback"] = traceback.format_exc()[:1000]
    finally:
        try:
            if browser:
                browser.close()
        except Exception:
            pass
    return result


def test_game(pw, url: str, runs: int) -> dict:
    slug = slugify(url)
    print(f"\n=== Testing {url} ({runs} runs) ===", flush=True)
    report = {
        "url": url,
        "slug": slug,
        "runs": runs,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "run_results": [],
        "errors": [],          # aggregated unique console/page errors
        "loadFailures": 0,
        "gameplayIssues": [],
    }
    seen_errors = set()
    for i in range(1, runs + 1):
        r = run_once(pw, url, i)
        # keep run_results light: drop per-run console detail into aggregate
        for ce in r["console_errors"]:
            key = (ce["type"], ce["text"][:200])
            if key not in seen_errors:
                seen_errors.add(key)
                report["errors"].append({**ce, "first_seen_run": i})
        for pe in r["page_errors"]:
            if isinstance(pe, dict):
                key = ("input_error", pe.get("message", "")[:200])
            else:
                key = ("pageerror", str(pe)[:200])
            if key not in seen_errors:
                seen_errors.add(key)
                report["errors"].append({"type": key[0], "text": key[1], "first_seen_run": i})
        if r["failed"]:
            report["loadFailures"] += 1
            report["gameplayIssues"].append({"run": i, "issue": r["fail_reason"]})
        else:
            gp = r.get("gameplay", {})
            if not gp.get("canvas_visible"):
                report["gameplayIssues"].append({"run": i, "issue": "canvas not visible"})
            if gp.get("keys_sent", 0) == 0 and gp.get("clicks_sent", 0) == 0:
                report["gameplayIssues"].append({"run": i, "issue": "no inputs accepted"})
        # keep a compact per-run summary
        report["run_results"].append({
            "run": i,
            "loaded": r["loaded"],
            "failed": r["failed"],
            "fail_reason": r.get("fail_reason"),
            "console_error_count": len(r["console_errors"]),
            "page_error_count": len(r["page_errors"]),
            "title": r.get("title_info", {}),
            "gameplay": {k: v for k, v in r.get("gameplay", {}).items()},
        })
        if i % 10 == 0 or i == runs:
            print(f"  run {i}/{runs}: errors={len(report['errors'])} "
                  f"loadFailures={report['loadFailures']}", flush=True)

    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    os.makedirs(REPORT_DIR, exist_ok=True)
    path = os.path.join(REPORT_DIR, f"{slug}.json")
    with open(path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  report -> {path}", flush=True)
    return report


def main():
    ap = argparse.ArgumentParser(description="Fire Babys game test harness")
    ap.add_argument("--url", help="Single game URL to test")
    ap.add_argument("--games", help="File with one URL per line")
    ap.add_argument("--runs", type=int, default=100)
    args = ap.parse_args()

    urls = []
    if args.url:
        urls.append(args.url.strip())
    if args.games:
        with open(args.games) as f:
            urls.extend([l.strip() for l in f if l.strip() and not l.startswith("#")])
    if not urls:
        ap.error("provide --url or --games")

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        for url in urls:
            try:
                test_game(pw, url, args.runs)
            except Exception as e:
                print(f"FATAL testing {url}: {e}", flush=True)
                traceback.print_exc()


if __name__ == "__main__":
    main()
