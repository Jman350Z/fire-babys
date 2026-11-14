# Fire World Fixes 1–5 — Jeff's Design Overhaul Orders (2026-10-13)

Jeff played the first five Fire World games and gave per-game design notes, plus one
program-wide order: **a unique badass gamer-music track for EACH game**. All five games
were changed exactly to those notes, verified with a first-time-visitor harness
(Playwright, desktop 1280×800 + phone 390×844, local server with production
auth-gate.js/rating.js): **65/65 checks passed, twice in a row**, 0 page errors on
every game on both viewports. Staged in `~/workspace/.deploy/` — **NOT uploaded**
(main agent ships). Changed files: see `upload-list.txt` (5 files).
Backups of every original: `backups/`. Harness: `verify.py`, results:
`verify-results.json`, screenshots: `shots/`.

**Music system (all 5 games):** each game got its OWN original track, synthesized
in code with Web Audio (Fire Babys pillar — no audio files, nothing copyrighted).
One compact lookahead scheduler per game (42 ms interval, ~0.14 s lookahead — no
per-frame work); music starts only after the first user interaction (autoplay
policy), freezes when the game's existing mute is on (and when paused), and uses
each game's existing `tone()`/`noise()` voices. Details per game below.

---

## 1) Slingshot Cascade — 💀 SKELETONS added (Jeff: "bad guys to crush just like Angry Birds")

- 3–5 skeletons per level (counts by level: 3,4,4,4,4,4,4,4,5,4 = 41 total), perched
  ON the crystal towers, beams and crystals in all 10 rounds — skull + ribcage +
  toothy-grin code art, gentle idle bob.
- **Crush rules (all verified live):** a skeleton is smashed by a direct hero hit, by
  a moving/falling block landing on it, by standing-support collapse (its block is
  destroyed → it falls; a long fall is fatal, a short drop it survives and lands),
  by Blaze's Explosion (r ≤ 130) and Aqua's Splash (r ≤ 100), and Ruko's Tornado
  tosses them (fall damage finishes them). Sparky's Magnet works indirectly — it
  drags blocks into them.
- Scoring: **+500 per skeleton**, bone-shard burst + "💀 SKELETON SMASHED +500"
  floater, **+500 bonus** when a level's skeletons are all smashed. New HUD pill
  `💀 smashed/total`; the level-clear screen reports "💀 Skeletons smashed: X/Y".
- Win condition unchanged (destroy every block), so all 10 rounds stay completable
  exactly as before, **with and without hero specials** (block layouts/shots/specials
  untouched — diff is additive around them). Hero picker + specials byte-identical
  in behavior; specials re-verified firing mid-flight.
- **Music — "Tower Toppler":** 112 BPM, playful battle march. Bouncy square-wave
  bass over an Am–F–C–G progression, triangle-wave lead melody, marching kick +
  noise snare + hats.

## 2) Ruko's Panic Dash — COMPLETE OVERHAUL (Jeff: "completely sucks, redo it")

