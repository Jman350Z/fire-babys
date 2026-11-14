# LATE ADDITIONS — Dark Knight admin-arrival announcement (2026-10-21, ~22:35 PDT)

Added by the Dark Knight build AFTER the manifest refresh. Whoever
regenerates `push-paths.json` / PUSH-MANIFEST.md must fold these in.
Full record: `~/workspace/coin-shop-build/DARK-KNIGHT-REPORT.md`.

## NEW file (must be ADDED to the push set)

- `dark-knight.js` — the arrival watcher (polls the auth Worker's
  `/presence`, flashes "⚔️ A Dark Knight is coming..." once per admin
  arrival). Present, byte-identical (md5 8f9ebcf04e5c1b7cd647665218d4473c),
  in BOTH `~/workspace/coin-shop-build/` and `~/workspace/.deploy/`.
  It is an external same-origin script: the enforced hash CSP allows
  it via `script-src 'self'` — NO hash-map change is needed for it,
  and it injects no inline script/style of its own (all CSSOM).

## MODIFIED files already in the push set (content changed — push the current staged copies)

- `fire-world.html` — added `<script src="dark-knight.js" defer></script>`
  after the auth-gate tag. NOTE: the tag was applied to the `.deploy`
  copy in place; its newer offline-ZIP fingerprint line
  (5a016f0e…) is preserved. Do NOT overwrite `.deploy/fire-world.html`
  from the source tree (source still carries the older b6d410aa…
  fingerprint line).
- `3d.html` — same include added after the auth-gate tag (source and
  `.deploy` copies were identical before the edit and remain in sync).

## MODIFIED file NOT in the current push set (maintainer decision)

- `play.html` — same include added before `</head>` in both source and
  `.deploy`. `play.html` is not in `push-paths.json` (it ships through
  its own patch/build route), so the include reaches production
  whenever play.html next ships; the hub + 3D includes already cover
  the announcement on the main entry pages. If play.html is ever added
  to this push set, the staged copy already carries the include.

## NOT part of the GitHub push (Worker route — already handled)

- `backend/index.js` (auth Worker: arrival recording + `GET /presence`)
  — deploys via `backend/deploy_auth.py`, never via GitHub. State at
  time of writing: the Dark Knight backend code is LIVE (see report).

---

# LATE ADDITIONS — sign-in landing fix + info offload (2026-10-21, ~22:50 PDT)

Added after the Dark Knight entry above, by the sign-in/info build.
Full record: `~/workspace/coin-shop-build/SIGNIN-AND-INFO-REPORT.md`.
Whoever pushes must use the CURRENT staged copies of these files
(source tree and `.deploy` are in sync; on `fire-world.html` and
`index.html` the ONLY source↔.deploy difference remains the known
offline-ZIP fingerprint line — `.deploy` carries the newer 5a016f0e…
line; do not overwrite it from source).

## MODIFIED files already in the push set (push the current staged copies)

