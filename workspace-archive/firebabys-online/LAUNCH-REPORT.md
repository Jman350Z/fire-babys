# Fire Babys Rebellion — Launch Report (2026-10-29)

**Bottom line:** the game is hardened, the website is finished and fully
verified locally — but **the site is NOT live yet**. Phase C hit hard tooling
walls (documented below): the GitHub repo could not be created from this
session, the finished tree cannot be pushed with the available connectors
(40 MB of binaries vs. text-only push tools), and Pages/DNS steps remain for
the parent. Nothing below claims a live URL, because none serves the game yet.

---

## Phase A — Export hardened ✅

**Test hook removed.** The `window.__FBR3D_*` web test hook lived entirely in
`godot/scripts/main.gd`. Removed, cleanly and completely:

- the whole "web test hook (JS)" section (was lines 1378–1509): `_setup_js_hook`,
  `_poll_js_cmd`, `_publish_js_state`, `debug_state()`, `debug_pick()`,
  `debug_teleport()`, and the `_js_pick/_js_tp/_js_codec/_js_act/_js_hold`
  callbacks — these exposed hero pick, **teleport**, and scripted inputs to any
  script running on the page;
- the hook's state: `_js_bridge`, `_js_window`, `_js_t`, `_cmd_t`, `_debug_hold`
  variables, the `_setup_js_hook()` call in `_ready()`, the poll/publish calls
  in `_process()`, the two `or _debug_hold` input fallbacks (real **E** key and
  touch ACT still work), and the header comment advertising the hook.
- Project-wide grep after the strip: **zero** `FBR3D` / `_js_` / `debug_*`
  references remain. The legitimate `JavaScriptBridge.eval("window.innerWidth")`
  window-sizing code (portrait/responsive support) is **kept** — it is game
  function, not a test hook. Pre-strip source backed up during the work;
  the proof snapshot in `godot-proof-snapshot/` is untouched. Blaze and the
  approved art were not modified.

