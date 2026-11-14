# Fire Babys — Patch Log

Every update to the game is a separate patch file. The baseline (`src/baseline.html`)
is frozen and never edited. This log is the map: if something glitches, find the
patch that touches that area, turn it off in `patches/manifest.json`, rebuild, retest.

How to disable a patch: in `patches/manifest.json` set `"enabled": false` on its
entry, then run `python3 src/build.py` from this folder.

## Baseline (frozen 2026-09-30)
- `src/baseline.html` — the full game as of Sept 30, 2026, **including the angry-faces
  upgrade** (thick angled eyebrows, glaring eyes, red pupils, gritted teeth, fangs,
  hero smirk). Fingerprint locked in `src/.baseline.fingerprint`.
- Debug reference build: `Fire Babys BASELINE.html` (baseline only, no patches).

## Patches
| # | File | Date | What it changes | Touches | Status |
|---|------|------|-----------------|---------|--------|
| 001 | `001-signature-looks.js` | 2026-09-30 | Signature face redesign: bigger eyes, thick brow slabs in an angry V, black pupils w/ red-hot rims, chunkier per-character mouths + extras (Ruko's headband/fists, Boulder's rock plates, Sizzle's bow, Cinder's triple crest, Inferno's horns, Blaze's bigger crown) | `drawBabyEyes`, `drawBabyExtras` (reassigned) | ✅ on |
| 002 | `002-character-codex.js` | 2026-09-30 | Character identities: names/titles/attitudes/descriptions/backstories/special moves for all 6; "Meet the Babys" codex (🔥 HUD button) with portraits drawn by the live renderer; troop bar + skill renames (cosmetic, no stat changes) | `UNIT_DEFS` names/skills, DOM overlay | ✅ on |
| 003 | `003-fire-baby-creator.js` | 2026-09-30 | Ruko is the Leader (codex bio updated); unlock system for the original 6 (stages 1/1/3/5/8/12, locked = ???, +2% army damage per unlock); BUILD-A-BABY creator (🎨 HUD button): name, 10 palettes, eyes/brows/mouths, gear, 6 classes, 8 specials, 12 attribute points (~9.6M combos); 6 save slots, equip as the joystick hero in battle with class/attribute/special integration | `__FB_BIOS` (Ruko), `Game.checkEnd`, `spawnUnit`, `spawnHero`, `tryCast`, `drawBabyEyes`, `drawBabyExtras` (reassigned), DOM `#creatorOv` | ✅ on |
| 004 | `004-two-girl-fire-babys.js` | 2026-09-30 | SIZZLE (archer) + CINDER (pyro) are the 2 girl Fire Babys: she/her bios/attitudes/backstories; new fire silhouettes (Sizzle: flame ponytail + bow; Cinder: twin ember-buns); eyelash flicks; codex cards + portraits repainted. Names, roles, stats, skills unchanged | `__FB_BIOS` (archer, pyro), `drawBabyEyes`, `drawBabyExtras` (wrapped), codex card DOM | ✅ on |
| 005 | `005-free-placement.js` | 2026-09-30 | Deploy phase is FREE: starting-gold gate removed — fill all 12 grid tiles with the team. Gold still earned/shown as score, nothing spends it | `tryPlace` (reassigned), `UI.buildTroops`/`UI.refreshTroops` (wrapped) | ✅ on |
| 006 | `006-smaller-fight-button.js` | 2026-09-30 | FIGHT button shrunk (15px font, tighter padding) so it no longer covers the bottom grid row; same position, still tappable | `#bigBtn` CSS (injected) | ✅ on |
| 007 | `007-fire-safety-mechanics.js` | 2026-10-01 | **Extinguish Matchup Matrix**: enemies get real fire classes — A Twiggy/Cardboard Carl (trash/wood), B Slick/Fryer Frank (grease), C Buzz (electrical), D Slag/Thermite Tim (metal), gated by stage (1:A, 3:+B, 5:+C, 8+:+D); boss stays neutral. Heroes wield signature tools: Ruko sand, Boulder smother blanket, Sizzle squirt gun, Cinder foam, Blaze nova (neutral), towers neutral. Correct counter = 2x–2.5x + themed burst; water on grease = enemy grows up to 2x and explodes splash onto YOUR side; water on Buzz = zapped back; water on metal = hydrogen flash. Villain sprites + name labels (round bodies, zero bird traits), rotating safety briefing on deploy screen, victory dossier card with 1-line counter rules | `spawnUnit`, `doAttack`, `tryCast`, `allocProj`, `fireProj`, `fireMeteor`, `updateProjs` (reassigned: verbatim baseline copy + tool threading), `dealDamage`, `drawBabyExtras` (chained), `Game.toDeploy`/`startFight`/`checkEnd` (chained), DOM `#mxBrief`/`#mxDossier` | ✅ on |

