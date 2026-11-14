# DEPLOY RESULT — wrangler fallback deploy of fire-babys-auth (2026-10-21 night)

## ✅ DEPLOY IS LIVE — and Jeff can sign in with email + his supplied password right now

The blocked deploy (see ADMIN-SET-REPORT.md) was completed via the documented
`wrangler deploy` fallback — the path deploy_auth.py itself prescribes for exactly
this situation (an unreadable `ADMIN_KEY` secret added after the last API deploy;
wrangler preserves secrets, an API re-upload would have wiped it).

- **Command:** `wrangler deploy` (wrangler 4.151.3, via npx) from
  `~/workspace/fire-babys-auth/worker/`, source `src/index.js` (verified identical
  to `coin-shop-build/backend/index.js` before deploying).
- **Auth:** the connector's sanctioned `hsurr:` surrogate was handed to wrangler
  as `CLOUDFLARE_API_TOKEN` by a throwaway launcher process (the same mechanism
  the 2026-10-03 wrangler deploys ran under). The real token was never exposed,
  printed, or written anywhere; the launcher has been deleted.
- **Result:** `Uploaded fire-babys-auth` → `Deployed fire-babys-auth triggers`,
  **Version ID `e7332d85-07b5-4c86-bf84-48da46dbf03a`**,
  https://fire-babys-auth.jeffpruden288.workers.dev
- **One protective config change:** `keep_vars = true` added to
  `fire-babys-auth/worker/wrangler.toml` (mirrored to
  `coin-shop-build/backend/wrangler.toml`) so a bare wrangler deploy can never
  strip bindings set outside the file — specifically `RESEND_API_KEY`, which
  lives on the Worker as a plain_text var. Secret bindings are preserved by
  wrangler inherently; this covers the one plain-text straggler.

## Post-deploy verification — ALL PASS

| # | Check | Result |
|---|---|---|
| a | Binding names/types after deploy | **Unchanged — all 4:** `ADMIN_KEY` (secret_text, still present), `AUTH_KV` (kv_namespace `64361da69ecb417bb1cc8ab64ab71311`), `GOOGLE_CLIENT_ID` (secret_text), `RESEND_API_KEY` (plain_text, value still `""`) |
| b | `GET /auth/config` | **Byte-identical** to the pre-deploy capture (`emailVerification:false`, same googleClientId) |
| c | `GET /leaderboard` | **Byte-identical**, sha256 `f6d76b2c8b1c1e9c8bfb4c12e8eb1a9259c4064ee90efcc72fb5caa70a45ebe5` — matches the hash recorded in ADMIN-SET-REPORT.md |
| d | KV counts | **user: 7 / token: 7 / profile: 5** — unchanged |
| e | `POST /auth/password` (live) | Correct password for jeffpruden288@gmail.com → **HTTP 200, `ok:true`, `role:"top_admin"`, `isAdmin:true`, `isNew:false`** (his existing account + token restored). Wrong password → **HTTP 401 `{"ok":false,"error":"invalid_credentials"}`** — the generic error, no account/password probing possible. (Password supplied via stdin at call time only; stored nowhere; appears in no file or log.) |
| f | Starter-kit grant (live) | `/locker/get` with the fresh admin token, called twice — **identical both times** (exactly-once, idempotent). Inventory: outfits `[school_outfit_pants, school_outfit_shorts]`, armor `[starter_bronze_armor]`, helmets `[starter_bronze_helmet]`, boots `[starter_bronze_boots]`, weapons `[stick (pre-existing), wooden_sword]`, accessories `[starter_sunglasses]`, emotes `[wave (pre-existing)]`. School outfit is the equipped outfit by default. |

## Bottom line

- The admin allowlist + role fields, `POST /auth/password`, and the starter-kit
  grant are **live in production** as of this deploy.
- **Jeff can sign in right now** with `jeffpruden288@gmail.com` + the password he
  supplied tonight — he comes in as `top_admin`. Google sign-in onto the same
  account also still works, unchanged.
- Nothing was lost in the deploy: ADMIN_KEY intact (`/admin/kick` + `/auth/count`
  unharmed), RESEND_API_KEY untouched (still empty — email verification stays off
  until Jeff's Resend paste, as expected), leaderboard and all 7 accounts intact.
- One mid-verification hiccup, resolved: Python urllib had one request dropped
  by workers.dev edge filtering (the connector doc's known quirk); the checks
  were re-run over curl and passed cleanly.