**Re-export + split.** Web preset (no threads) re-exported to `godot-web/`:
`index.wasm` 39,514,754 bytes → `split_wasm.py` → `index.wasm.aa` +
`index.wasm.ab` of **19,757,377 bytes each** (under GitHub's 25 MB limit),
loader IIFE patched into `index.html`; `index.pck` 130,028 bytes. The compiled
`.pck` was byte-searched: **no `__FBR3D` or `debug_teleport` strings** — the
hook is gone from the shipped binary, not just the source.

**Re-verification on the fresh export (Playwright, real input only — no hook
exists to cheat with):** hook globals `__FBR3D_CMD/__FBR3D_STATE/__FBR3D_PICK/
__FBR3D_TP` all `undefined`; boot → hero select (12 cards) → mouse-click Blaze →
codec (Lord Inferno) → Esc skip → WASD walks → **Gear Up** (objective advanced
to "RESCUE THE WATER BABYS 0/3", formed Blaze on the pad) → walked into a
patrol lane → **ALERT** (HUD "ALERT!", red meter, red cone, "!" over the
Bonehead). **Console/page errors: 0.** Screenshots: `launch-verify.png`
(select), `launch-verify-codec.png` (codec/play), `launch-verify-alert.png`
(Gear Up + ALERT).

## Phase B — Website finished ✅

**3D integration.** The hardened export is copied to `site/game/`, and its
shell was externalized so the **whole tree stays zero-inline**: Godot's inline
`<style>` → `game/index.css`, the wasm-split loader → `game/wasm-loader.js`,
the `GODOT_CONFIG` bootstrap → `game/boot.js` (all verbatim, same load order).
`rebellion.html`'s `#game-root` (id unchanged) now holds a launch card —
"MISSION 1 — LIVE NOW", honest ~40 MB note, **Play Mission 1** button — and
the new external `assets/game-loader.js` mounts `game/index.html` in an
iframe on click, with a Fullscreen button. The 2D build is **archived, not
deleted**: `site/archive-2d/` holds `rebellion-game.js` (moved, unreferenced),
plus `rebellion-2d.html` and `rebellion-2d.css` snapshots; all `.fbr-*` rules
were removed from the live `assets/rebellion.css` and replaced with the mount
styles (16:9 frame; 3:4 under 560 px).

**Copy.** Removed "Mission 1 — Deploying Soon" (index hero chip) and
"Arrives with Mission 1" (index Single Player chip) → both now "Mission 1 —
Live Now" (new `.chip-live` style); index hero CTA now reads **Play Mission 1**
→ `rebellion.html#play`; rebellion.html's play zone, mode cards, and roadmap
already read "Live now" and were kept; Co-Op remains **"Phase 2 — On the
Roadmap"** everywhere, with the not-live-yet honesty notes intact. heroes.html
was audited and carried **no** stale chips/copy (roster page; nothing to
remove). Canon held: transformation law in words, Slimers smothered never
sprayed, "for everyone" (never "for kids"), no stats displayed, nothing for
sale. Sitemap lastmod bumped to 2026-10-29. A `CNAME` file was deliberately
**not** added to the tree (see Phase C) so it can't carry the wrong domain
into whichever route the parent completes first.

**A+ audit (whole finished tree):** 0 `<style>` blocks, 0 `style=` attributes,
0 inline event handlers, 0 `<script>` tags without `src=`, 0 external asset
references. 

**Local verification (Playwright, tree served locally):** all four pages
render; roster filter works ("Showing 6 of 12 heroes" on Water); Play button
mounts the game; the game boots inside rebellion.html and **reaches hero
select** (desktop and portrait); **console/page errors: 0; HTTP ≥400: 0.**
Screenshots: `site-home.png`, `site-heroes.png`, `site-rebellion.png`,
`site-404.png`, `site-game-select.png`, `site-portrait.png`,
`site-portrait-game.png`.
*Honest limit:* inside the iframe, headless Chromium + SwiftShader throttles
`requestAnimationFrame` to ~1 tick/2 s (measured; a bare minimal-parent
control page showed the identical stall, while top-level pages tick ~28 fps),
so in-frame *clicks* could not be exercised in this harness — the frame renders
and boots, but its loop is starved by the test environment. The identical game
binary is fully input-verified top-level in Phase A, and iframe embedding of
Godot exports is the standard distribution shape; expect normal play in a
real browser, but the first real-device open should confirm it.

## Phase C — Push + wire ⛔ BLOCKED (precisely)

- **Repo creation — attempted, did not land.** `create_repository`
  (`firebabys-online`, public, under Jman350Z — identity confirmed via
  `get_me`) was called twice via the GitHub MCP connector; both calls died
  mid-flight (session disappeared / service restart) and the repo was
  verified **absent (GitHub API 404)** after each attempt. No repo exists.
  This is the parent's step now (a retry from the parent session, where the
  write-approval flow can complete, or two clicks in the GitHub UI).
- **Push — not possible with the available tooling, independent of the repo.**
  The finished tree is 29 files / **40,187,595 bytes**, mostly binary.
  (a) The connector's `push_files` snapshot route is capped at **16 MiB of
  UTF-8 text, binaries rejected** (connector reference, verified against the
  live tool schema: file contents are plain strings). (b) `create_or_update_file`
  likewise takes text content only. (c) The `custom.github-gitdata` PAT is
  scoped to `Jman350Z/fire-babys` only and cannot touch a new repo.
  The 19.7 MB wasm halves, `.pck`, and PNGs have no push route from here.
  Viable routes for the parent: a local `git push` with Jeff's own git
  credentials, or widening/replacing a token for the gitdata connector to
  cover the new repo (its blob/tree/commit flow already handles binaries —
  it shipped the 90-file fire-babys push), then push the tree at
  `~/workspace/firebabys-online/site/` as-is.
- **GitHub Pages enablement — no tool.** The MCP catalog has no Pages
  operation. Parent browser step: repo → Settings → Pages → deploy from
  branch `main`, root — after the push lands.
- **Cloudflare DNS — connector cannot.** Connector verified healthy
  (account 200, token active), but `cf.py` exposes only verify / Worker
  script / KV commands — **no DNS operations**. The `rebellion` CNAME in
  the firebabys.io zone → `jman350z.github.io` is a parent browser step
  (Cloudflare dashboard). No DNS record was created or altered.
