# 🔥 Fire Babys Multiplayer — Phase 1

Backend foundation for multiplayer Fire Babys: lobbies (up to **30 players**),
co-op + versus modes (**2v2, 4v4, 6v6, 7v7, 15v15**), and real-time sync over
WebSocket. Built on **Cloudflare Workers + Durable Objects** — same infra
family as the existing 3D leaderboard worker.

## Layout

```
fire-babys-multiplayer/
├── worker/                 # Cloudflare Worker (deploy this)
│   ├── wrangler.toml
│   ├── package.json        # type: module (lets node --check validate ESM)
│   └── src/
│       ├── index.js        # HTTP router: /api/lobby, /api/lobbies, /lobby/:code[/ws]
│       ├── lobby.js        # GameLobby Durable Object (1 instance = 1 lobby)
│       ├── directory.js    # LobbyDirectory DO (singleton lobby listing)
│       └── protocol.js     # shared constants + pure helpers
├── client/
│   └── fire-babys-net.js   # browser client lib (window.FireBabysNet, no deps)
├── test/
│   └── index.html          # manual test harness (create/join/ready/start + live dots)
└── docs/
    ├── ARCHITECTURE.md
    ├── PROTOCOL.md
    └── DEPLOY.md
```

## Quick start

See [docs/DEPLOY.md](docs/DEPLOY.md). TL;DR:

```
cd worker && wrangler deploy
```

then open `test/index.html`, paste the `wss://…` URL, create a lobby,
join from a second tab, ready up, start, and move.

## Status

- [x] Lobby create/join/list (30 max, 6-char codes)
- [x] Ready states, host migration, team snake-draft for versus
- [x] Mode select: coop + 2v2/4v4/6v6/7v7/15v15 (versus needs exact size)
- [x] Real-time move relay (~12Hz client, ~15Hz server cap) + generic actions
- [x] Reconnect via token, empty-lobby auto-cleanup
- [ ] Phase 2: game-specific logic (fire mechanics, scoring, authoritative sim)
- [ ] Phase 2: integration into the 2D + 3D games
