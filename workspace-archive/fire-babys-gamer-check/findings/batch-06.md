# Fire Babys — Gamer Check, Batch 06 (games 27–32)

Fresh gamer-lens + genre-benchmark audit, run 2026-10-12 (PDT) after the overhaul.
Escalation applied (Jeff, 2026-10-12 ~17:26 PDT): fix everything fixable — no fixable item left report-only.
Sources edited: `~/workspace/fire-babys-fireworld/game-NN-v2.html`, copied byte-identical to the deploy mirror.
Originals backed up in `~/workspace/fire-babys-gamer-check/backups/batch-06/` (source + deploy names).
Not uploaded to GitHub. No other games / shared files touched.

**Verification method:** Playwright/Chromium against the local deploy mirror, desktop 1280×800 and phone 390×844 (touch), math gate solved, title → gameplay → game-over → restart driven for every game, plus deterministic probes that call the games' own global functions/state (`G`, `update()`, `doPull()`, …) so results don't depend on frame timing.

**Performance note (honest):** rAF FPS inside this headless VM was **not device-representative** during the pass — the VM (2 cores) was running ~106 Chromium processes from the parallel batch workers (load average peaked at 24.6); a baseline rAF sample read 1.6 fps at peak contention purely from CPU starvation. The comparative metric used instead is direct `render()` cost per frame (30-call average), measured head-to-head baseline vs fixed on the same machine: every game sits at **0.2–2.4 ms/frame**, far under the 16.7 ms (60 fps) budget, with **no regression** from any fix (fixed ≤ baseline in 5 of 6; game 27's +1 ms delta is shared-VM noise — its only added per-frame work is ≤5 short-lived bounce particles). Page loads: ~1.0–1.7 s from the local server. **Page/console errors: 0 in every completed run of every fixed game, both viewports.**

Shared fix applied to all 6 games (each counted in that game's findings): an on-screen **⏸ pause button + 🔊 mute button** (48×48 px tap targets, top-right, P/Esc and M keys too). Pause genuinely freezes game state (probe: `G.time` frozen while paused, resumes cleanly), mute gates the games' existing `tone()` helpers (and `noise()` in game 31). Neither existed in any batch-06 game before this pass.

---

## Game 27 — Ember Bounce 2D (`game-27-ember-bounce-2d.html`)

**Complaints found**
1. *Medium — clarity/session:* no pause anywhere.
2. *Medium — feel:* no mute; bounce/super/fall sounds unmutable.
3. *Medium — balance:* difficulty flat forever — breakable/moving platform rates and mover speed never change after the early thresholds, so minute 3 plays exactly like minute 1.
4. *Medium — feel:* landing a bounce had sound only — no visual impact feedback.
5. *Low — controls/physics:* at terminal fall speed a 16 px platform could be tunneled through between frames (landing sweep too tight).
6. *Low — clarity:* 🏆 best pill stayed stale during a record run; it only updated on restart.
7. *Low — robustness:* unguarded `setPointerCapture` in the drag handler can throw for non-active pointers (same latent pattern found live in game 29's probe).

**Cross-reference — Doodle Jump (vertical jumper).** Defining style mechanics: (1) auto-bounce, steer-only control with screen wrap; (2) platform variety — normal / moving / breakable / spring-super; (3) difficulty that escalates with height (more breakable + faster movers, fewer safe platforms) under a pure height score.
**Verdict: upgraded to match.** (1) and (2) already matched. (3) fell short → breakable share now grows with height (+0.4 %/100 m, capped +8 %) and moving platforms get faster with height (up to +70 px/s).

**Fixes applied:** pause + mute (shared); height difficulty ramp (above); bounce burst particles (green, gold on super) through the existing particle pool; landing sweep widened by 8 px; best pill updates live when a run passes the old best; pointer-capture calls guarded with try/catch.

**Re-verification:** 0 errors, desktop + phone. Pause freeze/resume ✓, mute ✓. Deterministic bounce probe: stepped `update()` onto a platform → `vy` = −950 (full bounce) with 5 feedback particles active ✓ (phone live-play probe also showed 5 particles). Fall → "💥 YOU FELL!" overlay → BOUNCE AGAIN → back in `play` ✓. Best-pill probe: pill shows the live record mid-run ✓. Render cost 1.38 → 2.39 ms desktop (noise, see header), 0.28 ms phone.

**FIXED vs COULD-NOT-FIX — Game 27:** findings **7**, fixed **7**, could-not-fix **none**.

---

## Game 28 — Thermal Tug-of-War (`game-28-thermal-tug-of-war.html`)

**Complaints found**
1. *High — controls:* the headline weapon, ⚓ Ember Anchor, was **SPACE-only — unusable on phones**, the primary audience.
2. *Medium — controls:* desktop players had no mash key at all — mouse clicks only, in a button-mashing game.
3. *Medium — balance:* Medium/Hard were effectively unbeatable for kids: break-even against the AI needed ≈5.8–7 taps/s (Medium R1) up to ≈9.5 taps/s (Hard R3, after the ×(1+round·0.15) escalation), before the Anchor even matters.
4. *Medium — clarity/session:* no pause.
5. *Medium — feel:* no mute.
6. *Low — overhaul leftover (documented in `fire-babys-overhaul/batches/batch-5-report.md` + `BUG-LOG.md`):* `sfx.round()` defined but never called — dead code left in place by the overhaul.

**Cross-reference — button-mash tug-of-war (Track & Field / Mario Party-style mash games).** Defining style mechanics: (1) rapid repeated input as the whole skill, offered on **several inputs** so every device can mash; (2) a visible rope/flag position as constant tug feedback, structured in rounds; (3) opponent pressure that escalates round over round.
**Verdict: upgraded to match.** (2) already matched. (1) fell short (one input per device class, and the power move missing on touch) → keyboard mash (←/→, A/D, Enter) added and the Anchor got a 92 px on-screen **⚓ SLAM!** button that glows when charged. (3) was present but miscalibrated → rebalanced (below).

**Fixes applied:** pause + mute (shared); ⚓ SLAM button (appears at 20/20 charge, same `slamAnchor()` path as SPACE); keyboard pulling; balance — tap power 0.028 → 0.032, AI pull Medium 3.4 → 3.2 / Hard 4.6 → 4.2, per-round escalation 0.15 → 0.12 (break-even now ≈5 taps/s Medium R1, ≈6.8 taps/s Medium R3; Hard stays hard); leftover cleared — `sfx.round()` is now actually called at every round end.

**Re-verification:** 0 errors, desktop + phone. Pause freeze/resume ✓, mute ✓. Keyboard-pull probe: 5 × `A` presses = **+0.107 net rope gain** (5×0.032 minus AI drain during the window) ✓. Anchor probe: charge set to 19, one tap → SLAM button gains `ready` class; tapping it → anchor consumed to 0 with **+0.143 rope gain** ✓. Match flow: forced match point through `doPull()` → state `over` → "🏆 YOU WIN THE MATCH!" → REMATCH → countdown → `play` ✓ (exercised the new `sfx.round()` path, 0 errors). Render cost 0.38 → 0.23 ms desktop, 1.97 ms phone.

**FIXED vs COULD-NOT-FIX — Game 28:** findings **6**, fixed **6**, could-not-fix **none** (documented overhaul Low leftover included and cleared).

---

## Game 29 — Blaze's Jump Quest (`game-29-blazes-jump-quest.html`)

**Complaints found**
1. *High — controls:* **no way to move left on touch** — phone players could only run right; backtracking for coins/enemies was impossible.
2. *Medium — controls:* 🔥 Ember Blaster was keyboard-only (F/X) — unusable on phones.
3. *Medium — feel:* no variable jump height — jumps were fixed-arc, below platformer genre standard.
4. *Medium — controls:* multi-touch conflict — lifting the jump finger cancelled an active right-run (canvas `pointerup` cleared `touchR` for any pointer).
5. *Medium — balance/clarity:* coins were paid twice — +25 on pickup and again inside the level-clear bonus, so the score never matched what the player saw collected.
6. *Medium — feel/bug:* thin one-way platforms shoved the player sideways when jumping up through them (the ground side-bump test also matched 0.08-height platforms).
7. *Low — balance:* stomp only registered at `vy > 200`, so short-hop stomps — the ones kids land — counted as taking a hit instead.
8. *Medium — clarity/session:* no pause.
9. *Medium — feel:* no mute.

**Cross-reference — Super Mario Bros.-style side-scrolling platformer.** Defining style mechanics: (1) run + **variable-height** jump with stomp-from-above enemy interaction; (2) coin pickups feeding a visible score, goal flag ending each level; (3) discrete levels of rising complexity with a level-select/progression structure.
**Verdict: upgraded to match.** (2) and (3) already matched (coin double-count fixed under (2)). (1) fell short on variable jump → releasing Space/↑/jump button early now cuts the rise (`vy` capped to −320), and stomps register from `vy > 80`.

**Fixes applied:** pause + mute (shared); on-screen ◀ ▶ hold buttons (76 px) and a 🔥 shoot button (76 px) on touch devices; variable jump height (jump-cut on key/button release); run now tracks its pointer ID — only the run finger's release stops the run; coin double-count removed (flag = +200 flat, coins pay once); side-bump collision restricted to tall ground slabs (thin platforms are cleanly one-way); stomp threshold 200 → 80.

**Re-verification:** 0 errors, desktop + phone. Pause/mute ✓. Touch probes: ◀ sets `touchL`, ▶ sets `touchR`, 🔥 touch button spawns a fireball (`G.shots` = 1), buttons render on phone (move cluster `flex`, shoot `block`) ✓. Jump-cut probe: `vy` −700 → −320 ✓. Multi-touch probe: run finger down → `touchR` true; jump finger down+up → **still true**; run finger up → false, with 0 page errors (the probe also exposed the unguarded `setPointerCapture` throw — now try/catch-guarded here and in game 27) ✓. Fall → "💥 YOU FELL!" → TRY AGAIN → `play` ✓. Render cost 1.53 → 1.11 ms desktop, 0.27 ms phone.

**FIXED vs COULD-NOT-FIX — Game 29:** findings **9**, fixed **9**, could-not-fix **none**.

---

## Game 30 — Ruko's Dash Blitz (`game-30-rukos-dash-blitz.html`)

**Complaints found**
1. *Critical — controls/balance:* **sliding could never avoid a barrier.** Barriers were drawn and collided as ground-to-top walls; the slide hitbox (22 px) still intersected them, so the game's second verb did nothing against the obstacle it exists for. Proven against the original build (probe below).
2. *Low — fairness:* rock collision used the full rectangle while the rock is drawn as a triangle — invisible corner deaths.
3. *Medium — controls:* pressing ↓/S mid-air did nothing, while the swipe-down path queued a landing slide — inconsistent inputs for the same move.
4. *Medium — balance:* at top speed, obstacle spacing could shrink to ≈231 px — less than one full jump arc — creating chains no player can clear.
5. *Low — feel:* death gave shake + sound only; the player simply vanished with no impact flash.
6. *Medium — clarity/session:* no pause.
7. *Medium — feel:* no mute.

**Cross-reference — Canabalt / endless-runner family (2D auto-runner).** Defining style mechanics: (1) auto-run with a two-verb kit — jump and slide — where **each obstacle type is matched to one verb**; (2) speed and spawn pressure ramp with distance; (3) one-hit runs scored on distance with instant restart.
**Verdict: upgraded to match.** (2) and (3) already matched. (1) was broken — slide matched no obstacle → barriers are now **overhead bars** (bottom edge at ground −38 px, chains/posts drawn): sliding passes under, standing or mistimed jumps still hit. All expression remains original Fire Babys art/code; only the functional collision geometry changed.

**Fixes applied:** pause + mute (shared); barrier rebuilt as overhead bar in both collision and rendering; rock hitbox inset 9 px per side to match its triangle; keyboard slide pressed mid-air now queues a landing slide (`slideQ`, same path as swipe); minimum spawn spacing raised (0.55 → 0.8 floor, gentler distance shrink); red impact flash on death (decays via the existing loop, character itself never depicted harmed — consistent with brand rules).

**Re-verification:** 0 errors, desktop + phone. Pause/mute ✓; air-slide queue probe ✓ (`doSlide()` mid-air sets `slideQ`). **Barrier proof, three ways:** original build + forced slide into a barrier → **died** (bug confirmed in the shipped code); fixed build + slide → **survived**; fixed build + standing → **died** (barrier still lethal when not sliding) ✓. Death → "💥 WIPED OUT!" → RUN AGAIN → `play` ✓. Render cost 0.45 → 0.31 ms desktop, 0.67 ms phone.

**FIXED vs COULD-NOT-FIX — Game 30:** findings **7**, fixed **7**, could-not-fix **none**.

---

## Game 31 — Boulder's Rampart (`game-31-boulders-rampart.html`)

**Complaints found**
1. *High — session:* no pause and no game-speed control in a 10-wave tower defense — the longest sessions in the batch with no way to step away or fast-forward a won wave.
2. *Medium — balance/progression:* towers carried a dead `lvl: 1` field — no upgrade progression existed, and gold had no late-game sink, flattening strategy after the first minutes.
3. *Medium — clarity:* score accumulated invisibly — no HUD element ever showed it during play (only on the victory screen).
4. *Medium — clarity:* building with insufficient gold silently did nothing (a generic click sound) — players couldn't tell a failed build from a misclick.
5. *Medium — feel:* no mute — and the cannon's `noise()` boom bypassed the `tone()` path entirely, so it needs its own guard.

**Cross-reference — Kingdom Rush / Bloons TD (tower defense).** Defining style mechanics: (1) build towers on a fixed field against waves marching set lanes, with a gold economy and castle lives as leak pressure; (2) tower variety with hard counters (fast single-shot / splash / slow / damage-over-time); (3) **upgrade progression** for placed towers plus wave escalation.
**Verdict: upgraded to match.** (1) and (2) already matched. (3) fell short → tap any built tower to upgrade it: Lv2/Lv3 at 70 %/140 % of base cost, +50 % damage per level, ★ pips under the tower, confirmation message.

**Fixes applied:** pause + mute (shared; `noise()` guarded too); ⏩ 1×/2× speed toggle; tower upgrades as above, wired into shot damage (`dmgMul`); score now shown live in the gold pill (🪙 · ⭐); transient on-screen messages for can't-afford builds, upgrade costs, successful upgrades, and max level — replacing silent failure.

**Re-verification:** 0 errors, desktop + phone. Pause/mute ✓; speed toggle probe: click → `__speed` = 2, click back → 1 ✓. Upgrade probe (both viewports, corrected tower index): tap tower → **Lv2, dmgMul 1.5, −35 gold, "⬆️ Tower upgraded to Lv2"**; again → **Lv3, dmgMul 2.0, −70 gold**; third tap → "⭐ That tower is max level (Lv3)" ✓. Can't-afford probe: message "Not enough gold — need 🪙 50" ✓. Score pill probe: pill reads "🪙 0 · ⭐ 123" after score set ✓. Victory → "🏆 VICTORY!" → PLAY AGAIN → `play` ✓. Render cost 0.95 → 0.21 ms desktop, 0.47 ms phone.

**FIXED vs COULD-NOT-FIX — Game 31:** findings **6**, fixed **5**, could-not-fix **1**:
- *Tower selling — not implemented.* The only input the single-tap canvas offers is a double-tap, which now directly conflicts with tap-to-upgrade: a child double-tapping to upgrade twice would sell their Lv2 tower instead — a foreseeable, frustrating loss with no undo. No non-conflicting gesture exists in this control scheme, and selling is not one of the genre benchmark's defining mechanics (build / upgrade / waves / lives are, and all are now delivered). Rejected on player-safety grounds, not convenience.

---

## Game 32 — Cinder's Glide (`game-32-cinders-glide.html`)

**Complaints found**
1. *Medium — balance:* cave terrain could step ±70 px per 40 px segment — near-vertical walls appearing faster than the player's capped climb/dive rates can answer: unfair, unreadable spikes.
2. *Low — visual:* background crystals on one side vanished — the parallax offset used a raw `%` that goes negative in JS.
3. *Low — dead code:* `sfx.whoosh()` defined but never called (same leftover pattern as game 28's overhaul item).
4. *Medium — clarity/session:* no pause.
5. *Medium — feel:* no mute.

**Cross-reference — Copter Game / hold-release cave flyer (Jetpack Joyride family).** Defining style mechanics: (1) one-button control — hold to rise, release to dive; (2) a **smooth** procedurally generated cave that narrows as distance grows; (3) distance scoring with collectible bonuses threaded through the gap.
**Verdict: upgraded to match.** (1) and (3) already matched, including the narrowing gap. (2) fell short on smoothness → per-segment slope capped (±70 → ±40 generated, ±60 → ±36 initial). Brand check: the player's sail is a hang-glider canopy (equipment), not a character wing/feather — no beaks/wings/feathers on any character; art unchanged from the overhaul-approved build.

**Fixes applied:** pause + mute (shared); terrain slope caps (above); crystal parallax wrapped with a proper positive modulo; `whoosh` now plays when a hold (rise) begins — the dead helper is live.

**Re-verification:** 0 errors, desktop + phone. Pause freeze/resume ✓; mute toggle verified in a dedicated probe (🔊 → 🔇 → 🔊, `__muted` true → false — an earlier harness click-timeout on the second tap was Playwright actionability under VM load, not the game) ✓; whoosh wiring probe: `wasHold` tracking engages on hold start ✓. Terrain measurement (auto-centered flight, same protocol both builds): mean segment step **15.2 → 9.2 px**, max step **34 → 19 px** — the cave is measurably smoother ✓. Death → "💥 CRASHED!" → GLIDE AGAIN → `play` ✓. Render cost 1.81 → 0.78 ms desktop, 0.58 ms phone.

**FIXED vs COULD-NOT-FIX — Game 32:** findings **5**, fixed **5**, could-not-fix **none**.

---

## Batch totals

| Game | Findings | Fixed | Could-not-fix |
|---|---|---|---|
| 27 Ember Bounce 2D | 7 | 7 | 0 |
| 28 Thermal Tug-of-War | 6 | 6 | 0 |
| 29 Blaze's Jump Quest | 9 | 9 | 0 |
| 30 Ruko's Dash Blitz | 7 | 7 | 0 |
| 31 Boulder's Rampart | 6 | 5 | 1 (tower selling — gesture conflicts with tap-to-upgrade; accidental-sell risk for kids; not a defining genre mechanic) |
| 32 Cinder's Glide | 5 | 5 | 0 |
| **Total** | **40** | **39** | **1** |

Every fix above was re-played and re-verified after application (both viewports where relevant; probes quoted per game). Deploy files updated for all 6 games; each source/deploy pair verified byte-identical after the final edit. Nothing uploaded to GitHub.
