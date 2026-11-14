# Game 11 — Magma Trench Dodge: Rebuild Notes

## 1. What was wrong with the old game (audit)

- **Wrong game for the title.** "Magma Trench Dodge" was actually a side-view one-tap jump runner (variable jump + double jump over rock spikes and geyser columns). Nothing about it was a trench or a dodge — it played like every other tap-jumper.
- **One-hit death with no recovery.** Any single mistake = instant run over. No hearts, no shield, no second chances — brutally punishing for the kid audience, and the main reason runs felt cheap instead of fun.
- **Unfair geyser columns.** Erupting geysers were 190px-tall kill columns; clearing one demanded a near-perfect double jump, so the "dodge" obstacle was really a precision-jump gate.
- **No structure or progression.** Endless score chase only — no levels, no goals, no clear screens, nothing to beat. Speed ramped 380→750 and spawn gaps shrank to ~0.7s, turning late-game into noise.
- **Thin reward loop.** Crystals (+50) required precise jump arcs to collect; the near-miss bonus logic was tangled into the obstacle pass check and fired inconsistently (geysers counted in 'warn' state, spikes needed an arbitrary low-clearance test).
- Verdict: shell (gate, HUD, controls, theme, audio helpers) was solid; the gameplay core was the wrong genre and too harsh. Full replacement per Jeff's order.

## 2. The new game

**Magma Trench Dodge v3 — 3-lane trench dodge-survival.** Ruko runs forward through a perspective magma trench (lanes converge to a horizon; volcano backdrop, glowing floor cracks, rocky walls).

- **Core loop:** Magma geysers approach down a lane. Each one **telegraphs first** — bubbling glow + "!" mark + low rumble noise — for a constant ~1.1s of warning, then **erupts**. Be in a different lane when it blows.
- **Controls:** Arrow keys / A,D, swipe left-right, or tap the left/right half of the screen. Lane switching is smooth (exponential lerp) and tilts Ruko into the move.
- **Fairness rule (hard-coded):** at most 2 lanes can be threatened near the hero at once — there is always a safe lane.
- **Water drops:** spawn in lanes; run through one for **+25 pts**. Every 2 drops charge a **shield** (max 1, shown as 🛡 READY + a bubble around Ruko).
- **Hits:** an eruption in Ruko's lane with a charged shield = **soaked** (steam burst, playful, shield consumed, brief invulnerability). Unshielded = **−1 heart** (3 hearts), red flash + shake + invulnerability window. 0 hearts = game over → RUN AGAIN.
- **Near-miss bonus:** dodge out of a lane within 0.45s before its geyser erupts → **CLOSE! +20**.
- **Levels (12):** each is a distance goal; speed and geyser frequency ramp per level; hearts refill on level clear; score carries across levels; clear bonus = 100 × level.
  - Goals (m): L1 150, L2 200, L3 250, L4 300, L5 360, L6 420, L7 480, L8 550, L9 620, L10 700, L11 780, L12 900.
  - Speed: 0.55 z/s on L1, +0.045/level → 1.045 z/s on L12. Geyser spawn interval: 2.3s → 0.85s floor. Telegraph time stays ~1.1s at every level (warning distance scales with speed).
  - Clearing L12 shows the **TRENCH MASTER** completion screen.
- **Screens/contracts kept:** title + parental math gate → play; pause (⏸/P/Esc), mute (🔊/M, persisted `fb_muted`), restart (↻ works mid-game and from end screens, resets to Level 1); level-clear screens (NEXT ▶); game-over screen with score/level/distance/best; best score persisted in `trench_best`.
- **Brand:** Ruko drawn as the approved Fire Babys look — round flame-teardrop body, bold outline, angry-V brows, glaring red-pupil eyes; never harmed (worst case: soaked and steamy). No beaks/wings/feathers. All art is original canvas code. SFX only (no music system), built on the shell's existing `tone()`/`noise()` helpers and respecting mute.
- **HUD:** original ⭐ score / 🏃 meters / 🏆 best pills kept; added a second pill row: LV n/12, hearts (❤️/🖤), shield status (💧 n/2 or 🛡 READY). HUD updates only on change (dist updates on whole-meter change) — no per-frame DOM thrash.

## 3. Checks + results

- **JS syntax:** inline script extracted and run through `node --check` → **SYNTAX OK**.
- **Call/definition audit (Patch-016 rule):** all 41 named functions defined exactly once each (`grep -c "function NAME("` loop — zero problems). The 10 `sfx.*` methods called (lane, drop, near, warn, erupt, soak, hurt, clear, over, click) all defined; the generic scan's "undefined" hits were audited by hand and were all false positives (CSS `rgba()` inside strings, comment words, the `cb` callback parameter, and `HEROY`, which is defined in the multi-name const declaration).
- **DOM contract:** every `getElementById` target (score, dist, best, lvl, hp, sh, mq, ma, mathgate, overlay, otitle, obody, obtn, olesson, pauseBtn, muteBtn, restartBtn, c) exists in the markup; math gate `checkMath()` wired from markup + defined once.
- **Stale-code grep:** no references to removed old-game functions (doJump/tryJump/spawnObstacle/groundY/G.py/GRAV/JUMP_V) → **CLEAN**.
- **Shell preservation:** same `<title>`, same auth-gate.js + rating.js includes, same math-gate markup/logic, same pause/mute/restart handler contracts, same premium dark theme + fbvis-cycle1 chrome block, same `tone()`/`noise()` signatures and `fb_muted` persistence.

## 4. Final file size

**30,775 bytes (~30.1 KB)** — well under the 80 KB cap.