- `auth-gate.js` — post-sign-in landing router (Jeff's law): interactive
  sign-ins (email code / register / Google) by players whose profile
  lacks `onboardedV1` now route straight to `3d.html` (the Creator)
  with `fb_tour_step="cards"` set; onboarded players and session
  restores are unrouted. Also: robust own-script lookup (the loaders'
  appended scripts broke `scripts[last]`), the email-code regex fix
  (`/^\\d{6}$/` → `/^\d{6}$/` — code entry rejected every real code),
  and a stand-down guard so the first-step submit listener no longer
  throws after the code step swaps the form. External file — no
  hash-map change (verified: fresh audit needs ⊆ deployed map).
- `onboarding.js` — header comment only (documents the gate routing);
  behavior unchanged.
- `fire-world.html` — the 58 per-card `🔥 Fire Safety:` lesson divs are
  REMOVED; ONE hub bar (reusing the existing `.whatsnew` styling) links
  to https://safety.firebabys.io. Games grid, shops, locker untouched.
- `index.html` — the Fire Safety Academy 4-lesson list is replaced by
  ONE hub card linking to https://safety.firebabys.io. Mission strip
  (house rules) kept.
- `parents.html` — the "real fire-safety curriculum" and "Trusted
  resources" sections are replaced by ONE hub card linking to
  https://safety.firebabys.io; the school FAQ answer now points at the
  Hub. "Safe by design" + the rest of the FAQ kept.

## NOT part of the GitHub push

- `tests/signin-server.mjs` + `tests/test-signin-routing.py` — new
  harness files in the source tree's tests/ only (never pushed).
- The moved content itself lives in the SEPARATE hub repo staging
  (`~/workspace/fire-safety-hub/index.html`: new Academy section, all
  58 game tips, Trusted Resources) and ships with the hub's own
  go-live, not with this push.

---

# LATE ADDITIONS — password sign-in form in the gate (2026-10-21, ~23:05 PDT)

Added after the sign-in/info entry above, by the password-form build.
Full record: `~/workspace/coin-shop-build/PASSWORD-FORM-REPORT.md`.

## MODIFIED file already in the push set (push the current staged copy)

- `auth-gate.js` — the gate now renders a PASSWORD sign-in path: a
  "Sign in with a password" link on the first step opens a password
  step (email + password) that POSTs to the already-live
  `/auth/password` endpoint and completes through the SAME
  `finishFreshAuth` path as code/register/Google — so a fresh
  password sign-in by a non-onboarded player routes straight to the
  Creator with the tour marker set, exactly like the other methods.
  All failures show ONE generic message (the endpoint's 401
  `invalid_credentials` is identical for unknown email, no-password
  account, and wrong password; the form never hints which). Back
  link restores the first step. Source and `.deploy` copies are
  byte-identical (sha256 f21ef267…). External file, no new inline
  code — no hash-map change.

## NOT part of the GitHub push

- `tests/password-server.mjs` + `tests/test-password-signin.py` —
  new harness files in the source tree's tests/ only (never pushed).

# LATE ADDITIONS — Creator is the signed-in home / Job B (2026-10-21, ~23:35 PDT)

Added after the password-form entry above. Full record:
`~/workspace/coin-shop-build/PASSWORD-FORM-REPORT.md` (Job B addendum).

## MODIFIED files already in the push set (push the current staged copies)

- `auth-gate.js` — post-sign-in routing WIDENED to Jeff's sharpened
  law ("the home page after you sign in should be the creator
  profile"): EVERY interactive sign-in (email code / register /
  Google / password) now lands on the Creator (3d.html), onboarded
  or not. NEW restore rule: a session restore arriving at a home
  page (index / fire-world hub) from OUTSIDE the site on a later
  visit (token stamp older than 6h) also lands on the Creator —
  onboarded players only; players still touring stay on the hub
  (the tour owns them), same-sitting reloads never move, in-site
  navigation (Creator -> hub) never bounces, and the home-route
  fires at most once per browser session. Source and `.deploy`
  copies byte-identical (sha256 f9614932…). External file, no new
  inline code — no hash-map change.
- `onboarding.js` — header comment refreshed to document the
  widened law (comment only, zero behavior change). NOTE: the
  `.deploy` copy of this file was stale (it predated even the
  previous comment update); it is now synced byte-identical to
  source (md5 ba91fe5f…).

## NOT part of the GitHub push

- `tests/test-signin-routing.py` — case B updated to the widened
  law; new cases E (returning onboarded restore -> Creator),
  F (Creator -> hub stays), G (front-door restore -> Creator).
- `tests/signin-server.mjs` — gate-tag rewrite now also applied
  to /index.html so case G can drive the front door.

## 2026-10-22 — NO-POWER-STATS LAW (Jeff's ruling; record: coin-shop-build/STATS-REMOVAL-REPORT.md)

- `fire-world/games/game-60-fire-babys-arena.html` — CHANGED after the
  refresh pass: the entire GEAR table zeroed (all armor + weapons:
  hp/guard/pow/spd/dmg/rate = 0), stat-advertising descriptions
  rewritten as style copy, loadout outfit chips reworded. Gear is
  pure style; fighter numbers are the character's own (Blaze 104 HP
  in any look). Source + `.deploy` byte-identical. Arena suite
  63/63 incl. 4 new gear-equality cases.
- `csp-hashmap-staged.json` (+ `~/workspace/a-plus-project/hashmap.json`)
  — REGENERATED via the A+ pipeline (audit_scan → gen_hashmap over
  `.deploy`) and union-merged with the previous staged map: zero
  hashes lost, the edited Arena inline script's new hash included,
  70 pages, union s=140 / y=125 / a=135 / t=252. Headers Worker NOT
  redeployed in this pass — same as the rest of the push package.
- Backend `LOCKER_ITEM_META` stats zeroed in the auth Worker source
  and REDEPLOYED LIVE via wrangler (Version ID
  6e203836-1b4a-4aed-9046-ef1334022b5d) — not part of the push; the
  push does not need to wait for it and must not overwrite it.

