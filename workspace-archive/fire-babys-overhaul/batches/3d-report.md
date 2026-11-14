# Fire Babys 3D (3d.html) — Overhaul Report

- Source: `~/workspace/fire-babys-3d-rebuild/3d.html` (~1.03 MB, 10,017 lines, single-file Three.js)
- Backup: `~/workspace/fire-babys-overhaul/backups/3d.html.orig` (pre-edit, byte-identical to the old deploy copy)
- Staged: **YES** → `~/workspace/.deploy/3d.html` (byte-identical to edited source, verified with `cmp`)
- Date: 2026-10-12

## Systems map (brief)

- **Core/rendering:** Three.js (bundled minified), WebGLRenderer with ACES filmic tone mapping, PCF soft shadows, quality tiers (`FBQ`, auto-degrades on low FPS). One open world: 170-unit strip, 6 biomes (ember/grease/volt/slag/smoke/volcano) painted onto a single ground-canvas texture, gradient sky dome + sun sprite, per-biome fog colour lerped by player Z.
- **Characters:** `makeBaby()` — spherical flame-body (SphereGeometry + canvas body/face texture), additive glow sprite halo, 7 animated flame "licks" (cones), blob shadow, limbs; heroes (Blaze/Ruko/Boulder/Sizzle/Cinder classes) + villains/foes with HP bars. NFPA A/B/C/D matchup matrix in `dealDamage()` (counter = 2×, weak = 0.5× + backfire).
- **Modes:** Story (towns/chapters, dialogue cinematics, stronghold sieges), wild encounters, Survival, Tournament, Practice, Rescue, free explore; local bots.
- **Combat:** Melee attack (0.8 s cooldown, range-limited `spHitFoe()` SP / `mpDoAttack()` MP), block (shield, negates SP damage), jump/double-jump with flip. Damage = `player.atk × vault weapon multiplier × random 0.85–1.15`.
- **Weapons — TWO systems (see bug below):**
  1. **Vault/Armory weapons** (`__fb*` functions, mirrors `data/weapons.json`): 6 damage-multiplier weapons (1.0–3.5×… starter 2.5×), unlocked by starter / full Bronze armour / Season-1 tiers 8/16/20 / Silver armour (250 tasks); localStorage + server sync; multiplier applied in SP (`spHitFoe`) and MP (`mpDoAttack` → `mpTakeHit`, clamped 1–5).
  2. **Store/Customize weapons** (`FBC` system): 12 purchasable wielded weapons (coins/gems) with real 3D meshes (`fbBuildWeaponMesh`), swing animation (`fbSwingWeapon`), equip via Store + Customize UI, look synced to other players (`fbLookNet`). No per-weapon damage stat — differentiation is price tier + mesh (same for all existing weapons).
- **Progression/economy:** XP/levels, 250-task system (`FB_TASKS_250`), Season 1 tiers/rewards, Bronze/Silver armour, coins/gems store (armour, weapons, emotes, accessories, hair styles), customization + live 3D preview.
- **Multiplayer:** WebSocket client (`FireBabysNet`, `mp*`): lobbies, co-op + versus, bots, SPLASH "catch" mode (grab-and-dunk, no attacks), leaderboard API, presence/look sync.
- **Audio:** Procedural Web Audio (`beep()` oscillator SFX; noise-buffer sizzle/reignite sounds) — no audio assets.
- **Other:** `FBF` fire-spread namespace, phone error reporter, auth gate, dialogue/cutscene engine.

## Bugs found / fixed

### FIXED (High): `FB_WEAPONS` variable collision silently disabled the entire Vault weapon system
Two different script blocks both declared `var FB_WEAPONS`:
- Block A (Vault): 6 multiplier weapons (`weapon_hose_blaster_01`, …).
- Block B (Store, later in file): 12 shop weapons (`stick`, `water_pistol`, …).

The later declaration overwrote the earlier one at runtime, so every Vault lookup (`__fbWeaponById`, `__fbCheckWeaponUnlocks`, Armory/Vault UI) searched the shop list: the starter weapon was never found, `__fbWeaponMult()` always fell back to 1 (advertised 2.5× starter damage never applied), no Vault weapon could ever unlock, and the Armory/Vault panels iterated items with the wrong field schema (`name`/`mult`/`unlockText` undefined). The shop system was unaffected (it read the surviving array).

**Fix (surgical rename, 3 sites):** the Store array is now `FB_STORE_WEAPONS` — its definition, `weaponById()`, and `fbStoreItems('weapons')`. The Vault keeps the canonical `FB_WEAPONS` name (matches `data/weapons.json`). Verified post-fix in Node with the game's own extracted code: `__fbWeaponById('weapon_hose_blaster_01')` → High-Pressure Magma Hose, mult 2.5; `weaponById('bubble_hose')` resolves; unknown-id fallback still returns `stick`; counts Vault 6 / Store 13. A duplicate-definition scan confirmed `FB_WEAPONS` was the only duplicated top-level var and there are no duplicated functions.

### No other bugs found
Pre-deploy check (syntax, script balance, FBF undefined-call check, size, error reporter) passed on the original; my own read of the main loop / combat / damage paths found no other runtime errors. Baseline harness: 0 page errors.

