#!/usr/bin/env python3
"""
FIRE BABYS — patch assembler.

The baseline game (src/baseline.html) is FROZEN. It is never edited.
Every update — big or small — lives in its own file under patches/.
This script assembles the playable files:

  Fire Babys.html          = baseline + all ENABLED patches  (the live game)
  Fire Babys BASELINE.html = baseline only                  (debug reference)

If something glitches:
  1. Open "Fire Babys BASELINE.html". Glitch still there? -> it's the baseline.
  2. Glitch only in "Fire Babys.html"? -> it's a patch. Set patches to
     "enabled": false one at a time in patches/manifest.json, rebuild,
     retest. The log in PATCHES.md says exactly what each patch touches.

The script also:
  - Refuses to run if src/baseline.html was modified since the freeze
    (fingerprint in src/.baseline.fingerprint), unless --allow-baseline-change.
  - Syntax-checks every patch with `node --check` before assembling.
  - Recomputes the CSP sha256 hashes for every script block automatically,
    so the phone browser never blocks the game again.
"""

import base64
import hashlib
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BASELINE = os.path.join(HERE, "baseline.html")
FINGERPRINT = os.path.join(HERE, ".baseline.fingerprint")
MANIFEST = os.path.join(ROOT, "patches", "manifest.json")
OUT_GAME = os.path.join(ROOT, "Fire Babys.html")
OUT_BASE = os.path.join(ROOT, "Fire Babys BASELINE.html")

SCRIPT_RE = re.compile(r"<script>(.*?)</script>", re.DOTALL)
CSP_RE = re.compile(r"(script-src\s+)([^;'\"]*(?:'[^']*'\s*)*)")


def sha256_b64(data: bytes) -> str:
    return base64.b64encode(hashlib.sha256(data).digest()).decode()


def minify_js(code: str, fname: str) -> str:
    """Minify JS patch code with terser (Pillar 5: keep the game under 250KB).

    Falls back to the unminified code if terser is unavailable or fails,
    so the build never breaks because of the optimizer.
    """
    import tempfile
    terser_bin = "/tmp/node_modules/.bin/terser"
    if not os.path.exists(terser_bin):
        return code
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".js",
                                         delete=False) as tf:
            tf.write(code)
            tmp_in = tf.name
        tmp_out = tmp_in + ".min.js"
        r = subprocess.run(
            [terser_bin, tmp_in, "--compress", "--mangle",
             "--output", tmp_out],
            capture_output=True, text=True, timeout=60)
        if r.returncode == 0 and os.path.exists(tmp_out):
            with open(tmp_out, encoding="utf-8") as f:
                minified = f.read()
            # Sanity: minified output must be non-trivial.
            if len(minified) > 100:
                print(f"    (minified {fname}: {len(code)} -> "
                      f"{len(minified)} bytes)")
                return minified
        print(f"    (minify skipped for {fname}, terser issue)")
        return code
    except Exception as e:  # noqa: BLE001 — never break the build
        print(f"    (minify failed for {fname}: {e})")
        return code
    finally:
        for p in (tmp_in, tmp_out):
            try:
                os.unlink(p)
            except Exception:
                pass


def die(msg: str) -> None:
    print(f"BUILD FAILED: {msg}", file=sys.stderr)
    sys.exit(1)


def check_baseline_frozen() -> None:
    with open(BASELINE, "rb") as f:
        digest = sha256_b64(f.read())
    if os.path.exists(FINGERPRINT):
        with open(FINGERPRINT) as f:
            recorded = f.read().strip()
        if recorded != digest and "--allow-baseline-change" not in sys.argv:
            die(
                "src/baseline.html was MODIFIED since the freeze.\n"
                "The baseline is never edited directly — put the change in a "
                "new patch file instead.\n"
                "If you truly mean to re-freeze a new baseline, rerun with "
                "--allow-baseline-change and document it in PATCHES.md."
            )
    else:
        with open(FINGERPRINT, "w") as f:
            f.write(digest)
        print("Baseline fingerprint recorded (first freeze).")


def load_patches():
    with open(MANIFEST) as f:
        manifest = json.load(f)
    patches = []
    for entry in manifest.get("patches", []):
        if not entry.get("enabled", True):
            print(f"  [off] {entry['file']}")
            continue
        path = os.path.join(ROOT, "patches", entry["file"])
        if not os.path.exists(path):
            die(f"patch listed in manifest but file missing: {entry['file']}")
        r = subprocess.run(["node", "--check", path], capture_output=True, text=True)
        if r.returncode != 0:
            die(f"patch has a syntax error: {entry['file']}\n{r.stderr}")
        with open(path, encoding="utf-8") as f:
            patches.append((entry["file"], f.read()))
        print(f"  [on]  {entry['file']}")
    return patches


