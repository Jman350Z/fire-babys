# GAMER CHECK — Master Report
**Date:** 2026-10-12 · **Scope:** all 59 playable entries (SPLASH + 3D + game-02 + games 04–55 + 4 Godot exports), site systems, security · **Status:** complete, staged in `~/workspace/.deploy/`, NOT uploaded (main agent uploads via GitHub web-UI route using `upload-list.txt`)

## How it was done
17 worker passes (11 game batches, flagship batch, systems, security audit, security fixes, leftover-fix pass, game-10 pass, 3D CSP pass) plus a coordinator end-phase (scope-guard verification, referrer-policy header pass, final sweep). Every game was played in Playwright on desktop (1280×800) and phone (390×844) viewports; every fix was re-played and required 0 page errors. Per-batch detail: `findings/batch-F.md`, `batch-02.md` … `batch-10.md`, `systems.md`, `security.md`, `security-fixes.md`, `leftover-fix.md`. Originals of everything changed are backed up under `backups/` (per-batch folders + `security-stray/`, `security-mp/`, `headers/`).

Safety rails held throughout: SPLASH changed only through build sources + build.py (new patch 027); 3D only through rebuild sources with `pre-deploy-check.sh` passing; characters gold, kid-safe, art bible intact; **scope guard verified at the end of the run — SPLASH patches 003 (creator), 015 (profile), 021 (auth-gate) untouched (mtimes predate the run), `.deploy/auth-gate.js` byte-identical to its canonical source and untouched.**

