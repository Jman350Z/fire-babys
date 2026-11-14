# Fire Babys Arena — Game #60 · DESIGN

**File:** `fire-world/games/game-60-fire-babys-arena.html` (single self-contained page, house convention) · **Hub card:** GAME #60 in `fire-world.html`
**Genre:** 1v1 fighting in the classic arcade-duel style — side-view duels, health bars, best-of-3 rounds, special moves with a meter. **100% original** moves, names, art, and code — nothing copied from any existing franchise.

## Modes (all in v1)

| Mode | What it is |
|---|---|
| 🏆 **Arcade Ladder** | 5 AI bouts of rising difficulty in the Caldera Colosseum; coin rewards per round win + match win |
| 👥 **Versus (couch)** | 2 players, one keyboard — P1 WASD+FGH, P2 arrows+KLM |
| 🌐 **Online 1v1** | Room-code matches over the live Fire Babys multiplayer Worker, host-authoritative sync (details below) |

## Design laws honored

- **Transformation Law:** character select shows the base **ball** forms; the moment a round starts, fighters morph (~0.9s intro) into sleek athletic **suited humanoids** of living fire/water — equipped armor and weapons are drawn on the morphed form (plates, helms, boots, gauntlets, every weapon shape). No ball-in-a-suit, ever.
- **Cartoon combat only:** hits are spark/splash bursts; blocking makes a shield "ting" and chip damage can never KO (HP floors at 1 on a blocked hit). A KO = dizzy stars, cross-eyed plop, and the loser **pops back up smiling** between rounds. The finisher slot is the **SIGNATURE SPLASH** — the winner floods the loser with a giant funny elemental soak + steam burst; the loser ends the sequence giggling in the win pose. Rivals, never victims.
- **HUD law:** ONE slim top tab bar (`#fbTabbar`, Game 1 pattern): P1 plate (name · wins · health bar · special meter) · center ROUND + ⏱ pill · P2 plate · ONE ⏸ pause button. Everything else (Resume · Sound · Restart · Quit to Fire World) lives only in the pause menu. The play field below is clear.
- **Math gate unchanged:** mode buttons pass the house Math Check; the 5-in-a-row 24h-unlock snippet rides along like the other games.
- **Economy:** playing is **always free**. Wins pay through the existing locker earn endpoint with the server-fixed rules — round win = `ko` (+5c), match win = `game_complete` (+10c), 5,000c/hour server cap. Offline/unsigned players get the graceful default locker (starter kit) and a session coin counter.

## Controls

| Action | P1 | P2 (couch) | Touch |
|---|---|---|---|
| Move | A / D | ← / → | ◀ ▶ pads |
| Jump — tap again mid-air = **DOUBLE JUMP** (elemental puff + flip) | W | ↑ | ⤒ pad (tap twice) |
| Block / crouch | S (hold ↓ or away from opponent also blocks, genre-style) | ↓ | 🛡 pad |
| Light attack | F | K | 👊 pad |
| Heavy attack | G | L | 💥 pad |
| **Kick** — standing kick; in the air = air kick; **S/↓ + kick = LOW KICK** sweep | J | N | 🦵 pad (BLOCK+KICK = low kick) |
| Special (50 meter) | H | M | ⭐ pad |
| Pause | ⏸ tab-bar button (or P / Esc) | ⏸ | ⏸ |

Touch controls are the house `#fbCtl` pattern (real KeyboardEvents for P1) and appear only on touch devices during fights. Portrait phones get the site-wide "turn your phone" blocker via the gate's `landscape.js`, like every game.

**Blocking a low kick:** the LOW KICK is a sweep — it must be blocked **low** (crouch-block: hold S/↓, a bumper, or down on the stick). Holding *away* (standing block) does **not** stop it. A crouch-block stops everything else too, exactly like holding S on the keyboard always has.

## Controllers — gamepads, mini pads & keyboard remotes

Every controller class feeds the **same input objects** as the keyboard (`humanInput`), so kicks, double jumps, online guest input and replays all work identically no matter what is plugged in. Gamepads are polled every frame (`pollGamepads`); pad 1 drives P1, pad 2 drives P2 in couch Versus, and keyboard/touch keep working alongside. A 🎮 chip under the status strip names what connected ("🎮 Xbox controller connected", "🎮 PlayStation controller connected", …), and the pause menu's controls section re-renders the layout in the connected family's own button names.

