# Fire Babys — Gamer Check, Phase D: Security FIX Pass

- Date: 2026-10-12 (PDT; VM clock Oct 13 ~00:28–00:40 UTC)
- Source audit: `findings/security.md` (read first, per task). This pass implements its
  fixable items in scope: stray public files, `worker-index.js` exposure, multiplayer
  worker MP-1/MP-2/MP-3.
- Out of scope and NOT touched: any `game-*.html`, `play.html`, `3d.html`, hub pages,
  `auth-gate.js`, SPLASH build files, the auth worker's code (AW-1–AW-5 belong to the
  upcoming dedicated profile-system update), and page-header/CSP edits (coordinator
  applies those last).
- **Deployment status: nothing here is deployed.** Files moved out of `~/workspace/.deploy/`
  stage their deletion from the public GitHub Pages repo (effective when the coordinator
  commits/pushes the staged tree). Multiplayer worker code is FIXED in canonical source;
  deploying it to Cloudflare (`wrangler deploy` from `fire-babys-multiplayer/worker/`)
  is the remaining step and is impossible from this VM.

---

## 1. Stray public files — FIXED (moved out of `.deploy`)

All files below were moved (not deleted) from `~/workspace/.deploy/` to
`~/workspace/fire-babys-gamer-check/backups/security-stray/`, preserving them locally.
Repo-relative paths are listed in `~/workspace/fire-babys-gamer-check/deletions.txt`.

| File (repo path) | Audit ref | Verification before move |
|---|---|---|
| `3d.html.backup-stadium` | §3.3 Low | grep of `.deploy` HTML/JS for `backup-stadium`: 0 references |
| `3d.html.backup-stadium2` | §3.3 Low | same sweep: 0 references |
| `play-all.html.bak` | §3.5 Low | same sweep: 0 references |
| `blog-100posts-backup.html` | §3.4 Low | grep for `blog-100posts`: 0 references anywhere in `.deploy` |
| `blog-single.html` | §3.6 Info (byte-identical duplicate of live `blog.html`) | grep for `blog-single`: 0 references; live `blog.html` remains in place |
| `index.pck` | §3.2 Medium (orphaned Godot pack, source-equivalent disclosure) | grep for `.pck`/`index.pck` in all `.deploy` HTML/JS: 0 references (re-verified this pass) |

Notes:
- `blog-100posts-backup.html`: the audit framed this as a coordinator/Jeff intent
  decision; the fix-pass task instructed moving every stray the audit lists, so it was
  moved and preserved locally. If Jeff wants the full 100-post blog live, restore this
  file deliberately under a linked name — the copy is intact in the stray backup dir.
- `index.pck`: the audit's one caveat was confirming no *external* page hot-links
  `firebabys.io/index.pck`. That cannot be verified from this VM (no access logs).
  In-tree consumers: none (verified). A hot-link, if one exists, would 404 after the
  deletion is pushed — accepted per task instruction to move all listed strays.

## 2. `worker-index.js` exposure (§3.1, Medium) — FIXED

- Verified unreferenced this pass: `grep -rn "worker-index" ~/workspace/.deploy`
  across HTML/JS/JSON (and a full-tree sweep) returned **0 hits** (exit 1, no matches).
- Verified the canonical copy is safe before moving: `.deploy/worker-index.js` and
  `~/workspace/fire-babys-auth/worker/src/index.js` are byte-identical — MD5
  `86daed61a263a703a6841631fd4a94d1` both, `diff` clean (re-verified after the move
  against the preserved copy).
- Moved `.deploy/worker-index.js` → `backups/security-stray/worker-index.js`;
  added `worker-index.js` to `deletions.txt`.
- The auth worker's code itself was NOT edited (per task scope).

## 3. Multiplayer worker fixes — FIXED IN SOURCE (deployment remaining)

Canonical source: `~/workspace/fire-babys-multiplayer/worker/src/`.
Originals backed up first to `~/workspace/fire-babys-gamer-check/backups/security-mp/`
(`index.js`, `lobby.js`, `directory.js`, `protocol.js`, `wrangler.toml`).
Client behaviour was checked before choosing thresholds: the real client
(`client/fire-babys-net.js`, inlined in `3d.html`) sends `{mode}` (~20 bytes) to create,
pings 1×/20 s, sends moves at 12 Hz (already server-throttled ~15 Hz), and sends
`action` only for discrete gameplay events (hit/block/jump/emote/extinguish/look).