## Totals
| Area | Findings | Fixed | Could-not-fix |
|---|---|---|---|
| Games 02–55 (batches 02–10) | 368 | 366 | 2 (games 21/22 display names — Jeff's brand call) |
| Flagships SPLASH + 3D (batch F) | 11 fix items landed | 11 | 6 noted items (see ledger) |
| Systems (Phase C) | 6 numbered findings (F1–F6) + MP live check | 3 | 3 (all reserved/blocked — see ledger) |
| Security (Phase D) | 7 stray files, 3 multiplayer-worker holes, 5 auth-worker items, header/CSP gaps | strays removed, MP holes fixed in source, referrer meta on 67 pages, 3D hash-CSP | MP deploy (Cloudflare), auth-worker items (profile update), real HTTP headers (Cloudflare) |
| "Fix it all" escalation pass | 6 items reclassified from could-not-fix | 6 | 0 |
| Overhaul leftovers (7 cosmetic) | 7 | 7 — all cleared inside the batches | 0 |

## Headline fixes (the ones players would have screamed about)
- **Game 12 (pinball): the ball could never enter the playfield** — the plunger lane had no exit geometry; every launch drained. Rebuilt, proven by simulation before/after.
- **Game 30: sliding could never clear a barrier** (full-height hitbox) — the slide move was decorative and the game unfinishable by its own rules. Barriers rebuilt as overhead bars.
- **Game 46: jump physics made legitimate hops land 112–182px *lower*** — levels were unclimbable except by a tap-spam exploit. Retuned; a legit-play bot now climbs.
- **Game 54: hop apex (120px) was smaller than the gaps (134–182px)** — stuck at 0m forever. Fixed.
- **Game 04: the fail state was unreachable** (shots = blocks + 1) — soft-locked sessions. Fixed.
- **Game 53: a resting flame never terminated the game** — soft-lock. Stuck detection + retry added.
- **3D: the pause menu did not freeze single-player** (closure bug) — the flagship's pause was fake. Fixed, plus a persisted mute, Esc/P pause, auto-pause on tab-hide.
- **SPLASH: no pause, no keyboard control, no mid-fight restart at all** — added via patch 027 through the build path; CSP integrity re-verified (27/27 hashes, runtime checks passed).
- **Game 21 phone performance: 9.8 → 55.7 FPS** (per-frame gradient/shadow rendering replaced with pre-rendered blits). Per-frame `shadowBlur` ember effects removed across games 40–44 for the same reason.
- **Almost no game on the site had pause or mute.** A verified pause/mute/restart cluster was added nearly everywhere — the single biggest gamer complaint class, now closed site-wide.
- **Game 02 ran ~2× too fast on 120Hz screens** (frame-dependent physics) and shipped with **no sound at all**. Both fixed.

## Per-batch results
| Batch | Games | Findings | Fixed | Notes |
|---|---|---|---|---|
| F | SPLASH, 3D | 11 items | 11 | Patch 027 (build path); 3D pause-freeze critical fixed; guarded items audit-only |
| 02 | 02, 04–08 | 46 | 46 | Game 04 fail-state soft-lock; game 02 120Hz physics + first SFX |
| 03 | 09–14 | 47 | 47 | Game 12 pinball lane critical; game 10 dead-board reshuffle (+ cascade-pause in escalation pass) |
| 04 | 15–20 | 33 | 33 | Game 18 wall-bump life drain; game 19 bomb now touch-usable |
| 05 | 21–26 | 31 | 31 | Game 21 FPS 9.8→55.7; 2 display-name items → Jeff decision |
| 06 | 27–32 | 40 | 40 | Game 30 slide critical; game 31 selling added in escalation pass |
| 07 | 33–38 | 27 (+2 genre gaps) | 27 (+2) | Game 35 economy + game 38 ghost car added in escalation pass |
| 08 | 39–44 | 39 | 39 | Game 41 corner-clipping (overhaul leftover) fixed diagonally; slide + tilt in escalation pass |
| 09 | 45–50 | 33 | 33 | Game 46 jump-physics critical |
| 10 | 51–55 + 4 Godot exports | 32 | 32 | Games 53/54 criticals; exports boot clean, 0 defects |
| Leftover-fix | 31, 35, 38, 40, 41 | 5 | 5 | See escalation pass below |
| Game-10 pass | 10 | 1 | 1 | Mid-cascade pause freeze, 38/38 checks incl. negative control |
| Headers (coordinator) | 66 pages | — | — | Referrer-policy meta added; all source/deploy pairs byte-identical |
| 3D CSP pass | 3D | 1 | 1 | Hash-based CSP landed, fully verified |

## Cross-reference pass (genre benchmarks)
Method: for each game, the real-world genre exemplar was identified and its 2–3 defining *style mechanics* checked against ours; shortfalls were upgraded in 100% original Fire Babys form (mechanics only — no assets, art, names, layouts, music, or code copied). Verdicts: **matches** = already at genre standard; **upgraded** = gap found and closed this run.

| Game | Reference / genre | Verdict — what changed |
|---|---|---|
| SPLASH (play.html) | Plants vs. Zombies / Kingdom Rush — lane defense | Upgraded — pause, keyboard hero control, mid-fight restart, ≥44px targets added (patch 027) |
| 3D (3d.html) | Fall Guys — 3D party platformer (Jeff's locked art direction) | Upgraded — real pause freeze, persisted mute, tab-hide auto-pause |
| 02 Blaze Runner | Chrome Dino / Canabalt — one-button runner | Upgraded — dt-normalized physics, SFX, muted-until-gesture audio |
| 04 Cinder's Ice Rink Chaos | Angry Birds — slingshot physics puzzler | Upgraded — fail state made reachable; dead SFX wired |
| 05 Lord Inferno's Ballista Siege | Sky Force Reloaded / Raiden — vertical shmup | Upgraded — pause/mute cluster, balance pass |
| 06 Blaze's Magma Bounce | Gang Beasts — bumper-sumo arena | Upgraded — hold-to-cheat exploit closed, stalemate escalation |
| 07 Ruko's Turbo Drift | Guitar Hero / FNF — 4-lane rhythm | Matches (one documented deviation kept for the 4–8yo audience: empty taps don't break combo; accuracy still graded — flagged for Jeff in the ledger) |
| 08 Sizzle's Spark Jump | Doodle Jump — vertical jumper | Upgraded — luck-gated spawns chained to ≤330px; iOS tilt permission from PLAY gesture |
| 09 Ember Cascade | Kingdom Rush / Bloons TD 6 — tower defense | Upgraded — snap-radius + upgrade clarity fixes |
| 10 Caldera Climb | Candy Crush Saga — match-3 | Upgraded — dead-board auto-reshuffle, idle hint, keyboard play, pause that truly freezes cascades |
| 11 Magma Trench Dodge | Geometry Dash / Subway Surfers — one-touch runner | Upgraded — near-miss reward feedback, pause/mute/restart |
| 12 Volcanic Pinball | Pinball FX — video pinball | Upgraded — launch lane rebuilt (ball can enter playfield); dead-flipper input unblocked |
| 13 Pyra Prime Defense | Breakout / Arkanoid — paddle & bricks | Upgraded — level size no longer depends on screen width; smooth held-key paddle |
| 14 Sparky Speedway | Snake | Upgraded — phone canvas DPR sizing fixed; pause/mute/restart |
| 15 Cinder's Melt Down | Concentration — memory match | Upgraded — genre-standard 1.6s board preview added |
| 16 Inferno Drop | Whack-a-Mole | Matches — shared controls/perf fixed only |
| 17 Flame Sprint 2D | Stack / Tower Bloxx — timing stacker | Upgraded — perfect-drop celebration now visual (particles), not sound-only |
| 18 Blaze's Thermal Run | Grid-maze escape (Pac-Man lineage) | Upgraded — fair collision standard restored (no more wall-bump life drain) |
| 19 Ruko's Lava Leap | Puzzle Bobble / Bust-a-Move — bubble shooter | Upgraded — one-reflection aim guide + tap-to-arm bomb (was keyboard-only) |
| 20 Boulder's Fortress | Flappy Bird — one-tap dodger | Upgraded — hold-Space ceiling-pin exploit fixed; gentler gap ramp |
| 21 Sizzle's Target Pop | Kids' drag jigsaw (Ravensburger-style) | Upgraded — ghost preview added, scatter clamped on-screen. Title says "Target Pop" — Jeff's naming call (ledger) |
| 22 Magma Block Breaker | Fruit Ninja — tap/slice faller | Upgraded — visible combo-decay pressure + fair capped ramp. Name/genre mismatch — Jeff's call (ledger) |
| 23 Crater Catcher | Kaboom! — falling catcher | Upgraded — smooth held-key catcher at 560px/s |
| 24 Ash Storm Survivor | Vampire Survivors — arena survivor | Upgraded — damage numbers added (genre-standard hit readout) |
| 25 Lava Line Draw | Brain It On / Happy Glass — physics line-draw | Upgraded — stuck-ball detection 20s → 2.5s, 12s hard cap |
| 26 Pyra Paddle Battle | Pong — paddle battle | Upgraded — smooth held-key paddle; ball speed normalized across screens |
| 27 Ember Bounce 2D | Doodle Jump | Upgraded — leftover dead SFX path cleared; pause/mute |
| 28 Thermal Tug-of-War | Track & Field / Mario Party — button-mash tug-of-war | Upgraded — `sfx.round` overhaul leftover wired; multi-input mashing |
| 29 Blaze's Jump Quest | Super Mario Bros. — side-scrolling platformer | Upgraded — variable-height jump/stomp standards verified & tuned |
| 30 Ruko's Dash Blitz | Canabalt — 2D auto-runner | Upgraded — **critical:** slide now actually clears overhead barriers; 92px SLAM button for touch Anchor |
| 31 Boulder's Rampart | Kingdom Rush / Bloons TD — tower defense | Upgraded — tap-to-upgrade + long-press sell (70% refund) economy completed |
| 32 Cinder's Glide | Copter Game / Jetpack Joyride — hold-release flyer | Upgraded — smooth cave generation verified; pause/mute |
| 33 Inferno Aim | Moorhuhn / Crazy Chicken — shooting gallery | Upgraded — overhaul Low leftover cleared |
| 34 Spark Jump Arcade | Doodle Jump | Upgraded — overhaul Low leftover cleared |
| 35 Lava Moat Defense | Bloons TD 6 — tower defense | Upgraded — full manual economy: select/upgrade to Lv4/sell at 70%; veteran bonus capped; ⏩ + range rings kept |
| 36 Magma Drop Physics | Peggle — pachinko physics puzzler | Upgraded — dead leftover markup removed |
| 37 Volcanic Stack Smash | Stack (Ketchapp) — timing stacker | Upgraded — overhaul Low leftover cleared |
| 38 Fire Baby Rally | Mario Kart time-trial — kart racer | Upgraded — car spawn heading corrected (−π/2 → +π/2); **ghost car**: best-lap recording + translucent replay |
| 39 Caldera Bounce | Breakout / Arkanoid | Upgraded — per-frame shadowBlur removed (perf) |
| 40 Sizzle's Spark Run | Subway Surfers — endless runner | Upgraded — slide input + new overhead ember-banner obstacle that only sliding clears |
| 41 Blaze's Inferno Roll | Labyrinth — tilt maze | Upgraded — corner-clipping fixed (overhaul leftover); real DeviceOrientation tilt added beside drag+keys |
| 42 Ruko's Speed Trap | Cyclone (arcade) — reflex ring | Upgraded — shadowBlur perf pass |
| 43 Boulder's Blockade | Rush Hour — sliding-block puzzle | Upgraded — shadowBlur perf pass |
| 44 Cinder's Slide | 15-puzzle | Upgraded — shadowBlur perf pass |
| 45 Lord Inferno's Strike | Defend Your Castle — tap defense | Upgraded — pause/mute/restart cluster |
| 46 Magma Jump 2D | Ninja Jump — wall-jump climber | Upgraded — **critical:** jump physics retuned; legit play now climbs |
| 47 Pyra Prime Dash | Tunnel Rush — gate-threading runner | Upgraded — pause/mute/restart cluster |
| 48 Ash Heap Hero | Recycle Roundup — falling-item sorting | Upgraded — pause/mute/restart cluster |
| 49 Thermal Track | Operation-style steady-hand tracing | Upgraded — resume-from-progress (was restart-at-START only) |
| 50 Ember Bounce Master | Breakout / Arkanoid | Upgraded — pause/mute/restart cluster |
| 51 Volcanic Target | Archery target shooter | Upgraded — pause/mute/restart cluster |
| 52 Lava Rush Arcade | Submarine endless swimmer (Deep Sea Dash pattern) | Upgraded — pause/mute/restart cluster |
| 53 Flame Drop Physics | Plinko/Peggle-pattern physics drop | Upgraded — **critical:** resting-flame soft-lock fixed (stuck detection + retry) |
| 54 Blaze's Zenith | Doodle Jump — vertical climber | Upgraded — **critical:** hop apex 120px → 181px clears max gap 166px |
| 55 Ruko's Final Dash | Slope — slope runner | Upgraded — 1s i-frames (one volley could previously take all 3 lives) |
| 4 Godot exports | runner / slingshot puzzler / 2× rescue puzzlers | Matches — boot clean on both viewports, 0 defects found; compiled exports (no source in workspace) |

## The "Fix it all" escalation pass (Jeff, 2026-10-12 ~17:26 + 17:56 PDT)
Six items batches had filed as could-not-fix for design/convenience reasons were reclassified as fix orders and closed:
1. **Game 31 — tower selling:** long-press (600ms, gold progress ring) sells at 70% of invested gold; early release falls through to tap-to-upgrade, drag-off cancels. Probed live.
2. **Game 35 — manual upgrade/sell economy:** tap-to-select, upgrade to Lv4 (40/80/120 🪙, +45% dmg/+8 range per level), sell at 70%; auto-level converted to a capped +6 veteran bonus. Multi-wave auto-player reached wave 5/12 at 92/100 HP with tight gold — useful, not trivializing.
3. **Game 38 — ghost car:** best lap sampled at 0.1s into localStorage (`rally_ghost_v1`), replayed translucently, render-only, 0.27ms/frame; replay verified sample-exact.
4. **Game 40 — slide + duckable obstacle:** swipe-down/↓ slide (incl. mid-air fast-drop) and a new overhead ember banner (15% of spawn rows) that only sliding clears.
5. **Game 41 — real device tilt:** DeviceOrientation added beside drag+keys (game-08 pattern, iOS permission from the PLAY tap); verified with simulated orientation events.
6. **Game 10 — pause freezes cascades:** pause-aware scheduler (`pTimeout`) routed through all 12 gameplay timer sites + a level-epoch guard; 38/38 checks passed including a negative control (the same test fails on the pre-fix backup, proving it detects the bug).

## Phase C — Systems results (detail: `findings/systems.md`)
- **Auth gate code: healthy.** Renders on play.html + 3d.html, sign-in round trip works, returning players are not blocked, no white-screen trap, 0 errors.
- **Auth coverage gap (F1/F2):** index/fire-world/play-all/arcade and all 57 game pages load **no** gate — direct links bypass Jeff's "sign in before any part of the site" rule. Audit-only under the scope guard → **profile-system update** (see below).
- **Voting (F5, FIXED):** the "Sign-in is unavailable" path previously retried the Google script every 300ms *forever*; capped at ~6s with a visible message. Fixed in canonical `~/workspace/fire-babys-arcade/voting/voting.js` + `.deploy/voting.js`, verified in-browser.
- **Voting latent issue (F4):** arcade.html has zero `data-game-id` cards — when voting opens, eligible creators would see "pick your favorite" with nothing to vote on. Cannot be fixed until real creator games exist to tag; belongs to the creator rebuild.
- **Hubs (F6, FIXED):** 0 dead links after staging 6 production files the local mirror was missing (characters.html, parents.html, manifest.json, icon-192.png, icon-512.png, world/index.html — all already live; mirror sync only). Game counts verified: **57 mini-games + SPLASH + 3D = 59 playable entries.**
- **Multiplayer: LIVE CHECK PASSED.** Connected to `fire-babys-multiplayer.jeffpruden288.workers.dev`, created and joined a co-op lobby, WebSocket welcome received, ping→pong 89ms, ready broadcast, host start → "playing", clean disconnect.

## Phase D — Security results (detail: `findings/security.md` + `security-fixes.md`)
- **Secrets sweep: CLEAN.** No real secrets, tokens, webhook URLs, or passwords anywhere in the public tree. **No critical findings.**
- **SPLASH CSP integrity: verified post-change** — 27/27 script hashes match the built file; game boots (the exact failure that killed SPLASH on Oct 12 cannot recur silently; verify-patches passed).
- **Stray public files (FIXED):** 7 files removed from the staging tree (originals preserved in `backups/security-stray/`, each grep-verified unreferenced): `3d.html.backup-stadium`, `3d.html.backup-stadium2`, `play-all.html.bak`, `blog-100posts-backup.html`, `blog-single.html` (duplicate of live blog.html), `index.pck` (Medium — a Godot data pack publicly downloadable; note: removal stops our copy; if it was ever hot-linked externally we can't check that from here), `worker-index.js` (Medium — full auth-worker source publicly exposed; canonical source verified safe *before* removal). **These 7 must also be deleted from the GitHub repo — see upload instructions.**
- **Multiplayer worker (FIXED IN SOURCE, deploy pending):** MP-1 unbounded lobby creation → 1KB body cap (413), 30/min/IP creation limit (429), 200-active-lobby global cap (503), 30-min expiry for never-joined lobbies. MP-2 unbounded WS messages → per-player token bucket (burst 40, refill 20/s). MP-3 CORS `*` → allowlist (firebabys.io, www, localhost). Mocked-DO harness: 30/30 checks passed. Source: `~/workspace/fire-babys-multiplayer/worker/src/` (originals in `backups/security-mp/`). **NOT deployed — needs `wrangler deploy` (Cloudflare access, impossible from this VM).**
- **Headers (FIXED what a static host allows):** `<meta name="referrer" content="strict-origin-when-cross-origin">` added to 67 pages (all except play.html). **3D CSP upgraded from `'unsafe-inline'` to hash-based** (6 sha256 hashes, both inline `onclick` handlers converted to `addEventListener`, pre-deploy check passed, zero CSP violations in testing).
- **Platform limits (honest):** GitHub Pages serves no custom response headers, and `frame-ancestors`/`X-Frame-Options`/`nosniff` have no working meta equivalents — play.html's clickjacking directive is present but ignored by browsers in meta form (this is also the single console notice in the final sweep). Real headers require serving through Cloudflare (already the DNS/Worker provider) — a dashboard/serving decision for Jeff.

## Findings handed to the profile-system update (guarded scope — audit only, zero edits made)
1. Auth gate coverage: hubs + all 57 game pages have no gate (F1/F2 above) — the expansion is yours.
2. SPLASH `#creatorBtn` is 21×19px and `#profileBtn` is 38px tall — below the 44px touch standard; both live in guarded patches 003/015.
3. Patch 021 (auth-gate integration) needs a live-https behaviour check (localhost testing can't settle it).
4. Auth worker items AW-1–AW-5: `/auth/count` enumeration, `/leaderboard` caching, `/auth/verify` IP rate-limiting, and F3 — sign-in is currently email-only with no verification (Resend not set up).
5. SPLASH HUD button widths: 13+ buttons in a fixed 480px stage row can't all be 44px wide (13×44 = 572 > 480); heights were fixed to 44px — full fix needs the HUD redesign you're already planning.
6. play.html referrer meta: couldn't be added without re-freezing the baseline; ride it along with your next legitimate rebuild.
7. Voting F4: tag arcade cards with `data-game-id` when real creator games ship.

## Final full-sweep verification (coordinator, after ALL changes incl. header pass)
All **68 staged HTML pages** loaded in Playwright (desktop viewport): **0 page errors on 68/68.** 67/68 also had zero console errors; play.html shows one console *notice* — "frame-ancestors is ignored when delivered via a <meta> element" — the pre-existing, documented platform limit above, not a defect. 6 pages logged sandbox network warnings for external resources (blocked by the test environment, not page defects). Every game was additionally verified on phone viewport by its batch worker after its fixes.

**Honest caveats:** (1) All FPS figures are headless SwiftShader readings on a contended VM — reliable as before/after comparisons, not as real-device numbers; a real-device sanity pass (3D in-world FPS, game 41's actual iOS tilt prompt, game 08 tilt) remains worth doing on Jeff's phone. (2) The multiplayer fixes are source-only until the Worker is deployed. (3) Nothing here is live until the upload below happens.

## FIXED vs COULD-NOT-FIX — closing ledger
**Fixed: everything fixable from this VM.** Games 366/368 findings + all 11 flagship items + 6/6 escalation items + 7/7 overhaul leftovers + systems 3 + security (7 strays, 3 MP holes in source, referrer on 67 pages, 3D hash-CSP).

**Could-not-fix — the complete list, each with its physical reason:**
1. **Multiplayer worker deploy** — code fixed and tested, but deploying needs `wrangler deploy` with Cloudflare credentials. *Parent follow-up.*
2. **Auth gate coverage expansion (hubs + 57 game pages), auth-worker AW-1–AW-5, creator/profile button sizes, patch-021 live check, SPLASH HUD-width redesign, email-verification setup (F3)** — reserved by Jeff's 17:15 PDT scope guard for the dedicated profile-system update that immediately follows this run; editing those files now would collide with it. All documented above for that update.
3. **Games 21/22 display names** ("Target Pop" is a jigsaw; "Block Breaker" is a tapper) — the names are canonical site/slug names; renaming is Jeff's brand decision, not a code defect. One decision from Jeff closes this.
4. **Voting `data-game-id` tagging (F4)** — no live creator games exist to tag; tagging placeholders would enable votes for fake games. Closes when the creator rebuild ships real games.
5. **Real HTTP security headers** (`frame-ancestors`, `X-Frame-Options`, `nosniff`) **and play.html's referrer meta** — GitHub Pages cannot serve custom headers and the meta equivalents don't exist / the baseline is frozen. Real fix: serve via Cloudflare (dashboard decision) or the profile update's next baseline rebuild.
6. **Real-device verifications** — 3D in-world FPS, game 41 iOS tilt-permission prompt, game 08 tilt on hardware: code is done and simulation-verified; the final confirmation needs a physical phone (Jeff's).
7. **Game 07 combo deviation** — empty taps not breaking the combo was *reviewed and deliberately kept* for the 4–8-year-old audience (accuracy is still graded). Listed here transparently: it's a design judgment Jeff can overrule, not an oversight.
8. **Godot exports** — 0 defects found, nothing to fix; noted only because any *future* change needs the Godot project source, which isn't in this workspace (compiled exports only).

## Upload instructions (for the main agent)
1. Upload the 69 files in **Section 1** of `upload-list.txt` (Section 2's 3 files are already live — mirror sync only).
2. **Delete the 7 files in Section 3** from the repo. Note: the local master of the 100-post blog survives at `backups/security-stray/blog-100posts-backup.html` — deleting the public copy does not decide Jeff's pending blog question.
3. Deploy the multiplayer worker separately: `wrangler deploy` from `~/workspace/fire-babys-multiplayer/worker/` (Cloudflare credentials required). Do **not** copy MP worker source over `.deploy/worker-index.js` — that public file is the *auth* worker and is being deleted, not updated.
4. SPLASH build artifacts (patch 027 + manifest + PATCHES.md) live in `~/workspace/goals/realm-clash-battle-game/files/fire-babys/` — the built `play.html` in Section 1 already contains them; no separate repo action needed.
5. After upload, live-verify per standing rules (bugs check: pages live, console clean, gate renders, boot OK).
