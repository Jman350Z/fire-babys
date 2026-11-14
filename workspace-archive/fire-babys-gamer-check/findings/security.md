# Fire Babys — Gamer Check, Phase D: Security Audit

- Date: 2026-10-12 (PDT, audit run ~17:14–17:35 / Oct 13 00:14–00:35 UTC in VM logs)
- Scope audited: public mirror `~/workspace/.deploy/` (= public repo tree of Jman350Z/fire-babys, GitHub Pages),
  `~/workspace/fire-babys-fireworld/`, `~/workspace/fire-babys-3d-rebuild/`,
  SPLASH build dir `~/workspace/goals/realm-clash-battle-game/files/fire-babys/`,
  multiplayer worker `~/workspace/fire-babys-multiplayer/worker/`.
- Method: static hash recomputation, Playwright boot test against a local static server,
  targeted grep pattern sweeps + manual eyeballing of every hit, manual code review of both workers.
- **No CRITICAL findings. No real secret was found in any public file. The secrets sweep is clean (see §2).**
- Files changed by this audit: **only this findings file.** No game files were edited, nothing was
  deleted from `.deploy`, nothing was uploaded or deployed anywhere.
- Concurrency note: `.deploy` changed during the audit — at 00:17 (VM time) sibling workers added
  `characters.html`, `parents.html`, `manifest.json`, `icon-192.png`, `icon-512.png`, `world/index.html`.
  All are referenced by `index.html` and are legitimate live files, not stray exposure. Stray-exposure
  results below were re-checked against the tree after that addition.

---

## 1. CSP integrity on `play.html` — PASS

File: `~/workspace/.deploy/play.html` (434,984 bytes), CSP meta at line 20 (file offset ~803).

- CSP `script-src` sha256 hashes in meta: **27**
- Inline `<script>` blocks (no `src` attribute) in the document: **27**
- Recomputed per CSP rules: SHA-256 of the exact UTF-8 text content of each `<script>` element,
  base64-encoded, compared to the meta list.
- **Result: 27 / 27 MATCH. 0 orphan CSP hashes, 0 scripts missing from the CSP.**
  (Hashes match in document order, e.g. block 0 `9ps6bRMP…pgkzo=`, block 26 `1fnc0y1M…2jXU8=` —
  full list reproduced by the audit script; no mismatch to report.)

### Boot test — PASS

- Server: `python3 -m http.server 8932 --directory ~/workspace/.deploy`
- Playwright (Chromium headless, `--use-gl=swiftshader`, re-run with `--no-sandbox`):
  - `GET /play.html` → **HTTP 200**
  - **Page errors: 0**
  - `window.Game` present, `typeof window.Game === "object"` — game object boots
  - Canvas present (`canvas#game` present)
  - Console errors (2, neither is a CSP script block):
    1. `The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.` — expected browser warning, see §5.
    2. `Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED` — traced via `requestfailed` to
       exactly one URL: `https://firebabys.io/auth-gate.js` (the script `play.html` injects at runtime).
       This is the sandbox having no external tunnel, **not** a CSP violation — CSP `script-src`
       explicitly allows `https://firebabys.io` — and it produced no page error.

Severity: **Info (positive result).** The historical SPLASH-killing CSP failure is not present.

---

## 2. Secrets sweep — CLEAN (no real credentials found)

Trees swept: the entire `.deploy` tree plus all three canonical source trees and
`~/workspace/fire-babys-multiplayer/` (binary extensions `.jpg/.png/.webp/.mp4/.pck/.wasm` excluded
from text grep; `index.pck` was separately inspected with `strings`, see §3).

Patterns used: Discord webhook URLs (`discord.com/api/webhooks/…`), `-----BEGIN … PRIVATE KEY-----`,
`AKIA…`, `ghp_/gho_/github_pat_…`, `sk-…` / `sk-(live|test)_…`, Google API keys (`AIza…`), SendGrid
(`SG.…`), Slack tokens (`xox[baprs]-…`), JWTs (`eyJ….eyJ….…`), credentialed connection strings
(`mongodb/postgres/mysql/redis://user:pass@…`), credential-in-URL (`https://user:pass@…`),
`Bearer <literal>`, and literal assignments
`(api_key|api_secret|client_secret|auth_token|access_token|password|secret) = "…"`.
Automated sweep: **0 hits.** Follow-up manual greps for `discord|webhook|password|token|secret|api_key`
were eyeballed hit by hit — every hit is one of the benign cases below.