### MP-1 — Unbounded lobby creation (Medium) — FIXED
File: `src/index.js` (`POST /api/lobby`), `src/lobby.js` (`/internal/create`), constants in `src/protocol.js`.
- **Body cap:** `content-length` > 1024 (`MAX_CREATE_BODY_BYTES`) rejected with 413 before
  reading; the actually-read body is also length-checked (chunked/no-header requests).
  Body parsing keeps the old tolerant behaviour (malformed JSON → `{}` → mode `coop`).
- **Per-IP rate limit:** max 30 creates/minute/IP (`CREATE_MAX_PER_IP_PER_MIN`, IP from
  `cf-connecting-ip`) → 429. Implemented as an in-memory Map in the worker isolate —
  honestly a best-effort blunt, not a global guarantee (isolates are per-PoP/ephemeral).
  30/min is generous for legit play (a classroom NAT creating simultaneously still fits).
- **Global cap:** before allocating a code, the entry worker counts lobbies via the
  singleton directory DO's existing `/list` (which also prunes stale entries); at
  ≥ 200 active lobbies (`MAX_ACTIVE_LOBBIES`) it returns 503. If the directory check
  itself throws, creation falls through rather than taking multiplayer down.
- **Creation expiry:** the lobby DO now arms an alarm at creation
  (`NEVER_JOINED_TTL_MS` = 30 min). A never-joined lobby is deleted by the existing
  `alarm()` (which only deletes when nobody is connected, so a joined/in-use lobby is
  never killed). `handleJoin` already cancels pending alarms (`deleteAlarm`) and
  `handleDisconnect` re-arms the shorter 5-minute `EMPTY_TTL_MS` — unchanged.
- Remaining (optional, dashboard-side, not required for the fix): a Cloudflare
  rate-limit rule / Rate Limiting binding on `POST /api/lobby` would make the per-IP
  limit global instead of per-isolate.

### MP-2 — No flood limit on non-move WebSocket messages (Medium) — FIXED
File: `src/lobby.js` (`webSocketMessage`, new `takeMsgToken()`), constants in `src/protocol.js`.
- Per-player token bucket for **all non-move message types** (`action`, `ping`, `ready`,
  `mode`, `start`, `end`, unknown): capacity 40 (`MSG_BUCKET_CAPACITY`), refill
  20/second (`MSG_BUCKET_REFILL_PER_SEC`) — the audit's suggested ~20 msg/s sustained,
  with burst headroom so legit bursts are never dropped. Over-limit messages are
  dropped silently; the connection is not closed.
- `move` is deliberately excluded — it keeps its existing dedicated ~15 Hz throttle
  in `relayMove()`, so movement behaviour is byte-for-byte unchanged.
- Buckets are in-memory per DO (one DO = one lobby, so the limit is effectively
  global per player-in-lobby) and are not reset on disconnect/reconnect.

### MP-3 — CORS `*` and no WebSocket Origin check (Low) — FIXED
Files: `src/index.js`, `src/lobby.js`, `src/protocol.js` (`isAllowedOrigin`).
- Allowlist exactly per the audit: `https://firebabys.io`, `https://www.firebabys.io`,
  plus `http://localhost` / `http://127.0.0.1` (any port) for the local test page
  (`test/index.html` + `wrangler dev` on :8787, both still present in the project).
- CORS: `access-control-allow-origin: *` is gone everywhere. Allowed origins are
  echoed back with `Vary: Origin`; disallowed origins get no CORS headers;
  preflight (`OPTIONS`) from a disallowed origin returns 403.
- WebSocket upgrades: the entry worker returns 403 when an `Origin` header is present
  and not allowlisted, and `GameLobby.handleJoin` repeats the same check as defence
  in depth (so a future route change cannot silently bypass it). Requests with **no**
  Origin header (non-browser clients, curl, tooling) are allowed through — CORS/Origin
  checks govern browsers; they are not an auth mechanism.
- Client compatibility: the live game is served from `https://firebabys.io` and calls
  the worker cross-origin for `POST /api/lobby` (preflight: `content-type` is in
  `access-control-allow-headers`), `GET /api/lobbies`, `GET /lobby/:code`, and the WS
  upgrade — all covered by the allowlist. `play.html` does not use the multiplayer
  worker at all (its CSP `connect-src` has no multiplayer entry).