- **CNAME file:** add `rebellion.firebabys.io` as repo-root `CNAME` **with
  the push, once the parent confirms the DNS record exists** (per brief, it
  was not pre-added; Pages will sit pending until DNS resolves — expected).
  Note DEPLOY.md Step 1 specifies the *apex* CNAME (`firebabys.online`) for
  the Namecheap route — use exactly one, matching the route that goes live.
- **Namecheap (apex) — untouched**, per brief; still the parent's browser leg.

## ⚠️ Flag for the headers step (Step 4, when it happens)

DEPLOY.md's CSP is `script-src 'self'`. Godot Web exports compile WebAssembly
at runtime, and Chrome **blocks wasm compilation** under `script-src 'self'`
without `'wasm-unsafe-eval'`. GitHub Pages serves no custom headers, so the
fallback launch is unaffected — but when the A+ headers Worker fronts the
site, add `'wasm-unsafe-eval'` to `script-src` (it permits wasm compilation
only, not JS eval) or the game will fail to boot behind the enforcing CSP.
Worth a report-only pass over the play page specifically before enforcing.

## Remaining browser steps for the parent

1. **GitHub:** create repo `firebabys-online` (public) under Jman350Z — or
   retry the connector create from the parent session — then push
   `~/workspace/firebabys-online/site/` (needs a binary-capable route: local
   git or a gitdata token covering the new repo), including a root `CNAME`
   with `rebellion.firebabys.io` once step 2 exists.
2. **Cloudflare dashboard:** create CNAME `rebellion` in the firebabys.io
   zone → `jman350z.github.io` (proxied), no other records touched.
3. **GitHub Pages:** enable Pages on the repo (Settings → Pages → main /
   root), confirm the custom domain reads `rebellion.firebabys.io`, enable
   HTTPS once the certificate issues.
4. **Namecheap attempt** for the firebabys.online apex (Jeff's track, ticket
   NC-GBE-9090) — if it lands instead, swap the CNAME to `firebabys.online`
   and follow DEPLOY.md Steps 2–5 (zone, SSL Full strict, headers Worker
   with the `'wasm-unsafe-eval'` note above).
5. **First real-device check:** open the live play page on a phone, tap Play,
   pick a hero — confirms the in-frame input path outside the headless
   harness (see Phase B limit).

**Status: hardened + finished + locally verified; NOT live.** The moment
steps 1–3 land, `https://rebellion.firebabys.io/rebellion.html` serves the
finished site with Mission 1 playable.

---

## FIX RUN — 2026-10-30 (Jeff's first phone playtest bugs; STAGED, NOT DEPLOYED)

Jeff playtested on his Android phone (portrait, rebellion.firebabys.io) and
reported: (1) "The controller is to far down and don't work" — joystick half
off the bottom edge, ACT/BNK/CRCH clipped at the right, game view shifted
with a dark strip down the right side; (2) "there are no pictures" — plain
colored circles in the in-game hero select, letter circles on the website.

### Root cause — controller / portrait fit

