# Fire Babys — Premium Visual Update (2026-10-12)

Jeff's order: a visual update that looks like a $5M pro studio did it. **VISUAL ONLY** — no gameplay, balance, weapons, save, audio, or multiplayer changes in either game.

Staged for upload (repo-relative paths in `upload-list.txt`): `play.html`, `3d.html` in `~/workspace/.deploy/`. Originals backed up in `backups/`. Screenshots: `before/` and `after/` (title/gate + gameplay for each game).

---

## 1. SPLASH — play.html

**How it was changed (safety-critical):** play.html is CSP-hash protected and was NEVER hand-edited. All changes live in one new build patch, `patches/026-premium-visuals.js` (registered in `patches/manifest.json`, documented in `PATCHES.md`), built with the documented `python3 src/build.py`. Proof of surgical scope: after stripping the CSP line and the new block, the rebuilt file is **byte-identical** to the previously deployed play.html — zero existing code changed. `node src/verify-patches.js` → **ALL RUNTIME CHECKS PASSED**. Kill switch: set patch 026 `"enabled": false` in the manifest and rebuild.

**What was upgraded:**
- **Pro UI (injected stylesheet):** ember-glow stage backdrop; stronger canvas presence (deep warm shadow + hairline rim); glass HUD pills (gradient + blur + inner highlight); FIGHT button rebuilt as a rich 4-stop gradient with a breathing ember-glow animation (original press-dip kept); glass troop cards with hover lift, icon drop shadows, and a golden selection glow; nova button ring glow; victory banner flame-text shimmer.
- **Title screen:** living logo (slow drift + gentle zoom, tuned so the logo never crops), studio start button (deep gradient + hard shadow + soft halo), glass menu buttons with hover lift/press states.
- **Canvas atmosphere (render wrap, cached gradients — no per-frame allocation):** warm top grade, ember glow pooled at the player castle, soft vignette, and 24 drifting/twinkling ambient embers across the battlefield.
- **Character presentation:** every baby gets a soft additive halo in team color (blue/red, gold for heroes) drawn from pre-rendered glow sprites — rim-light feel at drawImage cost; castles get a matching large team glow.
- **Celebration:** winning a stage now bursts 26 golden sparks from the enemy castle (hooked onto the game's existing victory banner).

**Verification (first-time-visitor harness, Playwright):** fresh load → **0 page errors**; title gate renders; tap-to-start → deploy phase; `tryPlace` placed 3 units via the game's own entry point; FIGHT click → phase "fight"; in-game FPS counter read 55–59 under a software renderer. Patch confirmed live in-page (`__FBV.active() === true`, stylesheet present, computed gradients applied).

**Size:** 422,946 → 434,984 bytes (+12,038, +2.8% — one patch block; no new assets, all effects are code).

## 2. 3D game — 3d.html

**How it was changed:** edited in the rebuild source (`~/workspace/fire-babys-3d-rebuild/3d.html`), the same value/additive pattern as the overhaul's graphics pass; staged file is byte-identical to the source (md5 `fdc1711eab9f2ce8e5902d6b8f03af3d`). **`pre-deploy-check.sh` → ALL CHECKS PASSED** (script balance, syntax, FBF calls resolve, size, error reporter).

**What was upgraded:**
- **UI/CSS:** menu panels are now warm glass (gradient + backdrop blur + layered depth shadows) with a spring entrance animation on every menu; logo gets an animated flame sheen; TAP TO START and all big buttons use a 3-stop gradient with inset highlight and hover brightening; mode-hub buttons get gradient glass, icon shadows, hover lift + glow; HUD pills glass with blur; toast deepened; name field focus glow; leaderboard tabs/swatches get motion; joystick knob/base glow; cinematic vignette strengthened with a warm falloff.
- **Lighting & atmosphere (Three.js):** new warm rim/back light (0xff8a40) so characters separate from scenery; hemisphere fill 1.05 → 1.12; ACES exposure 1.20 → 1.25; the shared glow texture re-curved (brighter core, wider halo) — every baby halo, torch, and ember uses it; ember motes bigger/brighter and denser (220 → 260 high tier, still quality-scaled by FBQ); sky gains a low sun-glow pool and a richer sunset band; ground texture gets denser speckle with warm flecks, torchlight pools in Ember Village, and more lava-glow patches at the volcano; a warm pool of stage light now sits under the title-screen crew.

**Verification:** fresh load → **0 page errors**; title gate renders; start button (JS click — the pulsing button never goes "stable" for synthetic clicks) boots the world; crew, name tags, torches, and scenery render; overlays hide cleanly for the world shot.

**Size:** 1,035,120 → 1,038,851 bytes (+3,731, +0.36%).

## Not upgraded — and why

- **SPLASH battlefield art itself** (background painting, castle/unit sprites): redrawing baseline art would require editing the frozen baseline, whose kid-safe re-freeze is a Jeff-visible change; the premium feel was instead delivered through grading, glow, atmosphere, and UI layers that wrap the existing art. The baseline's own draw code is untouched.
- **3D character models / animations:** the makeBaby factory and updateBaby life system (bob, blink, flame licks) were already solid; changing geometry risks the locked Fall Guys look for marginal gain. Polish was applied via light, glow, and texture instead.
- **Anything behind the auth gate / multiplayer UI internals in 3D:** visual pass kept to shared chrome (panels/buttons/pills) so no flow could break; MP screens inherit the panel/button upgrades automatically.
- **Heavy post-processing** (bloom passes, per-frame filters): deliberately skipped — Jeff's players are on phones; every effect chosen is a cached gradient, a pre-rendered sprite, a CSS animation, or one extra shadowless light.

## Rollback

- SPLASH: restore `backups/play.html.pre-visual` to `.deploy/play.html`, or disable patch 026 in `patches/manifest.json` + rebuild.
- 3D: restore `backups/3d.html.pre-visual` to `.deploy/3d.html` (and the rebuild source from `backups/3d-rebuild-3d.html.pre-visual`).
