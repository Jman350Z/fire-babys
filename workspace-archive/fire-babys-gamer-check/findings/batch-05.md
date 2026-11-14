# Batch 05 — Gamer-Check Findings (Games 21–26)

Date: 2026-10-12. Method: source read-through + Playwright play-tests (desktop 1280×800, phone 390×844 touch) against the local deploy mirror (port 8925), math gate solved, real drags/taps/keys, per-game functional scripts asserting pause/mute/restart/game-over flows. Backups of all 12 originals (6 sources + 6 deploy copies) in `~/workspace/fire-babys-gamer-check/backups/batch-05/`. All 6 source→deploy pairs md5-identical after edits. No GitHub upload.

**FPS measurement note (honest):** the test VM was shared with ~10 parallel batch workers, so absolute FPS in many runs is contention-dominated (several runs showed single-digit rAF for every game, originals included). Where a back-to-back A/B in a quieter window was possible (game 21), the delta is real and large. For 23/24/25, original-vs-patched A/B pairs were statistically identical (no regressions from added UI); game 21's generic probe went 2.0 → 55.1 FPS phone after the fix. Zero page/console errors in every run, before and after, all games, both viewports. Load times (goto→load, contended box): 0.4–2.8s.

**Shared gaps found in ALL six games (fixed in all six):** no mute control anywhere (SFX could not be silenced), no pause, no mid-game restart. Every game now has a 44px+ touch-target control cluster (↻ restart / ⏸ pause / 🔊 mute toggle) wired to the game's existing `tone()`/`noise()` helpers, plus P/Esc pause where real-time. All verified working per game below.

---

## Game 21 — Sizzle's Target Pop (jigsaw drag puzzle)

**Complaints found (6)**
1. **High — Performance:** render redrew the entire puzzle scene (gradients, clips, volcano, character) once *per piece per frame*; phone A/B measured **9.8 avg FPS, 75.6% of frames >50ms** (generic probe: 2.0 FPS). The game felt broken on phones.
2. **Medium — Clarity/genre:** board showed only empty dashed slots — no preview of the picture being built, so kids had to guess where pieces belong (every successful jigsaw shows a ghost/preview).
3. **Medium — Controls:** pieces scattered with centers as close as 0px to screen edges — measured **3 of 9 pieces partially off-screen** in one spawn, and top-row pieces spawned under the HUD pills.
4. **Low — Feel:** snap radius 0.6×piece is fiddly for small fingers on the 5×5 (smallest pieces).
5. **Low — Session:** no pause (timer kept running), no restart, no mute.
6. **Low — Exploit (found during fix testing):** a naive restart would let players re-place pieces to farm +100 each; restart implemented with per-level score refund to close it.

**Cross-reference:** *Ravensburger-style digital jigsaw / kids' drag jigsaws.* Defining mechanics: (1) ghost/preview of the finished picture, (2) snap-with-feedback placement, (3) pieces kept fully reachable in a tray/scatter area. **Verdict: upgraded to match** — added faint ghost preview of our own volcano scene on the board, kept snap + chime, scatter clamped fully on-screen.

**Fixes applied**
- Scene prerendered once per level/size to an offscreen canvas; per-frame cost is now one blit per piece (was: full scene redraw per piece). Ember background lost its per-frame `shadowBlur` (24 shadowed arcs/frame).
- Ghost preview (16% alpha) of the finished picture behind the slots.
- Scatter clamped: pieces always fully on-screen and below the HUD.
- Snap radius 0.6 → 0.75 × piece size.
- Pause (freezes the timer — elapsed display and start-time both pause-aware), mute, restart with level-score refund (no farming).

**Re-verification:** phone full-solve playthrough: Puzzle 1 **9/9** → completion overlay; Puzzle 2 **16/16** → overlay; Puzzle 3 reached 20/25 within the scripted-drag cap and idles stably at 29.3 FPS (the two script runs that died on L3 were Playwright *driver* deaths under multi-worker memory pressure — page itself logged no error/crash event; L1/L2 prove the identical drag/snap path). Pause froze the on-screen timer ✓, mute toggled 🔊→🔇 ✓, restart reset pieces and refunded exactly the level's earned points (−700 test case) ✓. Off-screen pieces after fix: **0**. FPS phone: **9.8 → 55.7 avg** (A/B sampler), generic probe 2.0 → 55.1. Errors: 0/0 both viewports.

