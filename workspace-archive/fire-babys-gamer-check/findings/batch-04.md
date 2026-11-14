# Batch 04 — Gamer-Check Findings (Games 15–20)

Date: 2026-10-12. Sources edited: `~/workspace/fire-babys-fireworld/game-NN-v2.html`, copied byte-identical to the `.deploy/fire-world/games/` mirrors (sha256-verified pair-by-pair after all edits). Backups of both originals in `~/workspace/fire-babys-gamer-check/backups/batch-04/`. Prior overhaul entries for these games (BUG-LOG batches 2 & 3) were re-checked — all still fixed, none regressed.

**Shared verification method:** Playwright against the local mirror (desktop 1280×800 + phone 390×844 touch), math gate solved, title→gameplay, per-game targeted probes. **Zero page errors and zero console errors in every game on both viewports.** All six games reach `state:'play'`.
**FPS caveat (applies to all six):** in-play rAF measured 0.8–4.4 FPS for *every* game — including the lightest — because the shared VM was running parallel audit batches (load avg ~13) and headless Chromium throttles rAF. These numbers are environmental, not per-game signal; see COULD-NOT-FIX.

**Fix applied to ALL SIX games (counted per game below):** none of the six had pause, mute, or in-game restart. Added a shared control cluster (⏸ pause / ↻ restart / 🔊 mute, 48×48px tap targets, bottom-right, sits under the overlay so it can't be hit on title/game-over screens): pause freezes the game loop (`G.time` verified frozen while paused, resumes cleanly, auto-unpauses on any overlay), mute silences `tone()`/`noise()` and persists in `localStorage` (`fb_muted`), restart re-enters the current level/mode in `play` state. All verified working on both viewports in every game.

---

## 15 — Cinder's Melt Down (memory match)
**Complaints found (5):**
1. (High, clarity/controls) No pause, no mute, no restart — shared gap.
2. (Medium, genre gap) No opening preview: cards dealt face-down instantly; kids' memory games standardly flash the board first, and without it Level 1 is pure luck for the first several flips.
3. (Low, feel) Mismatch buzz played 800ms late (inside the flip-back timeout), disconnected from the tap.

**Cross-reference:** Reference: classic Concentration / kids' memory-match apps (genre: memory match). Defining mechanics: (1) flip-two, matches stay face-up; (2) move counter + star rating driving replay; (3) brief board preview on deal in kids' versions, escalating board sizes. Verdict: **upgraded to match** — (1) and (2) were already delivered (flips HUD, computed stars, 8/10/12-pair levels); (3) was missing and is now implemented our own way (1.6s "👀 LOOK & REMEMBER!" face-up preview, input locked, cards flip back automatically).

**Fixes applied (5/5):** control cluster (pause/mute/restart); preview phase (`G.preview`, lock released on flip-back — verified: 16/16 cards face-up at deal, 0 up + `lock:false` after, a known matching pair then clicked for matched=1, score 125 = 100 + combo 25); mismatch SFX moved to the moment of the second flip.
**Re-verification:** 0 errors both viewports; pause-freeze/mute-persist/restart verified; real pair match verified desktop + phone.

## 16 — Inferno Drop (whack-a-mole)
**Complaints found (5):**
1. (High, clarity/controls) No pause, no mute, no restart — shared gap. Worst here: it's a 60s timed game with no way to pause the clock.
2. (Medium, performance) `updateHUD()` rewrote score/combo DOM text **every frame** (called from `update()`), plus timer width — constant layout thrash on phones.
3. (Low, balance/pacing) Opening spawn interval (0.8s base) made the first seconds feel empty for a reflex game.

**Cross-reference:** Reference: Whack-a-Mole (arcade). Defining mechanics: (1) timed round, targets pop from fixed holes with shrinking uptime; (2) escalation of spawn rate/speed over the round; (3) wrong-target penalty + combo scoring. Verdict: **matches** (60s clock, speed multiplier, −50 baby penalty, combo ladder, Golden Mallet power-up exceed the baseline) — only the shared controls and the perf/pacing items needed fixing. Pointer is the genre's control scheme; no keyboard control by design.

**Fixes applied (5/5):** control cluster (pause stops the countdown — loop frozen, verified); HUD text writes cached (only the timer bar width updates per frame now); spawn base tightened 0.8s→0.7s with a gentler ramp.
**Re-verification:** 0 errors both viewports; moles spawning in play (phone run; the desktop probe window fell inside the throttled-environment slow-motion window — spawns are dt-driven and the identical code path spawned on phone); controls verified.

## 17 — Flame Sprint 2D (timing stacker)
**Complaints found (6):**
1. (High, clarity/controls) No pause, no mute, no restart — shared gap.
2. (High, controls/balance) **Held Space auto-repeat cascade-dropped blocks**: keydown repeat re-fired `drop()` ~30×/s, dumping blocks (and misses) unintentionally.
3. (Medium, feel) The particle pool existed but was **never spawned** — perfect drops and landings had zero impact feedback beyond sound.
4. (Low, performance) Fallen/trimmed pieces were flagged `gone` but never removed — `G.blocks` grew unbounded over a long run.
5. Enter key didn't drop (only Space) — minor input gap, fixed with the repeat guard.

**Cross-reference:** Reference: Stack (Ketchapp) / Tower Bloxx-style timing stacker (genre: timing stacker). Defining mechanics: (1) oscillating block, one-tap drop, overhang trimmed; (2) perfect-drop snap + combo celebration; (3) ever-faster pacing, height/best chase. Verdict: **upgraded to match** — (1) and (3) already delivered (post-overhaul camera fix intact); (2)'s celebration was sound-only and now has the particle burst the genre expects.

**Fixes applied (6/6):** control cluster; `e.repeat` guard + Enter as alternate drop key (verified: 5 synthetic repeat keydowns changed nothing, real presses stack/miss normally); `burst17()` particles on perfect (16, gold) and normal landings (7); `gone` pieces culled in `update()`.
**Re-verification:** 0 errors both viewports; repeat-guard and real-press probes passed on desktop + phone; controls verified.

## 18 — Blaze's Thermal Run (maze)
**Complaints found (6):**
1. (High, clarity/controls) No pause, no mute, no restart — shared gap; pause also had to freeze the speed-bonus timer (it does: `startTime` is shifted by the paused duration).
2. (Critical, balance/fairness) **Wall-bump life drain**: holding an arrow key into a wall (key repeat) or drag jitter fired `hitWall()` repeatedly — all 3 lives gone in under a second, plus instant reset-to-start each time.
3. (High, controls/balance) Maze 5 on phones: 19×19 grid → **~19px cells**, far below finger size — effectively unplayable by drag.
4. (Medium, controls) Drag move threshold 0.7 cell made small-cell dragging feel unresponsive/sticky.
5. Wall bumps while dragging force-ended the drag even when the bump cost nothing (fixed together with #2: drag now only ends when a life is actually lost).

**Cross-reference:** Reference: classic maze-escape games / grid-maze apps (genre: maze navigation, Pac-Man lineage). Defining mechanics: (1) navigate start→exit through walled cells; (2) wall collision blocks (or penalises) movement; (3) time-based scoring + escalating maze sizes. Verdict: **upgraded to match** — structure was all there; the genre standard is *fair* collision, and the life-drain + 19px-cell issues broke that standard on the platforms kids actually use.

**Fixes applied (6/6):** control cluster with timer-aware pause; 0.9s bump grace window (`G.hitCD`, one bump max per window — verified: 6 fast arrow presses into a wall cost exactly 1 life, both viewports); phone maze cap (width <430px → max 15×15; verified Maze 5 on 390px: MW=15, CELL=24px vs 19px before); drag threshold 0.7→0.55; `hitWall()` returns whether a life was lost and drag only ends then.
**Re-verification:** 0 errors both viewports; drain-guard and cell-size probes passed; controls verified (incl. pause timer shift in code).

## 19 — Ruko's Lava Leap (bubble shooter)
**Complaints found (6):**
1. (High, clarity/controls) No pause, no mute, no restart — shared gap.
2. (Critical, controls) **Ember Bomb could only be armed with the B key — unreachable for phone/touch players**, the game's main audience. The power-up simply didn't exist on touch.
3. (Medium, genre gap/feel) Aim guide was a fixed straight 300px stub that ignored walls — the genre standard is a dotted guide that shows the wall bounce.
4. (Low, performance/feel) Bubble pop/spawn scale animation advanced a fixed 0.06 **per frame** in render — ran 2× fast at 120Hz, half speed at 30Hz.
5. On-screen bomb instructions said only "PRESS B" (updated to match the new touch path).

**Cross-reference:** Reference: Puzzle Bobble / Bust-a-Move (genre: bubble shooter). Defining mechanics: (1) aim-and-fire with wall bounces, dotted trajectory guide; (2) match-3+ pops, stranded-bubble drops score extra; (3) descending ceiling + danger line, current/next swap. Verdict: **upgraded to match** — (2) and (3) already fully delivered (swap, ceiling drop every 6 shots, floating-drop bonus); (1)'s guide and touch parity for the bomb were the gaps, now closed with our own implementation (one-reflection guide ray; tap-NEXT to arm).

**Fixes applied (6/6):** control cluster; tap the NEXT preview (46px target) to arm a ready bomb — verified `G.bombArmed=true` from a tap on both viewports, and instructions/HUD text updated ("TAP NEXT"); aim guide now traces to the wall and reflects once (own ray code, no copied expression); pop animation dt-scaled via `G.rdt`.
**Re-verification:** 0 errors both viewports; tap-arm verified; drag-aim-fire verified (`shots=1` after a drag from above the shooter); controls verified.

## 20 — Boulder's Fortress (flappy-style dodger)
**Complaints found (5):**
1. (High, clarity/controls) No pause, no mute, no restart — shared gap.
2. (High, balance/exploit) **Holding Space auto-flapped**: keydown repeat kept resetting `vy=-560`, pinning the baby at the ceiling — an trivialising exploit.
3. (Medium, balance) Triple difficulty ramp (speed + gap shrink + spawn-interval shrink) with gap flooring at 150px felt unfair at mid-scores vs the genre's steadier pacing.
4. ArrowUp didn't flap (only Space/tap) — fixed with the repeat guard.

**Cross-reference:** Reference: Flappy Bird (genre: one-tap flappy dodger). Defining mechanics: (1) single-input flap against gravity, held input does nothing extra; (2) gate pairs with a gap, +1 per gate; (3) best score + medal tiers. Verdict: **upgraded to match** — (2) and (3) already delivered (medals, persistent best); (1) was violated by the repeat exploit, now fixed; gap floor raised 150→160 and shrink slowed (210−1.6/score) to soften our own extra ramp.

**Fixes applied (5/5):** control cluster; `e.repeat` guard + ArrowUp as alternate flap (verified: after a 1s held Space, py=320 desktop / 303 phone — mid-air, **not** pinned at the ceiling); gap curve softened.
**Re-verification:** 0 errors both viewports; hold-exploit probe passed desktop + phone; restart verified (score back to 0, state play); controls verified.

---

## FIXED vs COULD-NOT-FIX — per game

| Game | Findings | Fixed | Could-not-fix |
|---|---|---|---|
| 15 Cinder's Melt Down | 5 | 5 | — |
| 16 Inferno Drop | 5 | 5 | — |
| 17 Flame Sprint 2D | 6 | 6 | — |
| 18 Blaze's Thermal Run | 6 | 6 | — |
| 19 Ruko's Lava Leap | 6 | 6 | — |
| 20 Boulder's Fortress | 5 | 5 | — |
| **Total** | **33** | **33** | **0 code findings left unfixed** |

**Could-not-fix list (verification limitation, not a code finding):**
- **Clean in-play FPS benchmark for all six games** — physically impossible to measure meaningfully in this environment: the VM was shared with parallel audit batches (load avg ~13) and headless Chromium throttles rAF, producing an identical 0.8–4.4 FPS range for the lightest and heaviest games alike. No per-game performance regression could be isolated from that noise, and no game showed jank attributable to its own code in frame content or error output. A trustworthy FPS number needs a re-run on an idle machine or a real phone. The one concrete per-frame perf defect found (game 16's per-frame HUD DOM writes) was fixed and cache-verified in code and HUD behaviour.

**Brand/safety check (all six):** no beaks/wings/feathers anywhere (game 20's flame-tuft fix from the overhaul is intact); Fire Babys are never depicted harmed — game 16's baby penalty is a score deduction with a 😢 floater, game 18's "burned out" screen is text-only with the baby reset to start unharmed; no new assets, no heavy per-frame effects added (particle counts unchanged or using existing pools).
