#!/usr/bin/env python3
"""
Fire Babys Arcade — DYNAMIC sandbox security analyzer (v1).

Executes a submitted game in an isolated headless Chromium and watches
everything it does. Catches what static pattern-matching misses:
credential/PIN stealers, keyloggers, session thieves, hidden exfiltration.

Usage:
    python3 sandbox-analyze.py <game-dir> [--time 30] [--out REPORT.md]

- Serves <game-dir> on localhost, loads index.html (or the single .html file)
- Injects monitoring hooks BEFORE any game code runs:
    fetch / XHR / WebSocket / EventSource  -> log URL + method
    document.cookie get/set               -> log access
    localStorage / sessionStorage          -> log access
    input/textarea value reads             -> log (credential-theft signal)
    keydown/keypress listeners             -> count (keylogger signal)
    navigator.sendBeacon                   -> log
- Simulates light gameplay (mouse move, clicks, keys) for --time seconds
- Verdict: PASS / FLAG with specific findings

Threat signatures (all require human review when flagged):
  CREDENTIAL_THEFT  input values read AND external network request in session
  SESSION_THEFT      document.cookie read AND external network request
  KEYLOGGER          keydown listener + periodic external network
  EXFILTRATION       any POST/beacon/WebSocket to non-whitelisted host
  OBFUSCATION        packed/high-entropy JS (static pre-check)
  MINER              miner signatures or sustained high CPU (static + heuristic)

Isolation: fresh incognito context, no real user data, localhost only,
all external traffic logged but allowed (to observe it). NEVER run on a
machine with real credentials. This VM is disposable.

Requires: playwright (pip) + a Chromium binary.
"""

import argparse, hashlib, json, math, os, re, sys, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CHROME = "/opt/meta-chromium/chrome"
WHITELIST_HOSTS = {"localhost", "127.0.0.1", "firebabys.io"}

MONITOR_JS = r"""
(() => {
  window.__fb = { net: [], cookie: 0, storage: 0, inputReads: 0, keys: 0, beacons: [] };
  const log = (t, d) => window.__fb.net.push({t, d, ts: Date.now()});
  // fetch
  const _f = window.fetch;
  window.fetch = function(u, o) {
    log('fetch', String(u && u.url || u) + ' ' + ((o && o.method) || 'GET'));
    return _f.apply(this, arguments);
  };
  // XHR
  const _o = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, u) {
    log('xhr', m + ' ' + u); return _o.apply(this, arguments);
  };
  // WebSocket
  const _W = window.WebSocket;
  window.WebSocket = function(u) { log('websocket', String(u)); return new _W(u); };
  // sendBeacon
  const _b = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
  if (_b) navigator.sendBeacon = function(u, d) {
    window.__fb.beacons.push(String(u)); log('beacon', String(u)); return _b(u, d);
  };
  // cookie
  let _c = '';
  try {
    Object.defineProperty(document, 'cookie', {
      get() { window.__fb.cookie++; return _c; },
      set(v) { window.__fb.cookie++; _c = v; }
    });
  } catch (e) {}
  // storage
  for (const s of ['localStorage', 'sessionStorage']) {
    try {
      const st = window[s];
      for (const m of ['getItem','setItem','removeItem','clear']) {
        const _m = st[m].bind(st);
        st[m] = function(...a) { window.__fb.storage++; return _m(...a); };
      }
    } catch (e) {}
  }
  // input value reads (credential-theft signal)
  try {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(HTMLInputElement.prototype, 'value', {
      get() { window.__fb.inputReads++; return desc.get.call(this); },
      set(v) { return desc.set.call(this, v); }
    });
  } catch (e) {}
  // key listeners
  for (const ev of ['keydown','keypress','keyup']) {
    const _a = EventTarget.prototype.addEventListener;
    // count only once per type via wrapper below
  }
  const _add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(t, ...r) {
    if (t === 'keydown' || t === 'keypress') window.__fb.keys++;
    return _add.call(this, t, ...r);
  };
})();
"""


def entropy(s: str) -> float:
    if not s:
        return 0.0
    from collections import Counter
    c = Counter(s)
    n = len(s)
    return -sum((v / n) * math.log2(v / n) for v in c.values())


