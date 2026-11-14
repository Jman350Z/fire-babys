# Fire Babys Rebellion — Mission 1: Operation First Ember (3D) — Build Report

**Status: BUILT + VERIFIED (not deployed).** Godot 4.7.2 project in `godot/`, web export staged in `godot-web/`. The 2D build was not touched. No deploy, no push, no DNS, no website edits.

Proof state was snapshotted first to `godot-proof-snapshot/` (sha256-verified copy).

## What shipped, per system

**World** (`scripts/main.gd`, ~1,500 lines) — The full Caldera outpost: the exact 26-row tile map from the verified 2D build (1 tile = 1.6 m), night scene with lava-crack ground shader, MultiMesh walls/crates, one shared-collider StaticBody, steam-vent mist + particles, gear pad, 3 bar cages with hinged doors and captive Water Baby balls, the Slime Pump (east plaza), extraction gate (NE corner), braziers, lava pools, rocks. Three zones with checkpoint doors.

**Heroes** (`scripts/heroes.gd`, `scripts/player.gd`, `scripts/star_mesh.gd`) — All 12 heroes playable, data ported 1:1 from the 2D build (names, roles, looks, flavor lines, palettes). Built from the approved Art Pass 1 Blaze construction system — **Blaze himself was not redesigned**; his rig was generalized with per-hero identity: star crowns (extruded star prism), bandanas + droplet charm, rock/ice slab hair, splash crown, archer bow + quiver, Lord capes + gold trim, Cinder's blue/purple flame tips. Role differences are internal only, never displayed: Scouts faster, Ramparts bonk from any side, archers get 3 sleep-darts, Ghosts crouch-move faster, Lords get a wider (visual) cone tint. Ball form at spawn with mini identity piece; Gear Up transformation sequence (0.9 s) on the pad; ball rolls, formed form runs, crouch supported.

**Mission flow** — Ball form → Gear Up pad → rescue 3 caged Water Babys (hold-to-free, 1.4 s) → plant ember charge on the Slime Pump (hold 1.6 s) → 20.0 s escape timer (last-5 s beeps; if it expires the charge fizzles and must be re-planted) → extraction gate → Mission Complete (time, times spotted, rank in words: Silent Flame / Ember Shadow / Spark Runner / Loud & Proud; best score persisted in `user://fbr3d.cfg`). Codec cards verbatim from the 2D script (Lord Inferno + Aqua intro, Aqua after rescue 2, Inferno on plant), typewriter effect, skippable with Esc, game pauses during codec. 3 ember shields: caught = shield lost + knockback to the current zone door; shields empty = checkpoint offer (retry from furthest zone with progress kept, or full restart).

**Enemies** — 6 Bonehead patrols (Art Pass 1 model, waypoint loops, perception = range 8.5 m + 62° FOV + occlusion raycast through walls/crates, calm → "?" → ALERT chase; bonk from behind = 20 s sleep with Zzz; archer sleep-dart also sleeps). 4 Slimers (wander, leave 11 s slime trails that slow the hero, are **smothered** by the ember-burst — 6 s recharge meter — never sprayed). Steam tiles hide a still hero completely.

**HUD law** — One slim top tab bar (objective, escape-timer chip, rescued count, 3 shield chips, alarm label + meter, ONE pause button) + slim status strip (hint, hold progress, burst meter, darts). Play field clear. Restart / Sound / Help / Quit exist ONLY inside the pause menu.

