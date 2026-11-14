# PASSWORD SIGN-IN FORM — report (2026-10-21, ~23:05 PDT)

The trace in `SIGNIN-AND-INFO-REPORT.md` flagged it: `POST
/auth/password` was live server-side (Jeff's admin account + the
password he set tonight verified against it), but **no page rendered
a password form** — there was no way to type a password anywhere.
That gap is now closed in the staged trees. **Nothing deployed,
nothing pushed** — the pages ship with the pending GitHub push.

## What was added (`auth-gate.js`, the shared gate)

- **Entry point:** the first step gains a line under the SIGN IN
  button — *"Have a password on your account? **Sign in with a
  password**"* — styled with the gate's existing classes/inline
  patterns.
- **Password step:** swaps the form's contents (same pattern as the
  email-code step) to a heading, an Email field (prefilled with
  whatever was typed on the first step), a Password field
  (`type=password`, `autocomplete="current-password"`), a SIGN IN
  button, an error box, and a **← All sign-in options** back link
  that restores the first step byte-for-byte (original listeners
  intact — the first-step listener lives on the form element, not
  its contents).
- **Submit:** POSTs `{email, password}` to `/auth/password`. On
  success it does exactly what the other methods do —
  `setToken(res.token)` then **`finishFreshAuth(...)`** — so it
  inherits the shared completion path AND tonight's Creator-first
  routing for non-onboarded players automatically. Like the Google
  path, it then fetches the display name via `/auth/session`.
- **One generic failure message:** *"That email and password don't
  match. Check them and try again — or go back and use another way
  in."* The endpoint's 401 `invalid_credentials` is identical for
  unknown email, no-password account, and wrong password; the form
  never hints which it was (verified byte-identical in tests B/C).
  The endpoint's 429 gets the gate's standard "too many tries"
  message. No Turnstile token is sent (the endpoint doesn't use
  one — per-IP capped server-side instead).
- **One lifetime submit listener** for the password step: it stands
  down unless the password step is currently showing (the
  first-step and code-step listeners own the other states) and
  reads the *current* inputs at submit time, so swapping the step
  in and out can never strand stale field references (tested in D).
- **Untouched:** Google, email-code, and legacy-register flows are
  byte-for-byte the same code paths as before; the math gate is not
  in this file and is unaffected. **CSP:** all new code lives in
  the external gate script — no new inline script/style anywhere.
  **Offline (`file://`):** the step renders like any other and its
  fetch fails into the same "Couldn't reach the sign-in server"
  message every network path shows — quietly unavailable, nothing
  breaks (offline onboarding suite still 38/38).

## Test evidence

New sibling suite `tests/test-password-signin.py` +
`tests/password-server.mjs` (real staged hub + real staged backend,
Playwright driving the REAL gate UI; the suite starts/stops its
server per mode). Server additions: a `/__seed-password` endpoint
(creates an account the player way — code + verify — then stamps a
`passwordHash` with the backend's own `hashPassword`) and a
`FB_AUTH_TARGET=live` mode that proxies `/worker/*` to the real
production Worker (sandbox Chromium has no direct egress; Node
does).

- **LOCAL — 18/18 pass, zero page errors:**
  - A — correct password, email prefilled from the first step →
    lands on the Creator (3d stub), `fb_tour_step="cards"` set,
    token stored.
  - B — wrong password → generic error, gate stays up, no token.
  - C — unknown email → **identical** error text to B.
  - D — back link restores the first step completely; reopening
    the password step and signing in works (no stale listeners).
  - E — the email-code flow still completes end to end.
- **LIVE — Jeff's case, 9/9 pass, zero page errors:** Jeff's real
  credentials (from the main chat tonight; passed to the test via
  stdin/env only — never written to a file, log, or this report)
  typed into the real gate UI against the live endpoint:
  `/auth/password` answered `ok:true` with **`role:"top_admin"`,
  `isAdmin:true`** and a token; the gate stored it; a read-back of
  his live profile confirms `onboardedV1=false`; he **landed on
  the Creator** with the tour marker set. (Two early runs of this
  phase failed only on test-side response sniffing — strict `is
  False` identity plus a last-response-wins race; the deterministic
  profile read-back replaced the sniff and passes cleanly. The
  product behavior was correct in every run.)
- **Regression — all green:** `test-signin-routing.py` **15/15**;
  `test-onboarding.py` **38/38** (clean 16 s rerun, incl. the
  offline `file://` suite); `test-admin-password.mjs` **52/52**;
  `test-dark-knight-backend.mjs` **30/30**; `test-starter-kit.mjs`
  **104/104**.

## Staging

- `auth-gate.js` synced to `~/workspace/.deploy/` — **byte-identical**
  (sha256 `f21ef267d246ce444f27216e97b33be5ce4ed03a047df20af032b404f444c1b3`
  in both trees).
- Change appended to
  `~/workspace/big-deploy-2026-10-21/github-push/LATE-ADDITIONS.md`.
- The new test files live in the source tree's `tests/` only —
  never part of the push.

## Bottom line

**Yes — Jeff can now sign in with email + password from the website pages in the staged tree** (proven live through the real gate UI: top-admin in, Creator-first landing). It reaches production the moment the pending GitHub push lands, like everything else in the staged tree.

---

# ADDENDUM — Job B: the Creator is the signed-in HOME (2026-10-21, ~23:35 PDT)

Jeff sharpened the law at ~23:08 PDT: **"The home page for fire
babys after you sign in should be the creator profile."** The
password form above was Job A; this addendum is Job B, executed
after a Step-0 state check found Job A complete (this report,
written 23:08 PDT) and the gate quiet — no test servers running,
no writes for 5+ minutes. Every Job B write was atomic (temp file
+ syntax check + move) and hash-verified, per the coordination
rules; the other agent's work was not clobbered (pre-edit md5 of
the gate: 999643dd…, exactly the copy it had synced).

