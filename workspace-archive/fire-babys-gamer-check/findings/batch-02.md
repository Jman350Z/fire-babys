# Fire Babys — Gamer Check, Batch 02 (games 02, 04, 05, 06, 07, 08)

Date: 2026-10-12 (PDT). Fresh gamer-lens + genre-benchmark audit, post-overhaul.
Method: full source read of each game, Playwright play-tests against the local deploy
mirror (desktop 1280×800 / 640×400 and phone 390×844 touch), fixes applied to the
canonical sources and copied byte-identical to the deploy mirror. Backups of all
originals: `~/workspace/fire-babys-gamer-check/backups/batch-02/`.

**Test-environment caveat (applies to every FPS number below):** this pass ran on a
shared VM at load average 9–17 with ~87 headless-Chrome processes from parallel
audit workers and software (SwiftShader) GPU rendering. Absolute FPS in that
environment (heavy games 7–10 fps, light game 02 ~50 fps on phone viewport) is an
environment artifact — the ORIGINAL code measured the same 1–9 fps range for
games 04–08 under identical conditions. No fix in this batch adds per-frame work;
two fixes (02, 08) remove per-frame DOM writes. Real-device FPS could not be
measured in this environment (see COULD-NOT-FIX, global item).

**Shared fix applied to all six games:** none of them had a working pause or a
mute control, and 04–08 had no mid-game restart. All six now have 48×48px
pause (⏸) and mute (🔊/🔇) buttons, a pause overlay with RESUME and RESTART,
and P/Escape keyboard pause (04–08 pattern; 02 equivalent). Mute is wired into
each game's existing `tone()`/`noise()` audio helpers. Pause/resume/mute/restart
were re-play-verified on desktop AND phone for every game (states checked in-page:
`pause` → `play`, score frozen while paused in 02, mute icon toggles).

---

## Game 02 — Blaze Runner
Source: `fire-babys-fireworld/games/game-02-blaze-runner.html` → deploy: `.deploy/fire-world/game-02-blaze-runner.html`

**Cross-reference:** Chrome Dino / Canabalt-style one-button endless runner.
Defining mechanics: (1) single-input timing jumps; (2) gradual, bounded speed
ramp; (3) distance score + persistent best, instant restart.
Verdict: **upgraded to match** — the ramp and gap generation were unbounded
(below), the rest of the loop was already genre-true.

**Complaints found (10) — all fixed:**
1. **High — frame-rate-dependent physics.** All motion was per-rAF-frame: on a
   120Hz screen the game ran ~2× fast and ~2× as hard. → Physics, gap motion,
   score and animation are now dt-normalised (60fps-equivalent, clamped).
2. **High — uncapped gap width.** Respawn width grew `+score/60` forever; late
   runs generated physically unjumpable gaps. → Width capped at 165px and
   growth slowed (`score/80`).
3. **Medium — gap respawn could clump.** Recycled gaps re-entered at a random
   x and could overlap the next gap into a double-wide pit. → Respawn now
   guarantees ≥300px spacing past the furthest existing gap.
4. **Medium — uncapped run speed** (`5+score/400`) became unreactable. → Capped at 13.
5. **Medium — no pause** (see shared fix). Score provably freezes while paused.
6. **Medium — the game was completely silent:** no audio helpers, no SFX, no
   mute. → Minimal WebAudio helper added through the game's own style: jump
   blip, game-over sweep, click; mute toggle added.
7. **Low — score DOM written every frame.** → Written only when the integer changes.
8. **Low — pause/mute taps also triggered a jump** (window pointerdown handler;
   found while implementing the shared fix). → Clicks inside `#ctlBtns` are excluded.
9. **Low — brand tone:** game-over copy read "Blaze fell in the lava!" — Blaze is
   gold, never left harmed. → Copy now reads "Blaze stumbled at a lava gap!"
   (a stumble, straight back up on the next run; nothing harmful is ever shown).
10. **Low — volcano backdrop vanished on long runs** (negative modulo in the
    silhouette scroll). → Positive wrap. (Note: the first attempt at this fix
    put a `//` comment mid-line and commented out the rest of the statement —
    caught by the JS syntax check, repaired, re-verified end-to-end.)

