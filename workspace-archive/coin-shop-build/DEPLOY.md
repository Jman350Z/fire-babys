# DEPLOY.md — Coin Economy + Dual Shop + Gate Rework + Player Locker + Sign-in Fixes + Turnstile

**Status: STAGING ONLY — nothing here is live.** Everything was built and
verified in `~/workspace/coin-shop-build/`. Deploy in the exact order below
(backend first, then frontend, then the offline reseal).

This ship contains FIVE workstreams (all Jeff, 2026-10-21):
1. Coin economy overhaul + main-menu dual shop.
2. Math-gate wording scrub + 5-problem → 24-hour unlock.
3. Player locker (ONE per player/account, server-side).
4. Sign-in persistence fixes F1/F2/F4/F5 from
   `~/workspace/signin-audit-2026-10-21/FIX-SPEC.md`.
5. **The Great Kick + first-run onboarding** — a global session epoch
   that signs EVERY player out at deploy (Step 1.5 below), and the
   hub tour (create-your-character first, then Chest / Shops /
   Sign in-out / Math Door / Join the Family / TikTok-soon) that
   greets them after they sign back in.

---

## STEP 0 — Pre-flight (do not skip)

- [ ] The separate security project must be DONE auditing
      `~/workspace/.deploy/` before anything is copied into it.
- [ ] Re-check the 3D CSP: this build changed two inline script blocks in
      `3d.html`; their sha256 hashes were recomputed and added to the CSP
      meta in the build tree. If the security project's CSP work touched
      `3d.html` after 2026-10-21, re-extract both script blocks, re-hash,
      and confirm the meta carries the new hashes before deploying
      (verify: load 3d.html, zero console CSP errors).
- [ ] i18n: `~/workspace/i18n-split-2026-10-18/dict-source.json` was
      already scrubbed in place (gate string → "🔒 Math Check"; backup at
      `dict-source.bak-2026-10-21.json`). Re-run the i18n build from that
      source as part of the frontend copy so shards stay in sync.
      116 non-English gate translations were zeroed (they fall back to
      English until retranslated) — full list in
      `~/workspace/coin-shop-build/STALE-TRANSLATIONS.md`.

## STEP 1 — Backend: auth Worker (locker + F2) with the F5-SAFE deploy script

**⚠️ D6/F5 HAZARD — READ FIRST:** the old deploy script
(`~/workspace/fire-babys-auth/deploy_auth.py`) uploads with ONLY
`AUTH_KV` + `GOOGLE_CLIENT_ID` bindings. Cloudflare replaces the whole
binding set on upload, so running it would DROP `RESEND_API_KEY` and all
provider secrets. **Never run the old script again.**

1. Sync the staged Worker source over the canonical one:
   `cp ~/workspace/coin-shop-build/backend/index.js ~/workspace/fire-babys-auth/worker/src/index.js`
   (This adds the `/locker/*` endpoints, the F2 sliding session
   renewal, the Great Kick session epoch + `POST /admin/kick`, and
   `POST /profile/onboarded`. No new KV namespaces or bindings are
   required — the locker lives inside the existing
   `profile:{sha256(email)}` record, and the epoch is a single KV key,
   `meta:session_epoch`, inside the existing AUTH_KV.)
2. Deploy with the F5-fixed script (it snapshots live bindings, merges —
   preserving every existing binding including `RESEND_API_KEY` — and
   ABORTS if an unreadable secret_text binding exists, in which case use
   `wrangler deploy` instead, which preserves secrets):
   `python3 ~/workspace/coin-shop-build/backend/deploy_auth.py`
3. **Binding check (part of the script, verify its output):** it prints
   the pre/post binding-name lists and fails loudly if any name vanished.
   Confirm `BINDINGS PRESERVED ✓` and both smoke lines:
   `/auth/config` ok with a non-empty googleClientId, and `/link/config`
   provider booleans as expected. Replace
   `~/workspace/fire-babys-auth/deploy_auth.py` with the fixed version
   afterward so the old one can't be run by mistake.
4. Spot-check the locker endpoints with the test account token
   (`~/workspace/test-profile/token.json`): `POST /locker/get` returns
   `{ok:true, locker:{...}}`.

## STEP 1.5 — THE GREAT KICK (deploy day, AFTER the Step 1 backend deploy + smoke tests pass)

Jeff's order: at the big deploy, EVERY player is signed out and must
sign back in — "even me." No allowlist, no exceptions.

**The one operator mechanism** (implemented + tested in the backend):
a guarded admin endpoint. Run it ONCE, after the Step 1 smoke checks:

```
curl -s -X POST https://fire-babys-auth.jeffpruden288.workers.dev/admin/kick \
  -H "x-admin-key: <the ADMIN_KEY Worker secret>"
```