<!--
To add a row: copy _TEMPLATE.js to NNN-short-name.js, write the patch,
add {"file": "NNN-short-name.js", "enabled": true} to manifest.json,
run python3 src/build.py, then log it here.
-->

## Build notes
- 2026-10-01: `src/build.py` stamps a purpose note (`<!-- FIRE BABYS — purpose note ... -->`)
  right after `<!DOCTYPE html>` on every build of `Fire Babys.html` (Jeff's direction:
  the game's purpose is to teach children how to prevent house fires and what to do
  when there is a fire around). Baseline untouched; the note rides along on the demo
  and deploy copies since they are built from `Fire Babys.html`.

## Push log (2026-10-01)
- 14:43 PDT: Jeff said yes — deploy copy refreshed (193,720 bytes) and pushed via GitHub web UI.
- Commit f0c64cf "Update game: Extinguish Matchup Matrix (patch 007)" — https://github.com/Jman350Z/fire-babys/commit/f0c64cf
- Pages build #3 green at 14:44 PDT (build 28s, deploy 11s). firebabys.io not reachable yet at ~14:50 PDT — GitHub "DNS Check in Progress", no cert issued yet (DNS records were set ~25 min before the push). Re-check pending.

## 2026-10-01 — Patch 008: elemental-armor-lore (Jeff: "Ok update the game")
Jeff's rethink: (1) ALL elements come from ARMOR — every fire baby starts in junior school wearing Sprout training armor; graduating to high school unlocks the Elemental Armor Generator test. (2) The Generator is the future store: thousands of procedural armor styles, Holy → Devil-Dark.
Defaults Jeff was told (new-chapter not retcon; cosmetic-first, no stat armor; store panel is a teaser — real IAP needs native app-store builds later).
10-element ladder (Sprout/Training → Ember → Flame → Aqua → Terra → Storm → Frost → Holy/Mythic → Shadow/Mythic → Devil-Dark/Abyssal); 4,800 procedural styles (10×4×6×4×5); deterministic forge(seed).
Hero bios +armor field and one armor sentence (renders in codex); player babies get ember-trimmed Sprout-Armor shoulder plates; deploy screen gets the Generator teaser panel with 3 rotating previews; victory adds a graduation-progress hint. Boss wears no armor ("he IS the wildfire").
All runtime checks passed. Deploy copy refreshed.

## 2026-10-01 — Copyright establishment (Jeff: "establish copyrights, all rights reserved")
- `src/build.py` now stamps a copyright notice on EVERY built copy of the game (after the purpose note): "Copyright (c) 2026 Jeffery Pruden. All rights reserved." — covers characters, artwork, story, text, code; no reproduction/derivatives without written permission.
- `FireBabys-demo.html` stamped with the same notice (surgical edit, no gameplay change).
- `deploy/index.html` refreshed from the new build (205,821 bytes, includes notice + patch 008).
- New `COPYRIGHT.md`: dated IP record — works table, authorship, notice text, trademark explainer, name-establishment trail (first public use 2026-09-30).
- Preliminary USPTO-index/web search found no conflicting "Fire Babys" game/app mark (encouraging, not a formal clearance). Trademark NOT filed — costs ~$250-350/class, needs Jeff's explicit go-ahead.

## 2026-10-01 — Patch 009: trailer-button (Jeff: "start adding this video to a few areas")
Jeff's 30s Fire Babys cinematic (arena battles + armor-generator armory scene). HUD gets a trailer button (next to the codex button) that plays the video in a fullscreen overlay. trailer.mp4 (~21MB) streams from the site root — NOT bundled into the game file.
Pushed live 2026-10-01 ~19:02 PDT: commit f1fa7a1 "Armor update + cinematic trailer (patches 008/009)", Pages build green ~19:04, https://firebabys.io/trailer.mp4 verified loading (30s). Game site now at 9 patches.
Trailer also posted: Threads (post 18032697401854666), Instagram (media 18118888645988652), FB Fire Babys group (pending), game-site artifact trailer section (pending).

