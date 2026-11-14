# Fire Babys Multiplayer — Architecture

Phase 1 foundation: lobbies + real-time sync. No game-specific logic yet
(fire mechanics, scoring) — that lands in Phase 2 on top of this.

## Big picture

```
  Browser (fire-babys-net.js)          Cloudflare
  ┌──────────────────────┐      ┌──────────────────────────────┐
  │  Game (2D / 3D)      │      │  Worker: fire-babys-multiplayer│
  │  test/index.html     │◄────►│  ┌─────────────────────────┐ │
  └──────────────────────┘  WS  │  │ GameLobby (Durable Object)│ │
    create/join via HTTPS        │  │  1 instance = 1 lobby     │ │
    realtime via WebSocket       │  │  ≤30 players, state+relay │ │
                                 │  └─────────────────────────┘ │
                                 │  ┌─────────────────────────┐ │
                                 │  │ LobbyDirectory (DO)     │ │
                                 │  │  singleton: open lobbies│ │
                                 │  └─────────────────────────┘ │
                                 └──────────────────────────────┘
```

## Why Durable Objects

- Each lobby is an isolated, single-threaded state machine — no race conditions
  on joins, ready-ups, or team assignment.
- WebSocket Hibernation API: connections survive object eviction; the runtime
  wakes the DO on incoming messages. Cheap at idle.
- Co-located with the existing leaderboard worker pattern Jeff already uses.

## Components

| File | Role |
|---|---|
| `worker/src/index.js` | HTTP router: `/api/lobby`, `/api/lobbies`, `/lobby/:code`, `/lobby/:code/ws` |
| `worker/src/lobby.js` | `GameLobby` Durable Object: lobby state, WS join/leave, ready, teams, start/end, move+action relay |
| `worker/src/directory.js` | `LobbyDirectory` DO: register/unregister/list open lobbies, stale pruning |
| `worker/src/protocol.js` | Shared constants + pure helpers (modes, team draft, name sanitize) |
| `client/fire-babys-net.js` | Browser client: connect, lobby ops, throttled moves, auto-reconnect, events |
| `test/index.html` | Manual test harness: create/join/ready/start + live dot canvas |

## Data flow

1. `POST /api/lobby {mode}` → worker allocates code, creates `GameLobby` DO.
2. Client opens `wss://…/lobby/CODE/ws?name=X[&token=T]` → DO validates
   (exists, not full, lobby phase for new joins), issues `playerId` + `token`.
3. `welcome` → full snapshot. `lobby` broadcasts keep every client in sync.
4. Host `start` → server snake-drafts teams (versus) or team 0 for all (co-op),
   flips phase to `playing`, broadcasts `start` with a random seed.
5. Clients send `move` (~12Hz, server caps ~15Hz/player) → relayed as `pos`
   to everyone else. `action` messages relayed as-is (capped 512B).
6. Host `end` → `game_end` broadcast, phase back to `lobby` (rematch ready).
7. Disconnect → player marked offline, host migrates to earliest-joined
   connected player. Lobby self-deletes 5 min after last disconnect.

## Versus modes

Lobby cap is 30. Versus requires the exact mode size to start:

| Mode | Players | Teams |
|---|---|---|
| 2v2 | 4 | 2 + 2 |
| 4v4 | 8 | 4 + 4 |
| 6v6 | 12 | 6 + 6 |
| 7v7 | 14 | 7 + 7 |
| 15v15 | 30 | 15 + 15 |

Co-op needs ≥1 player (up to 30). Teams are snake-drafted by join order.

## Scaling notes

- 30 players × 12Hz moves ≈ 360 inbound msg/s per full lobby; each relayed to
  29 others ≈ 10k outbound msg/s. Well within a single DO.
- Workers free tier: 100k requests/day. WebSocket messages count as requests —
  a busy lobby day can exceed this. **Upgrade to Workers Paid ($5/mo, 10M/day)**
  before any real launch (same lesson as the leaderboard worker).
- No chat in Phase 1 (kid-safety: nothing to moderate). Names sanitized.
- No auth in Phase 1: lobby codes are the capability (6 chars, ~2B combos).
  Phase 2 can add per-game join passwords.

## What's NOT in Phase 1

Authoritative game simulation, anti-cheat beyond relay caps, matchmaking,
persistent player accounts, voice/chat, spectating. The relay is dumb on
purpose — Phase 2 adds server-validated game events.
