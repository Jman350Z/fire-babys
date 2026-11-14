# Fire Babys Rebellion — Godot 4 3D Proof

**Status: built and verified, 2026-10-29.** A visual/feel checkpoint only — one
scene, no mission, no hero select, nothing deployed. Jeff rejected the flat 2D
canvas build ("the game needs to look like MGS with Fire Babys"); this proof
shows the same stealth idea in real 3D: a third-person camera, a transformed
Blaze made of living fire, and a Bonehead patrol with a working vision cone.

Engine: Godot 4.7.2 stable, GL Compatibility renderer (the web/phone-safe
path), no-threads web export following the Oct 3 configuration pattern
(`variant/thread_support=false`, `canvas_resize_policy=2`).

## What's in the scene

**Caldera outpost courtyard, night** (34×26 m, walled):
- Basalt ground with a custom voronoi **lava-crack shader** — dark volcanic
  rock split by pulsing emissive fissures (`shaders/lava_ground.gdshader`)
- Perimeter walls + two interior wall segments that carve a stealth route and
  genuinely block line of sight; 9 crates (some stacked) as occluders
- A watch platform (legs, deck with collision, railing, crate on top)
- 3 steam vents (GPU particles), 2 burning braziers with real point lights,
  2 glowing lava pools, scattered rocks
- Lighting: deep-blue ambient + dim blue "moon" directional with shadows,
  warm orange point lights, ACES tonemap, light distance fog

**Blaze, transformed** (`scripts/player.gd`, built from primitives in code):
sleek humanoid proportions; body is a **living-fire shader**
(`shaders/fire.gdshader`) — world-space vertical gradient (deep red → orange →
bright yellow) with time-based flicker and a fresnel rim, so he glows instead
of looking painted; five animated flame-hair cones; glowing eyes; **gold star
crown** (cylinder band + a star prism generated as an ArrayMesh); dark tactical
vest with pouches, belt, shoulder pads and gloves — the gear that triggered
the transformation. His own orange point light spills onto the ground.
Procedural walk/idle/crouch animation (limb swings, breathing, flame flicker).

**Bonehead patrol** (`scripts/guard.gd`): skull with dark sockets and glowing
coal eyes, jaw, spine, three torus ribs, stick limbs — all primitives. Walks a
4-waypoint courtyard loop with pauses. His **vision cone** is a generated
sector mesh (sloped sheet from eye height + ground fan): pale blue when calm,
warming through yellow as suspicion builds, **red in ALERT**. Perception is
real: range + field-of-view + a physics raycast for occlusion, suspicion rate
scales with distance and hero posture (crouch = harder to spot, moving =
easier). States: CALM → SUSPICIOUS ("?", stops and stares) → ALERT ("!",
synthesized two-blip sting, chase) → loses the trail, decays, resumes patrol.

**Camera & HUD**: smooth MGS-style follow camera behind/above the hero
(Q/E or captured mouse to orbit), WASD/arrows move camera-relative, Shift/C
crouch. HUD law, lightly: one slim top bar (objective + ALERT meter + state)
and a title card — "FIRE BABYS REBELLION — 3D PROOF" + controls line — that
fades on its own or when you move. Proof poses on keys **1/2/3** (hero beauty /
patrol wide / force alert) exist for screenshots and testing.

## Files

- Project: `godot/` — `project.godot`, `main.tscn`,
  `scripts/{main,player,guard,hud}.gd`, `shaders/{fire,lava_ground}.gdshader`,
  `capture.gd` (xvfb screenshot driver), `export_presets.cfg`, `icon.svg`
- Web export: `godot-web/` — **39 MB total; `index.wasm` alone is 39.5 MB**,
  which exceeds GitHub's 25 MB single-file limit. Not split (per instructions);
  a future deploy needs the wasm-split treatment the Oct 3 build used, or a
  different host.
- Screenshots: `proof-3d-{hero,patrol,alert}.png` (engine renders via xvfb) and
  `web-proof-{boot,hero,move,patrol,alert}.png` (the actual web export in
  Chromium).

## Verification (all real, nothing staged)

- Headless import + 300-frame run of the scene: **no script or shader errors**
  (two bugs were caught and fixed on the way: a `vec3`/`float` mix-up in the
  ground shader, and GDScript Variant-inference errors on `clamp()`/`get()`).
- xvfb capture run (llvmpipe GL): the three `proof-3d-*.png` shots — hero
  beauty, patrol wide with cone visible, and a genuine ALERT (red cone,
  "!! SPOTTED !!", guard mid-chase). One lighting polish pass was made after
  the first capture round (the scene read too dark and the cracks too coarse).
- **Web export booted in Playwright/Chromium** (SwiftShader WebGL 2.0): engine
  up in ~1 s after load, **zero console errors, zero page errors**. Keyboard
  input injected: pose keys worked, holding W visibly moved Blaze, and the
  alert pose tripped a real ALERT state in the exported build
  (`web-proof-alert.png` matches the engine capture).

## Honest limits

- Headless WebGL is software-rendered (SwiftShader/llvmpipe): frame rate in
  verification says nothing about real-device performance. The scene is light
  (~4 point lights, primitive meshes, one particle system ×3) and should run
  well on phones, but that is unproven until it runs on a phone.
- No bloom in the Compatibility renderer — the "glow" is emissive color +
  real lights, not post-process bloom. Forward+/WebGPU would add true bloom
  at higher device cost.
- Characters are primitive-built, not sculpted/animated models — this proves
  look, light, and stealth feel, not final art. Walk cycles are procedural.
- The "!" marker is anchored to the guard; from some camera angles its screen
  position can visually overlap the hero.
- The boot screenshot (`web-proof-boot.png`) was caught mid camera-settle;
  later frames render the full scene.
- Audio sting is synthesized in code and only audible after a user gesture in
  browsers (autoplay policy); untested for actual sound output in headless.
- Landscape 1280×720 proof; no portrait/phone layout pass yet.
