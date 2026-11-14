# SPLASH Investigation Report — play.html undefined-symbol errors

Date: 2026-10-12 · Investigator: SPLASH subagent · **Verdict: FIXED via the established build, with harness proof. SPLASH boots and plays; page errors 4 → 0.**

---

## Root cause (one cause for all three symbols)

**None of the three symbols is missing from the code. The baseline script block that defines all of them was refused by the browser under CSP, so it never executed.**

`play.html` carries a strict CSP (`script-src 'sha256-…' …`) that only executes inline `<script>` blocks whose exact bytes hash to a whitelisted value. Someone hand-edited the deployed `.deploy/play.html` *after* the last proper build (2026-10-04 build → deployed file timestamped 2026-10-05) — a kid-safe wording scrub — without rebuilding, so the CSP hashes went stale for every edited block:

| Block | Content | Deployed edits (vs. built file) | Hash in CSP? |
|---|---|---|---|
| 0 | **Baseline game** (all core code) | 5 wording edits: BURN→CAPTURE (header comment, castle comment ×2, hero hint `burn their castle! 🏰🔥`→`capture their castle! 🏰`, banner `CASTLE BURNED!`→`CASTLE CAPTURED!`) | ❌ stale (`FqSbWCT+…` = hash of the *unedited* baseline) |
| 12 | Patch 012 — title screen | `BAD ASS • FIRED UP • READY TO BLAST` → `BLAZE ON • …` | ❌ stale |
| 25 | Patch 025 — catch mode | 4 edits: CATCH→SPLASH (button, hint, end-screen line, quit-button aria-label) | ❌ stale |

The other 23 blocks match their hashes and execute normally. Verified mechanically: sha256 of every block in the deployed file vs. its CSP list (3 mismatches, 3 orphan CSP hashes), and a full diff of deployed vs. last built `Fire Babys.html` (only those 10 string edits differ).

This is the Patch-016 pattern one level up: not a function that was never defined, but a whole script block silently discarded by CSP — guaranteed silent because a blocked block produces no stack trace in the game, only a console CSP message.

### Per-symbol analysis

All three are defined in `src/baseline.html` (block 0), present and correct in both the built and deployed files:

- **`drawBabyEyes`** — `function drawBabyEyes(u, s)` in baseline. Throw sites: patch **001** line 16, `var __fb_origEyes = drawBabyEyes;` (unguarded, at IIFE top level), and patch **004**, `var __fb4_prevEyes = drawBabyEyes;` (also unguarded). That is why the harness logged this text **twice** (4 pageerrors, 3 distinct texts).
- **`UNIT_DEFS`** — `var UNIT_DEFS = {…}` in baseline. Throw site: patch **002** line 71+, the unguarded cosmetic renames (`UNIT_DEFS.brawler.name = 'Ruko';` …).
- **`tryPlace`** — `function tryPlace(col, row)` in baseline. Throw site: patch **005** line 18 — a `'use strict'` IIFE reassigning `tryPlace = function…`; assigning to a never-declared name is a ReferenceError in strict mode.

Later patches that guard with `typeof X !== 'undefined'` (003, 007, 008, 019…) did not throw — they silently no-opped. Each patch is its own `<script>` block, so no throw cascaded; it didn't matter (see impact).

### The other two console errors in the baseline sweep — assessed

- **`frame-ancestors` ignored in a `<meta>` element** — **cosmetic**, pre-existing in the known-good build too. Chromium simply doesn't support that directive via meta; anti-framing would need a real HTTP header. Not related to the outage.
- **`ERR_SSL_PROTOCOL_ERROR` loading `https://firebabys.io/auth-gate.js`** (patch 021 integration) — **pre-existing and independent**: present in both the broken and fixed runs, a resource-load console error, not a pageerror. The game boots and plays locally without it. It was **not** touched (auth path is out of bounds for this fix); the coordinator should verify the auth gate separately against the real https deployment, where the script is same-origin.

## User impact (before fix)

**Total: SPLASH was completely unplayable in any CSP-enforcing browser (all modern browsers).** Probe of the broken deployed file: `Game`, `UNIT_DEFS`, `drawBabyEyes`, `tryPlace` all `undefined`; title overlay never created (patch 012 was itself blocked); 0 troop buttons; the harness's "canvas_visible: true" was only the static `<canvas>` element in the HTML — no game logic ever ran behind it. Unit placement, rendering, and every other feature were dead because the entire core game (block 0) never executed.

