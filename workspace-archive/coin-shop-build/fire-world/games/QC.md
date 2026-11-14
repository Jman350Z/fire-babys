# Fire Babys Arena (Game #60) — QC Report · 2026-10-21

**Build:** `fire-world/games/game-60-fire-babys-arena.html` (source tree only — nothing deployed, nothing pushed). Hub card added as GAME #60 in `fire-world.html`.
**Suites:** `tests/arena/test-arena.py` (Playwright/Chromium, 32 checks), `tests/arena/test-live-worker.py` (two real protocol clients vs the live Worker, 10 checks), `tests/arena/mock-worker.py` (local protocol mirror), `tests/arena/serve.mjs` (test server, port 8946; mirror REST :8947 / WS :8948).
**Result: 32/32 page checks PASS · 10/10 live-Worker protocol checks PASS · zero page errors in every suite.**

## Page-level suite (test-arena.py)

- **Load & HUD law** — page loads clean; the single `#fbTabbar` is visible with exactly ONE pause button; all menu functions live in the pause menu (opened and resumed in-test).
- **Math gate** — mode buttons route through the house Math Check; answering it (as a player would) unlocks the flow.
- **Character select** — all **12 heroes** render with animated base-ball portraits (Transformation Law: balls only here).
- **Loadout + Starter Kit** — defaults verified: **Bronze Starter Set + Wooden Sword** pre-selected on a fresh (auth-aborted → fallback) locker; loadout offers **both starter outfits**; **BALANCE LAW verified numerically** — the stat preview text for School Outfit and Battle Starter Set is byte-identical (`❤ HP 116 · 👊 Light ~6 · 💥 Heavy ~12 · 🛡 Guard 4% · 👟 Speed 101%` for Blaze); Blaze enters the fight at **116 HP** (104 + 12 baseline).
- **Full ladder fight** — driven through the real sim: round 1 KO (dizzy sequence) → P1 round win → **+5 session coins** (earn `ko` rule); round 2 KO → Signature Splash phase → match end screen "🏆 BOUT WON!" → **20 session coins** (2× ko + `game_complete` 10) → NEXT OPPONENT starts bout 2 (ladderIdx 1).
- **Couch versus** — P1/P2 pick flow (P2 prompted separately), fighters bound to P1/P2 controls; P2's K light attack measurably damages P1.
- **Portrait** — a touch phone viewport (390×844) gets the site-wide turn-your-phone overlay (`#fb-rotate` from the gate's landscape.js).
- **Online (two real Arena pages)** — host creates a room (6-char code shown), guest joins by code; roles host/guest assigned; the guest builds the identical match from `arena_begin` (Blaze vs Aqua); guest receives host snapshots; **host's real keyboard attack drops the guest-side P2 HP 116 → 111**; both pages reach the match end screen (guest: "🏆 BLAZE WINS!"); zero console/page errors on either page.

## Live Worker verification (test-live-worker.py)

Two real clients (Python `websockets`, via the sandbox egress proxy) against **`wss://fire-babys-multiplayer.jeffpruden288.workers.dev`**, sending the page's exact message shapes — 10/10:

- REST `POST /api/lobby` issues a room code; first WS client is host, second is guest (welcome + ids).
- **Discovered + verified Worker rule: `action` messages are silently DROPPED until the host sends `{t:'start'}`** (pre-start pick confirmed dropped; lobby flips to `playing` on start). The page's handshake was built around this: picks are held locally and flushed on the `start` broadcast, then `arena_begin` flows.
- Post-start relay verified for `arena_pick` (sender id attached, `data` intact), `arena_begin`, `arena_in` (guest inputs → host), `arena_state` (snapshot delivered verbatim, incl. HP + projectiles), and ping → pong with ts echo.

## The one gap — stated plainly

**The two-page online test ran against a local mirror of the Worker protocol, not the live Worker directly.** Reason: this sandbox's headless Chromium has **zero external egress** — `https://example.com`, `https://firebabys.io`, and the Worker all fail identically with `ERR_TUNNEL_CONNECTION_FAILED`, with and without the egress proxy configured (shell tools through the same proxy work fine; it is a Chromium-in-VM limitation, not an Arena or Worker problem). The mirror (`mock-worker.py`) implements the semantics *verified against the live Worker in the same session* (welcome/host, start-gate on actions, id-tagged relays, pong), and the page code ran **unchanged** except for a test-init shim rewriting the Worker origin to localhost.

So the two halves are each verified end-to-end — (a) full page online logic over the protocol, (b) the page's exact protocol against the live backend — but a single run combining **two browser pages against the live Worker** still needs a browser with internet egress (e.g. Jeff's signed-in browser session). That is the recommended first check after deploy: create a room on one device, join on another, fight one match.

---

# Round 2 — double jump, kicks + low kick, controllers (2026-10-21)