**Re-verification:** desktop + phone: loads 715ms (phone) / ~1.1s (desktop,
contended), 0 page errors; Space jump ✓, tap jump ✓, pause ✓, resume ✓, mute
icon ✓, game over appears ✓, RUN AGAIN restarts with score reset ✓. Phone FPS ~50.

## Game 04 — Cinder's Ice Rink Chaos
Source: `game-04-v2.html` → deploy: `games/game-04-cinders-ice-rink-chaos.html`

**Cross-reference:** Angry Birds-style slingshot physics puzzler.
Defining mechanics: (1) pull-back launch with readable power/trajectory;
(2) shots == projectiles, and running out is a real fail state; (3) star rating
by efficiency.
Verdict: **upgraded to match** — item (2) was broken (below); stars already existed.

**Complaints found (8) — all fixed:**
1. **Critical — soft-lock: running out of blocks could NEVER fail the level.**
   Every level set `shots = blocks + 1`, and each block can be flicked once,
   so `shots - shotsUsed` could never reach 0 and the fail check was dead.
   A player who spent every block with crystals left had a frozen game and
   had to reload the page. → `G.shots` is now set to the actual block count in
   `buildLevel()`. Verified: forced-spend test now reaches `state:'fail'` and
   TRY AGAIN works.
2. **Medium — no pause / no mute / no mid-game restart** (shared fix).
3. **Medium — retry was score-farmable:** TRY AGAIN kept the score and rebuilt
   the level, so crystal points could be re-earned forever. → Per-level score
   snapshot (`levelStartScore`) restored on retry and on pause-restart.
4. **Low — dead SFX (overhaul leftover):** `sfx.slideSfx` was defined, never
   called. → Now fires once when a launched block is sliding fast (>260px/s).
5. **Low — per-frame ice friction** (`*=0.995` per update) made blocks stop
   ~2× faster on 120Hz screens. → dt-scaled friction.
6. **Low — aim read only showed the pull, not the launch direction.** → Three
   gold dots now project the launch direction while dragging (genre standard).