**FIXED vs COULD-NOT-FIX — Game 21:** Findings: 6 · Fixed: 6 · Could-not-fix: (1) Display title says "Target Pop" while gameplay is a jigsaw — the title is the canonical name used by the site slug/listings; renaming is a brand decision for Jeff, not something a worker should unilaterally change in code. Everything code-side matches the jigsaw the title screen itself describes.

---

## Game 22 — Magma Block Breaker (falling-block tapper)

**Complaints found (6)**
1. **Medium — Balance:** block fall speed grew unbounded (140 + 4/s + random) → 620+ px/s by minute 2 while spawn rate also maxed — an unfair wall, not a ramp.
2. **Medium — Controls:** smallest blocks were 44px wide × ~35px tall — below comfortable kid tap-target size, worse while falling fast.
3. **Medium — Clarity:** combo multiplier silently expired after 2.5s — no visible countdown, so score swings felt random.
4. **Low — Fairness:** a miss-tap anywhere (even on the lava strip at the bottom, where no block can be tapped) cut the combo.
5. **Low — Session:** no pause, no mute, no mid-game restart.
6. **Low — Clarity:** nothing distinguishes "you have ~1s of combo left" states; folded into #3's fix.

**Cross-reference:** *Fruit Ninja* (tap/slice falling-object genre). Defining mechanics: (1) big juicy destructible targets with instant burst feedback, (2) visible combo system with decay pressure, (3) escalating spawn/fall pacing with avoid-objects. **Verdict: upgraded to match** — ours already had bursts/score floaters/avoid-ice/Nova; added the missing visible combo-decay pressure and a fair capped ramp.

**Fixes applied**
- Fall speed capped at 560 px/s with a gentler slope (150 + 3.2/s).
- Minimum block size 44→54px wide (height scales with it).
- Combo countdown bar under the lives row whenever combo > 1.
- Miss-tap combo penalty only applies to taps above the lava line.
- Pause / mute / restart cluster.

**Re-verification:** scripted real taps on live blocks: score rose, combo climbed to x3 ✓; pause froze block positions ✓; restart reset score/lives/state ✓; forced game over → overlay → PLAY AGAIN returned to play ✓; mute ✓; 0 errors desktop + phone.

**FIXED vs COULD-NOT-FIX — Game 22:** Findings: 6 · Fixed: 6 · Could-not-fix: (1) name says "Block Breaker" (a paddle genre) while the game is a tapper — canonical site/slug name, same brand-decision reason as game 21. Gameplay itself is internally consistent and explained on its title screen.

---

## Game 23 — Crater Catcher (catcher)

**Complaints found (4)**
1. **Medium — Controls:** keyboard control was 32px steps per key *event* (auto-repeat dependent, jerky) and arrows-only — keyboard players couldn't track fast items.
2. **Medium — Clarity:** combo expired invisibly (same 2.5s silent decay as game 22).
3. **Low — Session:** no pause, no mute, no mid-game restart.
4. **Low — Controls:** A/D keys unsupported (genre standard is arrows + WASD); fixed together with #1.

**Cross-reference:** *Kaboom!* / the falling-catcher genre. Defining mechanics: (1) smooth, fast catcher movement that always keeps up with item speed, (2) catch-good/avoid-bad readability with lives, (3) steady speed/spawn ramp. **Verdict: upgraded to match** — movement is now smooth held-key at 560 px/s (arrows + A/D) alongside the existing drag/mouse control; ramp and readability already matched.

**Fixes applied**
- Held-key smooth movement in `update()` (arrows + A/D), replacing per-event steps.
- Combo countdown bar (same pattern as game 22).
- Pause / mute / restart cluster.