- Expected output: `{"ok":true,"epoch":2,"previousEpoch":1}` — the
  bump is **epoch 1 → 2** (the key starts absent = epoch 1; every live
  token record today is epoch-1, stamped or legacy-unstamped).
- **Prerequisite:** the `ADMIN_KEY` secret must exist on the Worker.
  With no ADMIN_KEY set, the endpoint fails CLOSED with 403 (same
  guard as `/auth/count`). If it 403s, set the secret in the dashboard
  (Workers → fire-babys-auth → Settings → Variables and Secrets) —
  NEVER via the old deploy script (F5 hazard, Step 1).
- **What players experience (intended, not a bug):** every existing
  session token is rejected with 401 `invalid_token` on its next
  check; the gate clears it and shows the sign-in screen. Signing back
  in (email code, Google, or register) re-stamps the CURRENT epoch on
  the player's token — same account, same token string, everything
  intact.
- **What is NEVER touched:** accounts, profiles, LOCKERS, leaderboard
  scores, progression. The kick writes exactly one KV key
  (`meta:session_epoch`). Verified byte-identical in tests (below).
- **Do not run it twice.** A second run bumps to epoch 3 and kicks
  everyone AGAIN — safe for data, pointless for players. (If it ever
  must be re-run as an incident response, that is exactly what it is
  for.)
- After the kick + Step 2 frontend, a fresh sign-in lands the player
  in the first-run onboarding (create-your-character step, then the
  tour) — players who already completed the tour on any device do NOT
  see it again (the flag lives in their profile, which the kick does
  not touch).
- Failure-mode note: if the epoch value is ever unreadable, protected
  endpoints fail CLOSED (401) and sign-ins answer 503
  `epoch_unavailable` — nothing is written on that path, so a KV
  hiccup looks like a sign-out, never like data loss.

## STEP 2 — Frontend: copy the build tree to `.deploy`

1. Sync the gate fixes to the OTHER copies of `auth-gate.js` (the build
   tree copy is the tested one): `~/workspace/fire-babys-auth/client/auth-gate.js`
   and `~/workspace/fire-babys-app/www/auth-gate.js` (app build) must get
   the same F1 + F4 changes, or those surfaces keep the old behavior.
2. Copy the tree (excluding `backend/`, `tests/`, `DEPLOY.md`,
   `INVENTORY.md`, `STALE-TRANSLATIONS.md`, and the `*.zip.bak-*`
   files) into `~/workspace/.deploy/` — `onboarding.js` is a root file
   and ships with the tree like the other root scripts — then run the
   project's normal deploy for the site.
3. Post-deploy smoke (signed-in test account): hub shows balance pill;
   Game Shop purchase debits once; Locker section lists the item; 3D
   Vault shows the shop-boost line after a boost purchase; one game page
   shows "🔒 Math Check" (no old branding anywhere). Onboarding smoke:
   a test account that has never toured gets the create-your-character
   step then the tour on the hub right after sign-in; finishing sets
   `onboardedV1` (check via `POST /profile/get`); the hub's top bar
   shows the Sign out button and the "🎓 Tour" replay link.

## STEP 3 — Offline build reseal

- Reseal `fire-babys-offline.zip` from the FINAL deployed tree (after
  Steps 1–2). The 24-hour unlock is an inline snippet + localStorage
  timestamp (`fb_gate_unlock_until`), verified working under `file://`
  including cross-page (2026-10-21 offline test, 9/9). The reseal also
  carries `onboarding.js` + the updated hub: its `<script src>` is
  already RELATIVE (no rewrite needed for it), and the tour completes
  device-side offline via the local `fb_onboarded_v1` flag (verified
  under `file://` with all network aborted — see Verification record).
- Per the sign-in audit §5.3: during reseal, rewrite the gate `src` in
  offline pages from the absolute `https://firebabys.io/auth-gate.js` to
  the RELATIVE `auth-gate.js` already inside the ZIP, so the gate (with
  F1) loads locally and the offline trust-cache path works as designed.
- Update START-HERE if needed: progress/unlock live in the browser
  profile used to open the folder.

## What changed, per file (summary)

- `fire-world.html` — nav balance pill; `#shop` (Game Shop: 16 coin
  items; Real-World Shop: 10 merch cards → Fourthwall storefront);
  `#locker` section + `FBLocker` client (server mode when signed in,
  local mode for guests, merge on first sign-in).
- `3d.html` — `__fbEffectiveBoost()` adds `fb_shop_boost` (cap +25%);
  Vault shows the shop-boost line; economy comment documents Jeff's
  free-play rule. (2 inline blocks re-hashed into the CSP meta.)
