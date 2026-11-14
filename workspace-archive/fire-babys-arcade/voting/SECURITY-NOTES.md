# 🔒 Voting System — Security Notes & Threat Model

## What's protected

**1. Only verified humans vote.**
Every vote requires a session token issued by the `fire-babys-auth` worker,
which only issues tokens after verifying a Google ID token (RS256 signature
against Google's JWKS, audience/issuer/expiry checks, `email_verified=true`).
There is no anonymous path — `/vote` has no way to accept a vote without a
valid token. Bots can't invent verified Google accounts at scale.

**2. Only live creators are on the voter roll.**
Eligibility is checked server-side against the `voterroll` KV doc, which
only the owner can write (via `/admin/roll` + `ADMIN_KEY`). The client never
decides who's eligible — `voting.js` only renders what `/votestatus` tells it.

**3. One vote per verified email — server-side.**
`vote:{sha256(email)}` is written once; any second attempt returns
`already_voted` (409). The check and the email identity both live
server-side, so client tampering can't bypass it.

**4. No self-votes.**
The roll maps each voter to their own `gameId`; voting for it returns
`no_self_vote` (403), enforced in the worker.

**5. Results are secret until the reveal.**
Tallies are computed server-side and only exposed via `/results`, which
requires the `ADMIN_KEY` (compared with a timing-safe check). Public
endpoints expose only the total count ("N creators have voted") and the
game list — never per-game votes. This kills bandwagon voting.

**6. Rate limiting.**
`/vote`: 20/hour per IP. `/votestatus` + `/games`: 120/hour per IP.
(The binding constraint is one vote per email, not the IP limit.)

**7. Audit trail.**
Every vote writes `votelog:{timestamp}:{emailHash}` with game, timestamp,
and a truncated IP hash (1-year TTL). If results are ever disputed, the
log can be replayed.

**8. Admin key hygiene.**
The key is compared timing-safe, never logged, and only travels over HTTPS
(Cloudflare workers are HTTPS-only). The `format=html` results page is a
convenience — treat its URL as a password.

**9. Input validation.**
Game IDs must match `^[a-z0-9-]{1,64}$` and exist in the roll. Emails are
normalized (trim + lowercase) before roll lookup and hashing. Request
bodies are size-capped. CORS allows only `firebabys.io` origins for
browser calls.

## What's NOT protected (accepted risks)

**Google-account farms / multiple Google accounts per person — OUT OF SCOPE.**
If someone controls 5 real verified Google accounts, they get 5 votes only
if all 5 emails are on the creator roll — and roll entries come from
approved submissions, which require a real name, phone number, and mailing
address. Sybil resistance therefore rests on the *submission identity
requirements*, not on the voting layer. If abuse appears, cross-check voter
emails against submission PII before paying the prize.

**Voter roll freshness.**
If a game is removed from the arcade but its creator already voted, the vote
stands. Jeff should rebuild the roll promptly when games go live/are removed.

**KV eventual consistency.**
`vote:` existence checks are strongly consistent per key (a double-click
can't create two votes for one email — same key overwrites). The public
`votedCount` and tallies use KV listing, which is eventually consistent —
counts may lag by seconds. Fine for this use.

**Admin key exposure.**
Anyone with `ADMIN_KEY` can read results and rewrite the roll. Rotate it
(`wrangler secret put ADMIN_KEY`) if it's ever pasted anywhere public.
Consider IP allowlisting on `/admin/*` if the Cloudflare plan supports it.

**Client UI is advisory.**
`voting.js` hides/disables buttons for UX, but all real enforcement is in
the worker. A hostile client calling the API directly gets the same
server-side rejections.

**No vote-change / vote-revoke.**
By design: one vote, final. Documented in the UI ("one vote per creator").

## Kid-safety note

Voters are creators (expected 13+ given the 18+/guardian prize rule), not
the kid player audience. No children's data is collected by the voting
system — only the creator's Google-verified email, already held by the auth
worker. The UI strings are kid-safe and brand-consistent.

the future is BLAZING FOR FIRE BABYS 🔥
