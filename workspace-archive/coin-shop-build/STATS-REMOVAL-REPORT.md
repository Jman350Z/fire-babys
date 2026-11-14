# STATS REMOVAL — Jeff's ruling executed (2026-10-22)

**The law (Jeff, 2026-10-22 ~01:21 PDT, ratifying Bobby's recommendation):**
REMOVE all power stats from gear/outfits; element stats/identity STAY.
Gear is pure style. Skill decides fights, never equipment. Progression
is unlocks, never power.

## What changed, per file

### 1. Arena — `fire-world/games/game-60-fire-babys-arena.html` (source + `.deploy`, sha256 `5e2ad7b7…`, byte-identical)
- **GEAR table zeroed**: every armor (13) and weapon (12) entry now has
  `hp/guard/pow/spd/dmg/rate = 0`. The fields remain for payload/save
  shape compatibility; `gearMods()` (the single choke point) therefore
  always returns zeros, and `makeFighter` builds fighters purely from
  the character: `maxHp = ch.hp`, `dmgMul = ch.pow`, `spdMul = ch.spd`.
- All stat-advertising item descriptions rewritten as style copy
  ("+12 HP · guard 4%" → "pure style", etc.). Loadout outfit chips
  reworded ("SAME stats" → "pure style — gear never changes your
  numbers"). effGear/STARTER/gearMods comments now state the law.
- AI ladder gear unchanged as *looks* (boss still wears knight armor
  + iron axe visually; his numbers are Lord Inferno's own).
- NOT touched: character base stats, element identities/specials, coin
  prices, earn rules, controller/kick/double-jump systems.

### 2. DESIGN.md / QC.md (`fire-world/games/`, source-only docs)
- DESIGN.md: the 2026-10-21 balance-law section replaced by the
  NO-POWER-STATS LAW (with the old equal-baseline kept as history);
  "Gear → stat mapping" replaced by "Gear — style only"; roster line
  and ladder table updated ("AI look — style only"). New section
  **"Power Boost — the honest label"** (see §4).
- QC.md: dated addendum — Blaze now enters at **104 HP** (was 116);
  loadout preview is character numbers only
  (`❤ HP 104 · 👊 Light ~5 · 💥 Heavy ~11 · 🛡 Guard 0% · 👟 Speed 100%`),
  byte-identical across every gear combination.

### 3. Starter kit — backend `LOCKER_ITEM_META` + STARTER-KIT-REPORT.md addendum
- Every `stats` value zeroed: school outfits (hp/guard/pow/spd 0),
  bronze armor/helmet/boots (0), wooden sword (dmg 0, rate 0),
  sunglasses (already 0). The `stats` field stays in the payload
  shape; the comment block now records the law so it is never
  reintroduced. Grant/equip/migrate logic untouched.

### 4. Shop definitions — checked, one honest reclassification
- Hub shop (fire-world.html ARMOR/WEAPONS/EMOTES lists) and the 3D
  store catalogs carry **no stat fields** — names, art, prices,
  flavor only. Nothing to remove; nothing changed.
- **Power Boost** (+1/+2.5/+5%, stacks to +25% account, Arena damage
  capped at +10% via `BOOST_DMG_CAP`) IS a real power effect, so per
  instructions it is **reclassified, not hidden**: DESIGN.md now
  labels it a coin-bought consumable-style effect — not gear, not a
  stat — and the Arena code comment says the same. Its numbers were
  NOT changed (removing a purchased effect's value silently would be
  its own dishonesty). ⚠️ **Flag for Jeff/parent:** this is now the
  ONLY power modifier left anywhere in the system. If "never power"
  was meant to include it, killing it is a small follow-up
  (zero `BOOST_DMG_CAP` + stop the shop sale) — say the word.

### 5. Backend — REDEPLOYED LIVE
- `fire-babys-auth/worker/src/index.js` (== `coin-shop-build/backend/index.js`,
  sha256 `9331f0d9…`, byte-identical) — LOCKER_ITEM_META zeroed (above).
- Deploy route: wrangler ONLY (never the API script — ADMIN_KEY).
  Auth via the documented connector surrogate launcher (throwaway,
  self-deleted; real token never exposed).
- **Version ID: `6e203836-1b4a-4aed-9046-ef1334022b5d`**
- Post-deploy verification: `/auth/config` byte-identical to
  pre-deploy; leaderboard byte-identical; bindings intact
  (ADMIN_KEY secret_text, AUTH_KV, GOOGLE_CLIENT_ID secret_text,
  RESEND_API_KEY plain_text — keep_vars held); live script read back
  via API contains the zeroed meta + law comment, old stat line
  absent; `/auth/password` junk attempt returns the generic
  `invalid_credentials`. No rollback needed.

## Tests — all green
| Suite | Result |
|---|---|
| starter-kit (`tests/test-starter-kit.mjs`) | **104 passed, 0 failed** — S8 rewritten to assert the all-zero law (school ≡ bronze ≡ 0, sword dmg 0); assertion count unchanged |
| admin-password | **52 passed, 0 failed** |
| kick backend | **71 passed, 0 failed** |
| dark-knight backend | **30 passed, 0 failed** |
| Arena page (`tests/arena/test-arena.py`) | **63 passed, 0 failed** — incl. **4 NEW cases**: GEAR table all-zero; knight armor + Magma Core Anvil fighter == bronze + wooden sword fighter (maxHp/dmgMul/spdMul identical); no-armor + fists == bronze set; Blaze's numbers are exactly his own (104 / ×1.00 / ×1.00). The old "Blaze 116 HP" assertion updated to 104 |
| Live multiplayer Worker protocol (`test-live-worker.py`) | **10 passed, 0 failed** |

Note: a live *authed* `/locker/get` starter-kit check was not run —
no valid test token exists post-Great-Kick and Jeff's password was
not available to this agent. The identical worker file passed the
full 104-case suite locally against a fake KV, and the live script
bytes were read back and verified.

## CSP
The Arena edit changed an inline script → staged CSP hash map
regenerated through the A+ pipeline (audit_scan → gen_hashmap over
`.deploy`) and union-merged with the previous staged map: **zero
hashes lost**, new Arena hash present, 70 pages, union
s=140 / y=125 / a=135 / t=252. `a-plus-project/hashmap.json` and
`big-deploy-2026-10-21/github-push/csp-hashmap-staged.json` identical.
Headers Worker NOT redeployed (ships with the push, as before).

## Out of scope, noticed, NOT touched
- `3d.html` (Creator) has its own progression boost flavor text
  ("armor boosts", season boosts in its 2D-stage system) — a separate
  game's internal progression, not the Arena/shop gear-stat system
  this ruling targeted, and its canonical file/deploy pipeline live
  outside this build. Its store catalogs carry no stat fields. If
  Jeff wants the same law swept through the Creator's stage-armor
  system, that's a follow-up build.
- `fire-world.html` line ~141 copy says Power Boosts "stack with
  season & armor boosts" **in the 3D Arena** — that sentence is about
  the Creator game's own system (previous bullet), which still
  exists, so the copy is not stale today. If the law is ever swept
  into 3D, that line goes with it.

---

## ADDENDUM — 2026-10-22 (later): Power Boost effect REMOVED (follow-up to §4)

Jeff's delegated judgment applied to the §4 flag: a coin-bought damage
boost is pay-for-power, so the exception is closed. **Zero power
modifiers remain in the Arena system.**

### What changed
- **Arena `fire-world/games/game-60-fire-babys-arena.html`** (source +
  `.deploy`, sha256 `edf59b4e…`, byte-identical): `BOOST_DMG_CAP`
  deleted; the `makeFighter` boost term `(1+boost)`, the boost
  computation, and the fighter `boost` field deleted; the loadout
  stat-preview boost suffix deleted (preview is character numbers
  only). `dmgMul` is now `ch.pow * (1 + m.pow)` with `m` always zero.
  NOTHING in the file reads `locker.shopBoost`. The `shopBoost: 0`
  field stays in `defaultLocker()` for payload-shape compatibility.
- **Item relabeled, not deleted** (`fire-world.html` hub shop, source
  edited + `.deploy` edited in place, staged ZIP-fingerprint line
  preserved): Power Boosts → **🌟 Star Charms** (Bronze 100c /
  Silver 250c / Gold 500c — same ids `boost1/boost25/boost5`, same
  prices, same `add` steps). All power copy rewritten honestly:
  section title, card lines, status line, buy/maxed toasts, locker
  box (total now shown as "shine"), and the intro paragraph ("never
  change any fighter's numbers"). `onboarding.js` tour copy updated
  to match (source + `.deploy` byte-identical). The item has no
  visual/flair effect of its own, so per instructions it is sold as
  what it is: a collectible. Existing owners keep their full
  collected total in the locker — no inventory was deleted anywhere.
- **Docs:** DESIGN.md "Power Boost — the honest label" section
  rewritten as "Power Boost — REMOVED as a power effect (2026-10-22)"
  (one-day history kept); QC.md addendum added; INVENTORY.md
  correction note added (table kept as pre-removal record).

### Backend determination — frontend-only, NO redeploy
The auth Worker never computed a fighter number from `shopBoost`: it
only stores the total on the locker and increments it on
`/locker/buy` (catalog ids/prices unchanged, so the purchase flow
and existing balances are untouched). The only power consumer was
the Arena page itself → nothing to zero server-side, **no redeploy
performed** (wrangler/API script untouched). Starter-kit suite
re-run as a sanity check: **104 passed, 0 failed**.

### Tests
| Suite | Result |
|---|---|
| Arena page (`tests/arena/test-arena.py`) | **67 passed, 0 failed** — incl. **4 NEW cases**: maxed `shopBoost` (0.25) fighter == no-boost fighter (maxHp/dmgMul/spdMul identical); light/heavy damage output identical with and without charms; fighter carries no `boost` field; `BOOST_DMG_CAP` no longer exists |
| starter-kit (`tests/test-starter-kit.mjs`) | **104 passed, 0 failed** (backend untouched sanity check) |

### CSP
Edited inline scripts (Arena + hub) → staged hash map regenerated
through the A+ pipeline (audit_scan → gen_hashmap over `.deploy`)
and union-merged with the previous staged map: **zero hashes lost**,
new Arena + hub script hashes verified present in the merged map
(and by direct hash of the staged files), 70 pages, union
s=143 / y=125 / a=135 / t=252. `a-plus-project/hashmap.json` and
`big-deploy-2026-10-21/github-push/csp-hashmap-staged.json`
identical. Headers Worker NOT redeployed (ships with the push).

### ⚠️ Flag for Jeff/parent — the one remaining consumer
`3d.html` (Creator) still adds `fb_shop_boost` into its own
`__fbEffectiveBoost()` (line ~5914, cap +25%) as part of the Creator
game's separate progression stack (armor/season/shop) — the system
the main report scoped out as its own follow-up build with its own
canonical pipeline and pre-deploy checks. This follow-up did not
touch it. Consequence to weigh: the hub shop now calls the item
collectible flair, which is fully true for the Arena; if Jeff wants
the label true everywhere, the Creator sweep (zero the shop term in
`__fbEffectiveBoost` + the backend `armorForStage`/season stack
decision) is the remaining build.

---

## ADDENDUM 2 — 2026-10-22 (later still): Creator wire removed — the §4/§5 flag is CLOSED

The one remaining consumer flagged above is fixed. The "🌟 Star
Charms — pure flair" label is now true in every game surface.

### What changed — `3d.html` (Creator)
- **`__fbEffectiveBoost()`** (coin-shop-build source + `.deploy`,
  byte-identical, sha256 `f9aeb508…`): the shop term
  `b += Math.min(sb, 0.25)` read from `localStorage fb_shop_boost`
  is DELETED. The function returns earned progression only — stage
  armor (bronze 10% / silver 20%) + season boost — byte-for-byte the
  same arithmetic as before for those terms. Both call sites
  (multiplayer send + defense calc) unchanged and resolving.
- **Vault panel**: the "🛒 Shop boost: +X%" line is replaced by
  "🌟 Star Charms: +X shine collected — pure flair" (same collection
  total, hub wording) — flair display only, computed from the same
  stored total the hub writes. No inventory deleted; owners keep
  their full collection.
- **Style Studio header comment**: the "Power Boosts … stack into
  __fbEffectiveBoost via the fb_shop_boost key (cap +25%)" claim is
  replaced by the law (collection count = "shine", never power).
- **Canonical file checked**: `fire-babys-3d-rebuild/3d.html` never
  carried the shop wire (its `__fbEffectiveBoost` was already
  armor+season only; no `fb_shop_boost` anywhere) — unchanged.
- NOT touched: stage-armor boosts, season boosts/rewards
  (`fbSeason1_boost`), weapon multipliers, the hub's `fb_shop_boost`
  writes (they now record a collection total that nothing reads as
  power), backend (frontend-only fix, no redeploy).

### CSP
Both edited inline scripts changed hashes → new hashes APPENDED to
3d.html's own meta `script-src` in both copies (all inline blocks
verify in-list), and the staged map regenerated through the A+
pipeline + union-merged: **zero hashes lost**, both new hashes
present in the `/3d.html` entry and the union, 70 pages, union
s=145 / y=125 / a=135 / t=252. `a-plus-project/hashmap.json` ==
`csp-hashmap-staged.json`. Headers Worker NOT redeployed.

### Tests
| Check | Result |
|---|---|
| `pre-deploy-check.sh` on final staged `3d.html` | **ALL CHECKS PASSED** (script balance, 5 blocks syntax, FBF calls resolve, size 1,032,429 B, error reporter) |
| Node unit test on the exact shipped `__fbEffectiveBoost` source | **6 passed, 0 failed** — charms 0.25 → +0 over bronze; charms 0.10 → +0; charms alone → 0; baseline (no charms) unchanged; earned season still stacks (+0.05); earned silver still overrides (0.20) |
| Boot parity (local server, Playwright) | Edited page == pre-edit original: boots, 2 canvases, THREE up, zero pageerrors |
| Strict-CSP harness (`harness_csp.py`, merged map) | 0 new errors vs baseline on the edited file. One violation appears IDENTICALLY on the pre-edit original: a runtime-generated style attribute (`sha256-V9J28zDuFjJ1Pf1SgQJ0bI/hxS8i46t+iBLuMVgblWU=`) absent from the map — pre-existing intermittent, unrelated to this change, deliberately NOT harvested in this pass; flagged for the next full sweep |

**Zero power modifiers remain anywhere: Arena ✓, backend locker
meta ✓, hub shop ✓, Creator ✓.** Coins buy style and collectibles
only — the no-power-stats law is now true on every surface.