- `auth-gate.js` — **F1:** session check clears the token ONLY on a
  definitive 401 `invalid_token` (plus one retry for tokens < 5 min old —
  KV propagation grace); every other failure trusts the cached user.
  **F4:** `already_registered` / `email_not_configured` copy points to
  "Sign in with Google with the same email" as the working recovery
  until Resend is configured.
- All 56 gate pages + shared snippets — the old branded gate label → "🔒 Math Check" (visible branding only; the math check and all
  protective behavior unchanged), plus the identical 24-hour-unlock
  snippet (5 in a row → `fb_gate_unlock_until` = now + 24h; remaining
  time shown in the gate and the hub; clean expiry).
- `backend/index.js` — locker endpoints `POST /locker/get|migrate|buy|equip|earn`
  (session-authenticated, server catalog/prices, fixed-amount earns with
  hourly cap, one-time merge) + **F2** sliding renewal in `/auth/session`
  (token records older than 180 days are re-PUT with a fresh 365-day TTL).
  **Great Kick additions:** session epoch (`meta:session_epoch`,
  default 1; every token record stamped at issuance/restore via one
  helper; enforced in `/auth/session` and in `profileKeyForToken`, the
  funnel for `/profile/*` + `/locker/*` + `/link/*`; legacy epoch-less
  records count as epoch 1; unreadable epoch FAILS CLOSED) +
  `POST /admin/kick` (the Step 1.5 operator endpoint, ADMIN_KEY-guarded)
  + `POST /profile/onboarded` and the `onboardedV1` profile flag.
- `onboarding.js` (NEW) + `fire-world.html` — the first-run flow on the
  hub: step 1 sends the player to the REAL character surface (3D
  Arena's 👤 PLAYER creator + 🎨 CUSTOMIZE Style Studio — no parallel
  creator), then skippable cards in Jeff's order — the Chest, the
  Shops, Sign In & Out, the Math Door + 24h unlock, Join the Family,
  and a no-link "Look for us on TikTok soon" card. Completion/skip sets
  `fb_onboarded_v1` locally + `onboardedV1` in the profile. The hub nav
  gained a real top-bar **Sign out** button (the page previously had no
  visible sign-out control — the gate badge is opt-in and not enabled
  here) and a **🎓 Tour** replay link. KNOWN GAP: the site tree has no
  Facebook-group or Instagram URL anywhere, so the Family card names
  them WITHOUT links (Discord uses the site's verbatim invite) — add
  the real URLs to the Family card in `onboarding.js` when they exist.
- `backend/deploy_auth.py` — the F5-fixed deploy script (binding merge +
  snapshot + smoke tests). `backend/wrangler.toml` is staging reference.
- i18n source `dict-source.json` — gate string scrubbed (see Step 0).

## Verification record (all in the staging tree, 2026-10-21)

- Main harness (Playwright, local server): shop purchases debit correctly
  (shield 50c, boost→0.05, sword+dance 375c), shared balance across pages,
  merch cards render, gate flows pass, play.html places troops at 0 gold
  (no coin-to-play anywhere), 68-page boot sweep = zero pageerrors.
- Locker backend unit tests vs the real Worker code (fake KV): 27/27.
- Locker end-to-end (real hub ↔ real Worker over a local shim): 13/13 —
  migration (275c + shield + boost), server-debited buy, auto-equip,
  unequip/re-equip, reload persistence, guest local mode.
- Sign-in fixes: F1 gate scenarios 6/6 (500-glitch keeps token, real 401
  clears, propagation-grace retry, network-down trust); F2 renewal 4/4
  (aged token re-PUT with fresh TTL, young token untouched).
- Offline (`file://`, resealed layout): 9/9 — gate renders, challenge →
  24h unlock, cross-page auto-pass, remaining-time display, clean expiry,
  one-problem entry.
- Wording: case-insensitive grep for the two scrubbed phrases over the
  shippable tree (html/js/css/json) = **0 hits**. (One code comment in
  play.html's patch history mentions "parental-consent design" — not UI
  or branding; left as history, noted here for the record.)
- Great Kick backend tests vs the real staged Worker (fake KV)
  (`tests/test-kick-backend.mjs`): **71/71** — tokens stamped with the
  current epoch at register / code-verify / restore; epoch N token
  rejected on session + profile + locker + link after the bump to N+1;
  re-sign-in re-stamps and revives the same account; user + profile
  (locker) records **byte-identical** across the kick; leaderboard
  unchanged; double bump safe (revive works at epoch 3); legacy
  epoch-less records valid at epoch 1, dead after the bump; epoch read
  failure (thrown or garbage) fails CLOSED on protected endpoints,
  issuance refuses 503 with nothing written, and no data is corrupted;
  F2 renewal preserves the epoch and never resurrects a kicked token;
  `/admin/kick` 403s without/with-wrong ADMIN_KEY and with ADMIN_KEY
  unset; `/profile/onboarded` sets the flag idempotently and the flag
  survives the kick.
- Onboarding tests (Playwright/Chromium; `tests/hub-server.mjs` +
  `tests/test-onboarding.py`): **38/38** — signed-out visitors see the
  gate and never the tour; a fresh sign-in gets the CREATE step first;
  the create button lands on 3d.html and returning resumes at the
  cards; cards appear in Jeff's order (Chest → Shops → Sign In/Out →
  Math Door → Join the Family → TikTok-soon); the Discord link is the
  verbatim invite and no TikTok/Facebook/Instagram URL is invented;
  Finish and Skip both set the local flag AND the server profile flag;
  no reappearance on reload; the 🎓 Tour replay re-opens the flow; the
  top-bar Sign out really signs out; and a full OFFLINE run
  (`file://`, all network aborted) completes device-side — zero
  pageerrors across every scenario.