Features added per Jeff's orders: double jump (elemental puff + flip on the second jump), kick attacks (standing kick, air kick, low kick that must be crouch-blocked), and controller support — standard gamepads, PlayStation + Xbox families with per-family button tables and fallbacks, cheap mini pads (simplified scheme + hold-for-special), and Bluetooth keyboard remotes. Ladder AI uses kicks/low kicks and sometimes fails to low-block by tier.

## New results — `tests/arena/test-arena.py` SUITE 5 + SUITE 6

**Full run: 59 passed, 0 failed** — all 32 round-1 checks stay green, plus 27 new:

SUITE 5 (mechanics, deterministic `simTick`):
- Double jump apex 106 vs single-jump 272 (higher = smaller y): second ascent confirmed
- Standing kick (J) connects for 6 dmg, kind `kick`
- Standing blocker verified guarding-not-low mid-test; **low kick slips under for 5 dmg**
- **Crouch-block stops the low kick** (1 chip dmg only)
- Air kick connects for 6 dmg, kind `airkick`
- Zero page errors

SUITE 6 (gamepads, unit + live mocked pads via `navigator.getGamepads`):
- Family detection: Xbox / DualSense / DualShock id strings recognized
- Standard mapping attack = button 0; nonstandard PS fallback table (Cross=1, Circle=2, Square=0)
- Mini scheme engages under 10 buttons (jump = btn 3, special = hold-attack); mini hold fires special exactly once after 1 s
- Sparse pad (missing buttons/axes) and bare pad objects never throw
- Live Xbox pad → P1: 🎮 chip names "Xbox", stick moves P1 (300 → 419), A attack / B kick / LB block / Y jump + second tap = double jump (`jumps===2`), Menu toggles pause, pause menu shows the Xbox layout
- Live DualShock (nonstandard mapping) → P1: chip names "PlayStation", fallback Cross attacks
- Zero page errors

Live Worker protocol suite re-run after the net changes (`kick` added to `ARENA_ATK` + `arena_in`): **10 passed, 0 failed**.

Harness notes: two test-only fixes were needed during this round — a prevIn settle step between back-to-back `evaluate` blocks (no rAF frame runs between them, so a held key could mask the next press's edge; not a game bug — a real keyup is always processed by a live frame), and the pad double-jump test now holds each press until the game observably reacts instead of fixed 110 ms taps (a tap can fall entirely between two polls).

The round-1 online caveat is unchanged: two browser pages against the live Worker still await a browser with internet egress; the protocol halves remain verified separately (mirror suite + live-Worker suite).

## Notes

- Auth Worker calls are aborted in page tests on purpose: the locker falls back to the starter-kit default, which is itself a required behavior (offline/unsigned default loadout). Signed-in locker reads use the same `/locker/get` contract as `fire-world.html`.
- Earn calls in tests hit the aborted auth route and fail silently by design; the session coin counter (asserted) is the client-side mirror of the server rules (ko 5c / game_complete 10c).
- Screenshots in `tests/arena/`: `select-screen.png`, `fight-ladder.png`, `match-end.png`, `online-lobby.png`, `online-guest-view.png`.

## Addendum — 2026-10-22: NO-POWER-STATS LAW (Jeff's ruling)

Jeff removed ALL power stats from gear/outfits (element identity stays; gear is pure style; skill decides fights). Supersedes the numbers in the 2026-10-21 record above, which stand as history:

- The shared starter baseline block (HP +12 / guard 4% / spd +1% / sword +1 dmg) is GONE — both starter outfits are zero-stat cosmetics, and every `GEAR` table entry (all armor + all weapons) is zeroed.
- Blaze now enters the fight at **104 HP** (his own character HP — the earlier "116 HP (104 + 12 baseline)" no longer applies), and the loadout stat preview shows character numbers only: `❤ HP 104 · 👊 Light ~5 · 💥 Heavy ~11 · 🛡 Guard 0% · 👟 Speed 100%` — byte-identical for EVERY armor/weapon/outfit combination, verified by new gear-equality cases in `tests/arena/test-arena.py`.
- Backend `LOCKER_ITEM_META` stats are all zeros (payload shape unchanged).
- The hub Power Boost remains, honestly reclassified in DESIGN.md as a coin-bought consumable effect (not a stat, not gear; +10% damage cap in Arena) — documented, not hidden.

## Addendum — 2026-10-22 (later): POWER BOOST EFFECT REMOVED (Jeff's no-power law)

The Power Boost's Arena damage effect — the last power modifier in the system — is removed the same day: `BOOST_DMG_CAP` and the `makeFighter` boost term are deleted, no Arena code reads `shopBoost`, and the loadout preview no longer shows a boost line. The item is relabeled in the hub shop as **🌟 Star Charms** (collectible flair; the Chest shows the collected total as "shine"); ids, prices, the `shopBoost` locker field, and existing owners' totals are unchanged. New Arena test case: a fighter built with `shopBoost` at the +25% maximum has damage output identical to a fighter with none. Backend untouched (it only ever stored the total; the effect was frontend-only) — no redeploy.
