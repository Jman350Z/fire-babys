# 🗳️ Fire Babys Arcade — Creator Voting: Setup Guide

File delivery only — nothing here is deployed yet. Follow the steps in order.

## What was built

| File | What it is |
|------|------------|
| `worker.js` | Cloudflare Worker: `/vote`, `/votestatus`, `/games`, `/results`, `/admin/roll` |
| `voting.js` | Client UI snippet for `arcade.html` (vote buttons, sign-in, states) |
| `update-roll.py` | Builds the voter roll from the submission Sheet |
| `wrangler.toml` | Worker config (KV binding + `VOTING_OPEN` flag) |

All three code files syntax-check clean; `worker.js` passed a 14-case
functional test (eligibility, self-vote block, double-vote block, closed
voting, admin-key protection, tallies).

## Step 1 — Deploy the worker

Option A — Cloudflare dashboard (no computer needed beyond a browser):
1. Go to Workers & Pages → Create → Create Worker → name it `fire-babys-vote`.
2. Paste the entire contents of `worker.js` into the editor → Save.
3. Settings → Variables:
   - Add variable `VOTING_OPEN` = `0` (voting starts CLOSED; you open it later).
   - Add secret `ADMIN_KEY` = a long random string (Settings → Variables → Encrypt). **Save this somewhere safe — it's the only key to the results.**
4. Settings → Bindings → KV Namespace → Add binding:
   - Variable name: `KV`
   - Namespace: **the SAME namespace the `fire-babys-auth` worker uses** (its `wrangler.toml` has id `64361da69ecb417bb1cc8ab64ab71311`). Sharing the namespace lets this worker validate the auth worker's session tokens.
5. Deploy. Note the worker URL, e.g. `https://fire-babys-vote.jeffpruden288.workers.dev`.

Option B — wrangler (from a computer):
```
cd ~/workspace/fire-babys-arcade/voting
wrangler secret put ADMIN_KEY
# edit wrangler.toml: VOTING_OPEN = "0"
wrangler deploy
```

## Step 2 — Wire the voting UI into arcade.html

1. Copy `voting.js` next to `arcade.html` (repo root of `fire-babys`, so it
   deploys to `firebabys.io/voting.js`).
2. For every **live creator game card**, add the game's slug:
   ```html
   <article class="card" data-game-id="ember-dash">
   ```
   The slug comes from `update-roll.py` (derived from the game title).
   The OFFICIAL 🌊 SPLASH card gets **no** `data-game-id` — the flagship
   isn't part of the creator vote.
3. Before `</body>`, add:
   ```html
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   <script>
     window.FB_VOTE_URL = "https://fire-babys-vote.jeffpruden288.workers.dev";
     window.FB_AUTH_URL = "https://fire-babys-auth.jeffpruden288.workers.dev";
   </script>
   <script src="/voting.js"></script>
   ```
   (Use the real worker URLs from Step 1.)

## Step 3 — Build and upload the voter roll

The roll = creators whose games passed review and are live. Rebuild it
every time new games go live:

```
cd ~/workspace/fire-babys-arcade/voting
python3 update-roll.py --approved "Ember Dash" --approved "Frost Fray"
# (or run with no args and pick numbers interactively; --merge roll.json keeps old approvals)
```

Then upload it (replace `$ADMIN_KEY` and `$VOTE_WORKER` with real values):

```
curl -X POST "$VOTE_WORKER/admin/roll" \
  -H 'content-type: application/json' \
  -d "{\"key\":\"$ADMIN_KEY\",\"roll\":$(python3 -c 'import json; print(json.dumps(json.load(open("roll.json"))["voters"]))')}"
```

Verify: `curl "$VOTE_WORKER/admin/roll?key=$ADMIN_KEY"` → shows voter count.

Notes:
- The script reads the submission Sheet (same config as the screener).
- If a creator submitted with a different email than their Google sign-in,
  add `"Game Title": "their-google@gmail.com"` to `approved-overrides.json`.
- Removing a creator from a future roll does NOT delete votes they already
  cast (they were eligible at the time).

## Step 4 — Open voting

When the arcade has live creator games and you're ready:

- Dashboard: Workers → `fire-babys-vote` → Settings → Variables → set
  `VOTING_OPEN` = `1` → Save (takes effect immediately, no redeploy).
- Or wrangler: set `[vars] VOTING_OPEN = "1"` in `wrangler.toml` → `wrangler deploy`.

To close: set it back to `0`.

## Step 5 — Read the results (owner only)

JSON:
```
curl "$VOTE_WORKER/results?key=$ADMIN_KEY"
```

Pretty page in a browser (keep the URL private — the key is in it):
```
https://<your-vote-worker>/results?key=$ADMIN_KEY&format=html
```

Response: `{ ok, open, totalVotes, tallies: [{gameId, title, votes}] }`
sorted highest-first, plus `generatedAt`.

**Never share the results URL or the tallies publicly until the reveal.**
The public only ever sees "N creators have voted."

## How it works (the 30-second version)

1. Creator signs in with Google on the arcade page → the existing
   `fire-babys-auth` worker verifies them and issues a session token.
2. `voting.js` asks the vote worker: is this email on the creator roll?
3. Eligible creators get a Vote button on every *other* creator's game card.
4. One vote per email, enforced server-side in KV. No self-votes.
5. Tallies are computed from the vote records — only the admin key can see them.

the future is BLAZING FOR FIRE BABYS 🔥