Benign / by-design items eyeballed and cleared:

| Item | Location | Verdict |
|---|---|---|
| Word "webhook" | `.deploy/3d.html:8940` (+ backups, + `fire-babys-3d-rebuild/`) | A code comment ("webhook pointing at your auth worker (future backend task)"). No webhook URL anywhere in scope. |
| Cloudflare Web Analytics beacon token, redacted `103d…ca69` | `.deploy/3d.html:136` | **Info, not a secret.** `data-cf-beacon` site token — public-by-design, it can only submit analytics beacons for that site property; it is not an API/account credential. No action required (rotating it would only break analytics). |
| `env.RESEND_API_KEY`, `env.GOOGLE_CLIENT_ID` | `.deploy/worker-index.js:620,760` etc. | Read from worker environment at runtime. **No literal values in code** — correct pattern. |
| All other "token" hits (100+ in `3d.html`, `play.html`, `worker-index.js`, `auth-gate.js`, `voting.js`) | throughout | Gameplay/session-token *handling code*: tokens are generated server-side with `crypto.getRandomValues`, stored in `localStorage`/KV, validated against `/^[A-Za-z0-9]{32}$/`. No token *value* is embedded. |
| `ACCOUNTS.md`, `SECURITY.md` | SPLASH canonical dir | Architecture/design documents only (TOTP, HMAC, rate-limit plans). No credentials, no addresses with passwords. |
| Worker endpoint hostnames `*.jeffpruden288.workers.dev` (auth / leaderboard / multiplayer / vote) | client code in `play.html`, `3d.html`, etc. | Public by necessity — the browser client must know where to call. Reveals the Cloudflare account subdomain name only. **Info.** |
| `.env*`, `*.pem`, `*.key`, `*secret*`, `*credential*`, `*.map` files | all scoped trees | **None present.** (Only `wrangler.toml` for the multiplayer worker — contains Durable Object bindings/migrations, no secrets.) |

Out-of-scope note: a Discord webhook URL file exists by design in the goal's private
`hidden_files/` storage (per project records). It was **not read** by this audit, and the important
verified fact is: **no copy of it (or any webhook URL) exists in `.deploy` or any canonical source tree.**

Severity: **Info — sweep clean.** If a real secret had been found in a public file it would have been
reported here as CRITICAL with file/line and a redacted value; there is none to report.

---

## 3. Stray exposure in the public `.deploy` tree

Nothing was deleted (mirror must stay truthful; removals are coordinator action items).
Full `.deploy` inventory was taken; apart from the files below, every file is a live game/page/asset
or is referenced by one. No other `*.bak / *.backup* / *~ / *.old / *.orig / *.env / deploy-*` files exist
in `.deploy` — `deploy-*.html` files exist only in the private SPLASH canonical dir, **not** publicly.

### 3.1 `worker-index.js` — full server source publicly served — **Medium**
- `~/workspace/.deploy/worker-index.js`, 32,360 bytes, 800 lines. Reachable as `https://firebabys.io/worker-index.js`.
- What it is: the **complete source of the Fire Babys auth Cloudflare Worker** (register/Google/email-code
  auth, KV profile/armor/season/weapons, leaderboard) sitting in the static GitHub Pages repo.
- What it exposes: **no credentials** (all secrets are env vars, §2), but the exact defensive logic an
  abuser/cheater would want: KV key schema, token format, every rate-limit number, the stage
  anti-cheat rule, stats delta caps, silver/season unlock thresholds, and the leaderboard scoring formula.
- Recommendation: remove from the Pages repo; keep worker source only in its worker project / a private
  repo. Server source gains nothing from being on the static site — no live page references it
  (verified: no HTML/JS in `.deploy` loads `worker-index.js`). Removal is safe for source
  preservation: the canonical copy exists and is byte-identical at
  `~/workspace/fire-babys-auth/worker/src/index.js` (see §4.0 correction).

### 3.2 `index.pck` — orphaned Godot game pack, source-equivalent disclosure — **Medium**
- `~/workspace/.deploy/index.pck`, 399,996 bytes. Magic `GDPC` — a Godot export pack.
- Referenced by a live page? **No.** Grep of every `.html`/`.js` in `.deploy` for `pck`/`.pck`: **0 references.**
  Root `index.html` is a landing page, not a Godot export, and the `fire-world/*` sub-games in the tree
  are standalone HTML, not Godot exports. Nothing in the tree loads this file.
