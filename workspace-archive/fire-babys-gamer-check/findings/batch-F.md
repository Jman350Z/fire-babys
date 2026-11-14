# Batch F — FLAGSHIP gamer-check: SPLASH (play.html) + Fire Babys 3D (3d.html)

Date: 2026-10-12 · Worker batch F · Backups: `~/workspace/fire-babys-gamer-check/backups/batch-F/` (play.html.orig, 3d.html.orig, 3d-rebuild-3d.html.orig, manifest.json.orig, PATCHES.md.orig — all taken before any edit)
Scope guards honored: patches 003 / 015 / 021 and all profile/creator/auth code were **audit-only** (see "For the profile-system update" section). No edits were ever made to them, so nothing needed reverting. Nothing uploaded to GitHub. No other games or shared site files touched.

Testing method: Playwright/Chromium (SwiftShader software renderer — FPS figures are environment-bound and labelled as such), local mirror `python3 -m http.server 8921 --directory ~/workspace/.deploy`, desktop 1280×800 + phone 390×844.

---

## 1. SPLASH — play.html (lane-defense / lane-battler)

**Sizes/load:** 449,979 bytes staged (was 434,984; +14,995 = patch 027 block + rebuild). Gzip transfer ≈ 132,517 bytes — honest load verdict: fine on broadband, ~1–2 s on mid mobile data; the raw "435 KB" headline overstates wire cost. DOMContentLoaded in harness ≈ 4.5–4.8 s (software-rendered local env, includes auth-gate fetch failing locally — pre-existing, see flagged items).
**FPS (approx, software renderer):** game's own FPS counter read 29 FPS desktop / 15 FPS phone during fights in the pre-fix audit — treat as a floor, not a device figure; the premium-visuals pass measured 55–59 on the same kind of renderer. No per-frame allocations were added by patch 027 (DOM poll at 700 ms only).

### Cross-reference (genre benchmark)
- **Reference:** *Plants vs. Zombies* / *Kingdom Rush* — lane-defense / lane-battler genre.
- **Defining style mechanics:** (1) read-the-lane deploy phase → real-time battle loop with a visible objective (defend yours / capture theirs); (2) pause + restart always one tap away, keyboard/mouse parity with touch on desktop; (3) chunky impact feedback (hit flashes, bursts, procedural SFX) and a readable HUD (stage, currency, unit costs) at a glance.
- **Verdict:** core loop **matches** (free deploy on a 12-tile grid, merge tiers, hero + nova, castle-capture win/lose banner, stage/gold/FPS HUD, matchup bursts + Web Audio SFX with mute). Pause/keyboard parity **fell short of genre standard → upgraded to match** (patch 027, below). No reference assets, art, names, layouts, music or code copied — functional patterns only, all expression Fire Babys original.

