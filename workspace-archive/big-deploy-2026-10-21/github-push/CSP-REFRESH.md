# CSP REFRESH — big deploy 2026-10-21, refresh pass 2026-10-22

## Staged hash map (ships with the push — NOT deployed in this task)
- **File:** `~/workspace/big-deploy-2026-10-21/github-push/csp-hashmap-staged.json`
  (byte-identical copy of `~/workspace/a-plus-project/hashmap.json`)
- **sha256:** d6ec9463fafd146f19dbad747d525d24fd3fe848cecfae7482f2f8cb3b2ab4e1 — 394,169 B
- **Coverage:** 70 pages. Union sets: script s=139, style y=125,
  script-src-attr a=135, style-src-attr t=252.
- **The headers Worker was NOT redeployed.** Per Jeff's A+ maintenance
  rule this map must be built into the Worker (audit_scan → gen_hashmap
  → build_worker enforce → deploy_worker enforce, in
  `~/workspace/a-plus-project/`) when the push ships.

## Method (established A+ pipeline, audit mode only)
1. `audit_scan.py` over the refreshed `~/workspace/.deploy` tree:
   70 pages, 126 unique inline script hashes, **zero danger patterns**.
2. `gen_hashmap.py` produced the new-only map for the refreshed tree.
3. Union-merged with the currently-deployed map backup (old hashes are
   never dropped — the live site keeps working until the push lands).

## Bug found and fixed during this refresh
- The starter-kit build added an inline script block to `3d.html`, but
  the page's own meta CSP was never updated — one hash missing:
  `sha256-y0vgYMqPN08i13vkz3Q53tSuecST14XNS/lISpkRo84=`.
  On the live site that block would have been blocked by the page meta.
  **Fix:** hash appended to the meta `script-src` in BOTH
  `~/workspace/coin-shop-build/3d.html` (source) and
  `~/workspace/.deploy/3d.html` (staging); the two copies are
  byte-identical after the fix.
- `play.html`'s meta was audited the same way: consistent (35/35).
- `dark-knight.js` needs no hash: it is an external same-origin script
  (`script-src 'self'`) and injects no inline script/style.

## Harness verification (refreshed tree, strict CSP from the staged map)
All runs serve `~/workspace/.deploy` locally as firebabys.io with the
staged map enforced; "new errors" are vs the old-CSP baseline.

- **game-60 (Arena)** — initial run surfaced style-src-attr violations;
  4 runtime hashes harvested, then a full gameplay bout harvest found 1
  more; all folded into the map globally. Final: **0 violations, 0 new
  errors**.
- **fire-world.html + 3d.html** — **0 violations, 0 new errors** after
  the 3d.html meta fix (an earlier batch run is what exposed the bug).
- **Index pages** (root index.html, slingshot-cascade, rukos-panic-dash,
  trinitys-holy-lightning-rescue, tristans-dark-knight-rescue, world) —
  **0 violations, 0 new errors**.
- **arcade.html + play-all.html** — **0 violations, 0 new errors**.
- **play.html** — 0 new errors; the only CSP console line is the
  pre-existing informational notice "'frame-ancestors' is ignored when
  delivered via a <meta> element" (the directive is enforced by the
  Worker header on the live site; play.html was not changed by this
  refresh and is not in the push set).

## Functional click tests (final runs against the FINAL staged map)
- `~/workspace/big-deploy-2026-10-21/click_test.py` — **13/13 PASS**:
  hub loads; onboarding tour appears for a fresh profile and sets the
  onboarded flag; shops render; locker (Chest) renders; hub sign-out
  present; Slingshot Cascade tab bar + hero tab click + pause menu;
  math gate 5-in-a-row sets the 24h unlock; playGame card click
  activates the game; **zero CSP violations, zero page errors** overall.
- `~/workspace/big-deploy-2026-10-21/click_test_arena.py` — **10/10
  PASS**: Arena menu → math gate → fighter select → loadout → bout
  starts (morph/fight phases, both fighters full HP) → fight continues
  through punch/kick/double-jump inputs → pause opens → resume works;
  **zero CSP violations, zero page errors** on game-60.
  (Test note: `wait_for_function` predicates are blocked by the strict
  CSP's lack of 'unsafe-eval', so the arena test polls via `evaluate`.)

## Bottom line
Refreshed tree + staged map are verified clean. Nothing was pushed and
nothing was deployed in this refresh.