def assemble(patches):
    with open(BASELINE, encoding="utf-8") as f:
        html = f.read()

    blocks = []
    for fname, code in patches:
        # Pillar 5 diet pass: minify each patch before embedding.
        # (No per-patch header comment — saves bytes; manifest.json
        # documents which patches are enabled.)
        code = minify_js(code, fname)
        blocks.append("<script>" + code + "</script>")

    if blocks:
        html = html.replace("</body>", "".join(blocks) + "</body>")

    # Recompute CSP hashes for every script block in the final document.
    hashes = ["'sha256-" + sha256_b64(b.encode("utf-8")) + "'"
              for b in SCRIPT_RE.findall(html)]

    def csp_sub(m):
        # Google sign-in (2026-10-03): the auth gate loads from firebabys.io
        # and Google Identity Services loads from accounts.google.com, so
        # both must be allowlisted alongside the inline-script hashes.
        return "script-src " + " ".join(hashes) + " https://firebabys.io https://accounts.google.com"

    html2, n = CSP_RE.subn(csp_sub, html, count=1)
    if n != 1:
        die("could not find the script-src directive in the CSP meta tag")
    # Security wall: block clickjacking — the game may never be framed by
    # another site. (frame-ancestors can't go in a patch; it rides the build.)
    if "frame-ancestors" not in html2:
        html2 = html2.replace("default-src 'none';",
                              "default-src 'none'; frame-ancestors 'self';", 1)
    return html2, hashes


def main():
    check_baseline_frozen()
    print("Loading patches from manifest:")
    patches = load_patches()

    game_html, hashes = assemble(patches)

    # Purpose note (added 2026-10-01 at Jeff's direction): states what the
    # game is for, stamped on every built copy of the live game file.
    PURPOSE_NOTE = (
        "<!--\n"
        "  FIRE BABYS — purpose note (added 2026-10-01, at Jeff's direction):\n"
        "  The purpose of this game is to teach children how to prevent house fires\n"
        "  and what to do when there is a fire around.\n"
        "-->"
    )
    game_html = game_html.replace("<!DOCTYPE html>",
                                  "<!DOCTYPE html>\n" + PURPOSE_NOTE, 1)

    # Copyright notice (added 2026-10-01 at Jeff's direction): asserts his
    # ownership on every built copy of the game. Copyright exists from the
    # moment of creation under US law; this stamp puts the world on notice.
    COPYRIGHT_NOTICE = (
        "<!--\n"
        "  FIRE BABYS — copyright notice (added 2026-10-01, at Jeff's direction):\n"
        "  Copyright (c) 2026 Jeffery Pruden. All rights reserved.\n"
        "  FIRE BABYS, the Fire Babys characters, artwork, story, text, and game\n"
        "  code are original works of authorship. No part of this game may be\n"
        "  reproduced, distributed, or used to create derivative works without\n"
        "  written permission.\n"
        "-->"
    )
    game_html = game_html.replace(PURPOSE_NOTE,
                                  PURPOSE_NOTE + "\n" + COPYRIGHT_NOTICE, 1)

    # Trailer fix (2026-10-02, permanent): the game streams trailer.mp4
    # same-origin, so the CSP needs media-src 'self'. The baseline's
    # media-src 'none' blocks the video — previously fixed by hand on
    # every deploy; now the build does it automatically.
    game_html = game_html.replace("media-src 'none'", "media-src 'self'", 1)

    # Google sign-in fix (2026-10-03, permanent): the auth gate (patch 021)
    # talks to the auth worker and Google Identity Services, and the
    # "Sign in with Google" button renders in a Google iframe. The
    # baseline's connect-src/frame-src/child-src 'none' blocks all of it —
    # now the build allowlists them automatically.
    game_html = game_html.replace(
        "connect-src 'none'",
        "connect-src https://fire-babys-auth.jeffpruden288.workers.dev"
        " https://www.googleapis.com https://accounts.google.com", 1)
    game_html = game_html.replace("frame-src 'none'",
                                  "frame-src https://accounts.google.com", 1)
    game_html = game_html.replace("child-src 'none'",
                                  "child-src https://accounts.google.com", 1)

    with open(OUT_GAME, "w", encoding="utf-8") as f:
        f.write(game_html)

    base_html, _ = assemble([])
    with open(OUT_BASE, "w", encoding="utf-8") as f:
        f.write(base_html)

    print(f"\nWrote {OUT_GAME}  ({len(patches)} patches, "
          f"{len(game_html)} bytes)")
    print(f"Wrote {OUT_BASE}  (baseline only, {len(base_html)} bytes)")
    print(f"CSP now whitelists {len(hashes)} script block(s).")
    print("DONE — game rebuilt, baseline untouched.")


if __name__ == "__main__":
    main()