## Late addition — 2026-10-22 (later): POWER BOOST EFFECT REMOVED (Jeff's no-power law)
- `fire-world/games/game-60-fire-babys-arena.html` (already in the push
  set; changed) — the Power Boost's Arena damage effect is DELETED:
  `BOOST_DMG_CAP`, the `makeFighter` boost term, the fighter `boost`
  field, and the loadout-preview boost line are gone. No Arena code
  reads `shopBoost`; a maxed locker total now changes NO fighter
  number (damage/HP/speed/guard/rate). Source + `.deploy`
  byte-identical (sha256 edf59b4e…). Arena suite 67/67 incl. 4 new
  POWER BOOST REMOVED cases.
- `fire-world.html` (already in the push set; changed) — the item is
  relabeled in shop copy as **🌟 Star Charms** (Bronze/Silver/Gold):
  collectible flair for the Chest, "never changes any fighter's
  numbers"; section title, card text, status line, toasts, locker
  box, and intro paragraph rewritten. Ids/prices/`add` steps and the
  `shopBoost` locker field unchanged — existing owners keep their
  full collected total (now shown as "shine"). `.deploy` copy edited
  in place (staged ZIP fingerprint line preserved; source/staging
  differ ONLY on that line, as before).
- `onboarding.js` (already in the push set; changed) — tour copy now
  says "Star Charms". Source + `.deploy` byte-identical.
- `csp-hashmap-staged.json` (+ `~/workspace/a-plus-project/hashmap.json`)
  — REGENERATED via the A+ pipeline and union-merged: zero hashes
  lost, new Arena + hub inline-script hashes verified present,
  70 pages, union s=143 / y=125 / a=135 / t=252. Headers Worker NOT
  redeployed — ships with the push, as before.
- Backend NOT touched, NOT redeployed: the boost effect was
  frontend-only; the Worker only ever stored the `shopBoost` total.
  Record: addendum in
  `~/workspace/coin-shop-build/STATS-REMOVAL-REPORT.md`.

## Late addition — 2026-10-22 (later still): CREATOR shopBoost wire REMOVED (law now true everywhere)
- `3d.html` (already in the push set; changed) — the last power
  consumer of the shop total is gone: `__fbEffectiveBoost()` no longer
  reads `fb_shop_boost` (the +25%-capped shop term is deleted; the
  function now returns EARNED progression only — stage armor
  bronze/silver + season boost, both untouched). The Vault panel no
  longer lists a "🛒 Shop boost: +X%" power line — the collected
  total is shown as "🌟 Star Charms: +X shine collected — pure
  flair", matching the hub wording. The Style Studio header comment
  now records the law instead of the old stacking claim. Source
  (`coin-shop-build`) + `.deploy` byte-identical
  (sha256 f9aeb508…). The canonical rebuild file
  (`fire-babys-3d-rebuild/3d.html`) was checked and never carried the
  shop wire — unchanged.
- `3d.html` meta CSP — the two edited inline scripts changed hashes;
  BOTH new hashes appended to the page's own meta `script-src`
  (append-only, as in the starter-kit fix). All inline blocks verify
  in-list in both copies.
- `csp-hashmap-staged.json` (+ `~/workspace/a-plus-project/hashmap.json`)
  — REGENERATED via the A+ pipeline (audit_scan → gen_hashmap) and
  union-merged with the previous staged map: zero hashes lost, both
  new 3d.html script hashes verified present in the `/3d.html` entry
  and the union, 70 pages, union s=145 / y=125 / a=135 / t=252.
  Headers Worker NOT redeployed — ships with the push, as before.
- Verification: `pre-deploy-check.sh` ALL CHECKS PASSED on the final
  staged file. Node unit test on the exact shipped
  `__fbEffectiveBoost` source: 6/6 — maxed charms (0.25) and partial
  charms add ZERO over bronze; charms alone = 0; earned season still
  stacks; earned silver still overrides. Boot parity: the edited
  page boots identically to the pre-edit original in the local
  harness (same canvases, zero pageerrors). One PRE-EXISTING
  intermittent surfaced identically on the pre-edit original under
  the strict-CSP harness: a runtime-generated style attribute
  (sha256-V9J28zDuFjJ1Pf1SgQJ0bI/hxS8i46t+iBLuMVgblWU=) not in the
  map — NOT caused by this change and NOT harvested here; flagged
  for the next full sweep pass.
- Backend NOT touched: the Worker only stores the `shopBoost`
  collection total; the purchase flow and existing balances are
  unchanged. Record: closing addendum in
  `~/workspace/coin-shop-build/STATS-REMOVAL-REPORT.md`.