## TURNSTILE — bot protection on /auth/register + /auth/code (added 2026-10-21)

Code is wired and tested in this tree; the KEYS are not yet created
(see step 1). Both sides are no-ops until configured, so key setup can
happen any time before the secret is set — but respect the ORDER
WARNING in step 4.

1. **Create the widget (dashboard — the API token cannot):** the
   connector token can LIST Turnstile widgets (GET …/challenges/widgets
   → 200) but widget CREATE returns 403 (code 10000, "Authentication
   error"), and the Worker-secret PUT was therefore never attempted.
   In the Cloudflare dashboard: Turnstile → Add site → name
   **"firebabys.io auth"**, domain **firebabys.io**, mode **Managed**.
2. **Site key (public)** → paste into `auth-gate.js` in this tree at the
   clearly-marked constant `TURNSTILE_SITE_KEY` (search for
   `>>> DEPLOY`). Then sync to the other gate copies (same list as
   Step 2): `~/workspace/fire-babys-auth/client/auth-gate.js`,
   `~/workspace/fire-babys-app/www/auth-gate.js`, and the Android asset
   copy `~/workspace/fire-babys-app/android/app/src/main/assets/public/auth-gate.js`.
3. **Secret key** → set as a Worker SECRET named **`TURNSTILE_SECRET`**
   on `fire-babys-auth` (dashboard: Workers → fire-babys-auth →
   Settings → Variables and Secrets; or `wrangler secret put
   TURNSTILE_SECRET`). **Never** via the old `deploy_auth.py` (F5
   hazard — it drops secrets).
4. **⚠️ ORDER WARNING:** only set `TURNSTILE_SECRET` AFTER (a) the
   site key from step 2 is live in the gate AND (b) the live CSP
   allows the widget (step 5). If the secret is set while players
   can't produce tokens, every register/code request 403s with
   `bot_check_failed`.
5. **CSP additions (the A+ strict policy must include these when this
   frontend ships):**
   - `script-src` += `https://challenges.cloudflare.com`
   - `frame-src` += `https://challenges.cloudflare.com`
   (connect-src to the same host is NOT needed — siteverify is
   server-side.) Without them the api.js/iframe are blocked, submits go
   tokenless, and step 4's warning applies.
6. **What the code does:** the gate renders the widget (execute +
   interaction-only) in the card and sends a fresh single-use token as
   `turnstileToken` on every `/auth/code` (verify / resend / recover)
   and `/auth/register` call; if the script fails to load it submits
   with no token and the server decides. The backend
   (`turnstileBlock()` in `backend/index.js`) verifies the token via
   siteverify when `TURNSTILE_SECRET` is set: missing/invalid → 403
   `bot_check_failed`; **siteverify unreachable/malformed → request is
   ALLOWED (falls back to the per-IP rate limits) and logged** — an
   outage can never lock every player out. There is no `/auth/login`
   route in this Worker (sign-in is register + code/verify + Google),
   so nothing else needed the check; the Google flow is already
   verified by Google's own ID token.
7. **Verification (staging, 2026-10-21, official Cloudflare test
   keys):** backend 11/11 — no-secret = no-op (siteverify never
   called), valid token passes, missing/invalid token → 403
   `bot_check_failed` on both endpoints, siteverify down/garbage →
   allowed, plus one LIVE siteverify pass with the official always-pass
   test secret. Gate (Playwright/Chromium) 5/5 — token flows into
   `/auth/code` and the code step opens; missing token → 403 and the
   gate shows "Quick bot check failed"; script blocked → submits
   tokenless and the no-secret server lets the flow proceed. Caveat:
   in the browser test the widget's client API was a faithful local
   stub (this VM's egress proxy refuses Chromium CONNECT tunnels to
   challenges.cloudflare.com — the same limitation the sign-in audit
   recorded); the backend siteverify leg ran LIVE against Cloudflare.