### 1) Real gamepads — Xbox & PlayStation families (Gamepad API)

Family is detected from `gamepad.id`: **Xbox** (`Xbox`, `045e`, `Microsoft`) and **PlayStation** (`Wireless Controller`, `DualSense`, `DualShock`, `054c`, `Sony`); anything else uses the generic scheme. When `gamepad.mapping === 'standard'` both families share the standard indexes; for `mapping: 'nonstandard'` (older PlayStation pads on some browsers/OSes) a **per-vendor fallback table** applies — the classic DualShock order puts □ × ○ △ at indexes 0–3, so Cross (attack) is index 1 there.

| Action | Xbox (standard indexes) | PlayStation (standard indexes) |
|---|---|---|
| Move / crouch | Left stick, right stick, or D-pad | Left stick, right stick, or D-pad |
| Attack | A (btn 0) | × Cross (btn 0) |
| Kick | B (btn 1) | ○ Circle (btn 1) |
| Special | X (btn 2) | □ Square (btn 2) |
| Jump (×2 = double jump) | Y (btn 3) | △ Triangle (btn 3) |
| Block (crouch-block) | LB / RB (btn 4 / 5) | L1 / R1 (btn 4 / 5) |
| Pause | Menu (btn 9), View (btn 8) | Options (btn 9), Create (btn 8), touchpad click (btn 17) |

### 2) Mini pads — the cheap $1-store class

Many mini phone pads report as standard HID gamepads but with only **4–8 buttons** and one stick. If a pad exposes **fewer than 10 buttons**, the data-driven **mini scheme** takes over and degrades gracefully (every button/axis read is bounds-guarded — a sparse pad can never throw):

| Action | Mini scheme |
|---|---|
| Move / crouch | Stick or D-pad (whichever exists) |
| Attack | Button 1 (index 0) |
| Kick | Button 2 (index 1) |
| Jump (×2 = double jump) | Button 3 (index 2) |
| Block | Button 4 (index 3, or any shoulder that exists) |
| Special | **Hold ATTACK for 1 second** (no dedicated button exists) |
| Pause | Any higher-index button the pad actually has |

### 3) Keyboard-class remotes — VR-box / shutter remotes

The other cheap-remote class pairs as a Bluetooth **keyboard** and sends plain key events, so it works with **zero setup beyond pairing** — no detection needed (after the first keypress it is indistinguishable from a keyboard, and the game claims nothing more than that). Mapping (drives P1 whenever P2 isn't sharing the keyboard — i.e. everywhere except couch Versus, where the arrows stay P2's):

| Remote key | Action |
|---|---|
| Arrow keys | Move / crouch / jump |
| Enter / OK | Attack |
| **Double-tap Enter** | Kick |
| **Hold Enter (~0.6 s)** | Special |
| Esc (or Media Play/Pause) | Pause |

The pause menu carries a short player-facing "Cheap mini controllers & remotes" note with these instructions: pair by Bluetooth, set a mode switch to **GAME**, press any button once to wake the pad, watch for the 🎮 chip.

## Combat system

- **Rounds:** 60 seconds, best-of-3. Time-over → higher health fraction wins the round; an exact draw replays the round.
- **Moves:** light (5 dmg, fast), crouch-low punch (4), heavy (11, slow), **kick (6, longer reach)**, **air kick (6)**, **low kick sweep (5 — must be crouch-blocked; slips under a standing block)**, jumping attacks inherit the pressed move. **Double jump:** every fighter can jump a second time mid-air (slightly lower arc, elemental puff/ring at the feet + a quick flip). Walk 252 px/s × speed multiplier; jump/gravity tuned for floaty cartoon arcs.
- **Special meter:** 0–100; +8 when you land a hit, +5 when hit, +3/+4 when blocking. A special costs 50. Half your meter carries into the next round.
- **Hit feel:** hitstop freeze frames, screen shake, spark/splash bursts, synthesized WebAudio SFX (no audio files).
- **AI:** one think-loop with intent states (approach / retreat / jump-in / anti-air / special), 3 tiers across the ladder — reaction time, block chance, heavy chance, special chance, and combo depth all scale; always readable, never input-reading. The AI mixes in standing kicks, air kicks on jump-ins, and low kick sweeps — and it defends low kicks the honest way: it has to read them and crouch-block, with a tier-scaled success chance (×0.45 / ×0.7 / ×0.9), so low tiers regularly eat the sweep.