### Complaints found → severity → outcome
1. **[HIGH] No pause at all.** No pause button, key, or auto-pause; hiding the tab mid-fight kept the sim running → unfair castle losses. Genre standard is one-tap pause. → **FIXED** (patch 027).
2. **[HIGH] No keyboard control — dead input class on desktop.** Hero movement existed only via the pointer joystick (canvas bottom-left zone). WASD/arrows/Space did nothing. → **FIXED** (patch 027: keys feed the same baseline `joy` object; Space = nova).
3. **[MEDIUM] Restart only reachable after game over.** Mid-fight there was no way to restart a botched stage. → **FIXED** (pause overlay → RESTART STAGE, calls the game's own `Game.retryStage()`).
4. **[MEDIUM] Tap targets below the 44 px platform minimum.** #muteBtn 38×38 (and flex-squished to 23 px wide in the crowded HUD row), HUD icon buttons 38 px tall, FIGHT button 38 px tall. → **FIXED**: muteBtn 44×44 with `flex:0 0 44px`; all non-guarded HUD buttons min-height 44 px (verified 44–48 px after); FIGHT keeps patch 006's small visuals but gains an invisible +5 px hit area. Widths of the shared HUD row: see COULD-NOT-FIX #1.
5. **[LOW] Desktop controls undiscoverable.** Nothing told a keyboard player the controls exist. → **FIXED**: one-line hint (“⌨️ WASD / ←↑↓→ move hero · SPACE nova · ESC pause”) shown during fights on ≥700 px-wide screens.
6. **[LOW] First-30-seconds clarity — actually good.** Title → PLAY → deploy hint (“Tap a troop, then tap a tile · Drag babys to move or MERGE!”) is clear within 10 s; win/lose banner + big-button NEXT/RETRY verified reachable. No change needed.
7. **Balance — no complaint sustained.** Deploy is free (patch 005) so there is no grind gate; enemy HP scales +6 %/stage; the 4 troops have distinct roles/costs (Brawler 64 hp/9 dmg, Guardian 150 hp tank, Archer 200-range, Pyro splash) and the matchup matrix (patch 007) rewards counters 2–2.5×. No safe, evidence-based balance change existed — none made.
8. **Feel/SFX — present and genre-adequate.** Procedural Web Audio (deploy pop, clash, sizzle, alarm — patch 018), hit bursts, victory spark burst (patch 026), mute toggle exists (baseline, now 44×44). No change.

### Fix applied — patch 027 `027-gamer-controls.js` (via the build only)
New patch file + manifest registration → `python3 src/build.py` (baseline untouched, CSP re-whitelisted 28 blocks) → staged build output to `.deploy/play.html` (sha256 `3343f32c…` at first staging; final staged file 449,979 bytes after the muteBtn flex fix rebuild). Contents: pause core (wraps `simTick` + `Game.update`, originals called unchanged when unpaused, fails open; `Game.toDeploy` wrap clears pause), ⏸ button + PAUSED overlay (Resume / Restart Stage), Esc/P toggle, auto-pause on `visibilitychange`, keyboard hero (WASD/arrows → baseline `joy`; capture-phase pointerdown always wins the stick back; typing-target guard for armory/profile/creator inputs; blur release), Space = nova, tap-target CSS (style appended to `#stage`, not `<head>` — patch 006's verify assertion requires its style to be head's last; same pattern as patch 026), keyboard hint line. Documented in PATCHES.md. Kill switch: manifest `enabled:false` + rebuild.

### Re-verification (after fix, both viewports)
- `node src/verify-patches.js` → **ALL RUNTIME CHECKS PASSED** (an intermediate run failed patch 006's last-style check because 027 first appended its style to `<head>`; fixed by moving it to `#stage` and re-verified).
- Playwright desktop + phone: **0 page errors**; patch live (`__FBGC` present); real player flow — title PLAY → hatch skip → troop select → **4 units placed** → **real FIGHT click → phase "fight"**; hero at (219,528) moved to (271,511) holding D (desktop), (221,523)→(294,503) (phone), keyboard drive released cleanly on key-up; **Esc pause → overlay flex, all unit positions frozen for 1.2 s**; Resume unpauses; ⏸ button pauses; Restart → phase "deploy", unpaused; muteBtn measured **44×44** both viewports; HUD button heights 44–48 px (guarded exceptions below).

### For the profile-system update (GUARDED — audit only, not fixed here)
- **#creatorBtn (patch 003) measures 21×19 px** — far below any tap-target minimum; very hard to tap on a phone. Hand to the profile update (creator code).
- **#profileBtn (patch 015) measures 45×38 px** (38 px tall — below the 44 px minimum). Patch 027's HUD min-height rule deliberately excludes it per the scope guard.
- **Patch 021 (auth gate):** locally the game logs a failed `auth-gate.js` load (ERR_TUNNEL/SSL artifact of localhost, also noted in the overhaul's splash-report); only a live https://firebabys.io check can prove the gate's real behaviour — coordinator/profile update should verify there. No local code change made or attempted.

---

## 2. Fire Babys 3D — 3d.html (bouncy 3D party platformer / open world)

**Sizes/load:** 1,040,695 bytes staged (was 1,038,851; +1,844 net — sound/pause code added, dead beacon script removed). Gzip transfer ≈ 267,416 bytes — heavy for slow mobile data but normal for a single-file Three.js world; FBQ quality scaling (persisted, mobile defaults medium) plus an existing low-FPS auto-degrade (drops to low tier: pixelRatio 1, shadows off) already protect phone frame rates. Title gate renders with **0 page errors** on desktop + phone in every run.
**FPS:** not honestly measurable in this harness — SwiftShader software rendering + intermittent driver instability (tab connection died twice mid-boot; the **untouched original shows identical boot behaviour** in A/B runs: state stays TITLE, no errors). The prior visual pass booted the world successfully in the same harness family. In-game FPS figure therefore reported as *not re-measured*, with A/B parity as the regression evidence.

### Cross-reference (genre benchmark)
- **Reference:** *Fall Guys* — bouncy 3D party platformer / open-world party game (Jeff's locked art direction for this game).
- **Defining style mechanics:** (1) instantly readable third-person movement — responsive stick/WASD run with a springy, toy-like character; (2) bright objective banner + always-visible session HUD (place/foes/FPS) so a player always knows the goal; (3) short feedback loops — squash/bounce motion, beep/blip SFX, celebration on wins, and a real pause that freezes the action.
- **Verdict:** movement/HUD/objective **match** (124 px touch joystick + WASD/arrows + wheel zoom, objective banner “➤ HEAD TO …”, top-bar pills for town/FPS/foes/wind, victory/defeat overlays with retry + hub). Pause **fell short — it was fake (below) → upgraded to match**. Sound control **missing → added**. No reference assets, art, characters, names, layouts, music or code copied.

### Complaints found → severity → outcome
1. **[CRITICAL] Pause didn't pause in single player.** `fbPaused` only opened the menu (and nudged the MP clock); the SP main loop never checked it — the world, enemies and encounter timers kept running behind the “⏸️ PAUSED” menu. → **FIXED**: `animate()` now preempts every gameplay state while paused. Implementation detail that mattered: `fbPaused`/`fbTogglePause` are closure-scoped (not globals), so `fbTogglePause` now also publishes `window.__fbPausedShared`, and the freeze requires the pause menu to actually be visible (`display:flex`) — the menu is ground truth on every resume/quit path, so a stale flag can never soft-lock a new game.
2. **[HIGH] No sound mute anywhere.** All SFX are synthesized through `beep()` plus `fbSizzleSound()`/`fbReigniteSound()`; there was no 🔊 control and no persisted preference — a player in a quiet room had to mute the whole device. → **FIXED**: new 🔊/🔇 pill in the top bar (next to the pause pill), persisted in `localStorage fb_muted`, gating all three sound functions at their choke points; unmuting plays a confirmation beep.
3. **[MEDIUM] Esc/P pause was multiplayer-only.** The keyboard pause handler was gated on `mpInGame`; in SP the keys were dead even though the pause pill worked. → **FIXED**: handler now also fires in SP `EXPLORE`/`BATTLE` states (verified: Esc at TITLE correctly does nothing).
4. **[MEDIUM] No auto-pause on tab/app switch (SP).** → **FIXED**: `visibilitychange` auto-pauses when hidden during SP explore/battle or MP.
5. **[MEDIUM] “🚪 QUIT TO LOBBY” was effectively dead in single player.** Its handler only called the MP leave-lobby path. → **FIXED**: SP fallback — when not in MP and in EXPLORE/BATTLE, quit now routes to `showHub()` (which, per Jeff's SPLASH-only order, drops the player into the mode flow).
6. **[LOW] Console error on every load:** the Cloudflare Web Analytics beacon script is blocked by the page's own CSP (`script-src` doesn't allow its domain) — it never runs and only spams the console. → **FIXED**: script tag removed from 3d.html (left an explanatory HTML comment). It cannot have been collecting anything under this CSP.
7. **Controls/clarity — good elsewhere.** Start button 306×79 px on phone; joystick 124 px; jump/attack/block exist as MP combat buttons (SP encounters are the game's auto-battler design, not a dead input); win/lose overlays offer PLAY AGAIN / retry / hub. No change.
8. **Balance/feel — no complaint sustained.** Encounter pacing is timer-based with formation followers; tool-counter system (right tool extinguishes, wrong tool flares) gives readable cause/effect with SFX + toast feedback. No safe evidence-based change — none made.

### Fixes applied (source `~/workspace/fire-babys-3d-rebuild/3d.html`, staged byte-identical)
All 9 edits listed in the working notes: animate() pause branch + `__fbPausedShared` bridge in `fbTogglePause`; sound pill HTML; `fbMuted` flag + gate in `beep()`; gates in `fbSizzleSound()`/`fbReigniteSound()`; SP Esc/P; sound-pill wiring + visibility auto-pause in `fbPauseInit`; SP quit fallback; beacon removal.

### Re-verification
- `pre-deploy-check.sh` on the edited source → **ALL CHECKS PASSED** (script balance, 5 blocks syntax, FBF calls resolve, size 1,040,695, error reporter). Staged file `cmp`-verified **byte-identical** to source.
- Playwright (desktop 800×450 + phone 390×844): title renders, **0 page errors**; sound pill toggles `fbMuted` true→false with `localStorage fb_muted` 1→0 and 🔊/🔇 label swap (verified end-to-end); pause pill → menu `flex` + `__fbPausedShared === true`; Resume → flag false, menu hidden; Esc at TITLE → menu stays hidden (state guard works).
- Freeze-in-world: verified by construction + the flag/menu ground-truth checks above; a live in-world freeze measurement was **not** obtainable in this harness because the 3D world does not finish booting under SwiftShader here — proven environmental by A/B: the **untouched backup behaves identically** (same TITLE stall, 0 errors). Recommend the coordinator's real-device/live check confirm the SP freeze on hardware (one tap: start a battle, tap ⏸, watch enemies stop).

---

## FIXED vs COULD-NOT-FIX (escalation list)

### FIXED
**SPLASH (patch 027, build path, verify-patches PASSED, Playwright-verified ×2 viewports)**
- F1. No pause → pause button + overlay + Esc/P + auto-pause on tab-hide.
- F2. No keyboard hero control → WASD/arrows feed the baseline joystick; Space = nova; pointer always wins the stick back.
- F3. No mid-fight restart → RESTART STAGE in the pause overlay.
- F4. Sub-44 px tap targets → muteBtn 44×44 (flex-proofed), non-guarded HUD buttons ≥44 px tall, FIGHT invisible hit-area +5 px (visuals unchanged).
- F5. Desktop controls undiscoverable → fight-phase keyboard hint line on wide screens.

**3D (source edits, pre-deploy PASSED, staged byte-identical)**
- F6. Pause menu didn't freeze single-player → animate() preempts gameplay states while paused (closure bridge + menu-visible ground truth).
- F7. No sound mute → top-bar sound pill, persisted, gating `beep()` + both direct sound effects.
- F8. Esc/P dead in single player → works in EXPLORE/BATTLE.
- F9. No auto-pause on tab-hide → added for SP + MP.
- F10. QUIT TO LOBBY dead in single player → falls back to `showHub()` mode flow.
- F11. CSP-blocked analytics beacon erroring on every load → removed (it never executed under the page CSP).

### COULD-NOT-FIX (hard reasons only)
1. **HUD button widths in SPLASH (27 px codex etc.)** — the HUD is a single flex row inside a fixed 480 px-wide stage holding 13+ buttons; 13 × 44 px = 572 px > 480 px, so full 44 px widths are geometrically impossible without a HUD redesign (wrapping rows would cover the enemy-castle play area). Heights were fixed to 44 px; widths left as-is. (Hard reason: fixed-stage geometry / would require baseline HUD redesign — a frozen-baseline change outside patch scope.)
2. **#creatorBtn 21×19 px and #profileBtn 38 px tall** — guarded scope (patches 003/015, scope guard 2026-10-12 17:15 PDT). Audit-only; listed above for the profile-system update.
3. **Auth-gate behaviour (patch 021)** — guarded scope, and its local load failure is a localhost artifact; needs a live https check by the coordinator/profile update.
4. **SPLASH file size / single-file architecture (450 KB)** — the CSP-sha256 single-file build is the mandated architecture; splitting or hand-editing the built file is exactly the failure mode that killed SPLASH on 2026-10-12. Gzip wire size is ~133 KB, which is acceptable; no safe in-scope reduction exists (the +15 KB delta is essentially patch 027's own source — the build ships patches near-verbatim — plus the extended CSP hash line).
5. **3D in-world FPS + live freeze measurement** — harness limitation, not a code blocker: SwiftShader Chromium here cannot finish booting the world (A/B-proven identical on the untouched original). Freeze logic verified by construction, flag/menu checks, and pre-deploy; FPS protected by the existing FBQ scaling + low-FPS auto-degrade. Needs one real-device confirmation pass.
6. **3D single-player jump** — jump exists only on MP combat buttons; SP is Jeff's encounter/auto-battle design with no platforming geometry to jump on. Adding SP jump would be inventing a mechanic, not fixing a defect — out of audit scope (genre benchmark noted: movement/objective/feedback match without it).

### Files changed
- `~/workspace/goals/realm-clash-battle-game/files/fire-babys/patches/027-gamer-controls.js` (new)
- `~/workspace/goals/realm-clash-battle-game/files/fire-babys/patches/manifest.json` (027 registered)
- `~/workspace/goals/realm-clash-battle-game/files/fire-babys/PATCHES.md` (027 entry)
- `~/workspace/goals/realm-clash-battle-game/files/fire-babys/Fire Babys.html` + `Fire Babys BASELINE.html` (build outputs)
- `~/workspace/.deploy/play.html` (staged build output, 449,979 bytes)
- `~/workspace/fire-babys-3d-rebuild/3d.html` (source, 9 edits)
- `~/workspace/.deploy/3d.html` (staged, byte-identical, 1,040,695 bytes)
- Backups: `~/workspace/fire-babys-gamer-check/backups/batch-F/`
