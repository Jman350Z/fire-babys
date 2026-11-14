# Fire Babys Godot Build — Memory Captures

Screenshots + clips of the game being created, for the future memory/"then and now" video. (Jeff, 2026-10-03: "take memory picks and videos of the creation of the game for a memory video later on in life.")

Capture method: `fire-babys-godot/capture.gd` run under `xvfb-run` (software rendering) — screenshots real rendered frames, never mockups.

## 2026-10-03 — Day one: Godot 4.7.2 + first Blaze
- `2026-10-03-blaze-first-screenshot.png` — very first rendered frame of Blaze (code-drawn fireball: flame hair, eyes, smile) in the Godot project.
- `2026-10-03-blaze-first-clip.mp4` — 3s clip (90 frames @ 30fps) of Blaze bouncing around the viewport. First ever moving footage of the Godot build.
- Raw frames kept in `frames/` for future edits.
- Context: Jeff got Bobby Godot Engine 4 the same day ("a powerful tool to help you build the next better game"). Project created at `~/workspace/fire-babys-godot/`.

## 2026-10-03 — First real character: Fire Baby in Godot 4
Jeff's spec: "IMAX 3D super style... spherical ball of living flame, arms with hands, legs with feet, big cheerful eyes, wide smiling mouth, glossy Fall Guys plushie texture, flame tendrils, neutral background."
- `2026-10-03-firebaby-front.png` — front model-sheet still (1080x1080, studio 3-point lighting).
- `2026-10-03-firebaby-threequarter.png` — three-quarter model-sheet still.
- `2026-10-03-firebaby-showcase.mp4` — 5s performance clip (wave + hop, blinking eyes, dancing tendrils).
- Raw frames in `frames_showcase/`. Character code: `fire-babys-godot/characters/fire_baby.gd`; studio: `fire-babys-godot/showcase.gd`.
- Posted to Discord #announcements (msg 1556075085616513148).

## 2026-10-03 — Standalone fireball (Jeff: "just a ball of fire")
Real Godot 4 particle fire: emissive shader core + 70 flame particles + 45 embers + smoke + flickering firelight. First render blew out white (fixed by tuning counts/sizes), then particles rendered as hard squares (fixed with a procedural soft-dot radial texture).
- `2026-10-03-fireball.png` — hero still.
- `2026-10-03-fireball-clip.mp4` — 3s clip (90 frames @ 30fps).
- Raw frames in `frames_fire/`. Code: `fire-babys-godot/characters/fireball.gd`; capture: `fire-babys-godot/fire_showcase.gd`.
- Posted to Discord #announcements.

## 2026-10-03 — Stock body (Jeff's new prompt)
Spec: matte vinyl, orange bottom → golden yellow top, stubby capsule arms + stubby feet seamlessly integrated (zero floating parts), embossed eyes + molded smile, solid gray bg, neutral lighting.
- `2026-10-03-stockbody-front.png` / `2026-10-03-stockbody-threequarter.png` — model-sheet stills.
- `2026-10-03-stockbody-clip.mp4` — 5s 360° turntable (150 frames @ 30fps).
- Raw frames in `frames_stock/`. Code: `fire-babys-godot/characters/stock_body.gd`; capture: `fire-babys-godot/stock_showcase.gd`.
- Eyes reworked to embossed/flattened — fixes the "egg eyes" laugh from the Ruko reveal.
- Posted to Discord #announcements.

## 2026-10-03 — Flaming stock body (Jeff: 2-inch flame layer, scrub the face)
Stock body + additive fresnel flame shell (animated tongues, stronger at top) + shell embers. Face removed (show_face=false, kept in code for later). First pass read as a glow aura — retuned to distinct tongues with dark gaps.
- `2026-10-03-flamebody-front.png` / `2026-10-03-flamebody-threequarter.png`
- `2026-10-03-flamebody-clip.mp4` — 5s turntable.
- Raw frames in `frames_flame/`. Posted to Discord #announcements.

## 2026-10-03 — Fire Baby v2: OVAL, and the body IS fire (Jeff's correction)
Jeff: "fires are oval not just a circle" + "make it fire" — the v1 vinyl-ball look was trash. Rebuilt: body mesh scaled to oval (0.9, 1.22, 0.9), body shader rewritten as living flame (hot core, deep orange edges, flames rolling upward, strong emission), shell hugs the oval, legs lengthened + body lowered so feet plant on the ground.
- `2026-10-03-flamebody-front.png` / `2026-10-03-flamebody-threequarter.png` (overwrote v1)
- `2026-10-03-flamebody-clip.mp4` — 5s turntable.
- Posted to Discord #announcements.

## 2026-10-03 — 50% more oval (Jeff)
Body/shell stretch 1.22 → 1.35 vertical, body mesh lifted so the flame sits over the stubby legs, camera reframed. Tall teardrop flame silhouette.
- `2026-10-03-flamebody-front.png` / `2026-10-03-flamebody-threequarter.png` (overwrote)
- `2026-10-03-flamebody-clip.mp4` — 5s turntable. Posted to Discord #announcements.

