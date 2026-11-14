# STARTER KIT — Implementation Report (Jeff's law, 2026-10-21)

**Status: built + tested in source. NOTHING deployed, NOTHING pushed.** Ships with the next wave after Jeff sees the Arena.

## The law

Every player in Creator mode starts with two free outfits in their locker (the Chest — one locker per player account, shared across all their characters):

1. **School outfit** — shirt + pants OR shirt + shorts (player's choice; **both variants granted**, pants equipped by default).
2. **Battle starter set** — bronze armor, wooden sword, bronze helmet, bronze boots, and sunglasses (equip only if they want; sunglasses are optional flair).

## ⚖️ BALANCE RULE (Jeff, 2026-10-21 ~17:37 PDT) — implemented

**The school outfit and the bronze armor kit are EXACTLY as strong as each other — equal stats — and a player can go into battle wearing EITHER one. Outfit choice is pure style, never power.**

- Each school outfit variant carries the **full baseline stat block: HP +12, guard 0.04, spd +0.01** — numerically identical to the bronze armor + helmet + boots combined (6/4/2 HP, 0.03+0.01 guard, 0.01 spd).
- Both outfits are **battle-legal equips** — the school outfit is a real equip slot (`outfit`), not a non-combat cosmetic.
- In battle the two are **alternatives, never stacked**: the Arena's `effGear()` resolves a school-outfit fighter to the same `bronze_set` + `wooden_sword` stats with only the visuals differing, so wearing both looks can never double-count.
- The wooden sword (+1 dmg) is the baseline weapon for both looks; sunglasses are zero-stat flair in both.

## Item ids + stats

Stats use the Arena's gear units (armor-type: flat `hp`, fractional `guard`/`pow`/`spd`; weapons: flat `dmg`, fractional `rate`). Canonical source: `LOCKER_ITEM_META` in `backend/index.js`, served with every locker payload as `locker.itemMeta`.

| Item id | Name | Slot | Stats |
|---|---|---|---|
| `school_outfit_pants` | School Outfit — Shirt & Pants | outfit | hp +12, guard 0.04, spd +0.01 |
| `school_outfit_shorts` | School Outfit — Shirt & Shorts | outfit | hp +12, guard 0.04, spd +0.01 |
| `starter_bronze_armor` | Bronze Armor | armor | hp +6, guard 0.03 |
| `starter_bronze_helmet` | Bronze Helmet | helmet | hp +4, guard 0.01 |
| `starter_bronze_boots` | Bronze Boots | boots | hp +2, spd +0.01 |
| `wooden_sword` | Wooden Sword | weapon | dmg +1, rate 0 |
| `starter_sunglasses` | Sunglasses | accessory | all zero (pure flair) |

Bronze set total = hp +12 / guard 0.04 / spd +0.01 = the Arena's `bronze_set` line exactly, and = each school outfit's block exactly. The pre-existing free starters (`stick`, `wave`) are unchanged. Note: `wooden_sword` was previously a 75-coin shop weapon; it is now a free starter (the Arena design already treated it as one). It stays in the shop catalog for id validity, but owners can never be charged for it (`already_owned`).

## Grant trigger points (idempotent by construction)

The grant is not a one-time event — `normalizeLocker()` **ensures** the kit on every locker read, so it can never be double-granted or lost:

- **Locker creation** — `defaultLocker()` includes the full kit; the school outfit (pants) is the only piece equipped by default.
- **First `/locker/get`** for any account — handler normalizes + persists via `saveLocker`, so pre-existing accounts (saved before the kit existed) receive it on their next get, with coins, purchases, and existing equip choices untouched.
- **Every other locker touch** — `/locker/migrate|buy|equip|earn` and profile loads (`getProfile`) all run the same normalize.
- **Non-sellable / non-deletable** — the locker has no sell/delete endpoints at all, and `/locker/buy` rejects owned ids, so starter items can never leave the locker or be charged for.
- **Local mirrors** — `fire-world.html` and `3d.html` run the identical ensure (`fbEnsureStarterKit`) over `fb_inventory` on load, so guest/local lockers match the server shape; `/locker/migrate` merges the four new categories with the original merge rules intact (toggle slots adopt the local choice only while the server slot is empty; weapon/emote/outfit take the local choice).

## Files changed

- **`backend/index.js`** — `STARTER_KIT` + extended `LOCKER_STARTERS`; new category system (`LOCKER_CATS`, `LOCKER_EQUIP_FIELD`, `LOCKER_EQUIP_DEFAULT`, `LOCKER_TOGGLE_CATS`) covering armor/weapons/emotes/**outfits/helmets/boots/accessories**; `LOCKER_ITEM_META` (names, slots, stats incl. the balance-law block); `defaultLocker()` grants the kit with `eqOutfit: school_outfit_pants`; `normalizeLocker()` generalized (grant + equip-field validation for all slots); `publicLocker()` serves `itemMeta`; migrate/buy/equip handlers generalized (equip: toggle slots = armor/outfits/helmets/boots/accessories, set slots = weapons/emotes).
- **`fire-world.html`** — `fbStarterInv()` / `fbEnsureStarterKit()` + kit constants; local default inventory is the kit; hub locker UI renders OUTFITS / HELMETS / BOOTS / ACCESSORIES sections with names + emoji.
- **`3d.html`** (the character creator) — kit constants + `fbEnsureStarterKit` on load, so **a newly created character's default appearance is the school outfit equipped (pants)**; `starter_bronze_armor` added to the store's armor list (free); new slot catalogs `FB_OUTFITS` / `FB_HELMETS` / `FB_BOOTS` / `FB_ACCESSORIES`; new mesh builders in the creator's existing primitive style (`fbBuildOutfit`, `fbBuildHelmetGear`, `fbBuildBootsGear`, `fbBuildShades`, bronze case in `fbBuildArmor`) — no new renderer; `fbDressGroup` dresses outfit/helmet/boots/shades with the same remove/dispose bookkeeping as armor; customize screen gains OUTFIT / HELMET / BOOTS / SUNGLASSES rows (owned pieces, tap-to-equip, tap-again-to-unequip, same pattern as the weapon row); preview and multiplayer look sync (`fbLookNet` / `fbDressRemote`) carry the new pieces.
- **`fire-world/games/game-60-fire-babys-arena.html`** — no change needed: the Arena build already implements the same baseline (`bronze_set` hp 12 / guard 0.04 / spd 0.01, `wooden_sword` dmg +1) and the balance rule (`effGear()` — school outfit fights with identical stats, visuals only; loadout screen offers both outfits as equals). Verified line-by-line against the backend meta.
- **`tests/test-starter-kit.mjs`** — new test suite (below).

## Test results

`node tests/test-starter-kit.mjs` — **104 passed, 0 failed.** Runs the real Worker against a fake KV (same harness as the kick tests):

- **S1** new account: full kit owned exactly once; school outfit (pants) equipped by default; battle pieces + sunglasses NOT force-equipped; `itemMeta` served.
- **S2** second `/locker/get`: inventory byte-identical (no duplication).
- **S3** pre-existing account (old-shape saved locker, 500 coins, bought wooden shield equipped): kit granted on next get; coins, purchase, and equip choice preserved; still intact on the following get.
- **S4** equip round-trips for **every** starter item (armor toggle, helmet, boots, sunglasses toggle, shorts↔pants, wooden sword↔stick).
- **S5** starters can't be bought (`already_owned`, no charge); a normal shop buy still works and the kit survives it.
- **S6** equipping an unowned item is rejected (`not_owned`).
- **S7** migrate merges the new categories (local shorts + wooden-sword choices adopted, kit intact).
- **S8 BALANCE LAW**: both school outfit variants' stat blocks equal the bronze armor+helmet+boots total on every axis; baseline is +12 HP / 0.04 guard / 0.01 spd; wooden sword is +1 dmg; sunglasses are zero-stat.

Regression check: `node tests/test-kick-backend.mjs` — **71 passed, 0 failed** (unchanged). Inline scripts of `3d.html` (6/6) and `fire-world.html` (2/2) parse clean.

## Notes / follow-ups

- The Arena references the bronze kit as one virtual armor id (`bronze_set`); the locker keeps the three real pieces. The stat totals are identical by design and locked by test S8.
- Deploy note for the next wave: this backend change is additive (new inv fields/categories + `itemMeta` in responses). Old clients ignore the new fields; new clients tolerate old saved lockers via the ensures. The frontend files ride the normal A+ CSP hash pipeline.

---

## ADDENDUM — 2026-10-22: stats REMOVED entirely (Jeff's ruling)

Jeff's decision (ratifying Bobby's recommendation): **remove all power stats; element stays as identity/flavor only; gear is cosmetic; progression is unlocks, never power.** The balance rule above is superseded — the outfits are no longer "exactly as strong as each other," they are **zero-stat cosmetics**, along with every other piece of gear:

- **Backend `LOCKER_ITEM_META`**: every `stats` value is now 0 (school outfits hp/guard/pow/spd 0; bronze armor/helmet/boots 0; wooden sword dmg 0). The `stats` field remains in the payload shape for client compatibility and must never carry a nonzero value again. Grant/equip/migrate logic untouched.
- **Arena `GEAR` table**: all armor and weapons zeroed (`hp/guard/pow/spd/dmg/rate = 0`); descriptions rewritten as style copy. A fighter's HP/damage/speed are their character's own — Blaze fights at 104 HP in any look.
- **Shop**: hub armor/weapon items never carried stat fields (names/prices/flavor only) — unchanged. The Power Boost is reclassified in the Arena DESIGN.md as a coin-bought consumable effect (not a stat, not gear), documented openly rather than removed in silence.
- **Tests**: starter-kit S8 section now asserts the all-zero law (school ≡ bronze ≡ 0, sword dmg 0); arena suite asserts identical fighter numbers across different gear.