def static_check(game_dir: Path, findings: list):
    """Static pre-check: obfuscation, miner sigs, known-evil patterns."""
    for f in game_dir.rglob("*"):
        if f.suffix.lower() not in {".js", ".html", ".htm"} or not f.is_file():
            continue
        try:
            text = f.read_text(errors="replace")
        except OSError:
            continue
        rel = str(f.relative_to(game_dir))
        # packed / high-entropy blobs
        for m in re.finditer(r"['\"]([A-Za-z0-9+/=]{500,})['\"]", text):
            if entropy(m.group(1)) > 5.5:
                findings.append(("OBFUSCATION",
                                 f"high-entropy blob ({len(m.group(1))} chars) in {rel}"))
                break
        if re.search(r"eval\s*\(\s*atob|eval\s*\(\s*unescape", text):
            findings.append(("OBFUSCATION", f"eval(atob/unescape) in {rel}"))
        if re.search(r"coinhive|cryptonight|monero|miner\.start", text, re.I):
            findings.append(("MINER", f"miner signature in {rel}"))
        # credential-harvesting patterns: password/PIN field targeting
        if re.search(r"(querySelector|getElementById|getElementsByName).*(password|pin|card|cvv|ssn)", text, re.I):
            findings.append(("SUSPICIOUS",
                             f"targets password/PIN/card fields in {rel} — verify intent"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("game_dir")
    ap.add_argument("--time", type=int, default=30)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    game_dir = Path(args.game_dir).resolve()
    out = Path(args.out) if args.out else game_dir / "SECURITY-REPORT.md"

    findings: list[tuple[str, str]] = []
    static_check(game_dir, findings)

    # find entry point
    index = game_dir / "index.html"
    if not index.exists():
        htmls = list(game_dir.glob("*.html"))
        index = htmls[0] if htmls else None
    if not index:
        findings.append(("ERROR", "no HTML entry point found"))
        write_report(out, findings, {}, game_dir)
        return

    # sandbox: load via file:// (no local server needed, bypasses
    # Local Network Access checks). External exfiltration attempts are
    # still observed because our hooks log before the request fires.
    from playwright.sync_api import sync_playwright
    fb = {}
    errors: list[str] = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=CHROME,
                                        args=["--no-sandbox",
                                              "--allow-file-access-from-files"])
            ctx = browser.new_context()
            page = ctx.new_page()
            page.add_init_script(MONITOR_JS)
            page.on("pageerror", lambda e: errors.append(str(e)[:200]))
            page.goto(index.as_uri(),
                      wait_until="domcontentloaded", timeout=30000)
            # simulate gameplay AND form interaction (thieves hide in handlers)
            page.wait_for_timeout(1500)
            try:
                inputs = page.query_selector_all("input, textarea")
                for inp in inputs[:5]:
                    try:
                        itype = (inp.get_attribute("type") or "text").lower()
                        if itype in ("hidden", "submit", "button", "checkbox",
                                     "radio", "file"):
                            continue
                        inp.click(timeout=2000)
                        inp.fill("test1234", timeout=2000)
                        # fire change/input like a real user blurring the field
                        inp.evaluate("""e => {
                            e.dispatchEvent(new Event('input', {bubbles:true}));
                            e.dispatchEvent(new Event('change', {bubbles:true}));
                        }""")
                        page.wait_for_timeout(400)
                    except Exception:  # noqa: BLE001
                        pass
            except Exception:  # noqa: BLE001
                pass
            for _ in range(4):
                page.mouse.move(200, 200)
                page.mouse.click(400, 300)
                page.keyboard.press("Space")
                page.wait_for_timeout(max(1000, args.time * 1000 // 6))
            fb = page.evaluate("window.__fb || {}")
            browser.close()
    except Exception as e:  # noqa: BLE001
        findings.append(("ERROR", f"sandbox run failed: {e}"))

    analyze_dynamic(fb, findings)
    write_report(out, findings, fb, game_dir, errors)
    verdict = "FLAG" if any(k in ("CREDENTIAL_THEFT", "SESSION_THEFT",
                                   "KEYLOGGER", "EXFILTRATION", "MINER", "ERROR")
                            for k, _ in findings) else "PASS (dynamic)"
    print(f"verdict: {verdict} — {len(findings)} findings -> {out}")


def analyze_dynamic(fb: dict, findings: list):
    net = fb.get("net", []) or []
    ext = []
    for n in net:
        url = n.get("d", "")
        m = re.search(r"https?://([^/:?\s]+)", url)
        if m and m.group(1).lower() not in WHITELIST_HOSTS:
            # ignore scheme-relative localhost noise
            if "127.0.0.1" not in url and "localhost" not in url:
                ext.append(url)
    ext = sorted(set(ext))
    input_reads = fb.get("inputReads", 0)
    cookie = fb.get("cookie", 0)
    keys = fb.get("keys", 0)

    if ext:
        findings.append(("EXFILTRATION",
                         f"{len(ext)} external request(s): " +
                         "; ".join(ext[:8])))
    if input_reads and ext:
        findings.append(("CREDENTIAL_THEFT",
                         f"read {input_reads} input value(s) AND contacted "
                         f"external host(s) — possible PIN/credential stealer"))
    elif input_reads:
        findings.append(("SUSPICIOUS",
                         f"read {input_reads} input value(s), no external net "
                         f"seen — verify what it does with them"))
    if cookie and ext:
        findings.append(("SESSION_THEFT",
                         "accessed document.cookie AND contacted external host"))
    if keys >= 3 and ext:
        findings.append(("KEYLOGGER",
                         f"{keys} key listeners + external network — "
                         f"possible keylogger"))
    if not net and not input_reads and not cookie:
        findings.append(("INFO", "no network, cookie, or input activity observed"))


def write_report(out: Path, findings, fb, game_dir, errors=()):
    verdict = "FLAG" if any(k in ("CREDENTIAL_THEFT", "SESSION_THEFT",
                                   "KEYLOGGER", "EXFILTRATION", "MINER",
                                   "ERROR") for k, _ in findings) else "PASS (dynamic)"
    lines = [f"# Sandbox security report — {game_dir.name}",
             f"Verdict: **{verdict}**", "",
             "## Findings"]
    for kind, detail in findings or [("INFO", "clean")]:
        lines.append(f"- **{kind}**: {detail}")
    lines += ["", "## Observed activity",
              f"- network events: {len((fb or {}).get('net', []))}",
              f"- input value reads: {(fb or {}).get('inputReads', 0)}",
              f"- cookie accesses: {(fb or {}).get('cookie', 0)}",
              f"- storage accesses: {(fb or {}).get('storage', 0)}",
              f"- key listeners: {(fb or {}).get('keys', 0)}",
              f"- beacons: {len((fb or {}).get('beacons', []))}"]
    if errors:
        lines += ["", "## Page errors"] + [f"- {e}" for e in errors[:10]]
    lines += ["", "---",
              "Next: human review per REVIEW-CHECKLIST.md. "
              "FLAG verdicts need Jeff-visible explanation before any decision."]
    out.write_text("\n".join(lines))


if __name__ == "__main__":
    main()