- Provenance (late-arriving grep, verified directly after): this file is **byte-identical**
  (399,996 bytes, SHA-256 prefix `08628453cdc8888b`) to `~/workspace/.export-out/world/index.pck` —
  the pack belonging to a Godot web export whose companion files (`index.html`, `index.js`,
  `index.wasm`) live alongside it in that export's `world/` directory. In `.deploy` none of those
  companions exist at root, and `.deploy/world/index.html` is only a 510-byte redirect to
  `3d.html?mode=splash`. So this is a stray component of that export sitting at the wrong (root)
  location, loaded by nothing. This strengthens, and does not change, the verdict below.
- What it exposes: the packed Godot project — `strings` shows scene/script paths including
  `res://world/open_world.gd`, `catch_arena/catch_mode`, `player/progression/progression_ui`,
  character scripts, and internal tooling scripts (`capture.gd`, `capture_catch.gd`,
  `capture_catch_cron.gdc`, showcase scripts). A `.pck` can be unpacked with standard Godot tools,
  recovering scenes and compiled script logic — i.e. source-form disclosure of a build that is
  **not** otherwise published in this form (the HTML games are public code; this Godot build is not
  the HTML code). No credentials were found in the sampled strings.
- Recommendation: remove from the public repo (keep in the Godot project archive). Before removal,
  coordinator should confirm no *external* page hot-links `firebabys.io/index.pck` — no in-tree
  consumer exists, so removal is expected to be safe.

### 3.3 `3d.html.backup-stadium`, `3d.html.backup-stadium2` — stale full game copies — **Low**
- 1,019,545 and 1,023,215 bytes (Oct 6), two complete pre-current versions of `3d.html`
  (current: 1,038,851 bytes), served at predictable URLs.
- Exposure: old game code only — no secrets (§2 sweep covered them; same auth-gate reference and
  same loose CSP as current `3d.html`, so no auth-gate bypass beyond running an outdated build).
  Risk is stale/unpatched code remaining playable and indexable, plus ~2 MB of repo bloat.
- Recommendation: remove from the public repo; archive privately if the stadium builds are wanted.

### 3.4 `blog-100posts-backup.html` — full 100-post blog backup — **Low**
- 116,344 bytes, 744 lines, 100 posts. The live `blog.html` contains only the first post;
  this backup publicly publishes all 100.
- Exposure: owner's own blog content only — no secrets, no personal data beyond what the live
  post itself says ("I'm Jeff…"). The issue is intent: it publishes 99 posts the live blog doesn't.
- Recommendation: coordinator/Jeff decision — either this is the intended full blog (then rename/link
  it deliberately) or it is a backup (then remove it from the public repo).

### 3.5 `play-all.html.bak` — stale game index — **Low**
- 14,782 bytes vs current `play-all.html` 14,901 bytes. Diff shows it is an older list: missing the
  Blaze Runner entry and carrying superseded titles/descriptions for games 39–55.
- Exposure: old public game metadata only. Recommendation: remove from the public repo.

### 3.6 `blog-single.html` — exact duplicate — **Info**
- 2,799 bytes; `diff` against `blog.html` is empty (byte-identical duplicate).
- No additional exposure beyond the live blog. Recommendation: remove as housekeeping.

### 3.7 Verified NOT stray
- `auth-gate.js` — loaded by `3d.html` (`https://firebabys.io/auth-gate.js`), `characters.html`, `parents.html`, and injected by `play.html`. Legitimate public client code.
- `voting.js` — loaded by `arcade.html`. Legitimate.
- `fire-world/slingshot-cascade/main.js` — that game's own script. Legitimate.
- `characters.html`, `parents.html`, `manifest.json`, `icon-192/512.png`, `world/index.html` — live files referenced by `index.html` (added by sibling workers during this audit).

---

## 4. Worker review

### 4.0 Mapping problem found first — read this before any "fix" instruction

The task premise "`worker-index.js` and its canonical source in `fire-babys-multiplayer/worker/`"
points at the **wrong project directory**:

- `.deploy/worker-index.js` is the **auth** worker (single file, 800 lines: `/auth/*`, `/profile/*`, `/leaderboard`).
- `fire-babys-multiplayer/worker/` is a **different worker** — a multi-file ES module
  (`src/index.js` + `src/lobby.js` + `src/directory.js` + `src/protocol.js`, Durable Objects,
  WebSocket lobbies) for `fire-babys-multiplayer.jeffpruden288.workers.dev`.
