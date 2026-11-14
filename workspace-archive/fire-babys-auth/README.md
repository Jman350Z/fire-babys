# Fire Babys — Sign-in Gate

Every page on firebabys.io shows a sign-in screen first. Players enter an
email (and optional Fire Tamer name), get a session token, and never see
the gate again on that device. Jeff gets a growing email list; players get
a layer of account security.

## Contents

- `worker/` — Cloudflare Worker backend (`fire-babys-auth`)
- `client/auth-gate.js` — drop-in gate script for any page
- `test/index.html` — demo page (uses `?mock=1` fake backend, no network)

## Architecture

```
[player's browser] --POST /auth/register--> [fire-babys-auth worker] --> [KV: AUTH_KV]
        | token in localStorage                     user:{sha256(email)} -> {email,name,createdAt,token}
        |--POST /auth/session (verify)-->           token:{token}        -> {email,createdAt} (TTL 1yr)
                                                    rl:{ip}:{hour}       -> count (TTL 1hr, max 5/hr)
```

- **No passwords.** Email-only sign-in keeps it kid-simple.
- **No email verification yet** — Resend isn't set up. Anyone can type any
  email today. When Resend is ready, add `/auth/code` + `/auth/verify`
  (send code, check code → issue token) without changing the gate script.
- **Offline-tolerant:** if the worker is unreachable but a cached user
  exists, the player is let in (better than locking kids out).
- **Kid-safety:** no chat, names are sanitized, gate shows "Kids: ask a
  grown-up first."

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{email, name?}` | `{ok, token}` or `{ok:false, error}` |
| POST | `/auth/session` | `{token}` | `{ok, email, name}` or 401 |
| GET | `/auth/count` | — | `{ok, count}` |

Errors: `invalid_email` (400), `rate_limited` (429, 5 regs/IP/hour),
`invalid_token` (401), `bad_request` (400).

## Deploy the worker

```bash
cd worker
npm install -g wrangler
wrangler kv namespace create AUTH_KV        # copy the returned id...
# ...paste it into wrangler.toml (uncomment the id line)
wrangler deploy
# -> https://fire-babys-auth.jeffpruden288.workers.dev
```

The gate script defaults to that URL. Override per-page with:

```html
<script>window.FB_AUTH_URL="https://fire-babys-auth.<account>.workers.dev";</script>
<script src="https://firebabys.io/auth-gate.js"></script>
```

or the `data-auth-url` attribute on the script tag.

## Integrate into each site page

1. Host `client/auth-gate.js` as `auth-gate.js` in the site repo root
   (so it's served at `https://firebabys.io/auth-gate.js`).
2. Add this line inside `<head>` of **every** page — `index.html`,
   `play.html`, `3d.html`, `parents.html`, `characters.html`:

```html
<script src="https://firebabys.io/auth-gate.js"></script>
```

Must be synchronous (no `async`/`defer`) so the gate renders before
content flashes.

3. Optional per-page hooks:

```js
// Run code after sign-in:
window.FireBabysAuth.onAuthed(function(user){ console.log(user.email); });
// or: document.addEventListener('fb-authed', e => ...);

// Somewhere in a settings menu:
window.FireBabysAuth.signOut();
```

4. Optional floating "🔥 name · sign out" badge: add `data-badge="1"`
   to the script tag.

## Jeff's dashboard

`GET https://fire-babys-auth.jeffpruden288.workers.dev/auth/count`
→ `{ok:true, count: N}` — total registered emails.

## Upgrade path (when Resend is ready)

1. Worker: add `POST /auth/code` (generate 6-digit code, store in KV
   with 10-min TTL, send via Resend) and `POST /auth/verify`
   (check code → issue token).
2. Gate: swap the register form for a two-step email → code form.
   The `localStorage` token contract stays the same, so already-signed-in
   players are unaffected.

## Testing

- `node --check worker/src/index.js && node --check client/auth-gate.js`
- Unit tests: `node test-worker.mjs` (pure helpers: email validation,
  name sanitize, token format) — see repo root.
- Browser: open `test/index.html?mock=1`, sign in with any email,
  reload (gate skipped), sign out (gate returns).