7. (counted in #2) pause, 8. (counted in #2) mute — see FIXED list.

**Re-verification:** desktop + phone: load ~1.1s / 723ms, 0 page errors;
`G.shots === G.blocks.length` (2 on L1) ✓; real mouse flick marks the block
used and decrements the shots pill (🧊 1) ✓; forced fail state reached ✓;
retry returns to play ✓; pause/resume/mute/restart ✓ both viewports.

## Game 05 — Lord Inferno's Ballista Siege
Source: `game-05-v2.html` → deploy: `games/game-05-lord-infernos-ballista-siege.html`

**Cross-reference:** Sky Force Reloaded / Raiden-style vertical scrolling shmup.
Defining mechanics: (1) smooth continuous steering (relative drag + held-key
movement); (2) auto-fire with timed power-up escalation, including true spread
weapons; (3) boss finale with HP bar.
Verdict: **upgraded to match** — (1) and the spread part of (2) fell short; boss
and HP bar already matched.

**Complaints found (7) — all fixed:**
1. **High — keyboard steering was OS key-repeat steps** (14px per repeat event;
   hold-to-move stuttered and varied by OS settings). → Held-key flags with
   smooth 430px/s movement in `update()`; verified continuous per-frame motion.
2. **High — drag teleported the ballista to the pointer.** `pointerdown` set
   the player position directly to the tap point — jarring, and a tap could
   teleport you into a rock. → Relative drag (grab offset preserved, position
   clamped). Verified: grabbing 120px away moves the player 0px.
3. **Medium — Ember Nova was billed as "4-way bolts" but fired 4 parallel
   bolts.** → Nova bolts now fan out (±140px/s lateral spread).
4. **Medium — no pause / no mute / no mid-game restart** (shared fix).
5. **Low — drag ceiling (90% / top unclamped) disagreed with the keyboard
   ceiling (H×0.4).** → Both clamp to the same band.

**Re-verification:** desktop + phone: load ~950ms / 551ms, 0 page errors;
held ArrowLeft moves continuously ✓; drag teleport = 0px ✓; pause/resume/
mute/pause-restart ✓ both viewports.

## Game 06 — Blaze's Magma Bounce
Source: `game-06-v2.html` → deploy: `games/game-06-blazes-magma-bounce.html`

**Cross-reference:** Gang Beasts / bumper-sumo arena battler.
Defining mechanics: (1) momentum-based bumping, ring-out wins; (2) rounds
escalate so they always resolve; (3) ring edge danger is telegraphed.
Verdict: **upgraded to match** — (2) was missing; (1) and (3) already matched
(DANGER warning + pulsing lava edge).

**Complaints found (7) — all fixed:**
1. **High — hold-to-cheat exploit:** while the player held Blaze (dragging),
   the physics loop skipped the player entirely — including the lava-edge
   check — so grabbing Blaze while sliding out froze you safely forever. →
   Held players are frozen but the edge still counts. Verified: player held
   outside the ring is ruled OUT and the round ends (`state:'over'`).
2. **Medium — rounds could stalemate.** `G.roundT` was tracked and never used;
   golem AI never escalated. → After 25s, golem charge/steering scales up to
   2.5× so rounds resolve.
3. **Medium — no pause / no mute / no mid-game restart** (shared fix).
4. **Medium — retry was score-farmable** (same pattern as 04). → Per-round
   score snapshot (`roundStartScore`) restored on retry and pause-restart.
5. **Low — per-frame friction** (`*=0.985` per update). → dt-scaled.

**Re-verification:** desktop (in-page pointer events; CDP mouse input was
starved by VM contention — the game itself responded in 13s end-to-end):
load ~600–800ms, 0 page errors in-game (the two `setPointerCapture` errors in
that run are an artifact of synthetic test events, not reachable by real
input); 3 golems spawn ✓; grab-and-fling imparts velocity ✓; held-edge OUT
rule ✓; pause/resume/mute ✓. Phone: state play, pause/resume ✓, 48px buttons ✓.

## Game 07 — Ruko's Turbo Drift
Source: `game-07-v2.html` → deploy: `games/game-07-rukos-turbo-drift.html`

**Cross-reference:** Guitar Hero / Friday Night Funkin'-style 4-lane rhythm.
Defining mechanics: (1) a chart driven by an audible beat/music track;
(2) timing judgments + combo; (3) end-of-song grade.
Verdict: **upgraded to match** — (2) and (3) already matched; (1) was missing
entirely (below).

**Complaints found (5) — all fixed:**
1. **High — a rhythm game with no music.** The only sounds were hit/miss
   effects; between notes there was silence, so there was no groove to play
   to. The overhaul-noted dead `sfx.beat` was the missing piece. → `sfx.beat`
   is now wired as a backing pulse on every beat (bass note on the downbeat),
   tracked via `G._lastBeat`, reset per song, volume trimmed 0.2 → 0.13 so it
   sits under the note tones. Verified live: beat index advances with song time.
2. **Medium — no pause / no mute / no mid-song restart** (shared fix; pause
   freezes `songTime`, so the chart stays in sync — verified).
3. **Low — keyboard limited to D F J K.** → Arrow keys mapped to the 4 lanes
   as an alternative. Verified: ArrowLeft registers a lane hit, game continues.

**Re-verification:** desktop + phone: load ~1.3s / 550ms, 0 page errors; song
starts with 39 generated notes (Easy), beat tracker advancing through the
countdown ✓; lane tap flashes the lane on phone ✓; pause/resume/mute/
pause-restart (restarts the current song) ✓ both viewports.

## Game 08 — Sizzle's Spark Jump
Source: `game-08-v2.html` → deploy: `games/game-08-sizzles-spark-jump.html`

**Cross-reference:** Doodle Jump.
Defining mechanics: (1) auto-bounce + wrap-around steering; (2) platform
variety that scales with height; (3) platform generation that is always
reachable by design; one-way camera, distance score.
Verdict: **upgraded to match** — (3) was broken on wide screens (below);
(1) and (2) already matched.

**Complaints found (9) — all fixed:**
1. **Critical — impossible jumps on desktop/wide screens.** New platforms
   spawned at a uniformly random x across the full width — up to ~1,200px
   horizontally from the platform below, against a maximum horizontal jump
   reach of ~430px. Whole runs were luck-gated. → Platform x is now chained:
   each new platform's centre lands within 330px of the previous platform's
   centre. Verified in-page: max centre-to-centre offset 289px (was up to
   full-width).
2. **High — vertical gap could reach the jump apex.** Spawn gap grew to
   60+80+60 = 200px vs a max jump height of ~205px (near-impossible, worse
   combined with any horizontal offset). → Difficulty growth capped at +30
   (max gap 170px).
3. **Medium — no pause / no mute / no mid-game restart** (shared fix).
4. **Low — a leftover rocket boost leaked into the next run** (`G.rocketT`
   was never reset; dying mid-rocket made the next run start at forced
   −1200px/s). → Reset in `reset()`; verified `rocketT === 0` on a fresh run.
5. **Low — advertised tilt control could never work on iOS:** the
   `DeviceOrientationEvent.requestPermission()` flow was never called. → It
   is now requested (guarded, permission-denial safe) from the PLAY gesture.
   Desktop has no tilt sensor — keyboard/tap steering is the desktop path
   (verified working).
6. **Low — touch steering ignored finger slides** across the screen midline
   (`touchSide` was only set on pointerdown). → Updated on pointermove.
   Verified on phone: holding the right side gives `touchSide = 1`.
7. **Low — height HUD written to the DOM every frame.** → Written only when
   the metre integer changes.

**Re-verification:** desktop + phone: load 449ms both, 0 page errors; platform
chain 289px ✓; keyboard steering accelerates (vx −112 after 0.4s hold) ✓;
phone touch-side steering ✓; pause/resume/mute/restart ✓ both viewports.

---

## FIXED vs COULD-NOT-FIX (escalation accounting)

- **Game 02 — findings 10, fixed 10, could-not-fix: none.**
- **Game 04 — findings 8, fixed 8, could-not-fix: none.**
  (Pause, mute and mid-game restart are counted as three of the eight.)
- **Game 05 — findings 7, fixed 7, could-not-fix: none.**
- **Game 06 — findings 7, fixed 7, could-not-fix: none.**
- **Game 07 — findings 5, fixed 5, could-not-fix: 1 design deviation, kept
  deliberately:** empty/off-beat taps do not break combo (genre-standard in
  Guitar Hero-style games). Not implemented because this is a kids' game for
  ages ~4–8: combo-breaking on stray taps punishes exactly the exploratory
  tapping the target audience does, and every other judgment (Perfect/Great/
  Miss grades, accuracy, S–C rank) already rewards accuracy. Changing it
  would degrade age-appropriateness, not quality.
- **Game 08 — findings 9, fixed 9, could-not-fix: none in-game.** (Tilt on
  desktop hardware is not a defect: no sensor exists; keyboard + touch
  steering are the supported desktop inputs and both verified.)

**Global could-not-fix (verification limit, not a game defect):** true
on-device FPS could not be measured in this environment — the audit VM was
shared with ~6 parallel workers (load 9–17, ~87 Chrome processes, software
rendering, browsers periodically OOM-killed). Baseline and fixed builds
measured identically under those conditions, and every functional check
(controls, pause, fail/win/restart flows, physics rules) was executed and
passed. A 60-second play on a real phone is the remaining check for absolute
frame rate; nothing in the code suggests a device-side problem (pooled
particles, capped dt, no per-frame allocations beyond pre-existing design,
and two per-frame DOM writes were removed by this pass).

**Observed, not counted as findings:** bounce/star particles in 08 are drawn
in screen space while the world scrolls (pre-existing, <0.6s lifetime,
visually negligible); crystal wobble in 04 advances per render frame
(cosmetic). Neither is reachable as a player complaint and both were left
untouched rather than risking render regressions.

**Deploy files changed (6, each byte-identical to its edited source; NOT
uploaded to GitHub):**
- `.deploy/fire-world/game-02-blaze-runner.html`
- `.deploy/fire-world/games/game-04-cinders-ice-rink-chaos.html`
- `.deploy/fire-world/games/game-05-lord-infernos-ballista-siege.html`
- `.deploy/fire-world/games/game-06-blazes-magma-bounce.html`
- `.deploy/fire-world/games/game-07-rukos-turbo-drift.html`
- `.deploy/fire-world/games/game-08-sizzles-spark-jump.html`