**Controls** — WASD + arrows (see bug #3 below), Shift crouch, E interact/hold, F context action (burst / bonk / dart), Q or drag to orbit camera, Esc pause. Touch: virtual joystick + ACT / BNK / CRCH buttons, appearing on first touch; codec advances by tap. **Portrait phones are fully supported**: the game window syncs to the browser's real size (see "Responsive fix" below), the camera pulls back and widens FOV in portrait, and the hero-select grid drops to 2 large columns.

**Audio** (`scripts/sfx.gd`) — Fully synthesized WAV bank generated in code (no audio files): click, rescue chime, bonk, gear-up, plant, escape beeps, burst, dart, caught sting, suspicion tick, win motif. Mute toggle in the pause menu, persisted with the best score.

## Export + wasm split

- Preset: Web, **no threads** (`variant/thread_support=false`), staged at `godot-web/` (proof export replaced).
- `index.wasm` = **39,514,754 bytes** → split with `~/workspace/firebabys-online/split_wasm.py` (idempotent) into `index.wasm.aa` + `index.wasm.ab` of **19,757,377 bytes each** (under the 25 MB GitHub per-file limit); a loader IIFE in `index.html` reassembles them into a blob URL before `index.js` loads — the same treatment as the Oct 3 `fire-babys-web` build.
- `index.pck` = 127,372 bytes. Total package ≈ 39.9 MB.

## Verification evidence

- **Headless native boot: zero script/shader errors** (multiple runs, incl. the final source).
- **Native scripted smoke test: 24/24 PASS** — select → codec → play, ball form, gear-up transform, stage advance, bonk sleeps a guard, ember-burst smothers a Slimer, cone → ALERT (organic), spotted counter, caught costs a shield (3→2), rescues 1/2/3, plant, escape timer ≈ 19.7 s at read, extraction → complete + rank, change-hero flow, archer forms with 3 darts, sleep-dart sleeps a guard, dart count 3→2.
- **Hero sweep: 12/12 heroes build + transform with zero errors.**
- **Playwright on the exported web build** (Chromium + SwiftShader), driven through the game's web test hook + real keyboard: boot → 12-card select → Blaze → codec → WASD movement → gear up (formed) → rescue 1 (0→1) → ALERT (spotted 1) → rescue 2 (+ codec) → rescue 3 → plant → **escape timer 20.00 / 19.87 at first read** → extraction → **Mission Complete, rank "Ember Shadow"**. Portrait pass (390×844): boot → codec → gear up → touch UI appears on tap → ALERT. **Console/page errors: 0 across every pass.**
- Final cosmetic fixes (objective "1/3" counter, portrait select layout) re-confirmed on the shipped binary with targeted runs, zero errors.
- Screenshots in `~/workspace/firebabys-online/`: `m1-select.png`, `m1-codec.png`, `m1-formed.png`, `m1-rescue1.png`, `m1-alert.png`, `m1-escape.png`, `m1-complete.png`, `m1-portrait-select.png`, `m1-portrait-formed.png`, `m1-portrait-touch.png`, `m1-portrait-alert.png`.

## Real bugs found + fixed during this build

1. **WASD was dead for real players** — the project's built-in ui_* actions bind arrow keys only. The player controller now reads physical keys directly (WASD + arrows). This would have shipped broken.
2. **JS bridge misuse** — `JavaScriptObject.set()` is forwarded as a method call and throws; the web test hook uses property assignment + a polled command string (engine `create_callback` callables proved inert in this runtime).
3. **Portrait squeeze** — with the original stretch settings, a portrait phone got a 1280-wide viewport scaled to ~0.30× (tiny UI, 4 cramped select columns). Fixed properly: stretch disabled + `canvas_resize_policy="Project"` + the game sizes its window to the browser's real inner size at boot and on resize/rotation. Verified: viewport reports exactly 390×844, 2-column select, natural-scale HUD, and follows live resizes.
4. Objective label didn't update its counter on rescues 1–2 (HUD showed 0/3 after the first rescue). Fixed.
5. Dart `look_at` before entering the tree; camera snap at hero pick could park the camera outside the west wall; codec hint glyph rendered as tofu in the default font — all fixed.

## Honest limits

- **Balance is ported, not playtested by a human**: patrol speeds, suspicion rates, hold times and the 20 s escape are the 2D build's numbers in 3D. Expect a tuning pass after Jeff plays it.
- **Performance on a real phone GPU is unproven.** Under SwiftShader (software rendering) on this VM the game runs ~4–5× slow-motion; that is a software-renderer artifact (native headless runs full speed and the scene is built light: MultiMesh + shared colliders + capped particles), but no physical device has run it yet.
- A perfectly still hero can hover just outside a chasing guard's 1.05 m catch radius (guard stops at 1.15 m); in practice movement resolves it, and ALERT/shield flow is unaffected.
- The checkpoint-offer screen and the charge-fizzle re-plant path are implemented and code-reviewed but were **not** exercised end-to-end in the web pass (the passing runs never lost all 3 shields or let the timer expire).
- The web test hook (`window.__FBR3D_CMD` / `__FBR3D_STATE`) ships in the export. It exposes only game-state reads and scripted inputs (pick/teleport/hold), no data or credentials; remove before a public launch if desired — it is also what made this verification possible.
- A benign "2 ObjectDB instances leaked" warning appears only when the native smoke harness kills the tree abruptly; it does not occur on normal quit or in the web build.

**Next step (not done here, by design):** Jeff's launch sequence — wire the finished site + this export (Namecheap apex for firebabys.online first, fallback rebellion.firebabys.io), replace the parked 2D mount on rebellion.html, remove "Deploy
...[truncated 400 chars]