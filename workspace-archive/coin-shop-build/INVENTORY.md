# Fire Babys — Shop & Locker Inventory (Jeff's review copy)

Built 2026-10-21 in `~/workspace/coin-shop-build/` (staging — NOT live yet).
Jeff's design: **playing is always free — coins are never charged to play,
enter, retry, or unlock any game or mode.** Coins are earned by playing and
spent only in the shops at the main menu (Fire World hub).

---

## A. GAME SHOP (in-game coins 🪙) — main menu, Fire World hub

Balance shows in the top nav and in the shop. One balance everywhere: the
hub shop, the 3D Arena store, and the player locker all read/write the same
store (localStorage keys `fb_coins` / `fb_gems` / `fb_inventory` /
`fb_shop_boost`; when signed in, the server locker is the source of truth
and the local copy is a cache).

### Power Boosts (permanent, stack, cap +25% total) — apply in the 3D Arena

> **CORRECTION (2026-10-22):** the Power Boost's ARENA (game-60) damage effect was REMOVED under Jeff's no-power law; in the hub shop the items are relabeled **🌟 Star Charms** (Bronze/Silver/Gold) — collectible flair, and the locker total is shown as "shine." Ids, prices, and the `shopBoost` field are unchanged. The table below stands as the pre-removal record for the Arena; the 3D Creator game's own boost stack is a separate system (see STATS-REMOVAL-REPORT.md addendum).
| Item | Price | Effect |
|---|---|---|
| +1% Power Boost | 100c | +1% power in the 3D Arena (stacks) |
| +2.5% Power Boost | 250c | +2.5% power in the 3D Arena (stacks) |
| +5% Power Boost | 500c | +5% power in the 3D Arena (stacks) |

Wiring: purchases raise `fb_shop_boost`; the arena's `__fbEffectiveBoost()`
adds it (cap +25%) on top of season/armor boosts, and the 3D Vault shows
"🛒 Shop boost: +X%". Verified in-browser 2026-10-21.

### Armor (permanent, equip one at a time — equipping is shared by every character)
| Item | Price | Notes |
|---|---|---|
| Wooden Shield | 50c | Sturdy oak ring |
| Iron Helm | 100c | Clanky head cap |
| Steel Boots | 150c | Heavy stompers |
| Lava Gauntlets | 200c | Molten fists |
| Knight Armor | 300c | Full plate suit |

### Weapons (permanent, equip one at a time)
| Item | Price | Notes |
|---|---|---|
| Wooden Sword | 75c | Practice blade |
| Stone Club | 100c | Heavy rock basher |
| Fire Baton | 150c | Crackling baton |
| Iron Axe | 250c | Sharp chopper |

### Emotes (permanent, pick a favorite)
| Item | Price | Notes |
|---|---|---|
| Dance | 50c | Celebration groove |
| Spin | 100c | Twirl move |
| Clap | 150c | Round of applause |
| Flip | 200c | Big air flip |

Armor / weapons / emotes use the exact item ids and equip slots the 3D
Arena already uses (`fb_inventory`: armor / weapons / emotes, eqArmor /
eqWeapon / favEmote), so anything bought at the main menu shows up equipped
in the arena and vice versa. Prices in the server locker catalog match
this list exactly (server validates every purchase — a client can never
name its own price).

**Not sold in the Game Shop:** gem-priced items remain exclusive to the 3D
Arena's own store tabs (unchanged). In-match currencies inside individual
games (e.g. tower-defense gold in game-31, coin pickups in games 29/30)
are gameplay/score mechanics, not the coin economy — untouched.

## B. REAL-WORLD SHOP (real money only) — main menu, Fire World hub

Cards link out to the Fourthwall storefront:
**https://general-federal-industries.fourthwall.com**
Coins are NEVER presented as paying for merch. The store is not live yet;
the section says "opening very soon" and shows the first-drop lineup:

| Product | Price |
|---|---|
| Blaze Hero Tee | $32 |
| Aqua Hero Tee | $32 |
| Boulder Hero Tee | $32 |
| Ruko Hero Tee | $32 |
| The Whole Crew Tee | $32 |
| Full Cast Hoodie | $48 |
| Slimer "SMOTHER IT!" Tee | $32 |
| Fire Safety Academy Tee | $32 |
| Sticker Pack — All 12 Characters | $12 |
| Candy Moon Halloween Tee (limited) | $34 |

(Prices are the planned lineup prices from the Fourthwall launch pack;
final prices settle in Fourthwall when the products publish.)

## C. THE PLAYER LOCKER (one per PLAYER, not per character)

At the main menu next to the shops. Everything a player earns or buys lives
in ONE locker tied to their account (email), saved server-side in the auth
Worker's KV inside the player's profile record — any character they play
can wear/use everything in it.

Locker groups shown: character look summary · **Armor · Weapons · Emotes ·
Power-Ups (boosts) · Collectibles** (Bronze Knight pieces, Silver Knight
set, season badges, armory weapons — derived server-side from real
progression, never client-granted).

- **Guests:** the locker prompts sign-in; buying still works locally and
  merges into the account on first sign-in. Playing is free either way —
  the locker is storage, never a gate.
- **Migration:** on first signed-in load, the local balance, items, boost,
  and progression merge INTO the server locker (max/union — nobody loses
  anything; merging is one-time and can't be replayed to duplicate).
- **Server-validated:** purchases debit the server balance at server
  catalog prices; equips require ownership; coin earning via the locker
  API is fixed-amount per event (game complete 10c, KO 5c, extinguish 2c;
  season-tier coin rewards 50–300c) with an hourly cap.

## D. How coins are earned (unchanged)
- 3D Arena: 10c per game, 5c per KO, 2c per extinguish; 1 gem per win,
  1 gem per 5 KOs. Season-pass tier rewards as before.
- The old one-time economy migration (starter 100c + 5g, `fb_economy_v2`)
  is unchanged and identical on the hub and in 3D, so balances can't
  flip-flop between pages.