## 2026-10-03 — All 5 research upgrades applied (Jeff: "use all of them")
GitHub/community research → toon-banded body shader, inverse-hull ink outlines (body 0.035, limbs 0.022), view-dependent hot core, voronoi cellular noise (body + flame shell), periodic squash & stretch (quad in → back out → elastic). All free, all Compatibility-safe.
- `2026-10-03-flamebody-front.png` / `2026-10-03-flamebody-threequarter.png` (overwrote)
- `2026-10-03-flamebody-clip.mp4` — 5s turntable. Posted to Discord #announcements.

## 2026-10-03 — A REAL FIRE: 100% thicker shell + emoji flame tip (Jeff)
Jeff: "a real fire 🔥". Shell radius 0.62 → 0.74 (100% thicker envelope), vertex shader pinches the top into a pointed flame tip, richer orange-red tongue colors, deeper gaps. The silhouette is now unmistakably a flame.
- `2026-10-03-flamebody-front.png` / `2026-10-03-flamebody-threequarter.png` (overwrote)
- `2026-10-03-flamebody-clip.mp4` — 5s turntable. Posted to Discord #announcements.

## 2026-10-03 — OPEN WORLD MAP: first walkable Fire Babys world (Jeff)
Built the real open world from Jeff's reference art: procedural island (240m), central volcano with crater lava pool + 3 lava ribbons + smoke, 5 kingdoms (Ember Village gold castle, Cinder Castle on Obsidian Peaks, Crystal Flare spires, Scorch Arena colosseum, Inferno's foundry), ocean + foam ring, 90 trees, drifting clouds. Playable third-person Fire Baby (flaming, faceless): WASD/mouse + touch joystick, jump, collision.
- `worldmap-aerial.png` / `worldmap-volcano.png`, `2026-10-03-worldmap-orbit.mp4`.
- EXPORTED to web (Godot 4.7.2, nothreads) and deployed to firebabys.io/world/ — wasm split in two <25MB parts, reassembled client-side via fetch patch. Verified live: boots, renders, character walks. Analytics beacon added.

## 2026-10-04 — CATCH MODE (Jeff's elimination edition)
New Godot world game mode: 3v3 (player + 2 AI fire-baby teammates vs 3 skeleton AI). Two teammates grab an enemy (3 units, 0.8s), carry at 55% speed to their own SWIMMING POOL, and dunk the victim — fire baby + water = big cartoon steam POOF, eliminated for the match. Rescue rules: 1 rescuer halves carry speed, 2+ stop carriers and break the victim free after 1.5s. Win: dunk all 3 skeletons. Lose: player dunked or both teammates dunked. Enter via the glowing portal in Ember Village or the CATCH! HUD button; clean return to free roam.
- `2026-10-04-catch-pool-dunk.png` — hero shot: gold pool, rising steam, "Bones got DUNKED!" toast, remaining-teams HUD.
- Headless integration test (27 checks: portal enter, grab, rescue slow/stop/break-free, dunk elimination, win/lose banners, free-roam restore) — ALL PASSED.
- Exported to web (Godot 4.7.2, wasm split .aa/.ab, index.html patches intact).
- `2026-10-04-catch-stadium-arena.png` — new Godot 4 CATCH stadium: walled 40m arena, dividing line, orange/blue pools, 3-sided MultiMesh fan stands, 4v4 kickoff, 4:56 timer HUD.
- `2026-10-04-catch-stadium-pools.png` — same arena, fire-safety tip ticker visible ("Test your smoke alarms every month!").

## 2026-10-04 — CATCH ARENA (Godot 4 standalone, Jeff's locked rules)
New standalone CATCH stadium built in Godot 4.7.2: 40x40m walled arena, orange/blue halves, two steaming pools, 600-fan MultiMesh crowd (pastel instance colors, bobbing), faceless toyetic Fire Baby contestants from primitives. Full rules: 1s two-baby grab, 0.55x carry speed, rescue (1 = 0.275x, 2 = full stop, 1.5s breaks chain + 2s immunity), pool dunk = steam POOF elimination, wipe-out win, 300s timer fallback, sudden-death next-dunk-wins. All-bot AI so matches play themselves. Headless integration test: 15/15 PASS (grab timing, carry slow, rescue slow/stop/break, re-grab immunity, dunk elimination, timer fallback, sudden death, organic bot play). Two real bugs found & fixed by the test: freed carriers kept stale pool orders; sudden-death soft-locked the rule ticks.
- `2026-10-04-catch-arena-empty.png` — opening face-off, both pools steaming, 4v4.
- `2026-10-04-catch-arena-carry.png` — "Spark got GRABBED!": two orange carriers dragging the lifted blue victim to the pool.
- `2026-10-04-catch-arena-dunk-b.png` — "Spark got DUNKED! POOF!": steam explosion + POOF! label over the orange pool (a/c variants also saved).
