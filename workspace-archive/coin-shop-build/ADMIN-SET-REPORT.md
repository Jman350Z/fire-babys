# ADMIN SET — master admin emails + account password + starter-kit ship (2026-10-21 night)

## ⚠️ HEADLINE: code is built, tested, and staged — the DEPLOY IS BLOCKED, stopped on purpose

`deploy_auth.py` (the F5-safe script, the only sanctioned path) **aborted by its own
design before uploading anything**:

```
Live bindings (4): ['ADMIN_KEY', 'AUTH_KV', 'GOOGLE_CLIENT_ID', 'RESEND_API_KEY']
ABORT: these live bindings hold values the API cannot read back;
re-uploading would WIPE them: ['ADMIN_KEY']
(exit 3 — snapshot saved to backend/deploy-backups/bindings-20261022-053106.json)
```

Why: the 20:00 deploy earlier today ran with only 3 bindings. **ADMIN_KEY was added to
the Worker after that deploy** (to fire the Great Kick), and its value is known to
nobody — the Cloudflare API never returns secret values, so any API re-upload would
silently wipe ADMIN_KEY and close `/admin/kick` + `/auth/count`. The script exists
precisely to refuse that trade. Per the task's hard rule (*F5-safe script only; if
blocked, STOP and report — never use a different deploy path*), I stopped.

**The script's own documented fallback is `wrangler deploy`** (it preserves secrets —
see deploy_auth.py's header and DEPLOY.md). That needs a human go-ahead because this
task forbade another path. Everything below is ready for that one command:
`coin-shop-build/backend/index.js` is copied to `fire-babys-auth/worker/src/index.js`
(the wrangler source), all tests green.

**Nothing live changed.** Proven after the abort: `/auth/config` byte-identical,
auth `/leaderboard` byte-identical (sha256 f6d76b2c… before and after), KV counts
identical (user 7 / token 7 / profile 5), bindings identical (same 4, ADMIN_KEY
intact), RESEND_API_KEY untouched (still the empty plain-text binding;
`emailVerification:false`, as expected).

---

## What existed before

- **No user-role/admin concept at all.** The only "admin" in the backend was the
  `ADMIN_KEY` secret guarding `/auth/count` and `/admin/kick` (ops endpoints,
  unrelated to player accounts). No `role`/`isAdmin` field anywhere.
- **No passwords anywhere.** A full-text search of the backend finds zero password
  handling — no field, no hash, no scheme. Sign-in has only ever been: stored token
  (`/auth/register` + `/auth/session`), email code (`/auth/code` + `/auth/verify`),
  or Google (`/auth/google`). User records: `user:{sha256(email)} ->
  { email, name, createdAt, token, emailVerified? }`.
- **Accounts for Jeff's two emails:**
  - `jeffpruden288@gmail.com` — **record EXISTS**, created **2026-10-03T05:43:32Z**
    (name "Jeff Pruden"), plus a profile record (maxStage 1). No password field
    (none existed for anyone).
  - `jeffprudengficompany@gmail.com` — **no user record, no profile** (KV 404 on
    both keys).

## What changed in code (staged, tested, NOT yet live)

File: `coin-shop-build/backend/index.js` (copied to `fire-babys-auth/worker/src/index.js`).
The starter-kit work from earlier today rides in the same file — I verified by diff
that the ONLY differences vs. the currently deployed source are starter-kit +
this change set.

1. **TOP ADMIN allowlist (central):** `ADMIN_EMAILS =
   { jeffpruden288@gmail.com, jeffprudengficompany@gmail.com }` + one helper,
   `isTopAdmin(email)` (case-insensitive over normalized email), and
   `roleFields(email)` → `{ role: "top_admin" | "player", isAdmin: bool }`.
2. **Exposure:** `role`/`isAdmin` now ride on `/auth/session`, `/auth/register`,
   `/auth/google`, `/auth/verify`, every `/profile/*` response (via
   `publicProfile`), every `/locker/*` response (via `publicLocker`), and the new
   `/auth/password`. Accounts *created* under a listed email also get
   `role:"top_admin"` stamped on their user record. The allowlist works for a
   brand-new registration — it reads the email, never client input.
