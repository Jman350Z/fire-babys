# BOT UPDATE + RENAME 21/22 — Report (2026-10-12)

**Status: DONE, staged only — nothing uploaded.** All 12 changed files are staged in
`~/workspace/.deploy/` (repo-mirror paths, listed in `upload-list.txt`). Originals backed up in
`~/workspace/fire-babys-bot-update/backups/`. SPLASH was changed ONLY through its build system
(new patch `patches/028-hard-bots.js` + manifest entry, rebuilt with `src/build.py`; baseline
untouched, CSP regenerated, staged `play.html` is byte-identical to the build output). The 3D
game was changed in its canonical rebuild source and passed
`~/workspace/fire-babys-3d-rebuild/pre-deploy-check.sh` (ALL CHECKS PASSED) before staging.

---

## JOB 2 — RENAMES (done first, it's short)

Verified gameplay myself: game 21 is a **jigsaw puzzle** (drag pieces into glowing outlined
slots, snap-in, timer score) and game 22 is a **tap game** (tap falling magma blocks before
they hit the lava; don't tap friendly ice blocks; golden blocks = 5x). New display names
(file names, slugs, URLs **unchanged**):

- **Game 21 → "Sizzle's Puzzle Snap"**
- **Game 22 → "Magma Tap Smash"**

Updated everywhere the old names appeared (grep of the full deploy tree for
"Sizzle's Target Pop" / "Magma Block Breaker" now returns **0 hits**):

| Place | Change |
|---|---|
| `fire-world/games/game-21-sizzles-target-pop.html` | `<title>` + `<h1>` → Sizzle's Puzzle Snap (🧩 kept) |
| `fire-world/games/game-22-magma-block-breaker.html` | `<title>` + `<h1>` → Magma Tap Smash (emoji 🧱→👆, it's a tap game) |
| `fire-world.html` | both card `<h3>` names; **also fixed game 22's card description** — it wrongly described a color-gate bounce game; now describes the actual tap game |
| `play-all.html` | both game-list entries; game 22's mechanic tag "Color switch timing"→"Tap reflex", emoji 🎨→👆 (game 21's tag "Jigsaw puzzle" was already right) |

Checked and clean (no occurrences): arcade.html, voting.js, characters.html, index.html,
history.html.

---

## JOB 1 — BOT UPDATE (Jeff's order: bots play the game, at hard level)

### SPLASH / play.html — VS-CPU army (new patch 028-hard-bots.js)
- **Before:** the CPU army spawned as a *random composition at random positions* (x random,
  y 240–400). Units used baseline targeting only (nearest / role-dives), no formation, no
  focus fire, ranged units stood still and got run over. No difficulty concept at all.
- **Now (always hard — there is no selector in SPLASH):**
  1. **Formation:** every CPU army deploys in role rows — guardians/boss front (y≈396),
     brawlers mid (y≈326), archers/pyros back (y≈256), centered on the castle gate.
  2. **Focus fire:** every ~0.16s each CPU unit re-evaluates and switches to the weakest
     (lowest HP-fraction) visible player unit within 380px when it's a clearly better kill.
  3. **Finish the hero:** a player hero under 55% HP within 320px gets piled on.
  4. **Kiting:** CPU archers/pyros back straight away from melee attackers inside 55% of
     their range (at 95% of their move speed — they can still be cornered/caught), and stop
     retreating to finish a target that's almost dead.
- Fair-hard: uses only visible state (positions/HP), respects taunts, never touches catch
  mode (patch 025 units untouched), fails open (any error = baseline behavior).
- **Verification (headless A/B vs the old build, scripted scenarios driving the real sim):**
  formation row means NEW tank 390 / dps 325 / ranged 255 (ordered) vs OLD 322/302/333
  (random mush); focus test — NEW bot killed the 30%-HP archer first (full-HP guardian
  untouched at 150) vs OLD bot ground on the nearest guardian (wounded archer never touched);
  hero test — NEW bot archer targeted the 40%-HP hero (hero HP 77→60) vs OLD never engaged
  the hero; kite test — NEW archer kited a brawler for 2s and killed it **without taking a
  single hit**, OLD archer stood still and died in ~1.5s.

### 3D game / 3d.html — multiplayer backfill bots, catch bots, SP foes & rivals
- **MP versus bots (`mpBotTick`/`mpBotHits`) — Before:** code literally commented "medium
  difficulty pacing": attack every 0.9–1.8s, move speed 5.2 vs player 7.5, straight-line
  chases, 20% block chance. **Now (hard):** attack every 0.55–0.90s, move speed 7.0 (still
  under the player's 7.5 — fair), **strafing** approach (perpendicular weave while closing),
  45% reactive blocks (0.8s). SPLASH/catch-mode bots (the 3D game's catch mode, incl. the
  auto-started SPLASH lobby): chase/rescue speed 5.2→7.0 (× slow-zone factor unchanged);
  their rescue/carry/hunt decision-making was already complete.
- **Single-player foes — Before:** wild foes speed 3.4–4.2 (heroes 3.8–5.4), attack cd 1.4s,
  always hit the nearest hero. **Now:** speed 4.4–4.9, attack cd 1.05s, and **focus fire** —
  foes finish the weakest hero within 16 units (new `foePickTarget`), else nearest as
  before. Tournament/SPLASH-mode rivals: speed 4.2→5.0. (The 3D game has no difficulty
  selector; bots are simply hard, per the order.)
- **Verification:** unit tests executing the *actual shipped functions* extracted from the
  staged file (harness in `work/test-3d-units.js`): bot closes 6.99 units/s chasing (cap
  respected), 14 attacks in 10s in range (old pacing ≈ 6), block rate measured 45%,
  catch bot closes 7.0 units/s, foePickTarget picks the 30%-HP hero over a full-HP hero
  3× closer and falls back to nearest when nobody is weakened — **all passed**. Full-page
  boot check: renders, zero page errors.

### Game 26 — Pyra Paddle Battle (Pong vs CPU paddle) — HAS selector, now defaults to HARD
- **Before:** default difficulty was Easy (of Easy/Medium/Hard). The Hard AI predicted the
  ball with a straight line and **ignored the ball's spin curve**, with aiSpeed 480 / aim
  error ±18 — heavy curve balls beat it by ~68px at the paddle plane (a hair from a clean
  miss, paddle-edge contact).
- **Now:** default = Hard (selector still fully works; the Hard button is the pre-selected
  one). Hard AI upgraded: paddle speed 480→560, error ±18→±8, and it **simulates the ball's
  real trajectory** (wall bounces + spin curve, the game's own physics) to the contact
  plane, plus it **aims its returns away from the player's paddle** by offsetting the
  contact point — with a guard so the aim offset can never cause a whiff.
- **Verification (scripted serve trials, both builds on Hard):** on ±600-spin serves from
  far off-line, NEW makes solid aimed contact (38px error incl. its deliberate ~30px aim
  offset; 7–8px on a 900-spin serve) vs OLD's 68px edge-grazes. In a 200-second rally
  against a perfect-tracking player-bot, the NEW AI conceded **0 goals** and scored 2
  (it plays, defends, and scores). Note: a full-match A/B score wasn't used as evidence —
  difficulty also changes ball speed in this game, which confounds match scores.

### Game 28 — Thermal Tug-of-War (mash vs CPU) — HAS selector, now defaults to HARD
- **Before:** default Easy; the CPU pull rate at Hard (4.2 + round scaling) is the game's
  own hard design and was unreachable by default. **Now:** default = Hard (selector intact,
  Hard button pre-selected). AI rates unchanged — 4.2 *is* the game's hardest setting.
- **Verification:** fresh load shows diff=2 + Hard button selected; with zero player input
  the CPU alone drags the rope to −0.70 (most of the way to its win line) in 4 seconds.

### Game 06 — Blaze's Magma Bounce (sumo ring vs golem bots)
- **Before:** golems did play (charge/dash/ring-edge sense) but at soft settings: dash
  decision chance 0.5→0.86 by round, dash cooldown 1.5–3.5s, dashes aimed at the target's
  *current* position, and the Magma Surge orb was player-only — golems ignored it.
- **Now (hard):** dash chance 0.78→0.95 by round, cooldown 0.8–1.7s, dash range 200→230,
  dashes **lead the target** (aim where the opponent is heading). Golems now **contest the
  Surge orb**: the closest golem breaks off and takes it unless the player is about to grab
  it; a surged golem gets the same +25% bump power, ×1.4 drive, faster speed cap (660) for
  5s ("🌋 GOLEM SURGE!"). Player's own surge path unchanged.
- **Verification (20s round-3 sim vs a position-holding player-bot):** foe dash rate
  **1.15/s NEW vs 0.20/s OLD**; orb scenario — NEW golem beelines the orb and takes the
  Surge, OLD golems never touch it in the same setup.

### Game 24 — Ash Storm Survivor (survivors-like)
- The enemies here are pressure waves, but the **dasher** is a true decision-maker.
  **Before:** when its dash triggered it snapshot-aimed at the player's *current* position
  — trivially sidestepped by any moving player. **Now:** dashers **lead the player**
  (aim at position + velocity × flight-time factor, from visible motion only). Chasers
  also got a weaving fan-out offset so they pressure from a spread instead of stacking
  into one blob. Base stats unchanged (they already scale with survival time).
- **Verification:** scripted dash at a player sprinting perpendicular — NEW dash angle
  −26.4° (lead aim ≈ −28°) vs OLD −49.9° (snapshot aim ≈ −51°): the new dash goes where
  the player is going.

### Tristan's Dark Knight Rescue + Trinity's Holy Lightning Rescue (bosses)
- The patrol sentinels in these games are scripted hazards (fixed patrol routes, contact
  damage — they make no decisions; left as designed). The **bosses** are the bots:
  - **Tristan — Dark Knight (boss):** chase speed cap 120→175, slam cadence 2.0s→1.6s,
    trigger range 200→260, projectile 300→340 and **led** (aimed at the player's heading).
  - **Trinity — Storm Warden (boss):** chase cap 100→160, cadence 2.2s→1.8s, and the
    crystal shard fan is now **aimed at the player** (fan centered on the player's
    direction, still dodgeable through the gaps) instead of a fixed leftward fan that
    fired the same way regardless of where Trinity stood.
- **Verification:** boss chase velocity after 1s: 152 (cap 175) vs 104 (cap 120) Tristan;
  139 (cap 160) vs 87 (cap 100) Trinity. Tristan fires at 200px range (old boss doesn't
  fire at all at that range) with vx=340, atkT reset 1.6. Trinity's fan measured centered
  at −90° — exactly on the player standing above her — vs the old fixed spread.

### Inventoried and deliberately NOT changed (not bots, or nothing to upgrade)
- **Tower-defense games (13/31/35) and game 45's castle marchers:** creeps follow a fixed
  path and make no decisions — enemies/waves, not bots (per the brief's own definition).
- **Game 38 ghost car:** it's the player's own best-lap replay ("race against yourself"),
  render-only; making it "play hard" would mean falsifying the player's own record.
- **Solo racers/runners (02/07/14/17/30/42/47/49/52/55):** no rival/opponent exists in
  these games at all — there is no bot to update.
- **Game 05:** rock storms are environmental hazards; nothing returns fire and there is
  no opponent entity.
- **Puzzles/memory/sorting/gallery games (incl. renamed 21):** no opponent by design.
- Only games 26 and 28 have player-facing difficulty selectors on the whole site; both
  still work exactly as before — only the default changed to Hard.

### Could-not-fix / plain statements
- Nothing on the bot list had to be left un-fixed. One honest caveat: SPLASH's CPU still
  fields a *random army composition* each stage (that's the game's design — the player
  drafts against an unknown army); patch 028 makes whatever army it gets play in
  formation, focus fire, and kite, but it does not draft counter-compositions.
- All bot upgrades use only information a human player could see (positions, HP,
  velocity). No stat inflation beyond each game's own hardest settings; the only numbers
  raised past a game's previous "hard" are reaction/decision quality and, in the 3D game
  and rescues, speeds that stay **below the player's own** caps.
- Phone performance: all additions are tiny per-frame math (SPLASH: per-unit think every
  ~0.16s staggered; game 26: a ≤480-step ball simulation once per frame on Hard only;
  everything else is a few arithmetic ops). No new assets, no new network calls.

---

## Staged files (12) — see upload-list.txt
`play.html` (via build system, patch 028), `3d.html` (pre-deploy check passed),
`fire-world.html`, `play-all.html`, games 06/21/22/24/26/28, both rescue-game index files.

## Verification summary
- Node syntax check: every edited file's scripts pass.
- Headless-browser A/B harnesses (kept in `work/`): SPLASH scenario suite, per-game
  injected test suite, game-26 serve/rally trials, 3D shipped-function unit tests.
- Final sweep: all 11 changed HTML pages + hubs load with **zero console/page errors**;
  SPLASH CSP intact (scripts execute, patches active); 3D boots and renders clean.