## Graphics changes (Fall Guys glow-up — parameters/materials only, no restructuring)

| Change | Before | After |
|---|---|---|
| Tone mapping exposure | `1.12` | `1.2` |
| Scene fog | `Fog(0x53301a, 34, 125)` | `Fog(0x7a4a2a, 38, 135)` (warmer, lighter, slightly farther) |
| Hemisphere light | sky `0xffc490`, ground `0x3a1c10`, `0.9` | sky `0xffd9a8`, ground `0x6a4028`, `1.05` |
| Sun directional | `0xffe0b0`, `1.1` | `0xffe0b0`, `1.25` |
| Fill directional | `0x7aa8ff`, `0.35` | `0x7aa8ff`, `0.45` |
| Sky gradient stops | `0:#2f66c9`, `0.34:#7ab8f2`, `0.52:#ffd9a3` | `0:#2f7fe0`, `0.34:#8fd0ff`, `0.52:#ffe3b3` (brighter candy sky) |
| Biome ground bases (all 6) | e.g. ember `#8a6a52`, volt `#46587e`, volcano `#6e3a26` | ember `#9a7858`, grease `#8a815f`, volt `#54689a`, slag `#9c703c`, smoke `#6e6e7c`, volcano `#7e452c` (same bands, brighter/more saturated) |
| Biome fog colours (all 6) | e.g. ember `0x2a140c`, volt `0x101a2a` | ember `0x47261a`, grease `0x473a1e`, volt `0x1e3050`, slag `0x472c18`, smoke `0x2c2c36`, volcano `0x4d1810` (distance no longer fades to near-black) |
| Character body material (`makeBaby`) | `MeshStandardMaterial roughness:0.35` | `roughness:0.28` (glossier toy-plastic) |
| Character glow halo | `glow.scale.set(R*4.2, …)`; pulse `opacity = 0.7+0.2·sin` | scale `R*4.5`; pulse `0.78+0.2·sin` (bloom-like emissive halo boost) |

All changes are value-only edits to existing materials/lights/textures — no new geometry, no new draw calls, performance-safe. Art rules respected: spherical flame bodies unchanged, no beaks/wings/feathers added, no character-harm content.

## Weapon added

**Bubble Blast Hose** 🫧 — kid-safe water/bubble toy blaster, added to the wielded-weapon (Store) system:
- **Store entry:** `id:'bubble_hose'`, name "Bubble Blast Hose", **25 gems** (mid-tier, between Star Wand 20 and Ice Axe 30), colour `#ff9ff3`, blurb "Rainbow bubble splash!".
- **How obtained:** Buy in the in-game Store (Weapons tab) with gems → auto-equips; afterwards equip anytime from Store or Customize → weapon row, exactly like every other store weapon. Purchase/equip flow (`fbStoreItems`/`fbIsOwned`/`fbStoreTap`), save (`FBC.inv.weapons`/`eqWeapon`), dressing (`fbDressPlayer`/`fbAttachWeapon`), and multiplayer look sync (`fbLookNet`) all pick it up with no extra wiring.
- **3D mesh:** new branch in `fbBuildWeaponMesh` — chunky hose body + nozzle (using the weapon colour material) plus two glossy bubble orbs (pale-blue `#cfeeff` and pink `#ffd7f4` MeshBasic spheres). Swing animation applies via the existing `fbSwingWeapon`.
- **Stats/balance:** Store weapons carry no individual damage stat in this game (verified for all 12 existing weapons); damage stays `player.atk × equipped Vault multiplier`, so the new weapon is inherently balanced with its tier. Audio: uses the game's existing shared Web Audio attack/equip beeps (`beep()` in `mpDoAttack`, `beepOk` on equip) — no store weapon has a bespoke SFX, so none was invented.

## Pre-deploy check

- Original source: **ALL CHECKS PASSED** (script tags 8/8, 5 blocks syntax-checked, FBF calls resolve, 1,034,256 bytes, error reporter present).
- Edited source: **ALL CHECKS PASSED** (same checks, 1,035,120 bytes — +864 bytes).
- Staged `.deploy/3d.html`: **ALL CHECKS PASSED**.

## Harness results (test-games-local.py, --runs 1)

| | Loaded | Canvas visible | Console errors | Page errors |
|---|---|---|---|---|
| Before (baseline, re-run this session) | ✅ | ✅ | 2 | 0 |
| After (staged copy) | ✅ | ✅ | 2 | 0 |

The 2 console errors are identical before/after and are the known local-test artifacts (SSL error loading `https://firebabys.io/auth-gate.js` from a localhost page; Cloudflare beacon CSP block) — not game bugs. **No new errors.**

Play-test honesty note: the generic harness loads the page, confirms the WebGL canvas, and sends random keys/clicks for ~10 s; it does not drive the 3D game's full start flow, so deep gameplay (combat swing, store purchase of the new weapon) was verified by code inspection + the Node simulation of the weapon lookups above, not by scripted in-game play. Headless WebGL did render (canvas visible, no page errors).

## Staged

**Yes** — edited source copied to `~/workspace/.deploy/3d.html` deploy location (`~/workspace/.deploy/3d.html`), re-checked and re-tested there. Not yet uploaded to GitHub Pages (per coordinator deploy path, the push step belongs to the parent agent).