- **CORRECTION (added after a late workspace-wide grep, verified directly):** the auth worker's
  canonical source **does** exist — at `~/workspace/fire-babys-auth/worker/src/index.js`, in a
  separate project the task scope did not name. It is **byte-identical** to `.deploy/worker-index.js`
  (both 32,360 bytes / 800 lines, MD5 `86daed61a263a703a6841631fd4a94d1`, `diff` clean). The
  original version of this section wrongly implied the public copy might be the only copy, because
  the auth project was outside the named scope trees. It is not the only copy; the §2 secrets
  conclusion is unaffected (the canonical file's content is the file already reviewed).

**No code was staged**, for the corrected reasons: (a) the abuse checks in scope (room creation,
players, message floods) belong to the *multiplayer* worker, whose fixes are behavior/config
decisions (MP-1–MP-3) and which has no single-file `.deploy` counterpart to copy to — copying it
over `.deploy/worker-index.js` would overwrite the *auth* worker's public copy with a different
worker's code and deploy nothing; (b) the auth-worker findings are all Low and their fixes are
behavior-changing (AW-1–AW-3). Future auth-worker fixes stage correctly as: edit
`~/workspace/fire-babys-auth/worker/src/index.js`, copy to `.deploy/worker-index.js`, test with
`~/workspace/fire-babys-auth/test-worker.mjs` — with coordinator approval. Backup dir
`~/workspace/fire-babys-gamer-check/backups/security/` was created but is empty — there is no
staged fix to back up. **Nothing is marked STAGED, because nothing was staged. No fix is faked.**

### 4.1 Multiplayer worker — `fire-babys-multiplayer/worker/src/`

What is already good (verified in code):
- Message size: `webSocketMessage` drops non-strings and anything over `MAX_MSG_BYTES = 4096`
  (`lobby.js`, `protocol.js:38`); `JSON.parse` is in try/catch; `msg.t` must be a string.
- Players bounded: join refuses when `players.length >= maxPlayers` (`MAX_PLAYERS = 30`), refuses
  new joins once phase is `playing` (`lobby.js` `handleJoin`).
- Authority: `mode` / `start` / `end` are host-only and phase-gated; names sanitized
  (`sanitizeName`: 16 chars, strips `<>&"'`` `); move relay throttled to ~15 Hz/player, coordinates
  sanity-clamped (|x|,|y| ≤ 5000), `num()` rejects non-finite numbers; `action`/`end` payloads pass
  `safeData()` (JSON round-trip, ≤ 512 bytes) and `kind` is truncated to 24 chars.
- Destructive/internal endpoints are not externally reachable: `GameLobby.fetch` honours
  `/internal/create|state|close`, but the entry worker (`src/index.js`) only ever forwards to the
  hardcoded targets `/internal/state` and `/ws` for `/lobby/:code` routes — an outside caller cannot
  address `/internal/close` or `/internal/create` through the public worker. Same for the directory
  DO's `/register`/`/unregister` (only called stub-to-stub). Good — but this is a single point of
  failure: any future route change that forwards raw pathnames would expose them.

Findings:

- **MP-1 — Unbounded lobby creation — Medium.** `src/index.js`, `POST /api/lobby`: no authentication,
  no rate limit, no body-size cap (`await request.json()` on an unbounded body), no cap on total
  lobbies. Each call creates a Durable Object, writes storage, and registers in the directory.
  A created-but-never-joined lobby also never expires: the empty-lobby alarm is only armed in
  `handleDisconnect`; directory entries go stale after 3 h (`directory.js`), but the DO storage itself
  persists. Impact: cost/quota burn and directory pollution on a free/paid Cloudflare account.
  *Recommendation (behavior/config decision, not staged):* put a Cloudflare rate-limit rule or Rate
  Limiting binding on `POST /api/lobby`; reject `content-length` over ~1 KB and cap body read;
  arm an expiry alarm at creation (e.g. delete if never joined within 30 min); optionally cap total
  active lobbies via the directory before allocating a code.
- **MP-2 — No flood limit on non-move WebSocket messages — Medium.** `lobby.js` `webSocketMessage`:
  only `move` is throttled. `action` is broadcast to every other socket, and `ping`/`ready` are
  processed, with no per-player rate limit — one client can force the DO to fan out thousands of
  small messages/second to up to 29 peers (CPU + egress amplification, lag for real players).
  *Recommendation:* add a simple per-player token/leaky bucket for all message types
  (legit client play is far below, e.g., 20 msg/s sustained), in `lobby.js`. Threshold choice is a
  gameplay decision — not staged.
- **MP-3 — CORS `*` and no WebSocket Origin check — Low.** `src/index.js` sends
  `access-control-allow-origin: *` on everything, and `handleJoin` never checks `Origin`.
  Lobbies are public-by-design (browse + join is a feature), so this is not a data leak; combined
  with MP-1 it lets any website drive lobby creation from visitors' browsers.
  *Recommendation:* allowlist `https://firebabys.io` / `https://www.firebabys.io` (+ localhost for
  the local test page, if still used) for both HTTP CORS and the WS upgrade. Behavior-changing for
  any unknown embedder — coordinator decision, not staged.
- **MP-4 — Slot squatting by design — Low/Info.** Disconnected players are never removed from
  `players[]` (they can reconnect with their server-issued token — a deliberate feature), so a
  griefer can fill a lobby's 30 slots with idle sockets. Mitigated by: lobby codes are required,
  empty lobbies self-delete 5 min after the last disconnect (`EMPTY_TTL_MS`). No change recommended
  beyond MP-1/MP-2 limits.
- **MP-5 — Public state/list endpoints — Info.** `GET /api/lobbies` and `GET /lobby/:code` are
  unauthenticated and expose code, mode, phase, player ids and (sanitized) display names.
  This is the intended browse-and-join design, and codes are published by the list endpoint anyway.
  6-char codes from a 31-char alphabet (~887 M combinations) are not a meaningful secret.

### 4.2 Auth worker — `.deploy/worker-index.js` (see §3.1 for its public exposure)

What is already good (verified): body cap `MAX_BODY_BYTES = 2048` in `readBody` with safe JSON
parse; rate limits — register 5/hr/IP, Google auth 30/hr/IP, verification-code 5/hr/IP, profile
120/hr per account; Google ID tokens fully verified (RS256 signature vs Google JWKS, `aud`, `iss`,
`exp`, `email_verified`); session tokens validated by format then KV lookup; register **never
re-issues a token on email alone** (409 for existing accounts — hijack-by-email is closed);
verification codes are hashed, 10-min TTL, max 5 attempts, single-use; profile writes are
anti-cheat shaped (stages must be earned in order, stat deltas capped at 0–5/call, weapon ids
allowlisted, season boost derived server-side); `sanitizeName` applied; CORS is an **allowlist**
(`https://firebabys.io`, `https://www.firebabys.io`) — the correct pattern the multiplayer worker lacks.

Findings:

- **AW-1 — `GET /auth/count` is unauthenticated — Low.** Returns the total registered-user count to
  anyone. Harmless in isolation, useful reconnaissance/ vanity-metric leakage. *Recommendation:*
  require a token or remove the route if the dashboard no longer uses it.
- **AW-2 — `GET /leaderboard` scans all profiles on every request, unauthenticated, no rate
  limit/cache — Low.** It KV-lists every `profile:` key and fetches each one, every call. The data
  returned (display name, wins/kills/stage/armor flags) is the intended public leaderboard, but the
  implementation is a cost-amplification invitation as the user base grows. *Recommendation:*
  cache the computed board for ~60 s, or maintain it incrementally.
- **AW-3 — `POST /auth/verify` has no IP rate limit — Low.** Mitigations already present (5 attempts
  per code, then the code is destroyed; requesting a code is 5/hr/IP) make 6-digit brute force
  impractical, but note that requesting a fresh code overwrites the old one and resets the attempt
  counter — an attacker can mint fresh codes *for a victim's address* (they still never see them).
  *Recommendation:* add the same per-IP bucket used by `/auth/code` to `/auth/verify`.
- **AW-4 — Unverified registration is a documented trade-off — Low.** `/auth/register` issues a
  token for any well-formed email with `emailVerified:false` (legacy fallback when Resend is not
  configured). That allows squatting someone else's address — but the squatter gains nothing of the
  real owner's (no token re-issue, §above) and the owner can recover via Google or email code.
  Recorded so the decision stays visible; no change staged.
- **AW-5 — Cosmetic — Info.** `genToken()` uses `byte % 62` (slight modulo bias over a 32-char
  token — cryptographically negligible at ~190 bits); `readBody` measures the 2048 cap in UTF-16
  code units, not bytes (worst case a few KB — still bounded); `clientIp()` falls back to
  `x-forwarded-for` only when Cloudflare's `cf-connecting-ip` is absent. No action needed.

Client-side spot check (not a full XSS audit): in `auth-gate.js` the user-supplied email is
HTML-escaped before being placed via `innerHTML` (code-step, ~line 182), error text uses
`textContent`; in `voting.js` server-supplied email/voted-game title are assigned via
`textContent` and game ids are slug-sanitized before interpolation. No unsafe sink found in either file.

---

## 5. Headers / CSP presence — GitHub Pages reality

Checked: `index.html`, `play.html`, `3d.html`, `fire-world.html`, `play-all.html`
(plus `arcade.html`, `blog.html`, `history.html`, `characters.html`, `parents.html` for completeness).

| Page | CSP `<meta>` | Notes |
|---|---|---|
| `play.html` | **Yes — strong, hash-based (§1)** | `default-src 'none'`, 27 script hashes, `base-uri/form-action/object-src 'none'`. Best page on the site. |
| `3d.html` | Yes — weak | `script-src 'self' 'unsafe-inline' https://firebabys.io https://accounts.google.com` — `'unsafe-inline'` removes most XSS value of the CSP; **no `frame-ancestors` at all**. **Low.** |
| `index.html` | **No** | No CSP, no referrer meta. Loads no external scripts itself, but injects the auth flow via linked pages. **Low.** |
| `fire-world.html` | **No** | **Low.** |
| `play-all.html` | **No** | Links out to all games; has `innerHTML` usage. **Low.** |
| all other pages checked | **No** | Same pattern. **Info/Low.** |

Missing on **every** page checked: `<meta name="referrer">` (Referrer-Policy). This one *can* be
done in a meta tag — recommendation: add
`<meta name="referrer" content="strict-origin-when-cross-origin">` to the main pages. **Low/Info**
(no secrets appear in these pages' URLs; multiplayer *codes* in shared links are the main thing a
full referrer would carry to third parties).

Honest platform limits (so nobody "fixes" these the wrong way):
- GitHub Pages serves **no custom response headers**. A `_headers` file is a Netlify / Cloudflare
  Pages convention and is **ignored** by GitHub Pages.
- `frame-ancestors` in a `<meta>` CSP is **ignored by browsers** — confirmed live in the §1 boot
  test console. So `play.html`'s clickjacking protection is currently **not effective**, despite the
  directive being present. There is no meta equivalent for `X-Frame-Options` either.
- `X-Content-Type-Options: nosniff` likewise has **no working meta equivalent**.
- Real fixes, if framing/nosniff ever matter for this site: serve through Cloudflare (already the
  DNS/Worker provider) with Transform Rules / a Pages migration to set real `Content-Security-Policy`,
  `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, and `X-Content-Type-Options` headers.
  For a static kids' game site with no user-content rendering on most pages, current residual risk
  is **Low/Info** — this is a hardening opportunity, not an incident.

---

## 6. Summary of action items for the coordinator (nothing below was done by this audit)

1. **Remove from public repo (Medium):** `worker-index.js` (§3.1), `index.pck` (§3.2 — confirm no external hot-link first).
2. **Remove from public repo (Low):** `3d.html.backup-stadium`, `3d.html.backup-stadium2`, `play-all.html.bak`, `blog-single.html` (duplicate); decide intent for `blog-100posts-backup.html`.
3. **Multiplayer worker (Medium, needs decisions):** rate-limit + body cap + creation-expiry for `POST /api/lobby` (MP-1); per-player WS message rate limit (MP-2); CORS/Origin allowlist (MP-3, Low).
4. **Worker-source mapping — resolved (§4.0 correction):** auth worker canonical home is `~/workspace/fire-babys-auth/worker/src/index.js` (byte-identical to the public copy); multiplayer canonical home is `~/workspace/fire-babys-multiplayer/worker/src/`. Stage future fixes in the matching project only. **Do not** copy `fire-babys-multiplayer/worker/src/*` over `.deploy/worker-index.js`.
5. **Auth worker (Low):** gate or drop `/auth/count` (AW-1); cache `/leaderboard` (AW-2); IP rate-limit `/auth/verify` (AW-3).
6. **Hardening (Low/Info):** add referrer meta to main pages; consider hash-CSP for `3d.html` in line with `play.html`; real security headers require a Cloudflare-fronted serving change (§5).