## 2026-10-01 — Patch 010: elemental-armor-forge (Jeff's spec)
generateElementalArmor(characterLevel, targetSlot) -> { id, name, slot (head/body/hand/aura), primaryElement, opposingElement, cosmeticPalette {primaryColor, accentColor, glowColor}, rarity (Common/Rare/Epic/Legendary/Elemental Master) }.
10 elements (mirrors 008) with opposing pairs (Holy<->Devil-Dark etc.); level-gated rarity odds (Elemental Master only at high level); material/finish/piece/suffix name generator ("Osmium-Plated Slag Carapace of Grounding" style); optional 3rd seed param for determinism (omitted = random). Global function; cosmetic-only, no combat touched. All runtime checks passed.

## 2026-10-01 — Patch 011: keychain-redeem (Jeff: "Keychains with QR codes that give you in game armor")
Physical merch unlocks digital armor. Code format FB<tier>-<6 chars>-<2 checksum> (31-char unambiguous alphabet, FNV-1a checksum, offline-validated, no server). Tier 1-4 (Common/Rare/Epic/Legendary) maps to forge level and guarantees minimum rarity. window.redeemArmorCode(code) forges deterministically (same code = same armor, via 010's seed); duplicates rejected; tampered checksums rejected.
ARMORY overlay (HUD button): redeem-code input + owned-armor list persisted in localStorage (in-memory fallback). Cosmetic-only.
Factory: src/make_keychain_codes.py bulk-generates codes + QR PNGs (100/100 cross-verified against the game's own parser — merch/keychain-batch-001/, 25 per tier).
Caught + fixed in testing: alphabet is 31 chars (not 32) — codec now uses BASE=len(ALPHA) everywhere.
All runtime checks passed. Demo refreshed.

## 2026-10-01 — Patch 012: title-screen (Jeff: "build the ui .. how the game starts")
Full-screen title on every launch: official title art (embedded, compressed), tagline, pulsing TAP TO START, real menu (PLAY / ARMORY / CODEX / TRAILER), rising ember particles, copyright + safety footer. PLAY fades onto the deploy screen; menu buttons route into their patches' overlays (gracefully hidden if that patch is disabled). DOM-only. All 144 runtime checks passed. Demo refreshed.
Also logged: Jeff's platform roadmap discussion — Unreal/PlayStation is phase 3 (from-scratch rebuild, PlayStation Partners application, Sony approval); recommended path is (1) title-screen UI now, (2) native mobile apps later (real IAP), (3) Unreal/console only if it pops. No servers needed yet (offline by design); Cloudflare free tier when leaderboards/accounts arrive.

## 2026-10-01 — Patch 013: first-hatch (Jeff: "time to make my very first fire baby")
First-run player-creation moment (the full creator already lived in 003): after PLAY, new players meet the HATCH prompt ("EVERY LEGEND STARTS WITH A SPARK") instead of the deploy screen; one tap opens the 003 creator; the moment they save a baby, a "HATCHED!" celebration names it and sends them to battle. Never shows again (persisted flag); "skip for now" respected. Drives 003 through its public HUD button + window.__FB3; DOM-only. 151/151 runtime checks passed (incl. a harness fix: the DOM stub now registers elements by id). Demo refreshed.
Note: 013 was built after the 010-012 live-push task started, so it rides the next push.

## 2026-10-02 — Patch 014: story-mode (Jeff: "Story mode Bobby!!!!" — teenage trainees protecting the land)
World map (HUD 🗺️ button, pulses until first opened): Mario-3-style winding path through 6 towns — Ember Village (Twiggy/A), Greaseworks (Slick/B), Volt Town (Buzz/C), Slagheap (Slag/D), Smokestack City (all four), Inferno's Volcano (Lord Inferno). Each town: training brief with story intro + fire-safety lesson; 3 wins liberates it (Game.checkEnd hook, chains with 003); liberation unlocks the next; volcano = GRADUATION (ties 008's lore). Progress in localStorage. DOM-only. All runtime checks passed. Built locally, not pushed live yet.

## 2026-10-02 — Patch 015: player-profile (Jeff: player profile with name, avatar, stats, towns, armor)
👤 PROFILE button on HUD + title menu. Profile overlay: Fire Baby avatar drawn from equipped baby's flame colors, editable trainee name, rank ladder (Spark → Ember → Blaze → Senior Trainee → Protector of the Land), battle record (wins/losses/win rate via chained Game.checkEnd), towns liberated x/6 (live from story progress), armor collection count + rarity mix (live from armory). All localStorage, guarded. NO email capture in this patch — kids' game, parental-consent design must be settled first (COPPA). DOM-only. All runtime checks passed. Built locally, not pushed live yet.

## 2026-10-02 — Security hardening (Jeff: "build the security walls")
Audit: game makes ZERO external network requests, ZERO eval, ZERO fetch/XHR — fully offline single file. Hardened: (1) `src/build.py` now stamps `frame-ancestors 'self'` into the CSP on every build (clickjacking wall); (2) patch 011 armory cards escape all localStorage-derived fields; (3) patch 015 profile escapes town names + armor rarity mix. Baseline source untouched (fingerprint verified). All runtime checks passed.

## 2026-10-02 — Patch 016: story-cinematics (Jeff: "We want a bad ass story mode first")
DLG cinematic engine: portrait + name + typewriter dialogue, tap-to-advance, SKIP. Main intro (team assembly + Inferno's threat, auto-plays first map visit, replayable); per-town villain-taunt/team-answer cinematics for all 6 towns weaving in each fire-safety lesson (auto-play on first visit, 🎬 INTRO button in every brief); 4 liberation celebration variants; full graduation ceremony at the volcano. Portraits drawn live from signature colors (canon: spherical fireballs, expressive mouths). Watches 014's overlays via polling — never touches 014's code. DOM-only. All runtime checks passed. Built locally, not pushed live yet.

## 2026-10-02 — Patch 016 rewrite: 90210 teen-drama cut (Jeff: "like 90210... everyone works together and saves the world")
Rewrote all cinematic scripts: West Ember High ensemble — Ruko's cocky leadership vs Sizzle/Cinder's rivalry, Boulder keeping the peace, Blaze as the new kid. Each town is a drama beat (Cinder's temper in Greaseworks, Blaze's self-doubt in Volt Town, Ruko learning to trust in Slagheap) that resolves into teamwork. Graduation payoff: "I came in the new kid. I'm leaving family." Kid-safe: the drama is friendship/rivalry/doubt, never romance. All checks passed. Built locally, not pushed live yet.

## 2026-10-02 — Patch 017: play-3d-button (Jeff: "Update the different games of the game")
2D game HUD gets a 🎮 button (next to the trailer button) linking to the 3D open-world game at 3d.html. DOM-only, no game-logic changes. Kill switch: manifest.json.
Build note: `deploy/index.html` gets a build-time transform — `media-src 'none'` → `'self'` — matching the 2026-10-02 live trailer hotfix (baseline stays frozen; script hashes unaffected since they cover script blocks, not the meta tag).
Also: `GAME-HISTORY.md` created as the unified 2D→3D history record (Jeff: "make a record of the history of the game").

## 2026-10-02 — Patch 018: audio-engine (Jeff: 6 Pillars, Pillar 1 — Audio Signature Architecture)
Extends baseline AudioSys (vanilla Web Audio, zero sound files) with 4 signature procedural cues: deployPop() — bouncy pitch-bend when a baby drops in (hooked on player-side spawnUnit); attackClash() — short crisp low-passed noise burst layered onto melee-range (<=70px) non-crit impacts; extinguishSizzle() — white-noise hiss with rapid exponential decay when a fire-class enemy is extinguished (killUnit hook); alarm() — two-tone emergency siren for the castle-evacuation mechanic. Guarantees the explicit Mute/Unmute HUD toggle (#muteBtn) exists and stays wired — the baseline already ships it, so the patch asserts rather than duplicating. No baseline method redefined. All runtime checks passed. Built locally, not pushed live yet.
Note: Jeff's directive numbered these 010/011, but those numbers were already taken (010-elemental-armor-forge, 011-keychain-redeem) — used 018/019 so nothing was overwritten.

## 2026-10-02 — Patch 019: fire-safety-codex (Jeff: 6 Pillars, Pillars 4 + 6)
Pillar 4: NFPA class reference data (A/B/C/D — fuel, correct counter, NEVER rule) backing a new in-game Fire Safety Academy modal (HUD 🎓 button): 4 class cards, the 3 field-training mechanics, the toyetic tag, and real links to sparky.org, sparkyschoolhouse.org, usfa.fema.gov. The matchup matrix itself stays in patch 007 — this patch is the always-one-tap reference.
Pillar 6: (1) 'Get Outside & Stay Outside / Two Ways Out' — when the PLAYER castle collapses, the 018 alarm sounds and every surviving Baby troop comically flees along two illuminated green exit lanes (render overlay + evac tick; nobody runs back inside); (2) 'Stop, Drop, and Roll' — heroes can catch a burning debuff from enemy attacks (flames drawn on the hero); a fast horizontal swipe on the right side of the screen triggers the roll — burning extinguished, armor restored to base, dust burst + sizzle; (3) 'Safe Charging is a Superpower' — Buzz (Class C) sometimes spawns charging on a soft pillow with a frayed charger cable; while overloaded he zaps nearby troops every 1.4s; TAP him to unplug (overload cleared, 2s stun, pillow gone).
Toyetic tag: 'Real fire is never a toy — only grown-ups handle flame!' is appended to every character-codex card (patch 002) when the codex opens, and banners the Academy modal. Canvas tap/swipe gestures use dedicated pointer handlers that stay out of the joystick zone. All runtime checks passed. Built locally, not pushed live yet.

## 2026-10-02 — Build repair (standing issue from patch 017 deploy)
`src/build.py` now permanently rewrites `media-src 'none'` → `'self'` in the built game file (baseline stays frozen). The trailer hotfix no longer needs a manual step on deploys.

## 2026-10-02 — Pillar 5 diet pass: game under 250KB (Jeff: 6 Pillars, "Native-packaging guardrails")
Built file was 505,709 bytes. Target: <250KB (256,000 bytes). Final: 247,942 bytes (242KB) — 51% reduction. Baseline frozen and untouched (fingerprint verified).

What was done:
1. Title art recompressed (patches/012-title-screen.js): embedded JPEG went from 560x1120 to 200x400, quality 35. Base64 dropped from ~171KB to ~19KB. Saves ~152KB. (Original patch backed up to /tmp/012-title-screen.js.orig)
2. JS minification in build (src/build.py): added minify_js() using terser (--compress --mangle). All 19 patches minified at build time; source patches stay readable. Saves ~100KB.
3. Build assembly tightened: removed per-patch header comments, no newlines between script blocks. Saves ~1KB.

No features removed. All 20 script blocks pass node --check. CSP hashes recomputed automatically by build.py.

## 2026-10-12 — Build repair: CSP hash drift (SPLASH dead in browser) + baseline re-freeze
Root cause: at some point after the 2026-10-04 build, kid-safe wording edits were hand-applied directly to the deployed `.deploy/play.html` (BURN→CAPTURE ×5 in the baseline block, BAD ASS→BLAZE ON in patch 012, CATCH→SPLASH ×4 in patch 025) WITHOUT rebuilding, so 3 of 26 inline script blocks no longer matched their CSP sha256 hashes. Browsers refused to execute all 3 — including block 0, the entire baseline game — so every baseline global (UNIT_DEFS, drawBabyEyes, tryPlace, Game) was undefined and SPLASH could not boot at all (harness: 4 pageerrors, title never appeared).
Fix (through the build, per process): the exact deployed wording was ported back into the sources — 5 strings in `src/baseline.html` (baseline RE-FROZEN via `build.py --allow-baseline-change`; wording-only, zero code-logic changes), 1 string in `patches/012-title-screen.js`, 4 strings in `patches/025-catch-mode.js` — then rebuilt. The rebuilt file is byte-identical to the previously deployed file except the single CSP meta line (3 hashes corrected). verify-patches.js: ALL RUNTIME CHECKS PASSED. Harness on the rebuilt file: page_error_count=0 (was 4). Backup of the broken deployed file: `~/workspace/fire-babys-overhaul/backups/play.html.orig`. Full analysis: `~/workspace/fire-babys-overhaul/batches/splash-report.md`.
Addendum (same repair): `build.py --allow-baseline-change` bypasses the freeze check but never updates `src/.baseline.fingerprint`, so the fingerprint was updated manually to the new baseline hash (069pX5gNIimOg56i/+EbR+5XWprEa440HqING9N3Wno=). Verified: a plain flag-free `python3 src/build.py` now succeeds and reproduces the deployed file byte-for-byte.