## Roster — 12 heroes, one signature special each

Stats are HP / Power × / Speed × — the character's own numbers, final. Gear adds nothing (no-power-stats law, 2026-10-22). Specials cost 50 meter.

| Fighter | Team | HP | Pow | Spd | Signature Special | Type |
|---|---|---|---|---|---|---|
| Blaze | 🔥 | 104 | 1.00 | 1.00 | **Starfire Uppercut** | dash strike (14) |
| Ruko | 🔥 | 94 | 0.95 | 1.18 | **Magma Knuckle Rush** | dash strike (14) |
| Boulder | 🔥 | 136 | 1.22 | 0.66 | **Tectonic Slam** | leap → shockwave (15) |
| Sizzle | 🔥 | 90 | 0.90 | 1.14 | **Sparkshot Volley** | 3 projectiles (6 ea) |
| Cinder | 🔥 | 96 | 1.06 | 1.05 | **Prism Pop Barrage** | close multi-hits (3×ticks) |
| Lord Inferno | 🔥 | 128 | 1.28 | 0.74 | **Kingsfall Comet** | 1 big projectile (16) |
| Aqua | 💧 | 104 | 1.00 | 1.00 | **Coronation Wave** | dash strike (14) |
| Splash | 💧 | 94 | 0.95 | 1.18 | **Droplet Blitz** | dash strike (14) |
| Pebble | 💧 | 136 | 1.22 | 0.66 | **Glacier Wallop** | leap → shockwave (15) |
| Drift | 💧 | 90 | 0.90 | 1.14 | **Riptide Volley** | 3 projectiles (6 ea) |
| Bubble | 💧 | 96 | 1.06 | 1.05 | **Bubble Trouble Burst** | close multi-hits (3×ticks) |
| Lord Tidal | 💧 | 128 | 1.28 | 0.74 | **Abyssal Crown Surge** | 1 big projectile (16) |

## Loadout — the Locker (Chest) + STARTER KIT

Loadout is per player, read from the player's one locker via `/locker/get` (armor + weapons + collectibles, including the bronze/silver armory pieces and the six armory weapons), with the graceful default below when signed out or offline.

### Starter Kit (Jeff, 2026-10-21) — every locker starts with it, free

Two outfits, owned by default, shown first on the loadout screen:

1. **🎒 School Outfit** — shirt + shorts (drawn on the suited form: team-color shirt + shorts), elemental fists.
2. **⚔️ Battle Starter Set** — bronze armor + bronze helmet + bronze boots (drawn as plate/helm/boots), wooden sword.
3. **🕶 Sunglasses** — optional flair toggle, purely cosmetic, drawn on the fighter's face.

**NO-POWER-STATS LAW (Jeff, 2026-10-22 — supersedes the 2026-10-21 balance law): there are NO power stats on gear or outfits, at all.** Every fighter's HP, damage, and speed come from their CHARACTER (the roster table above) and nothing else. Gear, outfits, helmets, boots, weapons, crowns — all of it is pure style. Element is identity and flavor, never a stat. Skill decides fights, never equipment; progression is unlocks (new looks, new fighters, new modes), never power.

Both starter outfits are zero-stat cosmetics. The loadout screen still pre-selects Bronze Starter Set + Wooden Sword, and the school outfit is one tap away — the choice changes only what the fighter wears. Ladder AI gear (below) is likewise a look: the boss's knight armor and iron axe change none of the boss's numbers — Lords are strong because they are Lords (character kit), not because of what they wear.

_History: on 2026-10-21 the two outfits shared one exactly-equal baseline block (HP +12, guard 4%, speed +1%, sword +1 dmg) so neither look could out-power the other. On 2026-10-22 Jeff removed the block itself — equal-to-zero beats equal-to-something, and now no shop item can ever be "the strong one."_

### Gear — style only

Every armor and weapon in the `GEAR` table carries `hp/guard/pow/spd/dmg/rate = 0`. The fields remain in the data shape so old saves and locker payloads keep parsing; `gearMods()` is the single choke point and returns zeros while the law stands. Items keep their names, art, and coin prices — they are sold as cosmetics: a look you unlock, never an edge. If a future design wants a real effect on an item, it must be re-approved by Jeff as a consumable effect (below), never smuggled back in as a stat.

### Power Boost — REMOVED as a power effect (2026-10-22)