`main.gd::_sync_window_to_browser()` sized the Godot window from
`window.innerWidth/innerHeight`. Those are **CSS pixels**; the Godot window
size on Web is in **device pixels**. On any DPR>1 phone (Jeff's is DPR 2)
the render surface ended up twice the size the game logic believed in:
rendering collapsed into one corner of the surface, right/bottom edges
clipped, and every touch control landed in the wrong place — the stick
half off-screen in the system gesture zone, buttons at/past the edge.
Reproduced exactly in Playwright (390×844, DPR 2, touch): select UI
squashed into the bottom-left quadrant of the 780×1688 surface.
Aggravating factors on the real phone: the layout used raw pixels, so at
a 1688px-tall viewport the joystick center sat ~16 CSS px from the bottom
edge (inside Android's gesture strip), and the codec card — bottom-anchored,
with a full-panel tap catcher — landed on top of the joystick, eating the
taps of anyone who tried the stick during the opening briefing.

### Fix 1 — what changed

- `godot/scripts/main.gd`: window sync now multiplies by
  `window.devicePixelRatio` (rounded). Same JS window-sizing code path,
  correct units. Verified: at 390×844/DPR 2 the canvas is 780×1688 and the
  game fills it exactly, edge to edge.
- `godot/scripts/hud.gd`: touch layout is now computed from the real
  viewport with a scale factor (`clampf(vp.y/844, 1.0, 2.0)`) so the stick
  and buttons keep the same physical thumb size at any resolution:
  joystick Ø150→300 device px (DPR 2), ACT Ø76→152, BNK/CRCH Ø62→124,
  all with real edge clearances (bottom clearance 24 CSS px — clear of
  the gesture strip). Activation radius and max deflection scale too.
  Layout re-runs on viewport resize.
- `godot/scripts/hud.gd`: when touch controls are on screen, the codec
  card docks ABOVE the control zone (`_layout_codec`) instead of on top
  of the joystick; desktop/no-touch keeps the classic bottom dock.
- HUD law untouched: one slim top tab bar, menu only inside pause.
  Keyboard/mouse paths untouched (desktop regression pass below).

### Fix 2 — real character pictures

Official cutouts existed for **all 12 heroes** — none missing, nothing
invented or generated. Resized copies (aspect kept, ≤420 px) now live at
`site/assets/heroes/*.png` and in the game at `godot/art/heroes/*.png`
(256 px, ids mapped: inferno←lord-inferno, tidal←lord-tidal).

- **In-game hero select** (`hud.gd::_build_cards`): each card shows the
  hero's real cutout (TextureRect, aspect-centered); colored orb remains
  only as a fallback if a texture were ever missing.
- **Website**: letter orbs replaced by `<img class="hero-pic">` (real
  files, alt text, width/height set) on heroes.html (12), rebellion.html
  (12 — same roster block under the Play button), and the home page's
  four lead cards (Blaze, Ruko, Aqua, Splash). Dead `.orb` CSS replaced
  by `.hero-pic` rules in `assets/site.css`. A+ audit of the full tree
  after changes: 0 `<style>` blocks, 0 `style=` attributes, 0 inline
  handlers, 0 `<script>` without `src`, 0 external asset references.

### Re-export + staging

Web preset re-exported (no threads), `split_wasm.py` treatment as before
(2 × 19,757,377 B halves), shell re-externalized into `site/game/`
(index.css / wasm-loader.js / boot.js; boot.js carries the new pck size
1,160,476 B — the growth is the hero art). **`__FBR3D` test hook confirmed
still gone**: 0 matches in source and byte-searched in the shipped .pck.
Deploy ZIP rebuilt at `firebabys-online-deploy.zip` (39 files, 14.6 MB;
archive-2d excluded, `_headers` included). **NOT uploaded or deployed** —
deployment is a separate coordinated step (Cloudflare DNS work in flight).

### Verification (Playwright, exported build served from site/)

Portrait 390×844, DPR 2, touch emulation, game top-level:
- Pre-fix repro: quadrant-squashed select (the bug). Post-fix: boot →
  hero select fills the screen, all 12 cards show real pictures
  (`fix-select.png`).
- Tap Blaze → codec (card docked clear of the controls, `fix-codec.png`)
  → tap through → play: stick and ACT/BNK/CRCH big, fully on-screen with
  margins (`fix-play.png`).
- Touch joystick **moves the hero** — verified across four sessions:
  spawn → across the courtyard → into a patrol's red cone (ALERT/SPOTTED
  states fired, `fix-joy-right.png`, `fix-joy-up.png`); knob displacement
  visible in-frame. Hero driven by touch to the Gear Up pad's rim
  (`fix-gearup-c.png`).
- **Console/page errors: 0 in every completed pass.**
- Desktop regression (1280×720, DPR 1): boot → click → Esc-skip codec →
  WASD/D movement works, zero errors (`fix-desktop-gearup.png`).
- Site pages at 390 wide: all 28 hero `<img>` slots load (naturalWidth
  check), zero errors (`fix-site-heroes.png`, `fix-site-home-heroes.png`,
  `fix-site-rebellion-heroes.png`).

**Honest limit:** the touch sessions ran under SwiftShader (game time
~4–5× slow, blind CDP drags, camera auto-follow curves long holds). The
joystick was driven onto the pad's rim, but the Gear Up objective flip
itself was not captured in this harness; the Gear Up trigger is unchanged
mission code verified end-to-end in Phase A, and today's desktop pass
re-confirms the same build's movement/objective path. First real-device
open after deploy should confirm the flip on hardware.

## FIX RUN 2 — Controls & Combat (Jeff's retest spec, Oct 30)

Jeff's retest on his phone after Fix Run 1: "The gaming controls don't
even work — there's no double jump. Before the game even starts you
should be prompted to equip some kind of armor and sword, and there
has to be attacking buttons and a weapons menu so you can have
different weapons just like Metal Gear Solid." Four work items; all
built, verified on the exported build, staged — NOT deployed.

### 1) Controls root cause(s)

a) Touch layer could stay hidden for the whole opening (found in code,
   confirmed by the flow): the layer only revealed itself from main's
   _unhandled_input — a tap on bare 3D. Every tap in the real flow
   (hero-select card, codec tap-catcher, buttons) is consumed by the
   control and never becomes "unhandled," so on a phone the controls
   might never appear at all. Fix: HUD._input (runs before any control)
   reveals the layer on the first touch anywhere; the joystick also
   tracks its touch index so a second finger on the buttons can't
   hijack or kill the stick mid-drag, and mouse can drive the stick
   when the layer is shown (handled, so it can't fight camera orbit).
b) The codec card covered the JUMP button: its fixed dock (-188 x
   scale) predated the taller 5-button combat cluster, so during the
   opening codec the card + its tap-catcher sat on JUMP (seen live in
   verification: "JUMP" taps advanced the dialogue instead). Fix: the
   dock is now computed from the cluster's real top edge + margin —
   the card always clears every button.