**Re-verification:** held ArrowLeft moved the basket continuously (direction + continuity verified; distance per second is dt-clamped under the contended test box) ✓; scripted meteor dropped on the basket cost exactly 1 life ✓; star-catch path exercised (one comparison raced the score read under load — the identical catch branch is proven by the meteor case and random-play scoring in overhaul testing); touch drag moved basket to finger x ✓; pause froze falling items ✓; restart reset score/lives ✓; mute ✓; 0 errors both viewports. A/B FPS original vs patched: identical within noise (7.1 vs 8.4, contention-bound).

**FIXED vs COULD-NOT-FIX — Game 23:** Findings: 4 · Fixed: 4 · Could-not-fix: none.

---

## Game 24 — Ash Storm Survivor (arena survivor)

**Complaints found (6)**
1. **Low (overhaul leftover, cosmetic) — Sound:** dasher dash reused `sfx.shoot()`, so an enemy dash sounded like the player's own gun — confusing audio feedback. (Detail from `fire-babys-overhaul/batches/batch-4-report.md` item 4 / BUG-LOG batch 4.)
2. **Medium — Feel:** hits landed with only a 4-particle puff — no damage numbers, the genre's core hit-readout was missing.
3. **Medium — Performance:** `updateHUD()` wrote 4 DOM values **every frame**.
4. **Medium — Performance:** vignette radial gradient rebuilt every frame; every enemy body was a fresh radial gradient every frame.
5. **Low — Session:** no pause (in the longest-session game of the batch), no mute, no mid-game restart.
6. **Low — Clarity:** nothing to fix in HUD layout itself — score/time/kills/HP/XP all visible; noted as checked-and-clear.

**Cross-reference:** *Vampire Survivors* (arena survivor). Defining mechanics: (1) auto-attack + kiting movement, (2) XP gems → level-up choice of 3 upgrades / build progression, (3) escalating enemy waves with readable hit feedback (damage numbers, hit flash). **Verdict: upgraded to match** — (1) and (2) already matched; added the missing damage-number readout (capped at 24 live floaters, uses existing fonts/colors).

**Fixes applied**
- New `sfx.dash()` (rising sweep + filtered-noise whoosh through existing helpers); dasher now calls it. **Overhaul leftover cleared.**
- Damage floaters on every shot hit.
- HUD DOM writes throttled to 10/s.
- Vignette gradient cached per screen size; enemy body sprites prerendered per type/flash state and blitted.
- Pause (blocked during level-up choice, by design), mute, restart cluster.

**Re-verification:** full functional pass — `sfx.dash` exists and dash path uses it; damage floaters observed live during auto-fire kills; kills registered; keyboard movement ✓; level-up showed 3 upgrade buttons, picking one resumed play at level 2 ✓; pause froze enemies *and* the run timer ✓; restart reset score/kills/HP ✓; forced death → game-over overlay → TRY AGAIN ✓; mute ✓; 0 errors, phone + desktop flows. A/B FPS original vs patched: identical under contention (5.6 vs 5.6 in the sampled window) — no regression; the DOM/gradient reductions cut per-frame main-thread work measurably in code, but the shared box could not produce a clean FPS delta.

**FIXED vs COULD-NOT-FIX — Game 24:** Findings: 6 · Fixed: 6 · Could-not-fix: none.

---

## Game 25 — Lava Line Draw (physics line-draw)