Same title, URL, hero (Ruko, same approved code-art), parental math gate,
pause/mute/**restart** (incl. the fb-cycle2 restart-cluster contract), rating.js,
auth gate, premium dark theme. Everything else is a new game:

**"VOLCANO ESCAPE" — a 20-level 3-lane dash with a lava wave chasing Ruko.**
- **Goal:** reach the 🏁 finish banner before the lava wave catches you. The wave
  constantly creeps closer; running cleanly outruns it slowly, ⭐ ember stars push
  it back (+2 m each), stumbling on an obstacle lets it surge (−7 m). If it touches
  Ruko → run over. The wave is drawn as a lava band at the bottom of the screen
  that grows taller/flamier the closer it gets, with a warning banner under 9 m.
- **Controls:** swipe / ◀ ▶ lanes, ▲ jump, ▼ slide (tap upper/lower half on touch),
  plus the new **🌪️ TORNADO DASH** — Space / Shift / X, double-tap, double-click,
  or the on-screen DASH button. Dash = 0.45 s of invulnerable spinning that
  **smashes through any obstacle (+150)**, 2.5 s cooldown (meter + button state).
- **Obstacles:** lava pools (jump), rocks (jump/dodge), tall pillars (slide/dodge),
  and from L6 **Bone Barricades** — dash or dodge only (they're labelled "DASH!").
  Spawn logic guarantees a solvable board: never all 3 lanes blocked in a band.
- **Health:** 3 hearts per level; a hit costs 1 heart (+1.4 s invulnerability);
  0 hearts = wiped out. Near-miss and star combos carry over from the old game.
- **Progression:** 20 levels, all selectable from the title (gate first). Goal
  distance 260 m → 735 m, base speed 430 → 696, spawn pressure and wave creep
  scale per level; two-obstacle rows from L4, barricades from L6. Finish stars:
  3♥ left = ★★★, 2♥ = ★★, 1♥ = ★ (+200/heart bonus). Score carries across
  NEXT LEVEL; retries restore the level-start score (no farming).
- Verified: all 20 levels build and start, dash triggers + smashes a barricade,
  hits cost hearts, finish → clear → next level advances, wave game-over overlay,
  restart cluster resets the current level.
- **Music — "Panic at 154":** 154 BPM, D minor chase energy. Relentless ostinato
  saw bass, square-wave arpeggio lead, four-on-the-floor kick, snare + driving hats.

## 3) Blaze Runner — Jeff: "was fun" + 4 additions

- **Double jump:** tap/click/Space again mid-air for a second jump (also a new ⬆
  touch button). Title screen now teaches it.
- **Random hazard birds:** grumpy blue enemy birds (angry brow, NOT Fire Babys)
  swoop in at random heights/intervals. Running into one costs **1 of 3 hearts**
  (new heart HUD + 1.6 s invulnerability blink); losing all 3 ends the run with a
  bird-specific game-over message. Rocketing through a bird bonks it away (+25).
  (The game had no health system before; hearts are the damage rule the birds use.
  Lava-gap falls still end the run instantly, as before.)
- **Step platforms:** stone steps scroll with the world — land on top, run along,
  jump off the edge; several are placed bridging lava gaps, giving a second way
  across. Full platform physics: landing, riding, and falling when the step ends
  or a gap opens beneath you; falling into lava is no longer instant — you fall,
  and a double jump can still save you.
- **SECRET rocket mode (undocumented in-game):** *hold* the jump button/key for
  more than ~0.22 s and Blaze ignites a rocket — sustained climb with a flame cone
  and a fuel gauge that appears once discovered. **Fair limit:** 100 fuel, drains
  ~36/s in flight (≈2.8 s max burn), refills only while running on the ground;
  hits the ceiling of the playfield; birds can't hurt you mid-rocket (you bonk
  them instead). It cannot skip the run: fuel starvation drops you back into the
  normal jump game, and gaps still kill.
- **Music — "Ember Gallop":** 134 BPM, E minor. Galloping square bass, heroic
  triangle pentatonic lead, steady kick — a driving runner beat.

## 4) Cinder's Ice Rink Chaos — chain explosions (Jeff: "when the ice hits a diamond it should explode and hit nearby diamonds")

- **Every** diamond (crystal target) now explodes when smashed: blast radius
  100 px destroys neighbouring diamonds, and each of those explodes too after a
  0.09 s delay — full cascading chain reactions with expanding blast rings,
  explosion sound, screen trauma and chain particles.
- Scoring stays coherent: the direct ice hit keeps its normal combo points
  (100 × combo multiplier); every **chain** kill pays a flat **+50** with a
  "CHAIN +50" floater (this replaces — and generalizes — the old Ember-Bomb-only
  splash, which paid the same +50). The Ember Bomb Block now has the **biggest**
  blast: its direct hit uses radius 130 and starts the same chains.
- Fail-safe: the out-of-blocks fail check waits until all queued explosions have
  resolved, so a late chain can still clear the level. Title copy updated to
  teach the chain rule. Nothing else changed (levels, shots, physics identical) —
  verified: one L3 hit cascaded to 3 diamonds for exactly the expected score, and
  one bomb hit cleared all 3 L1 diamonds.
- **Music — "Crystal Cascade":** 122 BPM. Sparkling sine-bell arpeggios (with a
  harmonic shimmer voice) over a soft pulsing triangle bass, one soft kick per
  half-bar and an 8th-note shaker — icy and playful, quietly intense.

## 5) Lord Inferno's Ballista Siege — ships, pilots, giant boss ships, home world (Jeff: "I love the most so far")

Reskin + enemy/boss redesign only — ballista mechanics, waves, power-ups, HP and
level structure unchanged; every level re-verified completable through the boss.

- **The "weird circles" are gone.** Every enemy is now a **flying ship with a
  little bad-guy pilot sitting in it** (round head, angry brows, frown, themed
  hat — cap/crown/horns/hood/turban — drawn in an open cockpit dome):
  - *Scout Ship* (was "rock"): little saucer, blinking rim lights, pilot on top.
  - *Dart Ship* (was "dart"): sleek pointed raider, hooded pilot, engine flame.
  - *Hauler Ship* (was "tank"): bulky twin-pod freighter, capped pilot up front.
  - Boss *fire-bolts* remain projectiles (they're shots, not enemies).
- **Bosses are GIANT ships** — wide hull, wing cannons, twin engine flames, a big
  glass dome with the **angry boss character sitting inside**, a name tag and HP
  bar. **Every boss is different** — 10 named captains (Captain Cinderclaw,
  Admiral Iceberg, Commodore Bubbles, General Sandstorm, Baron von Volt, Colonel
  Mossback, Duchess Gemwrath, Warlord Magmar, Marshal Ashfall, and finally
  **LORD INFERNO** himself), each with distinct hull/accent colors, pilot skin
  and hat.
- **Every boss fights differently** (verified bolt-for-bolt): L1 fan, L2 wide fan,
  L3 aimed shots that track the player, L4 spiral, L5 fan+aimed alternating,
  L6 aimed triple-bursts, L7 fast spiral, L8 ring burst + fan, L9 aimed+spiral,
  L10 Lord Inferno rotates fan/aimed/spiral/ring.
- **Setting: the Fire Babys home world, not outer space.** The starfield is
  deleted. Each level flies over a **different kingdom** with its own sky
  gradient, scrolling silhouette scenery (peaks / spires / trees / waves / dunes)
  and fleet livery: Volcano Slopes, Frostbite Kingdom, Bubble Bay Kingdom,
  Cinder Desert, Storm Spire Kingdom, Ember Forest, Crystal Rim, Lava Fields,
  Ashen Wastes, and Lord Inferno's Keep — with the great volcano (all five
  kingdoms ring it) scrolling on the horizon and ember drift throughout. The
  boss intro now announces the captain's name and the kingdom.
- **Music — "Siege of the Ember Keep":** 98 BPM, D minor boss-battle weight.
  Low sawtooth drones, detuned war-pads each bar, a dramatic square-wave war-horn
  lead, syncopated war-drum kicks and noise snares.

---

## Verification evidence (verify.py — 65 checks, run twice, 65/65 both runs)

- All 5 games: boot desktop + phone with **0 page errors**; parental gate flow,
  pause/mute/restart, rating.js and auth-gate includes intact everywhere.
- Slingshot: skeleton counts per level; direct-hit crush; falling-block crush;
  support-destroyed fall (survives short drop); special fires; music on/BPM.
- Ruko: 20 level buttons; gate→play; dash + barricade smash (+150); heart loss;
  all 20 goals 260→735 m; finish→clear→next; wave game-over; restart cluster.
- Blaze: double jump state machine; rocket fires on hold, fuel drains, rocket
  cuts out at 0 fuel; bird spawns; bird hit 3→2 hearts; platform landing
  (floorY == platform top, polled); last-heart bird death ends the run.
- Ice: chain cascade (1 hit → 3 diamonds, exact +50 chain scoring); bomb radius
  clears L1; all 10 levels build.
- Ballista: 10 unique kingdoms; 10 unique bosses; boss spawns L1–L10; pattern
  bolt counts exact (4/6/2/3/8/8); L3 aimed bolts converge on the player; wave-3
  boss summons in live play and killing it clears the level.
- **FPS (SwiftShader harness — defect evidence, not device guarantees):**
  in-play Slingshot 52.7, Ruko 31.7, Blaze 52, Ice 37, Ballista 30.7.
  Interleaved A/B vs the pre-change backups: Blaze OLD ≈55.0 vs NEW ≈53.7;
  Ballista OLD 44.7/54 vs NEW 44.3/60 — **no regression** from these changes
  (VM drift dominates; new drawing uses gradients/flat shapes, no added
  per-frame shadowBlur — the one pre-existing shadowBlur in Ballista's player
  render is untouched from the original).
- Screenshots (`shots/`): skeletons on Slingshot L4 towers; Ruko's tornado smash;
  Blaze rocketing past a bird over a lava-bridging step; L3 diamond field;
  Lord Inferno's boss ship + scout saucers over the volcano kingdom.

## Scope / integrity

- Diff vs backups is confined to the five files in `upload-list.txt`
  (changed-line counts: Slingshot 152, Ruko 349 — the ordered rebuild, Blaze 138,
  Ice 89, Ballista 270). Slingshot's `main.js` (legacy, unreferenced by the page)
  is byte-identical and NOT in the upload list. No other site files touched.
- Brand rules held: Fire Babys are never harmed or mocked (Ruko's "ouch" is a
  stumble with hearts, same as sibling games; Blaze's bird game-over is a tumble,
  not an injury); Babys keep their approved code-art (Ruko/Blaze/hero art
  unchanged); the no-beaks/wings rule binds the Babys — game 3's birds are enemy
  wildlife per Jeff's direct order and are drawn as plain enemy birds.
- One judgment call to flag: in Ice Rink, Jeff said "diamonds" — the game's
  targets are its crystal/diamond targets, so chains apply to them (the only
  diamonds in the game). In Blaze Runner, "take damage per the game's existing
  health rules" — the game had none, so birds use the new 3-heart system shared
  with the fall rules above.