- Known consequence, stated plainly: any *other* website that was embedding/driving
  this worker from a browser (unknown embedders) will now be blocked. That is the
  intended effect of the audit recommendation. `https://jman350z.github.io` is NOT
  on the allowlist (no in-tree evidence the game is played from there); if Jeff ever
  plays via the github.io mirror, add it to `ALLOWED_ORIGINS` in `protocol.js`.

### Not changed in the multiplayer worker
- `src/directory.js`: unchanged (its existing `/list` is what the MP-1 global cap uses).
- MP-4 (slot squatting by design) and MP-5 (public list/state by design): audit
  recommended no change beyond MP-1/MP-2, which now bound their abuse value.

## 4. Verification

- Syntax: `node --check` passes on all four worker sources (`index.js`, `lobby.js`,
  `directory.js`, `protocol.js`).
- Behaviour: a purpose-built Node harness with mocked DO storage/namespaces —
  **30 checks, 30 passed, 0 failed**. Copy saved at
  `backups/security-mp/mp-security-test.mjs` (re-run: `node mp-security-test.mjs`).
  Covered: origin allowlist (8 cases incl. look-alike-domain rejection); normal create
  still returns a valid code; invalid mode and malformed JSON tolerated exactly as
  before; oversized body → 413; 31st create from one IP → 429 while another IP is
  unaffected; 200 active lobbies → 503 while 199 still creates; CORS echo for allowed
  origin and no `*`/no header for disallowed; preflight 403/204; WS upgrade 403 for an
  evil origin and forwarded for an allowed one; DO create arms the ~30-min expiry
  alarm; DO itself 403s an evil-origin join; 100 rapid pings produce exactly 40 pongs
  (bucket cap), a ping is allowed again after a simulated 1 s refill; 50 moves do not
  drain the non-move bucket; a legit `ready` message is still processed.
- Harness limitation, stated honestly: Node's `Response` constructor rejects status
  101, so the *successful* WebSocket upgrade handshake inside the DO (a
  Workers-runtime feature) could not be exercised locally — the player was seeded
  directly for the `webSocketMessage` tests, and the upgrade's origin gate (which runs
  before the 101 response) was fully tested at both layers. The project ships no test
  suite of its own (`package.json` has only `deploy`/`dev` scripts); no project tests
  existed to run.
- `.deploy` post-move state re-verified: all 7 files gone from the tree, all live
  files (`3d.html`, `play.html`, `play-all.html`, `blog.html`, `auth-gate.js`, …)
  still present.

## 5. Not fixed in this pass (with reasons)

- **Auth worker AW-1–AW-5** (all Low): explicitly out of scope — the task reserves
  auth-worker behaviour changes for the upcoming dedicated profile-system update.
  Only its public *exposure* was fixed (§2 above); its code is untouched.
- **Page headers / CSP / referrer meta (§5 of the audit):** explicitly out of scope —
  the coordinator applies those at the end on the final staged files to avoid
  colliding with the game batches.
- **Multiplayer worker deployment to Cloudflare:** impossible from this VM (no
  wrangler credentials/deploy path here). Remaining step for the coordinator:
  `cd ~/workspace/fire-babys-multiplayer/worker && npx wrangler deploy`.
- **Cloudflare dashboard rate-limit rule for `POST /api/lobby`:** optional
  defence-in-depth only; the code-side MP-1 fix stands without it.


## 3D hash-CSP attempt

