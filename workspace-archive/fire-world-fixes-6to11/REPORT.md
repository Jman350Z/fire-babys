# Fire World games 6–11 redo + sitewide voting removal — 2026-10-14

## Jeff's orders
- "Game 6 to 11.. all need redone.. they all suck" (2026-10-14 ~13:54 PDT) — full redos, same titles/URLs/heroes/shell.
- "I also want you to take out the voting system in the game play of games" (2026-10-14 ~14:22 PDT).

## The six redos (all-new games inside the kept shells)
- 06 Blaze's Magma Bounce — vertical bubble-bounce climber (was a sumo bumper reskin). 12 levels.
- 07 Ruko's Turbo Drift — winding-track drift racer with boost slingshots (was a rhythm-tap reskin; Ruko never drawn — now stars in his kart). 10 stages.
- 08 Sizzle's Spark Jump — precision charge-jump platformer (was a doodle-jump reskin naming the wrong heroes). 15 levels.
- 09 Ember Cascade — falling-ember match puzzle with chain cascades (was a tower-defense reskin). 12 levels.
- 10 Caldera Climb — ledge climber with steam vents + falling rocks (was an emoji match-3). 10 levels.
- 11 Magma Trench Dodge — telegraphed 3-lane geyser dodge with shield pickups (was a one-tap runner with instant-death geysers). 12 levels.
All keep: title/URL, sign-in gate, math gate, pause/mute/restart, shell theme, approved hero code-art. No music added (not ordered for these). Babys never harmed — misses are playful (soaked/dizzy/spin-out).

## Voting removal
- 64 files: rating.js include stripped (all Fire World games, standalones, 3D, the six builds; canonical 3D source too).
- play.html: Patch 032 (star rating) disabled via patches/manifest.json kill switch + rebuilt with src/build.py. Determinism proof: rebuilding with 032 ON reproduces the live play.html byte-for-byte (528,499 B), so the OFF build differs only by the removed widget. Boot-tested: 0 errors, no rating pill.
- Spot + harness checks: no rating.js request, no "Rate this game"/"How fun was this game" UI anywhere.

## Verification (independent harness, real visitor flow, desktop + phone)
Final tallies: 06: 25/25 · 07: 25/25 · 08: 24/24 · 09: 24/24 · 10: 25/25 · 11: 25/25 — boots with 0 page errors, sign-in gate blocks signed-out visitors, math gate passes, games start and animate, pause/mute/restart work, keyboard/touch safe, FPS 51–60 (SwiftShader).
Harness lessons that mattered: the auth gate needs a returning-player seed (localStorage token + cached user, gate's own offline fallback); several early "failures" were harness artifacts (gate order, idle game-over overlays, stage-intro/level-picker overlays) — each was diagnosed against the live DOM before touching any game.
One real fix: game-10 rendered at 4–21 FPS — 13 per-frame shadowBlur calls (the most expensive canvas op). Zeroing them in the draw paths (glow look kept via the gradient fills) took it to 55.7 desktop / 59 phone.

## Ship
59 files (upload-list.txt): 52 in fire-world/games/ (46 voting-swept + 6 redos), game-02, 4 standalone index pages, play.html, 3d.html — via signed-in GitHub web UI to Jman350Z/fire-babys, then live-verified.
