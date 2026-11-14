# Deploying the Fire Babys Multiplayer Worker

## One-time setup

1. Install wrangler (needs Node 18+):
   ```
   npm install -g wrangler
   ```
2. Log in to Cloudflare (opens a browser):
   ```
   wrangler login
   ```
   Use the same Cloudflare account that owns
   `fire-babys-leaderboard.jeffpruden288.workers.dev`
   (keeps billing + infra in one place).

## Deploy

From `worker/`:

```
cd ~/workspace/fire-babys-multiplayer/worker
wrangler deploy
```

First deploy runs the `v1` migration creating the `GameLobby` and
`LobbyDirectory` Durable Object classes. Output gives you the URL, e.g.:

```
https://fire-babys-multiplayer.<account>.workers.dev
```

## Point the test client at it

1. Open `test/index.html` (serve over http — `npx serve` — or just open the file;
   paste the **wss** URL into the "Worker URL" field, e.g.
   `wss://fire-babys-multiplayer.<account>.workers.dev`).
2. Create a lobby → note the 6-char code.
3. Open the page in a second tab/window, enter the code, Join.
4. Both toggle Ready → host clicks Start → move with WASD/arrows and watch
   the dots sync live.

## (Recommended) custom domain

In the Cloudflare dashboard: Workers & Pages → this worker → Settings →
Domains & Routes → Add Custom Domain, e.g. `mp.firebabys.io`. Then use
`wss://mp.firebabys.io` in the client. Cleaner and stable across deploys.

## Game CSP note

When wiring into the real games, add the worker origin to `connect-src`
in each game's Content Security Policy, e.g.:

```
connect-src https://fire-babys-multiplayer.<account>.workers.dev wss://fire-babys-multiplayer.<account>.workers.dev
```

(or the custom domain equivalent). Without this, browsers block the socket.

## Scaling before launch

- **Workers Paid ($5/mo)** → 10M requests/day vs 100k on free. A single
  full 30-player lobby burns ~30k+ requests/hour; free tier will not survive
  real traffic. Upgrade in dashboard: Workers & Pages → Plans.
- No code changes needed for scale — Durable Objects shard per lobby.

## Local dev (optional)

```
wrangler dev
```

Serves locally with Durable Objects emulated. Point the test page at
`ws://localhost:8787`.

## Tear down a stuck lobby

Lobbies self-delete 5 min after the last player disconnects, and stale
directory entries are pruned after 3 hours. No manual cleanup needed for
Phase 1.