_History: the hub shop sold **Power Boosts** (+1% / +2.5% / +5%, stacking to +25% on the account, stored on the locker as `shopBoost`). For one day (2026-10-21 → 2026-10-22) they were honestly labeled a coin-bought consumable effect — not a stat, not gear — adding damage inside Arena fights only, capped at +10% (`BOOST_DMG_CAP`)._

**Removal (Jeff's no-power law, executed 2026-10-22):** a coin-bought damage boost is pay-for-power, so the effect is GONE. `BOOST_DMG_CAP`, the `makeFighter` boost term, the fighter `boost` field, and the loadout-preview boost line are all removed — no Arena code reads `shopBoost` anymore, and a fighter whose locker holds the maximum collected total has byte-identical damage output to one who never bought anything (covered by a dedicated case in `tests/arena/test-arena.py`).

The item itself survives as what it honestly is without the effect: a **collectible**. It is relabeled in the hub shop as **🌟 Star Charms** (Bronze / Silver / Gold) — "collectible flair, pure style" — and the Chest shows the collected total as "shine." Item ids, prices, the `shopBoost` locker field, and every existing owner's collected total are unchanged: nobody lost anything they bought; it just never buys power again. Skill decides fights — all of them, no exceptions left.

## Ladder structure

5 bouts, opponents drawn from the roster (never a mirror of the player's pick; the finale is the opposing team's lord — Lord Inferno, or Lord Tidal if you play Inferno):

| Bout | Tier | AI look (style only — numbers are the character's own) |
|---|---|---|
| 1–2 | 0 — readable, forgiving | Bronze starter set + wooden sword |
| 3 | 1 — blocks, mixes heavies | Bronze chestplate + stone club |
| 4 | 1 — sharper | Bronze chestplate + fire baton |
| 5 | 2 — boss: fast reactions, anti-airs, combos | Knight armor + iron axe (a look — the boss is strong because he's a Lord) |

## Online 1v1 — how it works

Transport is the existing Fire Babys multiplayer Worker (`wss://fire-babys-multiplayer.jeffpruden288.workers.dev`), speaking the exact wire protocol the 3D game's `FireBabysNet` library uses (mirrored, not modified):

1. **Create/Join:** host `POST /api/lobby {mode:'coop'}` → 6-letter room code; both sides open `WS /lobby/{code}/ws?name=…` and get `welcome` (host flag, player id, lobby state).
2. **⚠️ Verified Worker rule:** the Worker **drops all `action` messages until the host sends `{t:'start'}`** (lobby phase → `playing`). The page therefore holds picks locally; when both players are present and the host has locked in, the host sends `start`, and both sides flush their `arena_pick` (character + gear + outfit + shades) on the `start` broadcast.
3. **Begin:** the host, holding both picks, broadcasts `arena_begin {p1, p2}` — both pages build the identical match locally. The host is always P1.
4. **Play (host-authoritative):** the host runs the full simulation. The guest streams its inputs as `arena_in` (on change + 150ms heartbeat); the host applies them to the remote fighter. The host streams `arena_state` snapshots at 15 Hz — phase, round, timer, round winner, and per fighter [x, y, facing, pose, HP, meter, wins, attack kind/progress, morph flag] plus live projectiles. The guest interpolates toward snapshots, infers hit FX/sounds from HP drops, and plays banners the host relays via `arena_banner`. No client ever trusts the other side's math — the host's sim is the match.
5. **End/rematch/leave:** match end is computed by the host sim and reaches the guest in snapshots (`ph:'over'`); each client awards its **own** coins only for its own wins through the normal earn endpoint. Rematch: guest sends `arena_rematch`, host re-broadcasts `arena_begin`. A disconnect ('left' presence or socket close) ends the match gracefully with a "match ended" screen and a path back to a fresh room. Pause-menu Restart is host-driven online (it re-begins both sides).

## Phase 2 (not in v1)

- Online ranked competitions / tournament brackets on the same Worker + a results endpoint on the auth Worker (server-validated winners before coin payout scales up).
- Spectator mode (extra room members receive `arena_state` read-only).
- Reconnect/resume mid-match via the Worker's token rejoin (the protocol already issues per-player tokens).
- Rollback-style netcode if 15 Hz snapshots ever feel soft at high latency; v1 chose simple + robust on purpose.
- Locker loadouts for the *guest's* fighter are rendered from their pick payload already; phase 2 can persist equipped-gear changes from the Arena loadout screen back through `/locker/equip`.