c) Overlay cards could clip their buttons off-screen on short
   landscape windows (equip card is ~500px tall; on a 470px window
   START MISSION sat below the fold). Fix: all overlay cards (equip,
   weapons, pause, complete, checkpoint) now sit in a scrollable wrap
   — verified START reachable by wheel on an 820x470 window.
d) Hardening: browsers can synthesize mouse events from touches; a
   synthesized drag could orbit the camera while steering. Disabled
   emulate_mouse_from_touch in project settings and made the camera
   orbit ignore emulated (device -2) mouse events outright. Touch
   buttons re-verified working with emulation off.
   (Verification-harness note: an early touch-drive failure — hero
   walking west on an "up" drag — was a harness bug, wrong joystick
   center; the real center is (101,743) CSS px at 390x844. With the
   correct center the hero tracks straight, confirmed on camera.)

Every on-screen control was fired by real touch input in the exported
build at 390x844 DPR 2: joystick (multi-leg drives), JUMP, ATK, ACT
(hold), CRCH (toggle + orange state), WPN (menu + swap), PAUSE —
plus mouse clicks for select/equip on desktop and the full keyboard
set (WASD, SPACE, F, R, E, C, Esc).

### 2) Jump + double jump

JUMP button added to the touch cluster (right column, top); SPACE on
keyboard. Player physics: jump velocity 8.6, two jumps per airborne
(touch + keyboard share one buffered jump queue, 0.15 s). Works in
ball and geared form; the double jump fires an ember-ring flair at
the take-off point. Verified airborne screenshots, touch + keyboard.

### 3) Pre-mission equip prompt