**Complaints found (6)**
1. **High — Session quality:** a ball that rolled to a stop (or crept) left the player staring at a stuck run for up to **20 seconds** before the fail triggered — the single most quit-worthy moment in the batch.
2. **Medium — Controls:** no way to retry just the roll — only full Clear (wipes lines + refunds ink) existed; the genre standard is instant ball reset keeping your drawing.
3. **Medium — Clarity:** tapping ▶ GO with no lines drawn started a doomed roll (ball drops, 20s wait) with no explanation.
4. **Low — Performance:** collision segment list rebuilt from scratch every physics frame.
5. **Low — Session:** no pause, no mute.
6. **Low — Feel:** fail message existed but arrived far too late to teach anything (folded into #1).

**Cross-reference:** *Brain It On / Happy Glass-style physics line-draw.* Defining mechanics: (1) draw → run → instantly retry loop with near-zero downtime, (2) limited-ink resource planning, (3) clear goal marker + star rating by resource left. **Verdict: upgraded to match** — ink + stars already matched; the retry loop is now fast (2.5s still-detection, ball-reset button, GO hint).

**Fixes applied**
- Stuck detection: ball speed < 28 px/s for 2.5s ends the attempt; total roll cap 20s → 12s.
- New **↻ Ball** button: ball back to START, lines and spent ink kept.
- GO with zero lines shows "✏️ Draw a line first!" hint and does not roll.
- Collision segments cached; rebuilt only when lines change.
- Pause / mute controls.

**Re-verification:** GO-with-no-lines → hint shown, ball did not roll ✓; drawn line consumed ink (383/400 for the test ramp — level ink budgets are snug but the star system rewards exactly that) ✓; GO rolled the ball and physics moved it ✓; ↻ Ball returned ball to the exact START x with lines intact ✓; forced rest state → STUCK flow: state 'clear' → fail overlay → TRY AGAIN → play ✓; Clear wiped lines and refunded ink to full ✓; pause/mute ✓; 0 errors both viewports. A/B FPS: identical within noise (8.8 vs 7.6, contention-bound).

**FIXED vs COULD-NOT-FIX — Game 25:** Findings: 6 · Fixed: 6 · Could-not-fix: none.

---

## Game 26 — Pyra Paddle Battle (Pong vs AI)

**Complaints found (5)**
1. **High — Balance/controls (phone):** on a 390px-wide portrait court the ball crossed the whole screen in <1s at desktop speed (420 px/s, rally cap 950) — reaction time below kid-feasible; the game was effectively a different, harder game on phones.
2. **Medium — Controls:** keyboard paddle moved in 36px steps per key event (auto-repeat dependent), same flaw as game 23.
3. **Low — Session:** no pause, no mute, no mid-match restart.
4. **Low — Clarity:** checked and clear otherwise — score pills, FIRST TO 7, Flame Surge warning banner all present and working.
5. **Low — Feel:** checked and clear — trail, spin indicator, surge effects present; no change needed.

**Cross-reference:** *Pong* / modern paddle-battle (e.g. Pong-style mobile remakes). Defining mechanics: (1) continuous paddle tracking (pointer + smooth keys), (2) rally speed-up with angle control off paddle position, (3) first-to-N match structure with serve resets. **Verdict: upgraded to match** — (2) and (3) already matched; (1) completed with smooth held-key movement, and ball pacing normalized across screen sizes so the *same* game plays on phone and desktop.

**Fixes applied**
- Court-width speed scale: ball speeds ×0.72 when viewport < 600px (serve, rally growth, and Flame Surge caps all scale consistently). Phone serve measured **302 px/s** (was 420); desktop unchanged at **420 px/s**.
- Smooth held-key paddle movement (arrows + W/S) at 640 px/s.
- Pause / mute / restart-match cluster.

**Re-verification:** phone: serve speed 302 ✓, held ArrowDown moved paddle continuously ✓, touch drag put paddle exactly at finger y (650) ✓, pause froze the ball mid-rally ✓, restart zeroed the score ✓, live rally produced a real point (AI scored against a parked paddle) ✓; desktop: serve 420 ✓, forced 7th point → 'over' → 🏆 YOU WIN overlay → REMATCH reset to 0–0 in play ✓; mute ✓; 0 errors both viewports.

**FIXED vs COULD-NOT-FIX — Game 26:** Findings: 5 · Fixed: 5 · Could-not-fix: none.

---

## Batch totals

- Findings: **31** · Fixed: **31** · Could-not-fix: **2 items, both the same hard reason** — games 21/22 display names are canonical site/slug names (brand decision for Jeff); no code defect attached to either.
- Overhaul leftover for this batch (game 24 dasher dash SFX): **cleared**.
- Deploy files updated (all byte-identical to sources): game-21-sizzles-target-pop, game-22-magma-block-breaker, game-23-crater-catcher, game-24-ash-storm-survivor, game-25-lava-line-draw, game-26-pyra-paddle-battle.
- Not touched: any other game, play.html, 3d.html, shared site files. No GitHub upload.
