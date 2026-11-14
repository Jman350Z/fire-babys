# Phase C — Site Systems Findings (auth gate, voting, hubs, multiplayer, shared JS)

Worker: Phase C systems worker · Date: 2026-10-12 (PDT) · Mirror: `~/workspace/.deploy/` served locally on port 8931, Playwright (Chromium, `--use-gl=swiftshader`), desktop 1280×800 + phone 390×844.
Scope guard applied (Jeff, 2026-10-12 17:15 PDT): **auth-gate.js, SPLASH patches 003/015/021, and all profile/creator code are AUDIT-ONLY** — no edits were made to them (none had been made before the guard arrived; nothing to revert). Escalation (17:26 PDT) applied to everything else: fixable items in voting/hubs/shared JS were fixed, not just reported.
No game files were edited. Nothing was deployed to GitHub or Cloudflare.

**Test-environment caveat (applies to several results):** the sandbox browser cannot open direct tunnels to some external hosts — requests from inside Chromium to `https://firebabys.io/auth-gate.js`, `accounts.google.com`, and the workers.dev domains intermittently failed with `net::ERR_TUNNEL_CONNECTION_FAILED`, while `curl` from the same machine reached all of them fine (HTTP 200). To test the real gate code, Playwright served the byte-identical local `auth-gate.js` (verified `diff`-identical to the canonical `~/workspace/fire-babys-auth/client/auth-gate.js`, and live `https://firebabys.io/auth-gate.js` returns 200) in place of the production URL. Where a result depends on this, it is flagged.

---

## 1) AUTH GATE — AUDIT ONLY (guarded scope; no fixes made)

**Files:** `.deploy/auth-gate.js` is byte-identical to canonical `~/workspace/fire-babys-auth/client/auth-gate.js`. Auth worker live at `https://fire-babys-auth.jeffpruden288.workers.dev`.

**Where the gate is loaded (grep of the mirror):**
- `3d.html` — static `<script src="https://firebabys.io/auth-gate.js">` in `<head>` (line 7). ✅
- `play.html` — no static tag; SPLASH patch 021 dynamically injects the same script (`async = false`). ✅ (Verified live in-browser: gate renders for a fresh player on desktop + phone.)
- `index.html`, `fire-world.html`, `play-all.html`, `arcade.html` — **no auth gate at all.** ❌ (Finding F1)
- All 57 game pages under `fire-world/` — **no auth gate** (grep: 0 files). A player with a direct game link bypasses sign-in entirely. ❌ (Finding F2)