After hero select, before the mission: GEAR UP — CHOOSE YOUR KIT.
Hero picture + name/role, 3 armors (Homeland Cloth / Bronze Armor /
Crystal Armor) and 3 swords (Wooden Sword / Ember Blade / Tidebrand),
each visually distinct (armor re-skins vest + shoulder pads + chest
gem; swords are different models in the hero's hand). Defaults
preselected per the starter-kit law: Bronze Armor + Wooden Sword.
Option taps live-preview on the hero behind the card; START MISSION
begins play already geared in humanoid form (Transformation Law) —
the roll-to-the-Gear-Up-pad opening is gone: pad props removed, the
opening codec line and first objective rewritten ("RESCUE THE WATER
BABYS — 0/3"). Style only, per the no-power-stats law: the screen
says so ("Every kit is pure style — no kit is stronger. Skill
decides."); swords differ in look, swing speed and reach only.
Mission loop after equip unchanged: 3 rescues → pump sabotage →
20 s escape → extraction → Mission Complete with rank.

### 4) ATK button + weapons menu

ATK (touch) / F (keyboard) swings the equipped sword: the swing
bonks Boneheads to sleep (replaces the old BNK button) and smothers
Slimers per the smother rule; ranges scale with the blade's reach.
Archers still dart at range (swing included). WPN (touch) / R opens
the WEAPONS menu — action pauses — listing all three swords with the
current one marked EQUIPPED; picking one swaps instantly (status
flash "Equipped: <name>") and the new blade is in the hero's hand
with its own swing style. CRCH and ACT kept. Final cluster, all
fully on-screen at 390x844 with thumb margins: joystick left;
JUMP / ATK / ACT up the right edge, CRCH + WPN in the second column.

### Bonus fix found during verification

A rescued cage kept its captive's EYES floating inside the empty
cage: the eyes were children of the cage root while the rescue tween
moves/hides only the captive ball. (This briefly misled verification
— a freed cage still looked occupied.) Fix: eyes/pupils now parent
to the captive, so they leave and hide with it.

### Verification (exported build, served from site/game)

- Touch pass (390x844, DPR 2): boot → select (pictures) → equip
  screen → changed armor + sword (Crystal Armor + Ember Blade) →
  start geared → codec dismissed clear of the buttons → JUMP →
  double jump (two airborne screenshots) → CRCH toggle → WPN menu
  ("Ember Blade — EQUIPPED") → swap to Tidebrand ("Equipped:
  Tidebrand") → ATK taps fired. Zero console errors. fix2b-*.png.
- Touch drives: calibrated joystick drives from spawn reached
  Cage 1's tile neighborhood in three independent runs (cage framed
  on camera); ACT holds executed at 15+ positions around the cage.
- Desktop pass (820x470, keyboard/mouse): select + equip by mouse
  (Crystal Armor + Ember Blade, gold borders), R weapons menu +
  Tidebrand swap, then a full keyboard rescue of Cage 1 — target
  hint "Hold E / ACT — free the Water Baby!" in range, E hold →
  "RESCUED 1/3", freed Water Baby seen hopping away, cage door
  open. Zero page errors for the entire session (PAGEERRS []).
  fix2d3-*.png.
- Final staged build re-verified after the eyes fix (boot → select
  → equip → start → play, touch, zero errors). fix2-final-*.png.
- __FBR3D debug hook: absent from the shipped pck (0 matches).
- boot.js fileSizes updated: index.pck 1,167,548 bytes;
  index.wasm 39,514,754 (split .aa/.ab 19,757,377 each).

### Honest limits

- The full mission loop past Rescue 1 was NOT completed in the
  harness. Rescues 2/3, the pump plant, the escape and the
  extraction run through the identical code paths proven at Cage 1
  (same target/hold/complete functions; the pump is the same hold
  with a different target; extraction is a distance check in the
  same physics step), but blind navigation at ~0.11x real speed —
  1-FPS screenshots, a follow camera that curves every long leg —
  could not place the hero inside the 2.3 m interact radius at
  Cages 2/3 within the run's budget. The touch ACT rescue flip was
  likewise not captured: calibrated touch drives reached Cage 1's
  neighborhood repeatedly, but dead-reckoning lands ±1–2 tiles
  against that 2.3 m radius. This is a harness limit, not a game
  defect: every system responded correctly whenever the hero was
  verifiably in place (hint text appears exactly in range, holds
  complete, counters/objectives update).
- ATK with no target in range shows no visible swing result (by
  design — the swing connects only within reach of a guard/slimer);
  the bonk and smother outcomes were not captured on camera for the
  same navigation reason. The swing input itself was verified
  firing on touch (ATK) and keyboard (F).
- The SwiftShader harness runs the game at ~0.11x real speed
  (2-core VM); every timing above is harness-relative. On a real
  phone the game runs full speed — Jeff's phone retest remains the
  confirming check for feel (button size, stick throw, dock
  position) and for the in-range rescues.

## Fix Run 3 — touch controls (Jeff's third phone test: "the game controls still don't work") — 2026-10-30

### Root cause (deterministic, found by code audit — spec: `FIX3-SPEC.md`)
Fix Run 2's own hardening item (d) set `pointing/emulate_mouse_from_touch=false` in `project.godot`. On a real phone browser, every interactive control in the game is a Godot Button fed by touch→mouse emulation (the touch cluster, the codec tap-catcher, the select/equip cards, START) — with emulation off, no button press ever fires: the game loads and renders (why every screenshot looked right) but reads as frozen from the first screen. Desktop/CDP taps synthesize browser-level mouse events, which is why all prior harness passes "verified" buttons that real hardware could not fire. The camera-orbit reason for the change was already covered by main.gd's device −2 guards (main.gd lines 991/995), so the setting was pure harm. Secondary suspect killed in the same run: `site/_headers` had no Cache-Control and Godot's pck/wasm filenames never change across deploys — a stale-build risk on phones.

### Changes
1. `godot/project.godot` — `pointing/emulate_mouse_from_touch=true`.
2. `godot/scripts/hud.gd` `_input` — raw-touch backup wiring: `InputEventScreenTouch` presses hit-tested against the shown cluster buttons' global rects set `atk_queued` / `jump_queued` / `wpn_queued` / `act_held` (ACT release tracked by touch index). CRCH deliberately excluded (toggle would double-fire), codec catcher excluded (double advance).
3. `site/_headers` — `/game/*` + `Cache-Control: no-cache` block appended; the rest of the file is untouched.

### Export + treatment
- Headless Web export; wasm split (`.aa`/`.ab` 19,757,377 B each) + loader patch; externalized exactly as Fix Runs 1–2 — `index.html` / `index.css` / `wasm-loader.js` byte-identical to Fix Run 2; `boot.js` differs only in `fileSizes` (`index.pck` 1167548 → 1167964).
- New `index.pck` 1,167,964 B (was 1,167,548). `__FBR3D` in shipped `.pck`: **0 matches**.
- Emulation state proven baked correctly: the Fix 2 pck contains a stored `emulate_mouse_from_touch=false` override; the Fix 3 pck contains no stored override (Godot persists only non-default project settings; a probe project on this exact binary confirmed the engine default is `true`) → emulation is ON in the shipped build.

### Verification — Playwright 390×844, DPR 2, touch emulation (two passes; the one allowed retry was spent on the second, jump/ATK-focused pass)
- **Zero console/page errors across both passes.**
- Select: all 12 hero cards with real pictures ✓ (`fix3-select.png`).
- Gear Up opens for Blaze; armor changed to Crystal Armor and sword to Ember Blade — both selections registered (gold highlight) ✓ (`fix3-equip.png`).
- Mission starts geared; **codec advances by tap** — the typewriter line completed after one tap ✓ (`fix3-codec0.png` → `fix3-codec1.png`).
- **JUMP: hero caught airborne across consecutive frames** ✓ (`fix3r-jump0.png`, `fix3r-jump1.png`). **DOUBLE JUMP: second mid-air jump caught with its ember burst ring under the hero** ✓ (`fix3r-djump0.png`).
- WPN menu opens with the equipped blade marked; swap to Tidebrand confirmed by the "Equipped: Tidebrand" status line ✓ (`fix3-weapons.png`, `fix3-swapped.png`).
- Joystick drive: calibrated (EFF 0.241 m/real-s) and routed E1 N2 E1 N4 to Cage 1's neighborhood (`fix3-atcage.png`); CRCH toggle lit orange; ACT held 6.5 s beside the cage.
- **Touch ACT rescue flip NOT captured** — HUD stayed RESCUED 0/3; harness dead-reckoning lands ±1–2 tiles off the 2.3 m interact radius (same limit as Fix Runs 1–2; the interact hint never appeared, so the hold had no target).
- **ATK swing animation NOT visually captured** despite a post-tap shot plus an 8-frame burst in the retry — the ~0.4 game-second swing falls between the harness's ~11 s-apart captures at SwiftShader dilation. The ATK input uses the identical queue path proven live by JUMP/WPN in this build; the swing visual itself remains harness-unverified.
- **HARNESS LIMIT (restated):** Playwright/CDP taps synthesize mouse events — this pass proves the full input chain works with emulation restored, but it cannot reproduce the real-hardware touch path. **Jeff's phone retest remains the confirming check for this fix.**

### Package
- `firebabys-online-deploy.zip` rebuilt: **42 entries (39 files + 3 dirs), 14,521,810 bytes** — site tree only, `_headers` included (with the new `/game/*` no-cache block), `archive-2d` excluded. Backups: `/tmp/firebabys-deploy-fix2.zip`, `/tmp/fix3-backup/`.
- **NOT deployed.** Staging only, awaiting the coordinated production upload.
