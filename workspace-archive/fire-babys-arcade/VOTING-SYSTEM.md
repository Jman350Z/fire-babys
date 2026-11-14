# Fire Babys Arcade — Creator-Only Voting System (v1 spec)

**Requested by:** Jeff, 2026-10-05 ~13:57 PDT
**Purpose:** pick the creator game mode that ships in the official phone app — voted on by creators only, bot-proof.

## Jeff's rules (the law for this system)

1. **Only creators can vote** — and only if ALL THREE are true:
   - they submitted a game through the official submission form (real name + phone + address + email on file, per competition eligibility),
   - their game passed review and is **LIVE** on firebabys.io/arcade.html,
   - their email is verified.
2. **No cheating, no bots.** One vote per verified email. No self-votes.
3. Jeff keeps the final yes/no — the vote picks the finalist; nothing ships (and the $10,000 is not paid) without Jeff's approval. Standing rule, unchanged.

## Why bots can't win this vote

The vote is **not** open to the public. The server holds a private eligibility list
(`vote:creator:<emailHash>` in AUTH_KV) that is written ONLY when a game passes the
full review checklist and goes live on the arcade page — a human-reviewed event.

- A voter must sign in with Google; the worker verifies the Google ID token
  server-side against Jeff's production OAuth app (same `verifyGoogleIdToken`
  path as the auth worker's `/auth/google`).
- Google verifies the email. The server then checks the eligibility list.
- A million fake Google accounts can't vote, because fake accounts are never on
  the approved-creators list. The list is server-side only — the client never
  sees it, so there's nothing to scrape or forge.
- One vote per verified email (keyed by sha256(email)); re-voting replaces the
  previous ballot — one creator, one live vote, ever.
- No self-votes: the ballot served to a voter excludes their own game.
- Voting window is server-side (`vote:config.open`); votes outside the window
  are rejected. Tallies are hidden until the window closes (public after close;
  Jeff/Bobby can see them anytime with the admin token).

## Flow

1. **Submission** → creator submits via the official form (name/phone/address/email,
   game URL, rules checkbox). Lands in the review queue.
2. **Review** → auto-screener → Bobby human review → Jeff batch yes/no.
3. **Publish** → on publish, the review pipeline adds two records to AUTH_KV
   (via a Bobby/Jeff-only admin call):
   - `vote:creator:<emailHash>` → `{ name, gameId, addedAt }`
   - `vote:game:<gameId>` → `{ title, by }`
4. **Vote** → creator visits `firebabys.io/vote.html`, taps "Sign in with Google",
   gets their ballot (all live games except their own), picks one, confirms.
   They can change their vote any time before the window closes.
5. **Close** → Jeff calls the close (or it closes automatically at `closesAt`).
   Public tally appears on the vote page. Winner → Jeff's final yes → phone-app
   shipment and the $10,000.

## API (drop-in endpoints for the fire-babys-auth worker)

Full draft implementation: `worker-vote-endpoints.js` (same file style, same
helpers: `json()`, `sha256Hex()`, `normalizeEmail()`, `verifyGoogleIdToken()`).

- `POST /vote/eligibility` `{ idToken }` →
  `{ ok, eligible, votingOpen, hasVoted, games: [{id,title,by}], closesAt }`
  Errors: `bad_request`, `google_not_configured`, `invalid_token`, `not_eligible`,
  `voting_closed`.
- `POST /vote/cast` `{ idToken, gameId }` →
  `{ ok: true, replaced: <bool> }`
  Errors: same + `self_vote`, `unknown_game`, `rate_limited`.
- `GET /vote/tally?admin=<token>` →
  `{ ok, counts: {gameId: n}, total, closed }` — public only when closed; admin
  token sees it anytime.
- `POST /vote/admin` (admin token) → actions: `open`, `close`, `add_creator`,
  `add_game`, `remove_creator`. Bobby/Jeff only.

KV schema (all keys under AUTH_KV):

| Key | Value |
|---|---|
| `vote:config` | `{ open: bool, closesAt: iso|null }` |
| `vote:creator:<sha256(email)>` | `{ name, gameId, addedAt }` |
| `vote:game:<gameId>` | `{ title, by }` |
| `vote:ballot:<sha256(email)>` | `{ gameId, ts }` |
| `vote:log:<ts>:<sha256(email)>` | `{ gameId, ip }` (audit) |
| `vote:admin` | `{ tokenHash }` |

## Client page

`vote.html` (draft ready) — single self-contained page, Fire Babys styling:

- Google Sign-In button (GSI, client ID from `/auth/config` — never hardcoded).
- States: sign-in → checking → eligible ballot / ineligible ("your game isn't
  live yet" + link to submit) / voting closed → vote confirmation → change vote.
- Ineligible page explains exactly why (not on the approved list) without
  leaking the list.

## Open decisions for Jeff

1. **When does voting open?** Suggestion: automatically once 2+ creator games
   are live; closes on your call. (Window is one admin tap either way.)
2. **Vote page URL:** `firebabys.io/vote.html`, or fold it into `arcade.html`
   as a section? Suggestion: separate page — cleaner, and the tally display
   needs its own layout.

## Deploy order (blocked right now)

1. Worker endpoints → deploy `fire-babys-auth` (wrangler; verify `/vote/tally`
   admin auth works).
2. `vote.html` → firebabys.io root via GitHub web-upload path (browser
   infrastructure is down as of 2026-10-05 ~13:56 PDT — queued).
3. COMPETITION-RULES.md → add the voting paragraph (repo edit, needs the same
   upload path).
4. REVIEW-CHECKLIST.md → the "add voter eligibility record" step (already
   drafted below — local copy updated).

Nothing about this changes the existing pipeline: the auto-screener, human
review, and Jeff's batch yes/no all stay exactly as they are. Voting only ever
happens between approved, live games.