## Job A — verified complete, unchanged

Re-verified in place rather than rebuilt: the "Sign in with a
password" entry, password step (email prefill, generic
"don't match" failure — byte-identical for wrong password and
unknown email), back link, shared `finishFreshAuth` completion,
offline quiet failure, external-file-only (CSP-clean). Suites
re-run in this pass: local 18/18, LIVE 9/9 (below).

## Job B — what changed (`auth-gate.js`)

1. **Every interactive sign-in lands on the Creator.** The fresh
   path (`routeAfterSignIn`) no longer asks the profile whether
   the player onboarded: Google, email code, register, and
   password completions all `goCreator(true)` (tour marker set),
   unless the player is already standing on 3d.html. The old
   `/profile/get` round-trip (and its device fallback) is gone
   from the fresh path — a fresh sign-in just talked to the
   server by definition.
2. **Session restores arriving at home land on the Creator.**
   The non-fresh path (`finishAuth`) now goes through
   `routeRestoredHome`. The redirect fires only when ALL of:
   - the page is a home entry (`/`, index.html, fire-world.html)
     and not the Creator itself;
   - the arrival is from OUTSIDE the site (no same-origin
     `document.referrer`) — in-site navigation, Creator -> hub
     above all, NEVER bounces;
   - it has not already fired in this browser session
     (sessionStorage `fb_home_routed`);
   - the token stamp is older than 6 hours — a genuinely later
     visit, not the same sitting as the sign-in (reloads, the
     tour's Creator-detour return, and every onboarding-suite
     flow keep the player exactly where they are);
   - the server confirms `onboardedV1` (an unreachable server
     always stays — trust-cache behavior unchanged).
3. **Why onboarded-only for restores:** a player still touring
   is owned by the hub tour — its step-1 CREATE card is their
   Creator door, and the tour's resume flow (Creator detour ->
   back to the hub) depends on the hub staying put for them.
   Routing them away mid-tour would make the first-run flow
   unfinishable. The moment they finish or skip, later arrivals
   home-route like everyone else. Fresh sign-ins have no such
   constraint (the gate routes first, the tour resumes after).
4. `onboarding.js`: header comment refreshed to document the
   widened law — comment only, zero behavior change. Its
   `.deploy` copy was found STALE (predating even the previous
   comment update) and is now synced byte-identical.

## Test evidence (this pass, zero page errors everywhere)

- `tests/test-signin-routing.py` — **20/20** (was 15): A Jeff's
  case -> Creator; B UPDATED to the new law (onboarded fresh
  sign-in -> Creator); C brand-new -> Creator; D unchanged
  (still-touring restore stays, tour serves them); **E NEW**
  onboarded restore, 48h-old token stamp, cold hub arrival ->
  Creator; **F NEW** from the Creator, in-site navigation to the
  hub stays (no bounce, 2.5 s settle); **G NEW** restore at the
  front door (`/`) -> Creator. `tests/signin-server.mjs` now
  applies the gate-tag rewrite to index.html too (G's driver).
- `tests/test-onboarding.py` — **38/38** (tour, detour resume,
  skip, replay, sign-out, offline file:// incl. reload — all
  unmoved by the restore rule, as designed).
- `tests/test-password-signin.py` — LOCAL **18/18**; LIVE **9/9**:
  Jeff's real credentials (stdin/env only — never written to any
  file, log, or this report) typed into the real gate UI against
  the live endpoint: `ok:true`, `role:"top_admin"`,
  `isAdmin:true`, token stored, **lands on the Creator**, tour
  marker set. (His live profile still reads `onboardedV1=false`;
  under the widened law the landing no longer depends on it.)
- Backend/unit regressions — admin-password **52/52**,
  dark-knight **30/30**, starter-kit **104/104**, kick **71/71**.

## Staging

- `auth-gate.js` synced to `~/workspace/.deploy/` — byte-identical
  (sha256 `f96149324acfe2ad03e85bcabecba0f8a823fc1b1f3d556468ed9a15f5d9b00d`
  in both trees). `onboarding.js` likewise (md5 `ba91fe5f…` both).
- Record appended to
  `~/workspace/big-deploy-2026-10-21/github-push/LATE-ADDITIONS.md`.
- Updated harness files live in source `tests/` only.
- Nothing deployed, nothing pushed.

## Bottom line

**Yes — from the staged pages, a player can sign in with email +
password and lands on their Creator profile as home** (proven live
through the real gate UI with Jeff's own top-admin account), and
every other sign-in method — plus a returning player's arrival at
the site's home — lands there too. It reaches production the
moment the pending GitHub push lands, like everything else in the
staged tree.
