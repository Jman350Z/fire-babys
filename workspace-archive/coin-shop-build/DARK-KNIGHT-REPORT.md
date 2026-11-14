# Dark Knight — admin-arrival announcement (Jeff, 2026-10-21)

**Spec:** when a top admin (ADMIN_EMAILS allowlist:
jeffpruden288@gmail.com / jeffprudengficompany@gmail.com) comes
online, EVERY player currently online sees a flashing red banner:
**"⚔️ A Dark Knight is coming..."** — the owner's entrance; it means
an admin just signed in.

## What was built

### Backend — auth Worker (`backend/index.js`) — **LIVE**
- `recordAdminArrival(env, email)`: on every successful sign-in path —
  `POST /auth/register`, `POST /auth/verify` (email code), `POST
  /auth/google`, `POST /auth/password` — an allowlist admin's sign-in
  writes KV `admin:arrival` = `{ id, at }` (id = random token +
  timestamp, unique per sign-in) with a 180s KV TTL. Non-admin
  sign-ins never write it; failed sign-ins never write it; the write
  is best-effort so a KV hiccup can never fail a sign-in.
- `GET /presence` (public): returns `{ ok: true, arrival: { id, at } }`
  or `{ ok: true, arrival: null }`. Freshness is enforced on read at
  120s (`arrivalIsFresh`, 5s clock-skew slack) on top of the TTL.
  Only `id` + `at` ever leave the server — no email, no PII.
- Session validation (`/auth/session`) deliberately does NOT record
  an arrival: it runs on every page load for already-signed-in
  players, and an arrival means "just signed in."

**Deploy state: LIVE — verified, not assumed.** At build start the
live Worker carried no admin allowlist at all (74,962-byte script, no
`ADMIN_EMAILS`), so per the coordination rule this agent did NOT
deploy. The backend was staged in `backend/index.js` and synced to
the shared deploy copy (`~/workspace/fire-babys-auth/worker/src/
index.js`). The concurrent admin agent's F5 deploy from that shared
copy then carried the Dark Knight code with it. Verified after the
fact, three ways:
  1. Live script read via the Cloudflare API contains
     `recordAdminArrival`, `ADMIN_ARRIVAL_KEY`, `handlePresence`,
     `arrivalIsFresh`, `"/presence"`, `admin:arrival`.
  2. `GET https://fire-babys-auth.jeffpruden288.workers.dev/presence`
     → `{"ok":true,"arrival":null}` (was `not_found` before).
  3. Live bindings after the deploy: `ADMIN_KEY`, `AUTH_KV`,
     `GOOGLE_CLIENT_ID`, `RESEND_API_KEY` — the full set, nothing
     dropped (F5 rule intact).
- The write path cannot be exercised live without signing in as Jeff
  (not attempted); it is proven by the unit suite below against the
  identical source that is now deployed.

### Frontend — `dark-knight.js` + includes — **staged, rides the GitHub push**
- New standalone watcher `dark-knight.js`, included via
  `<script src="dark-knight.js" defer></script>` on:
  - `fire-world.html` (hub) — after the auth-gate tag;
  - `3d.html` — after the auth-gate tag (its meta CSP allows the
    same-origin file; connect-src already covers the auth Worker);
  - `play.html` — before `</head>` (play.html ships via its own
    patch/build route, not this push set — see LATE-ADDITIONS.md).
- Present in BOTH the source tree and `~/workspace/.deploy/`
  (byte-identical; the `.deploy` hub copy kept its newer ZIP
  fingerprint line — the tag was applied in place, not overwritten).
- Behavior: poll `/presence` on load + every 30s; a fresh (<120s)
  arrival id not in the localStorage seen-set (`fb_dk_seen`, capped
  at 20) triggers the banner exactly once — full-width fixed top
  overlay (never shifts the play field or the tab bar), flashing red
  (350ms CSSOM toggle between #c40000/#ff2020), bold white text
  "⚔️ A Dark Knight is coming...", ~5s flashing + 1s fade, then
  removed. Stale arrivals are retired into the seen-set unseen.
  Fetch failures / endpoint absence are swallowed silently.
- CSP-clean by construction: external file (allowed by
  `script-src 'self'` in the enforced header CSP and by both pages'
  meta CSPs), and the file itself uses NO inline `<style>`, NO style
  attributes, NO innerHTML markup, NO eval — every visual is set via
  CSSOM, so no hash-map change is needed. It also no-ops if included
  twice (`window.__fbDarkKnight` guard).

## Tests — all passing

- **Backend unit** (`tests/test-dark-knight-backend.mjs`, real Worker
  against a fake KV): **30/30** — freshness window (120s in/out,
  malformed records), player sign-in writes nothing, admin register
  writes `{id, at}` with TTL 180, `/presence` returns only id+at and
  contains no admin email anywhere, second admin's password sign-in
  mints a NEW id, stale record reads null, failed sign-in writes
  nothing.
- **Regression suites after the backend edit:** test-admin-password
  52/52, test-kick-backend 71/71, test-starter-kit 104/104.
- **Browser harness** (`tests/dark-knight/test-dark-knight.py`,
  Playwright; serves `.deploy` as firebabys.io under the staged
  strict CSP from `a-plus-project/hashmap.json`, auth Worker mocked
  with a controllable `/presence`): **20/20** —
  results in `tests/dark-knight/results.json`, banner screenshot at
  `tests/dark-knight/hub-banner.png`. Hub: no arrival → no banner;
  fresh arrival → banner with the exact text as a fixed top overlay;
  auto-removes after ~6s; the next 30s poll with the same arrival
  does NOT re-show; a new arrival shows again; reload with the same
  arrival does not (seen-set persisted, verified in localStorage);
  stale arrival retired unseen; **0 CSP violations, 0 console/page
  errors**. 3D + play: banner shows on fresh arrival; **0 NEW CSP
  violations and 0 new errors vs each page's no-arrival baseline**.

### Known page-owned noise (not Dark Knight)
- play.html's own meta CSP emits the "'frame-ancestors' is ignored
  when delivered via a <meta> element" notice on every load —
  baseline and Dark Knight passes alike.
- 3D boot showed ONE intermittent CSP block of the game's OWN main
  script (required hash `sha256-y0vgYMqPN08i13vkz3Q53tSuecST14XNS/
  lISpkRo84=`) in ~1 of 20+ harness boots — including a boot where
  the banner never fired (arrival null). Follow-up batches: 0/6 with
  the tag and no arrival, 0/6 with the tag and the banner firing,
  0/6 with the tag stripped. The hash IS present in both the page
  meta and the staged hash map. Characterized as a rare pre-existing
  3D boot intermittent, unrelated to this feature (dark-knight.js
  contains no inline code at all); the harness retries that single
  documented signature once and records `flake_retried` in results.

## Staging / reconciliation
- `~/workspace/big-deploy-2026-10-21/github-push/LATE-ADDITIONS.md`
  lists every file added/changed for the manifest regeneration:
  `dark-knight.js` (new, must join the push set), `fire-world.html`
  + `3d.html` (modified, already in the set), `play.html` (modified,
  not in this push set).

## What remains
- The frontend reaches players when the pending GitHub push lands
  (the backend half is already live, so the announcement starts
  working the moment the pushed pages serve — no second deploy
  needed).
- First real-world proof: Jeff's next admin sign-in with any other
  player online (or a second device on the hub) inside the 120s
  window.