3. **Password scheme (new — the system had none):** PBKDF2-SHA256, 100,000
   iterations (the Workers ceiling), 16-byte random salt, stored on the user record
   as `passwordHash = "pbkdf2$100000$<salt b64>$<key b64>"`, constant-time verify.
   New endpoint `POST /auth/password {email, password}` mirrors the Google/code
   sign-ins (restores the account's token, re-stamps the current session epoch) and
   answers ONE generic `401 invalid_credentials` for no-account / no-password /
   wrong-password. Per-IP capped (30/hr, AW-3 pattern). Plaintext is never stored,
   returned, or logged.

**Tests (all local, against the real module + FakeKV):**
- New suite `tests/test-admin-password.mjs`: **52 passed, 0 failed** — allowlist
  (incl. a synthetic 288 user, case/whitespace variants), role exposure on
  register/session/profile/locker, record stamp, PBKDF2 round-trip, wrong/malformed
  rejection, `/auth/password` success (restores the account's existing token),
  generic-401 sameness, and company-email-has-no-password.
- Regression: starter-kit suite **104/104**, kick suite **71/71**.

## KV changes made tonight (data only — they take effect when the code deploys)

On `user:{sha256(jeffpruden288@gmail.com)}`, merged in place, every pre-existing
field byte-preserved (email, name, createdAt, token all verified unchanged, no TTL):

- `role: "top_admin"` stamped.
- `passwordHash` set to a hash of **the password Jeff supplied** (his chat value,
  used transiently via stdin only; hashed by the new code's own `hashPassword`;
  the stored hash was then verified locally with the same code — accepts the
  supplied password, rejects a wrong one). The value appears nowhere in this
  report, the code, or any file; temp working copies were deleted.
- The company email got **no record and no password** — allowlist only, per orders.

## Verification results

| Check | Result |
|---|---|
| `/auth/config` before/after | **Identical** — `emailVerification:false`, same googleClientId |
| Auth `/leaderboard` before/after | **Byte-identical** (sha256 f6d76b2c8b…) |
| KV counts before/after | **Identical** — user: 7, token: 7, profile: 5 |
| Bindings before/after | **Identical** — ADMIN_KEY, AUTH_KV, GOOGLE_CLIENT_ID, RESEND_API_KEY (RESEND value untouched) |
| gfi account | Still absent — allowlist only, as ordered |
| Stored password hash vs. supplied password | **Verified locally** with the shipping code (accepts supplied, rejects wrong) |
| Live `POST /auth/password` | **404 `not_found`** — expected: the endpoint exists only in the staged code until the deploy lands. **This is the one verification that cannot complete until the deploy is unblocked.** |
| Starter-kit grant live | **Cannot run yet** — depends on the same blocked deploy. Locally proven (104/104 incl. grant-on-first-`/locker/get`, exactly-once). Re-run after deploy: `/locker/get` twice for a pre-existing account, inventories identical, starter items present once. |
| Test profile (`token.json`, fbtest account) | **Was already `invalid_token` BEFORE this task touched anything** — its token record predates the Great Kick (no epoch field = epoch 1; live epoch is 2). The deploy changed nothing here: same 401 before and after the abort. It cannot be used for the post-deploy locker check until it signs back in fresh (which re-stamps epoch 2). Jeff's own 288 account is the right vehicle for that check once the deploy lands: sign in (password or Google), then `/locker/get` ×2. |

## The 288 account — exact admin state

- Record exists (created 2026-10-03), now carries `role:"top_admin"` in KV.
- Its email is on the `ADMIN_EMAILS` allowlist, so **the moment the staged code
  deploys, every session/profile/locker response for this account reports
  `role:"top_admin", isAdmin:true`** — allowlist and record agree.
- A password is now set on the account (hash only, see above). There was **no
  password to "change" from** — the game never had passwords; Jeff's sign-ins to
  date were his device token / Google. Until the deploy lands, his working way in
  with this email is **Google sign-in** (configured live) onto this same account,
  or a device that still holds its token. After the deploy, `POST /auth/password`
  with the email + the password he supplied signs him in directly (verified locally
  end-to-end; live check pending the deploy).

## What unblocks this

One decision: authorize the `wrangler deploy` fallback that deploy_auth.py itself
documents for exactly this situation (ADMIN_KEY added post-deploy, value unreadable).
Wrangler preserves existing secrets, so ADMIN_KEY / GOOGLE_CLIENT_ID / RESEND_API_KEY
survive. After it lands, re-run: `/auth/password` live sign-in for the 288 account
(expect `ok:true, role:"top_admin"`), `/locker/get` ×2 starter-grant check, and the
config/leaderboard/count diffs above (all baselines saved in /tmp during this run —
re-capture before deploying since the leaderboard can move).