Date: 2026-10-12 (PDT). Scope: ONLY `3d.html` (audit §5 hardening item: its
`script-src 'self' 'unsafe-inline' https://firebabys.io https://accounts.google.com`
— `'unsafe-inline'` removed most of the CSP's XSS value).

**Outcome: LANDED.** `3d.html` now uses hash-based `script-src` in the style of
`play.html`. Staged and verified; nothing else was touched (no GitHub upload).

### What changed (rebuild source `~/workspace/fire-babys-3d-rebuild/3d.html`, copied to `~/workspace/.deploy/3d.html`, `cmp` byte-identical, 1,041,540 bytes)

1. `script-src`: removed `'unsafe-inline'`; kept `'self'`, `https://firebabys.io`,
   `https://accounts.google.com`; added one `'sha256-…'` source per inline script
   block (6 blocks). Every other CSP directive is byte-for-byte unchanged.
2. Added `<meta name="referrer" content="strict-origin-when-cross-origin">`
   (it was absent).
3. Inline event-handler conversion (the known trap — hash-based `script-src`
   does NOT cover `onclick=` attributes): a grep of the whole file found exactly
   **2** handler attributes, both trivially convertible, so this was NOT a blocker:
   - `#startbtn` `onclick="startGame()"` — attribute removed; wired with
     `addEventListener('click', startGame)` in the "BULLETPROOF START" script block
     that already defines `startGame()`.
   - Error-overlay TRY AGAIN `onclick="location.reload()"` — attribute removed,
     button given `id="errretrybtn"`, wired with
     `addEventListener('click', function(){ location.reload(); })` in the same block.
   Post-edit grep: **0** `on*=` handler attributes remain.

### Integrity evidence

- Hashes recomputed independently after the edit (SHA-256 of each `<script>`
  element's exact text content, base64): **6 listed / 6 computed — MATCH**, in
  document order: `5NCPLkl8…BFtts=`, `+vKsYcHw…9koXWw=`, `JFAStX56…sKZtoI=`,
  `vy6BFtfC…tuBmlc=`, `EMMgLCzG…nGDrDd8=`, `7QqO4Dup…nGVdc=`.
- Diff vs the pre-edit backup is exactly the 4 edits above (CSP line + referrer
  line, 2 button lines, one 10-line wiring block) — nothing else.
- Backups (taken before editing): `backups/headers/3d.html.rebuild-source.pre-hash-csp.bak`
  and `backups/headers/3d.html.deploy.pre-hash-csp.bak` (both MD5
  `147e2fbd635164b58baca966182ccbc0`, matching the pre-edit files).
- `~/workspace/fire-babys-3d-rebuild/pre-deploy-check.sh 3d.html`: **ALL CHECKS
  PASSED** (script tags balanced 7, 5 blocks syntax-checked, FBF namespace calls
  resolve, size 1,041,540 bytes, phone error reporter present).

### Behaviour verification (Playwright, Chromium headless + SwiftShader)

Served `~/workspace/.deploy` on port 8935; tested desktop 1280×800 and phone
390×844. Local-harness note: the sandbox has no external tunnel (same limitation
recorded in audit §1), so `https://firebabys.io/auth-gate.js` was fulfilled from
the byte-identical local `.deploy/auth-gate.js`, and `*.workers.dev` endpoints
were stubbed with minimal JSON (auth session OK; lobby-create returned a
graceful `ok:false`, so no live match was attempted — per task scope).

Both viewports, identical results:

- **Console errors: 0. Page errors: 0. CSP violation reports: 0.** (Only
  console *warnings*: SwiftShader "GPU stall due to ReadPixels" performance
  notices — not errors, not CSP.)
- Auth gate renders (`.fbgate` + `#fbgate-email` sign-in form) on a fresh
  profile, and clears after cached sign-in.
- Page boots to the title menu; TAP TO START is visible and a real click hides
  the title (proves the `onclick`→`addEventListener` conversion works).
- Multiplayer menu opens (`#mpmenuov` → `display:flex`) via the SPLASH flow.
- WebGL renders: canvas present; in-game screenshots show 96,207 distinct
  colours (desktop) / 31,329 (phone) — a live rendered 3D scene, not a blank canvas.
- Single-player starts (`startFreeMode()` — the hub SP entry point — reaches
  `state === 'EXPLORE'`).
- Pause works with both **P** and **Escape** (`#pausemenu` → flex); Resume hides it.
- Mute works and persists: sound pill toggles `fbMuted`, sets
  `localStorage fb_muted=1`, pill shows 🔇, and both survive a full page reload.
- Quit-to-hub works: pause → QUIT TO HUB hides the pause menu and returns to
  `state === 'HUB'` with the mode flow reopening (`#mpmenuov` flex; in this
  SPLASH-only build `showHub()` routes straight back into the SPLASH flow and
  `#hubov` itself stays hidden by design).

No revert was needed: nothing failed. Residual note (unchanged from audit §5):
this is still a `<meta>` CSP on GitHub Pages — `frame-ancestors`-class
protection and real response headers still require the Cloudflare-fronted
serving change; the hash conversion removes the `'unsafe-inline'` script hole,
which was the fixable part.