**Behavior tests (Playwright, 3d.html + play.html, gate code = production file):**
- Fresh player: gate renders and is visible on play.html and 3d.html, desktop + phone. Game canvas still boots behind it. **0 page errors** on all 12 page/viewport loads.
- B1 — returning player, valid session (mocked `/auth/session` → ok): **gate does NOT appear**, `FireBabysAuth.getUser()` returns the user. Not wrongly blocked. ✅
- B5 — full sign-in (mocked `/auth/config` emailVerification:false + `/auth/register` → token): fill email + name → gate disappears, token stored in `localStorage`, user set; `signOut()` → gate returns. No loop. ✅ (No real account was created on Jeff's worker — registration was mocked deliberately so the test wouldn't pollute his email list; the register endpoint itself was probed live, see below.)
- B3 — auth worker unreachable + cached user: player is let in with the cached user (designed offline tolerance). ✅
- B4 — auth worker unreachable + no cached user: exactly **one** gate, visible — no white-screen/permanent-hidden trap (the page-cloak is lifted when the gate is shown). ✅
- B2 — bogus token against the **live** worker: from the sandbox browser the worker fetch failed at the tunnel (environment caveat), so the gate took its offline path and admitted the cached user without clearing the token. The server side was verified directly: `POST /auth/session {token:"bogus…"}` → `{"ok":false,"error":"invalid_token"}`, and the gate source clears the token and re-shows the gate on a not-ok session response. The in-browser live-invalid-token path could not be exercised from this sandbox; the two halves (server response + gate code path) are each verified.
- Live worker probes (curl): `/auth/config` → `{ok:true, googleClientId:"1006253206125-…apps.googleusercontent.com", emailVerification:false}`; `/auth/count` → `{ok:true, count:5}`; `/auth/register` with a malformed email → `{"ok":false,"error":"invalid_email"}` (no account created). Worker is healthy and error paths are sane.
- Minor: with `emailVerification:false` on the live worker, sign-in is email-only with no verification (matches the auth project's README: Resend not yet set up). Anyone can type any email — known design state, flagged for the profile update. (Finding F3)
- Minor console noise (not gate errors): play.html logs a CSP warning (`frame-ancestors` ignored in a meta element); 3d.html's CSP blocks Cloudflare's `static.cloudflareinsights.com` beacon script. Cosmetic/analytics only.

**Verdict:** the gate itself works — renders, signs in, persists, doesn't wrongly block returning or offline players, doesn't loop, doesn't break game boot. The gap is **coverage**: hubs and all game pages don't load it, so Jeff's "sign in before any part of the site" rule is only enforced on play.html + 3d.html. Fix belongs to the profile update (guarded).

## 2) VOTING — tested; 1 fix applied

**Files:** `.deploy/voting.js` was byte-identical to canonical `~/workspace/fire-babys-arcade/voting/voting.js`. Only consumer: `arcade.html` (loads GSI client, sets `FB_VOTE_URL`, loads `/voting.js`). Vote worker live: `GET /votestatus` → `{ok:true, open:false, votedCount:0}`; `POST /votestatus` (no token) → `{…, signedIn:false}`.

**Tests:**
- Live state (Playwright, arcade.html): banner `#voteBanner` renders, reads "Voting is closed right now — check back soon." and "0 creators have voted so far." — matches the live worker exactly. **0 page errors** from voting.js, desktop + phone. ✅
- **Dead UI (latent):** `arcade.html` contains **zero** cards with `data-game-id` — the SPLASH card correctly has none (official game), and every other card is a "COMING SOON" placeholder. With voting mocked OPEN and an eligible signed-in creator, the banner says "You're eligible! Pick your favorite below" but renders **0 vote buttons** — there is nothing to vote on. Currently harmless (voting is closed and no creator games are live), but the moment voting opens with live creator games, those cards must get `data-game-id` attributes or voting is a dead end. (Finding F4 — could not fix: no live creator games exist to tag, and tagging placeholder cards would enable votes for fake games.)
- **FIXED (F5):** `renderGoogleButton()` retried every 300 ms **forever** if the Google Identity script never loaded (blocked/slow network), silently spinning with no message. Capped at 20 tries (~6 s), after which the banner shows "Sign-in is unavailable right now." Edited canonical `~/workspace/fire-babys-arcade/voting/voting.js`, copied to `.deploy/voting.js` (originals backed up, see below). Verified: `node --check` passes; Playwright with GSI blocked + voting open shows the unavailable note after ~6 s, 0 page errors.

## 3) GAME HUBS — link integrity FIXED; counts verified correct

**Method:** scripted extraction of every `href`/`src` (plus play-all.html's JS game array) from `index.html`, `fire-world.html`, `play-all.html`, `arcade.html`, checked against files in the mirror; dead targets cross-checked against `~/workspace/site/` and the live site.

**Before fix:** `fire-world.html` 60/60 internal links OK; `play-all.html` 60/60 OK (all 57 game URLs + nav); `arcade.html` OK. `index.html` had **5 dead targets in the mirror**: `characters.html`, `parents.html`, `manifest.json`, `icon-192.png` (link + apple-touch-icon), `icon-512.png` (og:image), and `world/` — all return HTTP 200 on the live site (production was fine; the local mirror was incomplete).
**FIXED (F6):** staged the exact production files into `.deploy`: `characters.html`, `parents.html`, `manifest.json`, `icon-192.png` (valid PNG 192×192), `icon-512.png` (valid PNG 512×512), and `world/index.html` (the SPLASH redirect stub →
...[truncated 6182 chars]