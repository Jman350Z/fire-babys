# Fire Babys Multiplayer — Wire Protocol

All WebSocket frames are JSON objects with a `t` (type) field.
HTTP API is JSON with CORS `*`.

## HTTP API

| Method & path | Body / query | Response |
|---|---|---|
| `POST /api/lobby` | `{ "mode": "coop" \| "2v2" \| "4v4" \| "6v6" \| "7v7" \| "15v15" }` | `{ ok, code }` — 6-char lobby code |
| `GET /api/lobbies` | — | `{ ok, lobbies: [{ code, mode, players, maxPlayers, phase, updatedAt }] }` |
| `GET /lobby/:code` | — | `{ ok, state }` — snapshot without joining |
| `WS  /lobby/:code/ws?name=X[&token=T]` | — | 101 + `welcome`, or 403/404 |

## Client → Server (WebSocket)

| `t` | Fields | Notes |
|---|---|---|
| `ping` | `ts` | Server replies `pong` (latency) |
| `ready` | `ready: bool` | Lobby phase only |
| `mode` | `mode` | Host only, lobby phase; resets ready/teams |
| `start` | — | Host only, lobby phase |
| `move` | `x, y, dir, anim, ts` | Playing phase only; client ≤12Hz, server caps ~15Hz/player, clamped ±5000 |
| `action` | `kind` (≤24ch), `x, y`, `data` (≤512B JSON) | Playing phase only; relayed to others |
| `end` | `results` (≤512B JSON) | Host only, playing phase |

## Server → Client (WebSocket)

| `t` | Fields | Notes |
|---|---|---|
| `welcome` | `playerId, token, isHost, reconnected, state` | First frame after WS open; `token` resumes this player |
| `lobby` | `state` | Full snapshot on join/leave/ready/mode change |
| `joined` / `rejoined` / `left` | `id[, name]` | Presence (also covered by `lobby`) |
| `host` | `hostId, name` | Host migrated |
| `pos` | `id, x, y, dir, anim, ts` | Relayed move (excludes sender) |
| `action` | `id, kind, x, y, data` | Relayed action (excludes sender) |
| `start` | `mode, seed, state` | Game started; `seed` for client RNG sync |
| `end` | `results` | Game ended; phase returns to `lobby` |
| `pong` | `ts` | Latency reply |
| `error` | `msg` | e.g. wrong team size for mode |

## Lobby state snapshot

```json
{
  "code": "ABC123",
  "mode": "4v4",
  "phase": "lobby",
  "maxPlayers": 30,
  "hostId": "uuid…",
  "seed": 123456,
  "players": [
    { "id": "uuid…", "name": "Jeff", "ready": true, "team": 0, "connected": true }
  ]
}
```

Tokens are never included in snapshots — only the owning client ever sees its own.

## Reconnect

Client stores `token` per lobby code (`localStorage`). Reconnecting with
`?token=` restores the same `playerId` (team + ready preserved). If the lobby
emptied out, it self-deletes after 5 minutes and the token is useless —
client gets 404 and should create/join anew.