## What was done — fix through the build only

No hand-edits to `.deploy/play.html`. No graphics/weapon changes. No auth/multiplayer code touched.

1. **Backup first:** broken deployed file → `backups/play.html.orig` (sha256 `defbf304…`, hash-verified copy); original sources + fingerprint + built file → `backups/splash-src-orig/`.
2. **Reproducibility check:** a scratch copy of the source tree rebuilt **byte-identical** to the shipped `Fire Babys.html` (sha256 `e82ce634…`) — the build is deterministic (terser absent, minify is a no-op), so a rebuild was provably safe to reason about.
3. **Ported the deployed wording back into the sources** (exactly the 10 deployed strings, nothing else):
   - `src/baseline.html` — the 5 CAPTURE strings. Baseline **re-frozen** via build.py's documented `--allow-baseline-change` path (wording only, zero code-logic changes).
   - `patches/012-title-screen.js` — `BAD ASS` → `BLAZE ON` tagline.
   - `patches/025-catch-mode.js` — the 4 CATCH→SPLASH user-visible strings.
4. **Rebuilt** with `build.py` (recomputes all CSP hashes). The rebuilt file is **byte-identical to the previously deployed file except the single CSP meta line** (3 hashes corrected) — same size, 422,946 bytes. Zero game-code change relative to what was already deployed.
5. **Re-freeze completed:** build.py's `--allow-baseline-change` never updates `src/.baseline.fingerprint` (script quirk), so the fingerprint was set to the new baseline hash (`069pX5gN…`). Verified afterwards: a plain flag-free `python3 src/build.py` succeeds and reproduces the deployed file byte-for-byte.
6. **Documented** in `PATCHES.md` (2026-10-12 entry + addendum), as build.py's re-freeze process requires.
7. **Deployed** by copying the build output `Fire Babys.html` → `.deploy/play.html` (sha256 `8eb51db4…`).

## Evidence

- **verify-patches.js** (real tree, before and after): `ALL RUNTIME CHECKS PASSED`.
- **Candidate tested before deploying:** scratch-served rebuild — probe showed `drawBabyEyes: function`, `UNIT_DEFS: object` (5 units), `tryPlace: function`, `Game.phase: 'deploy'`, title overlay present and dismissible, 4 troop buttons; direct `tryPlace(0,0)`/`tryPlace(1,0)` calls placed 2 brawlers with zero pageerrors (report: `reports/http-localhost-8903-play-html.json`).
- **Harness on the live URL after deploy** (`reports/http-localhost-8901-play-html.json`, 2 runs): **page_error_count = 0 / 0** (baseline sweep: 4), `start_clicked: true` (was false), canvas visible, loadFailures 0. Remaining console errors: exactly the 2 pre-existing ones above — a strict subset of the baseline run's errors; **no new errors**.
- **Byte-safety:** deployed-now vs. backup diff = 2 lines (the CSP meta line only).

## State left

- `~/workspace/.deploy/play.html` — **REBUILT & FIXED** (build output only), sha256 `8eb51db41a31e4b80bab888f77f3e68effd605683927ab2d8befcb8b6e3fe3ec`, served at http://localhost:8901/play.html and verified live above.
- Sources: `src/baseline.html` re-frozen with CAPTURE wording; `patches/012`, `patches/025` carry the deployed wording; `Fire Babys.html` / `Fire Babys BASELINE.html` regenerated by the build.
- Rollback (if ever needed): restore `backups/play.html.orig` → `.deploy/play.html` and `backups/splash-src-orig/*` → sources, then rebuild. (Rollback would restore the broken CSP state — it exists only as a safety net.)

## Follow-ups flagged (not done here, by design)

1. **Process guard:** this happened because a deploy bypassed the build. Any future wording/content edit to SPLASH must go through a patch (or a baseline re-freeze) + `build.py`; a direct edit to the deployed file silently kills the game again. A cheap tripwire: extend the sweep to fail loudly when any script block's hash is absent from the CSP.
2. **Auth gate:** verify `auth-gate.js` behaviour on the real https://firebabys.io deployment (the local SSL error is a localhost artifact, but only a live check proves it).
