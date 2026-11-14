// Fire Babys auth — Cloudflare Worker entry point.
// Sign-in gate backend: collects player emails, issues session tokens.
//
// Routes:
//   POST /auth/register  {email, name?}  -> { ok, token }        (rate limited: 5/hr/IP)
//   POST /auth/session   {token}          -> { ok, email, name, role, isAdmin }  (token check)
//   POST /auth/password  {email, password} -> { ok, token, email, isNew, role, isAdmin }
//        Password sign-in (2026-10-21): only for accounts that have a
//        passwordHash on their user record (see hashPassword below).
//        One generic 401 invalid_credentials for no-account /
//        no-password / wrong-password — never reveals which.
//   GET  /auth/count                        -> { ok, count }       (dashboard; AW-1: x-admin-key required)
//   GET  /leaderboard                       -> { ok, leaders }     (AW-2: KV-cached 60s)
//   GET  /presence                          -> { ok, arrival }     (Dark Knight: latest admin
//                                                                   arrival {id, at} or null; no PII)
//   POST /auth/verify                       (AW-3: per-IP rate limit added 2026-10-12)
//   POST /link/config|list|steam/verify|discord/exchange|unlink
//        Platform linking (2026-10-12): Steam OpenID + Discord OAuth2,
//        both verified server-side. Discord needs env DISCORD_CLIENT_ID
//        + DISCORD_CLIENT_SECRET (secret never ships to the client).
//   POST /link/google/exchange|yahoo/exchange|amazon/exchange
//        Account linking (2026-10-18): Google / Yahoo / Amazon OAuth2,
//        codes exchanged server-side exactly like Discord. Each needs
//        its env pair (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET,
//        YAHOO_CLIENT_ID + YAHOO_CLIENT_SECRET, AMAZON_CLIENT_ID +
//        AMAZON_CLIENT_SECRET); secrets never ship to the client.
//
// Storage: KV namespace AUTH_KV
//   user:{sha256(email)} -> { email, name, createdAt, token,
//                             emailVerified?, role?, passwordHash? }
//   token:{token}        -> { email, createdAt, epoch }   (TTL 365 days)
//   rl:{ip}:{hourBucket} -> count                         (TTL 1 hour)
//
// Master admins (Jeff, 2026-10-21): ADMIN_EMAILS below is the TOP
// ADMIN allowlist. isTopAdmin() is the ONE central check; /auth/session,
// /profile/* (publicProfile), /locker/* (publicLocker) and every
// sign-in response derive { role, isAdmin } from it, so the flag shows
// up identically on every path — including a brand-new registration
// under a listed email. Accounts created under a listed email also get
// role:"top_admin" stamped onto their user record.
//
// Designed for upgrade: when Resend is available, add
//   POST /auth/code  (send email verification code)
//   POST /auth/verify (check code -> issue token)
// without changing the client gate contract.
//
// Bot protection (2026-10-21): /auth/register and /auth/code verify a
// Cloudflare Turnstile token (body.turnstileToken) when the
// TURNSTILE_SECRET secret is set; no secret = check disabled. If
// siteverify is unreachable the request falls back to the rate limits.
//
// THE GREAT KICK (Jeff, 2026-10-21): a global session epoch lives in KV
// at `meta:session_epoch` (integer, default 1 when the key is absent).
// Every token record carries the epoch it was issued under
// (token:{token} -> { email, createdAt, epoch }). /auth/session and
// every token-authenticated endpoint (via profileKeyForToken: /profile/*,
// /locker/*, /link/*) reject a token whose epoch differs from the
// current epoch with 401 invalid_token. POST /admin/kick (guarded by
// the ADMIN_KEY secret, same pattern as /auth/count) bumps the epoch by
// one — that is the ENTIRE kick: no account, profile, locker,
// leaderboard, or progression record is read for deletion or modified
// in any way; only sessions die. New sign-ins (register / code verify /
// Google) stamp the current epoch, so signing back in always works.
// Token records written before the epoch existed have no epoch field
// and count as epoch 1 — valid until the first bump, dead after it.
// FAILURE MODE (chosen, tested): if the epoch cannot be read (KV error
// or a non-integer value), validation FAILS CLOSED — protected
// endpoints answer 401 invalid_token and sign-in paths answer 503
// epoch_unavailable instead of stamping a guessed epoch. Nothing is
// written on the failure path, so a KV hiccup can never corrupt data;
// it only looks like a sign-out until KV recovers.

const CORS = {
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

// Only the game's own origins may call the API from a browser.
const ALLOWED_ORIGINS = new Set([
  "https://firebabys.io",
  "https://www.firebabys.io",
]);
function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const h = { ...CORS };
  if (ALLOWED_ORIGINS.has(origin)) {
    h["access-control-allow-origin"] = origin;
    h["vary"] = "origin";
  }
  // Non-browser tools (curl, workers) send no Origin; they still get JSON.
  return h;
}

const TOKEN_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_LEN = 32;
const TOKEN_TTL = 60 * 60 * 24 * 365; // 1 year
const MAX_BODY_BYTES = 2048;
const RATE_LIMIT_PER_HOUR = 5;

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(request || { headers: new Headers() }) },
  });
}

// --- pure helpers (exported for unit tests) ---

export function isValidEmail(raw) {
  if (typeof raw !== "string") return false;
  const email = raw.trim();
  if (email.length < 5 || email.length > 254) return false;
  // Simple, pragmatic check: local@domain.tld, no spaces.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function normalizeEmail(raw) {
  return String(raw).trim().toLowerCase();
}

/* ----- Master admins: TOP ADMIN email allowlist (Jeff, 2026-10-21) ----- */
export const ADMIN_EMAILS = new Set([
  "jeffpruden288@gmail.com",
  "jeffprudengficompany@gmail.com",
]);

// The one central admin check. Case-insensitive because every email in
// the system is stored normalized (trim + lowercase).
export function isTopAdmin(email) {
  return typeof email === "string" && ADMIN_EMAILS.has(normalizeEmail(email));
}

// The { role, isAdmin } pair every session/profile/locker response
// carries, derived from the account's email — never from client input.
export function roleFields(email) {
  const admin = isTopAdmin(email);
  return { role: admin ? "top_admin" : "player", isAdmin: admin };
}

/* ----- Dark Knight: admin arrival announcement (Jeff, 2026-10-21) -----
 * When a TOP ADMIN signs in — any successful sign-in path (register,
 * email-code verify, Google, password) — recordAdminArrival() writes
 * KV `admin:arrival` = { id, at } with a 180s TTL. It means one thing:
 * an admin just came online. GET /presence is the public, PII-free
 * read (id + timestamp only, never an email): every player's pages
 * poll it via dark-knight.js, and a fresh arrival id they have never
 * seen flashes the "⚔️ A Dark Knight is coming..." banner once.
 * Freshness is 120s, enforced on read as well as by the KV TTL, so a
 * stale record can never announce late. Non-admin sign-ins NEVER write
 * the key. The write is best-effort: a KV hiccup must never fail a
 * sign-in, so write failures are swallowed (and logged server-side). */
export const ADMIN_ARRIVAL_KEY = "admin:arrival";
export const ADMIN_ARRIVAL_TTL = 180; // seconds of KV life
export const ADMIN_ARRIVAL_FRESH_MS = 120000; // announced only within 120s

export async function recordAdminArrival(env, email) {
  if (!isTopAdmin(email)) return null;
  try {
    const arrival = { id: genToken() + "-" + Date.now().toString(36), at: Date.now() };
    await env.AUTH_KV.put(ADMIN_ARRIVAL_KEY, JSON.stringify(arrival), { expirationTtl: ADMIN_ARRIVAL_TTL });
    return arrival;
  } catch (e) {
    console.log("dark-knight: arrival write failed (sign-in unaffected)");
    return null;
  }
}

// Pure freshness check (exported for tests): an arrival counts only
// within 120s of its timestamp (5s of clock-skew slack); malformed
// records never count.
export function arrivalIsFresh(rec, now = Date.now()) {
  return !!rec && typeof rec.id === "string" && rec.id.length > 0 &&
    typeof rec.at === "number" && Number.isFinite(rec.at) &&
    now - rec.at >= -5000 && now - rec.at < ADMIN_ARRIVAL_FRESH_MS;
}

async function handlePresence(request, env) {
  let rec = null;
  try { rec = await env.AUTH_KV.get(ADMIN_ARRIVAL_KEY, "json"); } catch (e) { rec = null; }
  // Only id + at ever leave the server — no email, no PII.
  const arrival = arrivalIsFresh(rec) ? { id: rec.id, at: rec.at } : null;
  return json({ ok: true, arrival }, 200, request);
}

export function sanitizeName(raw) {
  if (typeof raw !== "string") return "";
  // Strip anything that could break HTML/JSON contexts; keep it short.
  return raw
    .replace(/[<>"'&\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export function genToken() {
  const buf = new Uint8Array(TOKEN_LEN);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
  return s;
}

/* ----- The Great Kick: session epoch helpers ----- */
const SESSION_EPOCH_KEY = "meta:session_epoch";
const DEFAULT_SESSION_EPOCH = 1;

// Current epoch: the KV integer, DEFAULT_SESSION_EPOCH when the key has
// never been written, or null when unreadable (KV threw, or the value
// is not a positive integer). Callers treat null as FAIL CLOSED.
export async function getSessionEpoch(env) {
  try {
    const raw = await env.AUTH_KV.get(SESSION_EPOCH_KEY);
    if (raw === null || raw === undefined) return DEFAULT_SESSION_EPOCH;
    const s = String(raw).trim();
    if (!/^\d+$/.test(s)) return null;
    const n = parseInt(s, 10);
    return Number.isSafeInteger(n) && n >= 1 ? n : null;
  } catch (e) {
    return null;
  }
}

// The epoch a token record was issued under. Records written before
// the Great Kick have no epoch field — they are epoch 1 by definition.
function tokenRecordEpoch(rec) {
  return rec && Number.isInteger(rec.epoch) && rec.epoch >= 1
    ? rec.epoch
    : DEFAULT_SESSION_EPOCH;
}

// True only when the record's epoch matches the current epoch. An
// unreadable epoch is NEVER a match (fail closed — see header note).
async function sessionEpochOk(env, rec) {
  const cur = await getSessionEpoch(env);
  if (cur === null) return false;
  return tokenRecordEpoch(rec) === cur;
}

// The one place token records are (re)written: every issuance and every
// restore goes through here so the epoch stamp can never be forgotten.
async function writeTokenRecord(env, token, email, createdAt, epoch) {
  await env.AUTH_KV.put(
    `token:${token}`,
    JSON.stringify({ email, createdAt, epoch }),
    { expirationTtl: TOKEN_TTL }
  );
}

/* ----- Google ID token verification ----- */
// Verifies a Google Sign-In ID token and returns {email, name} or {error}.
let __googleJwksCache = null;
let __googleJwksAt = 0;
async function getGoogleJwks() {
  // Cache for 1 hour.
  if (__googleJwksCache && Date.now() - __googleJwksAt < 3600000) return __googleJwksCache;
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!r.ok) throw new Error("jwks_fetch_failed");
  const j = await r.json();
  __googleJwksCache = j;
  __googleJwksAt = Date.now();
  return j;
}
function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function verifyGoogleIdToken(idToken, clientId) {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return { error: "bad_token" };
    const header = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
    if (header.alg !== "RS256") return { error: "bad_alg" };
    const jwks = await getGoogleJwks();
    const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
    if (!jwk) return { error: "unknown_kid" };
    const key = await crypto.subtle.importKey("jwk", jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const data = new TextEncoder().encode(parts[0] + "." + parts[1]);
    const sig = b64urlDecode(parts[2]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, data);
    if (!valid) return { error: "bad_sig" };
    // Claims checks.
    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== clientId) return { error: "bad_aud" };
    if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com")
      return { error: "bad_iss" };
    if (typeof payload.exp !== "number" || payload.exp < now) return { error: "expired" };
    if (!payload.email || payload.email_verified !== true) return { error: "email_not_verified" };
    return { email: payload.email, name: payload.name || "" };
  } catch (e) {
    return { error: "verify_failed" };
  }
}

async function handleGoogleAuth(request, env) {
  const body = await readBody(request);
  if (!body || typeof body.idToken !== "string") {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  const clientId = env.GOOGLE_CLIENT_ID || "";
  if (!clientId) {
    return json({ ok: false, error: "google_not_configured" }, 503, request);
  }
  // Rate limit by IP.
  const ip = clientIp(request);
  const hourBucket = Math.floor(Date.now() / 3600000);
  const rlKey = `grl:${ip}:${hourBucket}`;
  const rlRaw = await env.AUTH_KV.get(rlKey);
  const rlCount = rlRaw ? parseInt(rlRaw, 10) || 0 : 0;
  if (rlCount >= 30) return json({ ok: false, error: "rate_limited" }, 429, request);
  await env.AUTH_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });

  // Great Kick: a sign-in stamps the CURRENT session epoch. If the
  // epoch can't be read, refuse (fail closed) rather than stamp a
  // guessed one — the player just retries when KV recovers.
  const epoch = await getSessionEpoch(env);
  if (epoch === null) return json({ ok: false, error: "epoch_unavailable" }, 503, request);

  const v = await verifyGoogleIdToken(body.idToken, clientId);
  if (v.error) return json({ ok: false, error: v.error }, 401, request);

  const email = normalizeEmail(v.email);
  const emailHash = await sha256Hex(email);
  const userKey = `user:${emailHash}`;
  const existing = await env.AUTH_KV.get(userKey, "json");

  let token, isNew;
  if (existing && existing.token) {
    // Returning player: Google verified the email, so it's safe to restore
    // their existing token — their account (armor, tasks, stats) comes up.
    token = existing.token;
    isNew = false;
    if (v.name && v.name !== existing.name) {
      existing.name = sanitizeName(v.name);
      await env.AUTH_KV.put(userKey, JSON.stringify(existing));
    }
    // Restoring after the Great Kick re-stamps the CURRENT epoch —
    // this sign-in is the player's fresh proof, so their token lives.
    await writeTokenRecord(env, token, email, existing.createdAt, epoch);
  } else {
    // New player via Google.
    token = genToken();
    isNew = true;
    const now = Date.now();
    const fresh = {
      email, name: sanitizeName(v.name || ""), token, createdAt: now, emailVerified: true,
    };
    if (isTopAdmin(email)) fresh.role = "top_admin"; // allowlist stamp
    await env.AUTH_KV.put(userKey, JSON.stringify(fresh));
    await writeTokenRecord(env, token, email, now, epoch);
  }
  await recordAdminArrival(env, email); // Dark Knight: no-op unless top admin
  return json({ ok: true, token, email, isNew, ...roleFields(email) }, 200, request);
}

export async function sha256Hex(str) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ----- Account passwords (Jeff, 2026-10-21) -----
 * The game originally had NO passwords at all: sign-in was a stored
 * token, an email code, or Google. Jeff ordered a password on his own
 * account, so this is the scheme: PBKDF2-SHA256, 100,000 iterations
 * (the Cloudflare Workers ceiling), a 16-byte random salt, and a
 * 32-byte derived key, stored on the user record as
 *   passwordHash = "pbkdf2$100000$<salt base64>$<key base64>"
 * Plaintext passwords are never stored, returned, or logged.
 * POST /auth/password verifies a presented password against it. */
const PASSWORD_ITERATIONS = 100000;

function b64EncodeBytes(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64DecodeBytes(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function pbkdf2Sha256(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const dk = await pbkdf2Sha256(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2$${PASSWORD_ITERATIONS}$${b64EncodeBytes(salt)}$${b64EncodeBytes(dk)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
    const iterations = parseInt(parts[1], 10);
    if (!Number.isInteger(iterations) || iterations < 1000 || iterations > PASSWORD_ITERATIONS) return false;
    const salt = b64DecodeBytes(parts[2]);
    const expected = b64DecodeBytes(parts[3]);
    if (salt.length < 8 || expected.length !== 32) return false;
    const dk = await pbkdf2Sha256(password, salt, iterations);
    // Constant-time compare over the full derived key.
    let diff = 0;
    for (let i = 0; i < 32; i++) diff |= dk[i] ^ expected[i];
    return diff === 0;
  } catch (e) {
    return false;
  }
}

function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --- Cloudflare Turnstile bot check (added 2026-10-21) ---
// Guards /auth/register and /auth/code — the endpoints bots abuse for
// fake accounts and wallet attacks (each /auth/code send costs real
// Resend money). Active ONLY when the TURNSTILE_SECRET secret is set on
// the Worker; with no secret configured this is a no-op, so deploy order
// can never break auth. Returns null when the request may proceed, or a
// 403 bot_check_failed response.
// OUTAGE RULE: if siteverify itself is unreachable or returns garbage,
// fall back to the per-IP rate limits and ALLOW the request — a
// Cloudflare hiccup must never lock every player out. The fallback is
// logged server-side.
async function turnstileBlock(request, env, body) {
  const secret = env.TURNSTILE_SECRET || "";
  if (!secret) return null; // Turnstile off — no-op.
  const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  if (!token) {
    return json({ ok: false, error: "bot_check_failed" }, 403, request);
  }
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    form.set("remoteip", clientIp(request));
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const data = await r.json().catch(() => null);
    if (!data || typeof data.success !== "boolean") {
      console.log("turnstile: siteverify malformed response — allowing (rate limits still apply)");
      return null;
    }
    if (!data.success) {
      return json({ ok: false, error: "bot_check_failed" }, 403, request);
    }
    return null;
  } catch (e) {
    console.log("turnstile: siteverify unreachable — allowing (rate limits still apply)");
    return null;
  }
}

// --- handlers ---

async function handleRegister(request, env) {
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: "bad_request" }, 400, request);

  // Bot check (Turnstile) — no-op unless TURNSTILE_SECRET is configured.
  const tsBlock = await turnstileBlock(request, env, body);
  if (tsBlock) return tsBlock;

  const email = normalizeEmail(body.email || "");
  const name = sanitizeName(body.name || "");

  if (!isValidEmail(email)) {
    return json({ ok: false, error: "invalid_email" }, 400, request);
  }

  // Rate limit: 5 registrations / IP / hour.
  const ip = clientIp(request);
  const hourBucket = Math.floor(Date.now() / 3600000);
  const rlKey = `rl:${ip}:${hourBucket}`;
  const rlRaw = await env.AUTH_KV.get(rlKey);
  const rlCount = rlRaw ? parseInt(rlRaw, 10) || 0 : 0;
  if (rlCount >= RATE_LIMIT_PER_HOUR) {
    return json({ ok: false, error: "rate_limited" }, 429, request);
  }

  const emailHash = await sha256Hex(email);
  const userKey = `user:${emailHash}`;
  const existing = await env.AUTH_KV.get(userKey, "json");

  let token;
  if (existing && existing.token) {
    // SECURITY: never re-issue a token on email alone — that lets anyone who
    // knows an email hijack the account. The client must present its stored
    // token via /auth/session. (Email-code verification is the upgrade path.)
    await env.AUTH_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });
    return json({ ok: false, error: "already_registered",
      message: "This email already has a Fire Babys account. Sign in on your original device." }, 409, request);
  } else {
    // Email verification is ON (RESEND_API_KEY set): new accounts must come
    // through the email-code flow (/auth/code + /auth/verify). Refuse direct
    // registration so a fake email can no longer mint a live token.
    // (Added 2026-10-20, closing the junk-registration hole.)
    if (env.RESEND_API_KEY) {
      await env.AUTH_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });
      return json({ ok: false, error: "verification_required",
        message: "Sign-up uses an email code now — check your inbox." }, 403, request);
    }
    // Great Kick: stamp the CURRENT session epoch; unreadable epoch
    // fails closed (503, nothing written) instead of guessing.
    const epoch = await getSessionEpoch(env);
    if (epoch === null) return json({ ok: false, error: "epoch_unavailable" }, 503, request);
    token = genToken();
    const user = { email, name, createdAt: Date.now(), token, emailVerified: false };
    if (isTopAdmin(email)) user.role = "top_admin"; // allowlist stamp
    await env.AUTH_KV.put(userKey, JSON.stringify(user));
    await writeTokenRecord(env, token, email, user.createdAt, epoch);
  }

  await env.AUTH_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });

  await recordAdminArrival(env, email); // Dark Knight: no-op unless top admin
  return json({ ok: true, token, ...roleFields(email) }, 200, request);
}

async function handleSession(request, env) {
  const body = await readBody(request);
  if (!body || typeof body.token !== "string") {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  const token = body.token.trim();
  if (!/^[A-Za-z0-9]{32}$/.test(token)) {
    return json({ ok: false, error: "invalid_token" }, 401, request);
  }
  const rec = await env.AUTH_KV.get(`token:${token}`, "json");
  if (!rec || !rec.email) {
    return json({ ok: false, error: "invalid_token" }, 401, request);
  }
  // THE GREAT KICK: a token issued under an older epoch is dead — the
  // player signs back in (which re-stamps the current epoch) and loses
  // nothing else. An unreadable epoch also lands here (fail closed).
  const epoch = await getSessionEpoch(env);
  if (epoch === null || tokenRecordEpoch(rec) !== epoch) {
    return json({ ok: false, error: "invalid_token" }, 401, request);
  }
  // F2 (sign-in audit 2026-10-21, defect D2): sliding renewal. The token
  // record is written with a fixed 365-day TTL at sign-in; without this,
  // even daily players were force-signed-out on day 365. When the record
  // is older than 180 days, re-PUT it with a fresh TTL so active players
  // never reach the cliff — only genuinely abandoned sessions expire.
  // The renewal runs ONLY after the epoch check above and carries the
  // validated epoch, so it can never resurrect a kicked token.
  if (rec.createdAt && Date.now() - rec.createdAt > 180 * 24 * 3600 * 1000) {
    await env.AUTH_KV.put(
      `token:${token}`,
      JSON.stringify({ email: rec.email, createdAt: Date.now(), epoch }),
      { expirationTtl: TOKEN_TTL }
    );
  }
  const user = await env.AUTH_KV.get(
    `user:${await sha256Hex(rec.email)}`,
    "json"
  );
  return json({ ok: true, email: rec.email, name: (user && user.name) || "", ...roleFields(rec.email) }, 200, request);
}

// --- player profile: 2D stages -> bronze knight armor, arena stats ---
//
// Armor pieces are SERVER-AUTHORITATIVE: the server derives them from
// maxStageBeaten and never trusts client armor claims.
//   stage 5  -> greaves     (+2.5%)
//   stage 10 -> gauntlets    (+5% total)
//   stage 15 -> helmet       (+7.5% total)
//   stage 20 -> chestplate   (+10% total, full set, gold glow)
// Storage: KV `profile:{sha256(email)}` ->
//   { email, name, maxStage, stats:{kills,deaths,wins,losses}, updatedAt }

const ARMOR_MILESTONES = [
  { stage: 5, piece: "greaves" },
  { stage: 10, piece: "gauntlets" },
  { stage: 15, piece: "helmet" },
  { stage: 20, piece: "chestplate" },
];
const BOOST_PER_PIECE = 0.025;
const PROFILE_RL_PER_HOUR = 120;

function armorForStage(maxStage) {
  const armor = { greaves: false, gauntlets: false, helmet: false, chestplate: false };
  let pieces = 0;
  for (const m of ARMOR_MILESTONES) {
    if (maxStage >= m.stage) {
      armor[m.piece] = true;
      pieces++;
    }
  }
  return { armor, pieces, boost: pieces * BOOST_PER_PIECE, fullSet: pieces === 4 };
}

async function profileKeyForToken(request, env) {
  const body = await readBody(request);
  if (!body || typeof body.token !== "string") return { error: "bad_request" };
  const token = body.token.trim();
  if (!/^[A-Za-z0-9]{32}$/.test(token)) return { error: "invalid_token" };
  const rec = await env.AUTH_KV.get(`token:${token}`, "json");
  if (!rec || !rec.email) return { error: "invalid_token" };
  // THE GREAT KICK: every token-authenticated endpoint funnels through
  // here (/profile/*, /locker/* via lockerAuth, /link/* via linkAuth),
  // so this one check retires kicked tokens everywhere at once. An
  // unreadable epoch fails closed (sessionEpochOk -> false).
  if (!(await sessionEpochOk(env, rec))) return { error: "invalid_token" };
  return { email: rec.email, body };
}

async function getProfile(env, email) {
  const key = `profile:${await sha256Hex(email)}`;
  const p = await env.AUTH_KV.get(key, "json");
  if (p && typeof p === "object") {
    if (!p.stats) p.stats = { kills: 0, deaths: 0, wins: 0, losses: 0 };
    if (typeof p.silverUnlocked !== "boolean") p.silverUnlocked = false;
    if (typeof p.tasksDone !== "number") p.tasksDone = 0;
    if (!p.season1 || typeof p.season1 !== "object") p.season1 = { xp: 0, claimed: [], badges: [], boost: 0 };
    if (!p.weapons || typeof p.weapons !== "object") p.weapons = { equipped: "weapon_hose_blaster_01", unlocked: ["weapon_hose_blaster_01"] };
    if (!p.locker || typeof p.locker !== "object") p.locker = defaultLocker();
    else normalizeLocker(p.locker);
    // First-run onboarding flag (2026-10-21): false until the player
    // finishes or skips the post-sign-in tour (POST /profile/onboarded).
    if (typeof p.onboardedV1 !== "boolean") p.onboardedV1 = false;
    return { profile: p, key };
  }
  const fresh = {
    email,
    name: "",
    maxStage: 0,
    stats: { kills: 0, deaths: 0, wins: 0, losses: 0 },
    silverUnlocked: false,
    tasksDone: 0,
    season1: { xp: 0, claimed: [], badges: [], boost: 0 },
    weapons: { equipped: "weapon_hose_blaster_01", unlocked: ["weapon_hose_blaster_01"] },
    locker: defaultLocker(),
    onboardedV1: false,
    updatedAt: Date.now(),
  };
  return { profile: fresh, key };
}

async function profileRateLimit(env, email) {
  const bucket = Math.floor(Date.now() / 3600000);
  const rlKey = `prl:${await sha256Hex(email)}:${bucket}`;
  const raw = await env.AUTH_KV.get(rlKey);
  const count = raw ? parseInt(raw, 10) || 0 : 0;
  if (count >= PROFILE_RL_PER_HOUR) return false;
  await env.AUTH_KV.put(rlKey, String(count + 1), { expirationTtl: 3600 });
  return true;
}

// Valid weapon ids (Jeff's roster). Server never trusts arbitrary ids.
const WEAPON_IDS = [
  "weapon_hose_blaster_01",
  "weapon_fist_gauntlets_02",
  "weapon_ember_bow_04",
  "weapon_scatter_bomb_05",
  "weapon_anvil_drop_03",
  "weapon_inferno_staff_06",
];

function publicProfile(p) {
  const { armor, pieces, boost, fullSet } = armorForStage(p.maxStage || 0);
  // Silver (+20%) overrides bronze (+10%) when unlocked.
  const silver = !!p.silverUnlocked;
  // Season 1 boost stacks additively on top (max +3% from tiers 5/14/20).
  const seasonBoost = Math.min(Math.max((p.season1 && p.season1.boost) || 0, 0), 0.03);
  const baseBoost = silver ? 0.20 : boost;
  return {
    name: p.name || "",
    ...roleFields(p.email),
    maxStage: p.maxStage || 0,
    armor,
    pieces,
    boost: baseBoost + seasonBoost,
    fullSet,
    silverUnlocked: silver,
    tasksDone: p.tasksDone || 0,
    onboardedV1: !!p.onboardedV1,
    season1: {
      xp: Math.min(Math.max((p.season1 && p.season1.xp) || 0, 0), 2000),
      claimed: Array.isArray(p.season1 && p.season1.claimed) ? p.season1.claimed.filter(t => Number.isInteger(t) && t >= 1 && t <= 20) : [],
      badges: Array.isArray(p.season1 && p.season1.badges) ? p.season1.badges.filter(b => typeof b === "string").slice(0, 20) : [],
      boost: seasonBoost,
    },
    weapons: {
      equipped: WEAPON_IDS.includes(p.weapons && p.weapons.equipped) ? p.weapons.equipped : "weapon_hose_blaster_01",
      unlocked: Array.isArray(p.weapons && p.weapons.unlocked)
        ? [...new Set(p.weapons.unlocked.filter(id => WEAPON_IDS.includes(id)))]
        : ["weapon_hose_blaster_01"],
    },
    stats: p.stats || { kills: 0, deaths: 0, wins: 0, losses: 0 },
  };
}

async function handleProfileGet(request, env) {
  const auth = await profileKeyForToken(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.error === "bad_request" ? 400 : 401, request);
  if (!(await profileRateLimit(env, auth.email))) return json({ ok: false, error: "rate_limited" }, 429, request);
  const { profile } = await getProfile(env, auth.email);
  return json({ ok: true, profile: publicProfile(profile) }, 200, request);
}

async function handleProfileStage(request, env) {
  const auth = await profileKeyForToken(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.error === "bad_request" ? 400 : 401, request);
  if (!(await profileRateLimit(env, auth.email))) return json({ ok: false, error: "rate_limited" }, 429, request);
  const stage = auth.body.stage;
  if (typeof stage !== "number" || !Number.isInteger(stage) || stage < 1 || stage > 20) {
    return json({ ok: false, error: "bad_stage" }, 400, request);
  }
  const { profile, key } = await getProfile(env, auth.email);
  // ANTI-CHEAT: stages must be earned in order — no skipping ahead.
  const cur = profile.maxStage || 0;
  if (stage > cur + 1) {
    return json({ ok: false, error: "stage_skip", maxStage: cur }, 400, request);
  }
  const before = armorForStage(cur).pieces;
  if (stage > (profile.maxStage || 0)) {
    profile.maxStage = stage;
    profile.updatedAt = Date.now();
    await env.AUTH_KV.put(key, JSON.stringify(profile));
  }
  const after = armorForStage(profile.maxStage || 0);
  const newUnlocks = [];
  if (after.pieces > before) {
    for (const m of ARMOR_MILESTONES) {
      if (m.stage <= profile.maxStage && m.stage > (before === 0 ? 0 : ARMOR_MILESTONES[before - 1].stage)) {
        newUnlocks.push(m.piece);
      }
    }
  }
  return json({ ok: true, profile: publicProfile(profile), newUnlocks }, 200, request);
}

async function handleProfileStats(request, env) {
  const auth = await profileKeyForToken(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.error === "bad_request" ? 400 : 401, request);
  if (!(await profileRateLimit(env, auth.email))) return json({ ok: false, error: "rate_limited" }, 429, request);
  const d = auth.body.delta;
  if (!d || typeof d !== "object") return json({ ok: false, error: "bad_stats" }, 400, request);
  const clean = {};
  for (const k of ["kills", "deaths", "wins", "losses"]) {
    const v = d[k];
    // ANTI-CHEAT: small per-call deltas + hourly rate limit make farming slow.
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 5) {
      return json({ ok: false, error: "bad_stats" }, 400, request);
    }
    clean[k] = v;
  }
  const { profile, key } = await getProfile(env, auth.email);
  for (const k of ["kills", "deaths", "wins", "losses"]) {
    profile.stats[k] = (profile.stats[k] || 0) + clean[k];
  }
  if (auth.body.name) {
    const n = sanitizeName(auth.body.name);
    if (n) profile.name = n;
  }
  profile.updatedAt = Date.now();
  await env.AUTH_KV.put(key, JSON.stringify(profile));
  return json({ ok: true, profile: publicProfile(profile) }, 200, request);
}

async function handleProfileSilver(request, env) {
  const auth = await profileKeyForToken(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.error === "bad_request" ? 400 : 401, request);
  if (!(await profileRateLimit(env, auth.email))) return json({ ok: false, error: "rate_limited" }, 429, request);
  const { profile, key } = await getProfile(env, auth.email);
  // Only allow unlocking, never un-unlocking. tasksDone must be 250 to unlock.
  const tasksDone = auth.body.tasksDone;
  if (typeof tasksDone === "number" && Number.isInteger(tasksDone) && tasksDone >= 0 && tasksDone <= 250) {
    profile.tasksDone = Math.max(profile.tasksDone || 0, tasksDone);
  }
  if (auth.body.unlocked === true && (profile.tasksDone || 0) >= 250) {
    profile.silverUnlocked = true;
  }
  profile.updatedAt = Date.now();
  await env.AUTH_KV.put(key, JSON.stringify(profile));
  return json({ ok: true, profile: publicProfile(profile) }, 200, request);
}

async function handleProfileSeason(request, env) {
  const auth = await profileKeyForToken(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.error === "bad_request" ? 400 : 401, request);
  if (!(await profileRateLimit(env, auth.email))) return json({ ok: false, error: "rate_limited" }, 429, request);
  const { profile, key } = await getProfile(env, auth.email);
  if (!profile.season1 || typeof profile.season1 !== "object") profile.season1 = { xp: 0, claimed: [], badges: [], boost: 0 };
  const s = profile.season1;
  // XP: only moves forward, capped at 2000 (20 tiers x 100).
  const xp = auth.body.xp;
  if (typeof xp === "number" && Number.isFinite(xp)) {
    s.xp = Math.min(2000, Math.max(s.xp || 0, Math.floor(xp)));
  }
  // Claimed tiers: merge-only, valid tier numbers 1-20.
  const claimed = auth.body.claimed;
  if (Array.isArray(claimed)) {
    const set = new Set(s.claimed || []);
    for (const t of claimed) {
      if (Number.isInteger(t) && t >= 1 && t <= 20) set.add(t);
    }
    s.claimed = [...set].sort((a, b) => a - b);
  }
  // Badges: merge-only, string ids, capped at 20.
  const badges = auth.body.badges;
  if (Array.isArray(badges)) {
    const set = new Set(s.badges || []);
    for (const b of badges) {
      if (typeof b === "string" && b.length <= 40) set.add(b);
    }
    s.badges = [...set].slice(0, 20);
  }
  // Boost: derived from claimed tiers server-side (+1% at tiers 5, 14, 20). Never trust client value.
  s.boost = [5, 14, 20].filter(t => (s.claimed || []).includes(t)).length * 0.01;
  profile.updatedAt = Date.now();
  await env.AUTH_KV.put(key, JSON.stringify(profile));
  return json({ ok: true, profile: publicProfile(profile) }, 200, request);
}

async function handleProfileWeapons(request, env) {
  const auth = await profileKeyForToken(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.error === "bad_request" ? 400 : 401, request);
  if (!(await profileRateLimit(env, auth.email))) return json({ ok: false, error: "rate_limited" }, 429, request);
  const { profile, key } = await getProfile(env, auth.email);
  if (!profile.weapons || typeof profile.weapons !== "object") {
    profile.weapons = { equipped: "weapon_hose_blaster_01", unlocked: ["weapon_hose_blaster_01"] };
  }
  const w = profile.weapons;
  if (!Array.isArray(w.unlocked)) w.unlocked = ["weapon_hose_blaster_01"];
  // Merge-only unlocks; ids must be on the roster.
  const unlocked = auth.body.unlocked;
  if (Array.isArray(unlocked)) {
    const set = new Set(w.unlocked.filter(id => WEAPON_IDS.includes(id)));
    for (const id of unlocked) {
      if (typeof id === "string" && WEAPON_IDS.includes(id)) set.add(id);
    }
    // Starter hose can never be removed.
    set.add("weapon_hose_blaster_01");
    w.unlocked = [...set];
  }
  // Equip: must be unlocked.
  const equipped = auth.body.equipped;
  if (typeof equipped === "string" && WEAPON_IDS.includes(equipped) && (w.unlocked || []).includes(equipped)) {
    w.equipped = equipped;
  }
  if (!WEAPON_IDS.includes(w.equipped)) w.equipped = "weapon_hose_blaster_01";
  profile.updatedAt = Date.now();
  await env.AUTH_KV.put(key, JSON.stringify(profile));
  return json({ ok: true, profile: publicProfile(profile) }, 200, request);
}

// --- PLAYER LOCKER (Jeff, 2026-10-21) -------------------------------------
//
// ONE locker per PLAYER (account), never per character: anything in the
// locker can be worn/used by ANY character the player plays. The locker
// lives inside the existing profile record (profile:{sha256(email)}) so
// it is saved server-side, linked to the player's account, and can never
// be lost with a device. It holds the coin/gem balance, the Game Shop
// inventory (armor / weapons / emotes), and purchased Power Boosts.
// Earned collectibles (bronze knight pieces, silver armor, season
// badges, armory weapons) are NOT stored in the locker — they are
// derived server-side from the profile's authoritative progression
// fields (maxStage / silverUnlocked / season1 / weapons) and returned
// in the collectibles list, so a client can never grant itself loot.
//
// Anti-forgery posture (same as the leaderboard work): every endpoint
// requires a valid session token; item ids and prices come from the
// server catalog below; the balance is debited server-side; earn
// credits use fixed server amounts with an hourly cap, and season coin
// rewards additionally require the tier to be claimed server-side and
// not previously credited.
//
// Routes:
//   POST /locker/get     {token}                 -> { ok, locker }
//   POST /locker/migrate {token, local}          -> { ok, locker }  (one-time merge of local progress)
//   POST /locker/buy     {token, cat, id}        -> { ok, locker }  (cat: armor|weapons|emotes|boosts)
//   POST /locker/equip   {token, cat, id}        -> { ok, locker }  (must own; armor/outfits/helmets/boots/accessories toggle, weapons/emotes set)
//   POST /locker/earn    {token, source, tier?}  -> { ok, locker, credited }

const LOCKER_CATALOG = {
  armor:   { wooden_shield: 50, iron_helm: 100, steel_boots: 150, lava_gauntlets: 200, knight_armor: 300 },
  weapons: { wooden_sword: 75, stone_club: 100, fire_baton: 150, iron_axe: 250 },
  emotes:  { dance: 50, spin: 100, clap: 150, flip: 200 },
};
const LOCKER_BOOSTS = {
  boost1:  { add: 0.01,  price: 100 },
  boost25: { add: 0.025, price: 250 },
  boost5:  { add: 0.05,  price: 500 },
};
const LOCKER_BOOST_CAP = 0.25;
// STARTER KIT (Jeff, 2026-10-21): every player's locker starts FREE with
// two outfits — (1) a school outfit (shirt + pants, or shirt + shorts;
// both variants granted, pants equipped by default) and (2) a battle
// starter set: bronze armor, wooden sword, bronze helmet, bronze boots,
// and sunglasses (equip if they want). Starters are ensured by
// normalizeLocker on EVERY read, so the grant is idempotent by
// construction: locker creation includes the kit, a pre-existing account
// receives it on its first /locker/get, it can never be double-granted,
// and it can never be lost. There is no sell/delete endpoint, so starter
// items are non-sellable and non-deletable. LOCKER_STARTERS is the union
// of always-owned ids per category (the original stick/wave plus the kit).
const STARTER_KIT = {
  outfits: ["school_outfit_pants", "school_outfit_shorts"],
  armor: ["starter_bronze_armor"],
  weapons: ["wooden_sword"],
  helmets: ["starter_bronze_helmet"],
  boots: ["starter_bronze_boots"],
  accessories: ["starter_sunglasses"],
};
const LOCKER_STARTERS = {
  armor: [...STARTER_KIT.armor],
  weapons: ["stick", ...STARTER_KIT.weapons],
  emotes: ["wave"],
  outfits: [...STARTER_KIT.outfits],
  helmets: [...STARTER_KIT.helmets],
  boots: [...STARTER_KIT.boots],
  accessories: [...STARTER_KIT.accessories],
};
// Every inventory category and the inv field that equips it. Weapons and
// emotes SET their field; every other category TOGGLES (tap again to
// unequip) — armor has always toggled, the kit pieces follow it.
const LOCKER_CATS = ["armor", "weapons", "emotes", "outfits", "helmets", "boots", "accessories"];
const LOCKER_EQUIP_FIELD = {
  armor: "eqArmor", weapons: "eqWeapon", emotes: "favEmote",
  outfits: "eqOutfit", helmets: "eqHelmet", boots: "eqBoots", accessories: "eqAccessory",
};
const LOCKER_EQUIP_DEFAULT = {
  eqArmor: null, eqWeapon: "stick", favEmote: "wave",
  eqOutfit: "school_outfit_pants", eqHelmet: null, eqBoots: null, eqAccessory: null,
};
const LOCKER_TOGGLE_CATS = new Set(["armor", "outfits", "helmets", "boots", "accessories"]);
// Item metadata for the starter kit: display names and slot types.
// The `stats` field is kept in the payload shape for client compat but
// is ALL ZEROS by law — it must never carry a nonzero value again.
// NO-POWER-STATS LAW (Jeff, 2026-10-22, supersedes the 2026-10-21
// balance law): ALL power stats were removed from gear and outfits.
// A fighter's numbers come from their CHARACTER only; element is
// identity/flavor, never a stat. The school outfit and the bronze kit
// are both pure style — a player can battle in either look, and the
// look changes nothing. Sunglasses were always flair; now everything
// is. (History: until 2026-10-22 both outfits shared an equal baseline
// block — hp +12 / guard 0.04 / spd +0.01, sword +1 dmg — exactly
// equal, never an edge. Jeff removed the block itself, not the tie.)
const LOCKER_ITEM_META = {
  school_outfit_pants:   { name: "School Outfit — Shirt & Pants",  slot: "outfit",    stats: { hp: 0, guard: 0, pow: 0, spd: 0 } },
  school_outfit_shorts:  { name: "School Outfit — Shirt & Shorts", slot: "outfit",    stats: { hp: 0, guard: 0, pow: 0, spd: 0 } },
  starter_bronze_armor:  { name: "Bronze Armor",                   slot: "armor",     stats: { hp: 0, guard: 0, pow: 0, spd: 0 } },
  starter_bronze_helmet: { name: "Bronze Helmet",                  slot: "helmet",    stats: { hp: 0, guard: 0, pow: 0, spd: 0 } },
  starter_bronze_boots:  { name: "Bronze Boots",                   slot: "boots",     stats: { hp: 0, guard: 0, pow: 0, spd: 0 } },
  wooden_sword:          { name: "Wooden Sword",                   slot: "weapon",    stats: { dmg: 0, rate: 0 } },
  starter_sunglasses:    { name: "Sunglasses",                     slot: "accessory", stats: { hp: 0, guard: 0, pow: 0, spd: 0 } },
};
const EARN_SOURCES = { game_complete: 10, ko: 5, extinguish: 2 };
const SEASON_COIN_TIERS = { 1: 50, 4: 100, 9: 150, 13: 200, 18: 300 };
const EARN_HOURLY_CAP = 5000;
const BADGE_NAMES = {
  first_spark: "First Spark Badge", bucket_brigade: "Bucket Brigade Badge",
  smoke_alarm_hero: "Smoke Alarm Hero Badge", extinguisher_pro: "Extinguisher Pro Badge",
  inferno_legend: "Inferno Legend Badge",
};
const ARMORY_NAMES = {
  weapon_hose_blaster_01: "Hose Blaster", weapon_fist_gauntlets_02: "Fist Gauntlets",
  weapon_ember_bow_04: "Spitfire Bow", weapon_scatter_bomb_05: "Spark Grenade",
  weapon_anvil_drop_03: "Magma Core Anvil", weapon_inferno_staff_06: "Underworld Doom Rod",
};
const BRONZE_NAMES = { greaves: "Bronze Greaves", gauntlets: "Bronze Gauntlets", helmet: "Bronze Helmet", chestplate: "Bronze Chestplate" };

function defaultLocker() {
  return {
    coins: 0, gems: 0,
    inv: {
      armor: [...STARTER_KIT.armor], weapons: ["stick", ...STARTER_KIT.weapons], emotes: ["wave"],
      outfits: [...STARTER_KIT.outfits], helmets: [...STARTER_KIT.helmets],
      boots: [...STARTER_KIT.boots], accessories: [...STARTER_KIT.accessories],
      eqArmor: null, eqWeapon: "stick", favEmote: "wave",
      // Default look (Jeff, 2026-10-21): school outfit on, pants variant;
      // the battle set is in the locker, equipped only if they want it.
      eqOutfit: "school_outfit_pants", eqHelmet: null, eqBoots: null, eqAccessory: null,
    },
    shopBoost: 0, migrated: false, seasonCredited: [], earn: { bucket: 0, total: 0 },
    updatedAt: 0,
  };
}

function lockerValidIds(cat) {
  return [...Object.keys(LOCKER_CATALOG[cat] || {}), ...(LOCKER_STARTERS[cat] || [])];
}

function normalizeLocker(L) {
  if (!Number.isFinite(L.coins) || L.coins < 0) L.coins = 0;
  if (!Number.isFinite(L.gems) || L.gems < 0) L.gems = 0;
  if (!L.inv || typeof L.inv !== "object") L.inv = defaultLocker().inv;
  for (const cat of LOCKER_CATS) {
    const valid = lockerValidIds(cat);
    L.inv[cat] = Array.isArray(L.inv[cat]) ? [...new Set(L.inv[cat].filter(id => valid.includes(id)))] : [...(LOCKER_STARTERS[cat] || [])];
    for (const s of LOCKER_STARTERS[cat] || []) if (!L.inv[cat].includes(s)) L.inv[cat].unshift(s);
  }
  // Any equip field pointing at an item the player does not own falls
  // back to that slot's default (this also grants the default school
  // outfit to lockers saved before the starter kit existed).
  for (const cat of LOCKER_CATS) {
    const field = LOCKER_EQUIP_FIELD[cat];
    if (!L.inv[cat].includes(L.inv[field])) L.inv[field] = LOCKER_EQUIP_DEFAULT[field];
  }
  L.shopBoost = Math.min(LOCKER_BOOST_CAP, Math.max(0, Number.isFinite(L.shopBoost) ? L.shopBoost : 0));
  if (typeof L.migrated !== "boolean") L.migrated = false;
  if (!Array.isArray(L.seasonCredited)) L.seasonCredited = [];
  if (!L.earn || typeof L.earn !== "object") L.earn = { bucket: 0, total: 0 };
  return L;
}

function publicLocker(p) {
  const L = normalizeLocker(p.locker);
  const collectibles = [];
  const af = armorForStage(p.maxStage || 0);
  for (const m of ARMOR_MILESTONES) {
    if (af.armor[m.piece]) collectibles.push({ id: "bronze_" + m.piece, name: BRONZE_NAMES[m.piece], group: "Bronze Knight Armor" });
  }
  if (p.silverUnlocked) collectibles.push({ id: "silver_armor", name: "Silver Armor", group: "Silver Armor" });
  const badges = (p.season1 && p.season1.badges) || [];
  for (const b of badges) collectibles.push({ id: "badge_" + b, name: BADGE_NAMES[b] || b, group: "Season 1 Badges" });
  const claimed = (p.season1 && p.season1.claimed) || [];
  if (claimed.includes(20)) collectibles.push({ id: "ignition_crown", name: "Ignition Crown", group: "Season 1" });
  const unlocked = (p.weapons && p.weapons.unlocked) || [];
  for (const w of unlocked) collectibles.push({ id: w, name: ARMORY_NAMES[w] || w, group: "Armory Weapons" });
  return {
    coins: L.coins, gems: L.gems, inv: L.inv, shopBoost: L.shopBoost,
    migrated: L.migrated, collectibles, itemMeta: LOCKER_ITEM_META,
    ...roleFields(p.email),
  };
}

async function lockerAuth(request, env) {
  const auth = await profileKeyForToken(request, env);
  if (auth.error) return auth;
  if (!(await profileRateLimit(env, auth.email))) return { error: "rate_limited" };
  const { profile, key } = await getProfile(env, auth.email);
  return { email: auth.email, body: auth.body, profile, key };
}

function lockerStatus(err) { return err === "bad_request" ? 400 : err === "rate_limited" ? 429 : 401; }

async function saveLocker(request, env, auth, extra) {
  auth.profile.locker.updatedAt = Date.now();
  auth.profile.updatedAt = Date.now();
  await env.AUTH_KV.put(auth.key, JSON.stringify(auth.profile));
  return json({ ok: true, locker: publicLocker(auth.profile), ...(extra || {}) }, 200, request);
}

async function handleLockerGet(request, env) {
  const auth = await lockerAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, lockerStatus(auth.error), request);
  return saveLocker(request, env, auth); // persists the default locker for new players
}

async function handleLockerMigrate(request, env) {
  const auth = await lockerAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, lockerStatus(auth.error), request);
  const { profile } = auth;
  const L = normalizeLocker(profile.locker);
  // One-time only: after migration the server is the source of truth and
  // later migration payloads are ignored (never a way to re-import coins).
  if (!L.migrated) {
    const local = (auth.body && typeof auth.body.local === "object" && auth.body.local) || {};
    const clampMoney = v => (Number.isFinite(v) ? Math.min(10000000, Math.max(0, Math.floor(v))) : 0);
    L.coins = Math.max(L.coins, clampMoney(local.coins));
    L.gems = Math.max(L.gems, clampMoney(local.gems));
    if (local.inv && typeof local.inv === "object") {
      for (const cat of LOCKER_CATS) {
        if (Array.isArray(local.inv[cat])) {
          const valid = lockerValidIds(cat);
          for (const id of local.inv[cat]) if (valid.includes(id) && !L.inv[cat].includes(id)) L.inv[cat].push(id);
        }
      }
      // Equip merge, same spirit as the original three fields: toggle
      // slots adopt the local choice only while the server slot is
      // empty; set slots (weapon/emote) and the outfit take the local
      // choice outright — it is the player's own device progress.
      for (const cat of LOCKER_CATS) {
        const field = LOCKER_EQUIP_FIELD[cat];
        if (!L.inv[cat].includes(local.inv[field])) continue;
        if (LOCKER_TOGGLE_CATS.has(cat) && cat !== "outfits") {
          if (!L.inv[field]) L.inv[field] = local.inv[field];
        } else {
          L.inv[field] = local.inv[field];
        }
      }
    }
    if (Number.isFinite(local.shopBoost)) L.shopBoost = Math.min(LOCKER_BOOST_CAP, Math.max(L.shopBoost, local.shopBoost));
    // Existing local progression merges in too — nobody loses progress.
    if (Number.isInteger(local.maxStage) && local.maxStage >= 0 && local.maxStage <= 20) {
      profile.maxStage = Math.max(profile.maxStage || 0, local.maxStage);
    }
    if (!profile.season1 || typeof profile.season1 !== "object") profile.season1 = { xp: 0, claimed: [], badges: [], boost: 0 };
    if (Array.isArray(local.seasonClaimed)) {
      const set = new Set(profile.season1.claimed || []);
      for (const t of local.seasonClaimed) if (Number.isInteger(t) && t >= 1 && t <= 20) set.add(t);
      profile.season1.claimed = [...set].sort((a, b) => a - b);
      profile.season1.boost = [5, 14, 20].filter(t => profile.season1.claimed.includes(t)).length * 0.01;
    }
    if (Array.isArray(local.seasonBadges)) {
      const set = new Set(profile.season1.badges || []);
      for (const b of local.seasonBadges) if (typeof b === "string" && b.length <= 40) set.add(b);
      profile.season1.badges = [...set].slice(0, 20);
    }
    if (Number.isInteger(local.tasksDone) && local.tasksDone >= 0 && local.tasksDone <= 250) {
      profile.tasksDone = Math.max(profile.tasksDone || 0, local.tasksDone);
    }
    if (profile.tasksDone >= 250 || local.silverUnlocked === true) profile.silverUnlocked = true;
    if (Array.isArray(local.armoryUnlocked)) {
      const set = new Set((profile.weapons && profile.weapons.unlocked) || ["weapon_hose_blaster_01"]);
      for (const id of local.armoryUnlocked) if (WEAPON_IDS.includes(id)) set.add(id);
      profile.weapons.unlocked = [...set];
    }
    L.migrated = true;
  }
  return saveLocker(request, env, auth);
}

async function handleLockerBuy(request, env) {
  const auth = await lockerAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, lockerStatus(auth.error), request);
  const L = normalizeLocker(auth.profile.locker);
  const { cat, id } = auth.body || {};
  if (cat === "boosts") {
    const b = LOCKER_BOOSTS[id];
    if (!b) return json({ ok: false, error: "bad_item" }, 400, request);
    if (L.shopBoost >= LOCKER_BOOST_CAP) return json({ ok: false, error: "boost_maxed", locker: publicLocker(auth.profile) }, 400, request);
    if (L.coins < b.price) return json({ ok: false, error: "insufficient_coins", locker: publicLocker(auth.profile) }, 400, request);
    L.coins -= b.price;
    L.shopBoost = Math.round(Math.min(LOCKER_BOOST_CAP, L.shopBoost + b.add) * 10000) / 10000;
    return saveLocker(request, env, auth);
  }
  if (!LOCKER_CATALOG[cat] || typeof id !== "string" || !(id in LOCKER_CATALOG[cat])) {
    return json({ ok: false, error: "bad_item" }, 400, request);
  }
  if (L.inv[cat].includes(id)) return json({ ok: false, error: "already_owned", locker: publicLocker(auth.profile) }, 400, request);
  const price = LOCKER_CATALOG[cat][id];
  if (L.coins < price) return json({ ok: false, error: "insufficient_coins", locker: publicLocker(auth.profile) }, 400, request);
  L.coins -= price;
  L.inv[cat].push(id);
  L.inv[LOCKER_EQUIP_FIELD[cat]] = id; // buying equips, as it always has
  return saveLocker(request, env, auth);
}

async function handleLockerEquip(request, env) {
  const auth = await lockerAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, lockerStatus(auth.error), request);
  const L = normalizeLocker(auth.profile.locker);
  const { cat, id } = auth.body || {};
  const field = LOCKER_EQUIP_FIELD[cat];
  if (!field || typeof id !== "string") return json({ ok: false, error: "bad_item" }, 400, request);
  if (!L.inv[cat].includes(id)) return json({ ok: false, error: "not_owned", locker: publicLocker(auth.profile) }, 400, request);
  if (LOCKER_TOGGLE_CATS.has(cat)) L.inv[field] = (L.inv[field] === id) ? null : id;
  else L.inv[field] = id;
  return saveLocker(request, env, auth);
}

async function handleLockerEarn(request, env) {
  const auth = await lockerAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, lockerStatus(auth.error), request);
  const { profile } = auth;
  const L = normalizeLocker(profile.locker);
  const { source, tier } = auth.body || {};
  let amount = 0;
  if (source === "season") {
    if (!(tier in SEASON_COIN_TIERS)) return json({ ok: false, error: "bad_tier" }, 400, request);
    const claimed = (profile.season1 && profile.season1.claimed) || [];
    if (!claimed.includes(tier)) return json({ ok: false, error: "tier_not_claimed", locker: publicLocker(profile) }, 400, request);
    if (L.seasonCredited.includes(tier)) return json({ ok: false, error: "already_credited", locker: publicLocker(profile) }, 400, request);
    amount = SEASON_COIN_TIERS[tier];
    L.seasonCredited.push(tier);
  } else if (source in EARN_SOURCES) {
    amount = EARN_SOURCES[source];
    const bucket = Math.floor(Date.now() / 3600000);
    if (L.earn.bucket !== bucket) L.earn = { bucket, total: 0 };
    if (L.earn.total + amount > EARN_HOURLY_CAP) {
      return json({ ok: false, error: "earn_cap", locker: publicLocker(profile) }, 429, request);
    }
    L.earn.total += amount;
  } else {
    return json({ ok: false, error: "bad_source" }, 400, request);
  }
  L.coins += amount;
  return saveLocker(request, env, auth, { credited: amount });
}

async function handleLeaderboard(request, env, url) {
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25", 10) || 25, 100);
  // AW-2 (2026-10-12): the full-KV scan is expensive — cache the ranked
  // rows in KV for 60s and slice per-request limits from the cache.
  const CACHE_KEY = "cache:leaderboard:v1";
  let rows = null;
  try {
    const cached = await env.AUTH_KV.get(CACHE_KEY, "json");
    if (cached && Array.isArray(cached.rows) && Date.now() - (cached.at || 0) < 60000) {
      rows = cached.rows;
    }
  } catch { /* cache is best-effort */ }
  if (!rows) {
    rows = [];
    let cursor;
    do {
      const page = await env.AUTH_KV.list({ prefix: "profile:", limit: 1000, cursor });
      for (const k of page.keys) {
        const p = await env.AUTH_KV.get(k.name, "json");
        if (!p) continue;
        const pub = publicProfile(p);
        const score = pub.stats.wins * 100 + pub.stats.kills * 10 + pub.maxStage + (pub.silverUnlocked ? 500 : 0) + (pub.tasksDone || 0);
        rows.push({ name: pub.name || "Fire Tamer", wins: pub.stats.wins, kills: pub.stats.kills, maxStage: pub.maxStage, pieces: pub.pieces, fullSet: pub.fullSet, silverUnlocked: pub.silverUnlocked, tasksDone: pub.tasksDone || 0, score });
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    rows.sort((a, b) => b.score - a.score);
    try {
      await env.AUTH_KV.put(CACHE_KEY, JSON.stringify({ at: Date.now(), rows }),
        { expirationTtl: 120 });
    } catch { /* best-effort */ }
  }
  return json({ ok: true, leaders: rows.slice(0, limit) }, 200, request);
}

/* ----- First-run onboarding flag (Jeff, 2026-10-21) -----
 * POST /profile/onboarded {token} -> { ok, profile }
 * Marks the player's profile onboardedV1 = true: they finished (or
 * explicitly skipped) the post-sign-in tour on the Fire World hub.
 * The hub also keeps a local fb_onboarded_v1 flag as the offline /
 * device-side fallback; this server flag is what makes "saw the tour"
 * follow the ACCOUNT to a new device. Idempotent: setting it twice is
 * a no-op. Like everything in the profile record, the Great Kick never
 * touches it — a kicked player who already toured does not tour again
 * after signing back in; a player who never toured sees it once.
 */
async function handleProfileOnboarded(request, env) {
  const auth = await profileKeyForToken(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.error === "bad_request" ? 400 : 401, request);
  if (!(await profileRateLimit(env, auth.email))) return json({ ok: false, error: "rate_limited" }, 429, request);
  const { profile, key } = await getProfile(env, auth.email);
  if (!profile.onboardedV1) {
    profile.onboardedV1 = true;
    profile.updatedAt = Date.now();
    await env.AUTH_KV.put(key, JSON.stringify(profile));
  }
  return json({ ok: true, profile: publicProfile(profile) }, 200, request);
}

/* ----- THE GREAT KICK operator endpoint (Jeff, 2026-10-21) -----
 * POST /admin/kick, header x-admin-key == the ADMIN_KEY Worker secret.
 * THE one operator mechanism for the kick (see DEPLOY.md Step 1.5):
 * increments meta:session_epoch by 1, which instantly retires EVERY
 * session token issued under earlier epochs — every player, Jeff
 * included, no allowlist, no exceptions. It writes ONLY the epoch key:
 * accounts, profiles, lockers, leaderboard scores and progression are
 * never read or modified here. Guarded exactly like /auth/count
 * (AW-1): with no ADMIN_KEY configured the endpoint stays closed
 * (fail-safe), and a wrong key gets the same 403.
 */
async function handleAdminKick(request, env) {
  const adminKey = env.ADMIN_KEY || "";
  if (!adminKey || request.headers.get("x-admin-key") !== adminKey) {
    return json({ ok: false, error: "forbidden" }, 403, request);
  }
  const cur = await getSessionEpoch(env);
  if (cur === null) return json({ ok: false, error: "epoch_unavailable" }, 503, request);
  const next = cur + 1;
  await env.AUTH_KV.put(SESSION_EPOCH_KEY, String(next));
  return json({ ok: true, epoch: next, previousEpoch: cur }, 200, request);
}

async function handleCount(request, env) {
  // AW-1 (2026-10-12): an exact live user count was public — an
  // enumeration/growth-probing oracle for anyone. The dashboard must
  // now present the ADMIN_KEY secret (header x-admin-key). With no
  // ADMIN_KEY configured the endpoint stays closed (fail-safe).
  const adminKey = env.ADMIN_KEY || "";
  if (!adminKey || request.headers.get("x-admin-key") !== adminKey) {
    return json({ ok: false, error: "forbidden" }, 403, request);
  }
  // KV list is eventually consistent; fine for a dashboard number.
  let count = 0;
  let cursor;
  do {
    const page = await env.AUTH_KV.list({ prefix: "user:", limit: 1000, cursor });
    count += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json({ ok: true, count }, 200, request);
}


/* ----- Email verification + account recovery (Resend) -----
 * POST /auth/code   {email, purpose?}  -> {ok, sent:true} (sends 6-digit code)
 * POST /auth/verify {email, code, name?} -> {ok, token, email, isNew}
 *
 * Requires env.RESEND_API_KEY. Until it's configured, /auth/code returns
 * {ok:false, error:"email_not_configured"} and the client falls back to
 * the legacy unverified register path (marked emailVerified:false).
 * Google sign-ins are always emailVerified:true (Google verifies).
 *
 * Storage: KV `vcode:{sha256(email)}` -> {codeHash, attempts, createdAt}
 *   TTL 600s (10 min), max 5 attempts, single-use.
 */
const VCODE_TTL = 600;
const VCODE_MAX_ATTEMPTS = 5;
const VCODE_RL_PER_HOUR = 5;

function genCode() {
  const buf = new Uint8Array(3);
  crypto.getRandomValues(buf);
  const n = (buf[0] << 16) | (buf[1] << 8) | buf[2];
  return String(100000 + (n % 900000));
}

async function sendVerifyEmail(env, toEmail, code, purpose) {
  const apiKey = env.RESEND_API_KEY || "";
  if (!apiKey) return { sent: false, error: "email_not_configured" };
  const from = env.EMAIL_FROM || "Fire Babys <noreply@firebabys.io>";
  const subject = purpose === "recover"
    ? "Your Fire Babys sign-in code"
    : "Your Fire Babys verification code";
  const html =
    "<div style=\"font-family:sans-serif;max-width:480px;margin:0 auto;\">" +
    "<h2 style=\"color:#e25822;\">🔥 Fire Babys</h2>" +
    "<p>Your sign-in code is:</p>" +
    "<p style=\"font-size:36px;font-weight:bold;letter-spacing:8px;\">" + code + "</p>" +
    "<p>This code expires in 10 minutes. Kids: ask a grown-up first.</p>" +
    "<p style=\"color:#888;font-size:12px;\">If you didn't request this, ignore it.</p></div>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [toEmail], subject, html }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { sent: false, error: "email_send_failed", detail: t.slice(0, 120) };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: "email_send_failed" };
  }
}

async function handleAuthCode(request, env) {
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: "bad_request" }, 400, request);
  // Bot check (Turnstile) — no-op unless TURNSTILE_SECRET is configured.
  const tsBlock = await turnstileBlock(request, env, body);
  if (tsBlock) return tsBlock;
  const email = normalizeEmail(body.email || "");
  if (!isValidEmail(email)) return json({ ok: false, error: "invalid_email" }, 400, request);
  const purpose = body.purpose === "recover" ? "recover" : "verify";

  // Rate limit: 5 code requests / IP / hour.
  const ip = clientIp(request);
  const hourBucket = Math.floor(Date.now() / 3600000);
  const rlKey = `vrl:${ip}:${hourBucket}`;
  const rlRaw = await env.AUTH_KV.get(rlKey);
  const rlCount = rlRaw ? parseInt(rlRaw, 10) || 0 : 0;
  if (rlCount >= VCODE_RL_PER_HOUR) return json({ ok: false, error: "rate_limited" }, 429, request);

  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: "email_not_configured" }, 503, request);
  }

  const code = genCode();
  const emailHash = await sha256Hex(email);
  await env.AUTH_KV.put(`vcode:${emailHash}`, JSON.stringify({
    codeHash: await sha256Hex(code),
    attempts: 0,
    createdAt: Date.now(),
    purpose,
  }), { expirationTtl: VCODE_TTL });

  const send = await sendVerifyEmail(env, email, code, purpose);
  await env.AUTH_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });
  if (!send.sent) {
    await env.AUTH_KV.delete(`vcode:${emailHash}`);
    return json({ ok: false, error: send.error || "email_send_failed" }, 502, request);
  }
  return json({ ok: true, sent: true }, 200, request);
}

async function handleAuthVerify(request, env) {
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: "bad_request" }, 400, request);
  // AW-3 (2026-10-12): per-IP hourly cap on verify attempts (the
  // per-code 5-attempt cap already existed; this stops an attacker
  // spraying codes across many accounts from one address).
  const ip = clientIp(request);
  const vfyBucket = Math.floor(Date.now() / 3600000);
  const vfyKey = `vfyrl:${ip}:${vfyBucket}`;
  const vfyRaw = await env.AUTH_KV.get(vfyKey);
  const vfyCount = vfyRaw ? parseInt(vfyRaw, 10) || 0 : 0;
  if (vfyCount >= 30) return json({ ok: false, error: "rate_limited" }, 429, request);
  await env.AUTH_KV.put(vfyKey, String(vfyCount + 1), { expirationTtl: 3600 });
  const email = normalizeEmail(body.email || "");
  const code = String(body.code || "").trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  const emailHash = await sha256Hex(email);
  const vkey = `vcode:${emailHash}`;
  const rec = await env.AUTH_KV.get(vkey, "json");
  if (!rec || !rec.codeHash) return json({ ok: false, error: "code_expired" }, 400, request);
  if ((rec.attempts || 0) >= VCODE_MAX_ATTEMPTS) {
    await env.AUTH_KV.delete(vkey);
    return json({ ok: false, error: "too_many_attempts" }, 429, request);
  }
  const codeHash = await sha256Hex(code);
  if (codeHash !== rec.codeHash) {
    rec.attempts = (rec.attempts || 0) + 1;
    await env.AUTH_KV.put(vkey, JSON.stringify(rec), { expirationTtl: VCODE_TTL });
    return json({ ok: false, error: "bad_code", attemptsLeft: VCODE_MAX_ATTEMPTS - rec.attempts }, 400, request);
  }
  // Code valid — single use.
  await env.AUTH_KV.delete(vkey);

  // Great Kick: verifying a code IS a fresh sign-in, so the issued /
  // restored token stamps the CURRENT epoch. Unreadable epoch fails
  // closed (503; the code is already consumed — the player requests a
  // fresh one when KV recovers).
  const epoch = await getSessionEpoch(env);
  if (epoch === null) return json({ ok: false, error: "epoch_unavailable" }, 503, request);

  const userKey = `user:${emailHash}`;
  const existing = await env.AUTH_KV.get(userKey, "json");
  const name = sanitizeName(body.name || "");
  let token, isNew;
  const now = Date.now();
  if (existing && existing.token) {
    // Recovery or re-verification: restore the existing token so the
    // player's armor, stats, and progress come back on the new device.
    token = existing.token;
    isNew = false;
    existing.emailVerified = true;
    if (name && name !== existing.name) existing.name = name;
    await env.AUTH_KV.put(userKey, JSON.stringify(existing));
    // The token STRING is restored (the account comes back whole), but
    // its record is re-stamped with the current epoch — post-kick this
    // sign-in is exactly what revives the session.
    await writeTokenRecord(env, token, email, existing.createdAt, epoch);
  } else {
    token = genToken();
    isNew = true;
    const fresh = { email, name, createdAt: now, token, emailVerified: true };
    if (isTopAdmin(email)) fresh.role = "top_admin"; // allowlist stamp
    await env.AUTH_KV.put(userKey, JSON.stringify(fresh));
    await writeTokenRecord(env, token, email, now, epoch);
  }
  await recordAdminArrival(env, email); // Dark Knight: no-op unless top admin
  return json({ ok: true, token, email, isNew, ...roleFields(email) }, 200, request);
}

/* ----- Password sign-in (2026-10-21) -----
 * POST /auth/password {email, password} -> { ok, token, email, isNew, role, isAdmin }
 * Only accounts whose user record carries a passwordHash can use this
 * (today: Jeff's own account, set server-side at his order). Mirrors
 * the Google / email-code sign-ins: a correct password IS the fresh
 * proof of identity, so the account's existing token is restored and
 * re-stamped with the current session epoch; an account that somehow
 * has a hash but no token gets one minted. Every failure — no such
 * account, no password set, wrong password — is the SAME generic
 * 401 invalid_credentials, so the endpoint can't be used to probe
 * which emails have accounts or passwords. Per-IP capped like
 * /auth/verify (AW-3 pattern). */
async function handlePasswordAuth(request, env) {
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: "bad_request" }, 400, request);
  const ip = clientIp(request);
  const bucket = Math.floor(Date.now() / 3600000);
  const rlKey = `pwrl:${ip}:${bucket}`;
  const rlRaw = await env.AUTH_KV.get(rlKey);
  const rlCount = rlRaw ? parseInt(rlRaw, 10) || 0 : 0;
  if (rlCount >= 30) return json({ ok: false, error: "rate_limited" }, 429, request);
  await env.AUTH_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });

  const email = normalizeEmail(body.email || "");
  const password = typeof body.password === "string" ? body.password : "";
  if (!isValidEmail(email) || !password || password.length > 200) {
    return json({ ok: false, error: "invalid_credentials" }, 401, request);
  }
  const userKey = `user:${await sha256Hex(email)}`;
  const user = await env.AUTH_KV.get(userKey, "json");
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return json({ ok: false, error: "invalid_credentials" }, 401, request);
  }
  // Correct password: a sign-in stamps the CURRENT epoch; unreadable
  // epoch fails closed (503) rather than stamping a guessed one.
  const epoch = await getSessionEpoch(env);
  if (epoch === null) return json({ ok: false, error: "epoch_unavailable" }, 503, request);
  let token = user.token;
  let isNew = false;
  if (!token) {
    token = genToken();
    user.token = token;
    isNew = true;
    await env.AUTH_KV.put(userKey, JSON.stringify(user));
  }
  await writeTokenRecord(env, token, email, user.createdAt || Date.now(), epoch);
  await recordAdminArrival(env, email); // Dark Knight: no-op unless top admin
  return json({ ok: true, token, email, isNew, ...roleFields(email) }, 200, request);
}

/* ----- Platform linking (2026-10-12, profile-system update) -----
 * POST /link/config          {token} -> { ok, steam:true, discord, discordClientId,
 *                                          google, googleClientId, yahoo, yahooClientId,
 *                                          amazon, amazonClientId }
 * POST /link/list            {token} -> { ok, links:{ steam, discord, google, yahoo, amazon } }
 * POST /link/steam/verify    {token, params:{openid.*}} -> { ok, steamId }
 * POST /link/discord/exchange{token, code, redirectUri} -> { ok, discord }
 * POST /link/google/exchange {token, code, redirectUri} -> { ok, google }   (2026-10-18)
 * POST /link/yahoo/exchange  {token, code, redirectUri} -> { ok, yahoo }    (2026-10-18)
 * POST /link/amazon/exchange {token, code, redirectUri} -> { ok, amazon }   (2026-10-18)
 * POST /link/unlink          {token, provider} -> { ok, links }
 *        provider: steam | discord | google | yahoo | amazon
 *
 * Verification ALWAYS happens here, server-side:
 * - Steam: OpenID 2.0 assertion is re-checked with Steam via
 *   check_authentication; a browser-supplied SteamID is never trusted.
 * - Discord / Google / Yahoo / Amazon: the OAuth2 code is exchanged
 *   with the app client SECRET, which lives only in this Worker's
 *   env — never in page code. Only the provider's user id, email and
 *   name are stored; access/refresh tokens are NEVER stored in KV.
 * Storage: KV `links:{sha256(email)}` ->
 *   { steam:{id, at}|null, discord:{id, username, avatar, at}|null,
 *     google:{id, email, name, at}|null, yahoo:{id, email, name, at}|null,
 *     amazon:{id, email, name, at}|null }
 */
async function getLinks(env, email) {
  const key = `links:${await sha256Hex(email)}`;
  const l = await env.AUTH_KV.get(key, "json");
  if (l && typeof l === "object") {
    return {
      links: {
        steam: l.steam || null,
        discord: l.discord || null,
        google: l.google || null,
        yahoo: l.yahoo || null,
        amazon: l.amazon || null,
      },
      key,
    };
  }
  return { links: { steam: null, discord: null, google: null, yahoo: null, amazon: null }, key };
}

async function linkAuth(request, env) {
  const auth = await profileKeyForToken(request, env);
  if (auth.error) return { error: auth.error, status: auth.error === "bad_request" ? 400 : 401 };
  if (!(await profileRateLimit(env, auth.email))) return { error: "rate_limited", status: 429 };
  return auth;
}

async function handleLinkConfig(request, env) {
  const auth = await linkAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.status, request);
  return json({
    ok: true,
    steam: true, // OpenID needs no keys — always available.
    discord: !!env.DISCORD_CLIENT_ID,
    discordClientId: env.DISCORD_CLIENT_ID || "",
    // 2026-10-18: true only when BOTH the client id and secret are set.
    google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    googleClientId: env.GOOGLE_CLIENT_ID || null,
    yahoo: !!(env.YAHOO_CLIENT_ID && env.YAHOO_CLIENT_SECRET),
    yahooClientId: env.YAHOO_CLIENT_ID || null,
    amazon: !!(env.AMAZON_CLIENT_ID && env.AMAZON_CLIENT_SECRET),
    amazonClientId: env.AMAZON_CLIENT_ID || null,
  }, 200, request);
}

async function handleLinkList(request, env) {
  const auth = await linkAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.status, request);
  const { links } = await getLinks(env, auth.email);
  return json({ ok: true, links }, 200, request);
}

async function handleLinkSteamVerify(request, env) {
  const auth = await linkAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.status, request);
  const params = auth.body.params;
  if (!params || typeof params !== "object") {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  // Only openid.* fields, capped — nothing else is forwarded to Steam.
  const form = new URLSearchParams();
  let fieldCount = 0;
  for (const [k, v] of Object.entries(params)) {
    if (!k.startsWith("openid.") || typeof v !== "string" || v.length > 1024) continue;
    form.set(k, v);
    fieldCount++;
  }
  if (!fieldCount || form.get("openid.mode") !== "id_res") {
    return json({ ok: false, error: "bad_assertion" }, 400, request);
  }
  const claimed = form.get("openid.claimed_id") || "";
  const m = claimed.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  if (!m) return json({ ok: false, error: "bad_claimed_id" }, 400, request);
  // The whole point: ask Steam itself whether this assertion is real.
  form.set("openid.mode", "check_authentication");
  let steamSaysValid = false;
  try {
    const r = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!r.ok) return json({ ok: false, error: "steam_unreachable" }, 502, request);
    const text = await r.text();
    steamSaysValid = /(^|\n)is_valid\s*:\s*true/.test(text);
  } catch {
    return json({ ok: false, error: "steam_unreachable" }, 502, request);
  }
  if (!steamSaysValid) return json({ ok: false, error: "steam_rejected" }, 401, request);

  const { links, key } = await getLinks(env, auth.email);
  links.steam = { id: m[1], at: Date.now() };
  await env.AUTH_KV.put(key, JSON.stringify(links));
  return json({ ok: true, steamId: m[1], links }, 200, request);
}

async function handleLinkDiscordExchange(request, env) {
  const auth = await linkAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.status, request);
  const clientId = env.DISCORD_CLIENT_ID || "";
  const clientSecret = env.DISCORD_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    return json({ ok: false, error: "discord_not_configured" }, 503, request);
  }
  const code = auth.body.code;
  const redirectUri = auth.body.redirectUri;
  if (typeof code !== "string" || !code || code.length > 512 ||
      typeof redirectUri !== "string") {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  // The redirect URI must be one of ours — no open-redirect games.
  let ru;
  try { ru = new URL(redirectUri); } catch { return json({ ok: false, error: "bad_redirect" }, 400, request); }
  if (!ALLOWED_ORIGINS.has(ru.origin)) {
    return json({ ok: false, error: "bad_redirect" }, 400, request);
  }
  let accessToken = "";
  try {
    const tr = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });
    if (!tr.ok) return json({ ok: false, error: "discord_exchange_failed" }, 401, request);
    const tj = await tr.json();
    accessToken = tj.access_token || "";
  } catch {
    return json({ ok: false, error: "discord_unreachable" }, 502, request);
  }
  if (!accessToken) return json({ ok: false, error: "discord_exchange_failed" }, 401, request);
  let me;
  try {
    const ur = await fetch("https://discord.com/api/users/@me", {
      headers: { authorization: "Bearer " + accessToken },
    });
    if (!ur.ok) return json({ ok: false, error: "discord_user_failed" }, 401, request);
    me = await ur.json();
  } catch {
    return json({ ok: false, error: "discord_unreachable" }, 502, request);
  }
  if (!me || typeof me.id !== "string") {
    return json({ ok: false, error: "discord_user_failed" }, 401, request);
  }
  const { links, key } = await getLinks(env, auth.email);
  links.discord = {
    id: me.id,
    username: sanitizeName(me.username || ""),
    avatar: typeof me.avatar === "string" ? me.avatar : null,
    at: Date.now(),
  };
  await env.AUTH_KV.put(key, JSON.stringify(links));
  return json({ ok: true, discord: links.discord, links }, 200, request);
}

/* ----- Google / Yahoo / Amazon linking (2026-10-18) -----
 * Same shape as the Discord exchange above: the browser sends the
 * OAuth2 code it got back on play.html; this Worker exchanges it with
 * the provider using the client SECRET from env, reads the provider's
 * own userinfo/profile endpoint with the access token, and stores
 * only { id, email, name, at }. The access token is used for that one
 * userinfo call and then dropped — tokens are never stored in KV.
 */
const OAUTH_LINK_PROVIDERS = {
  google: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    userinfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    idField: "sub",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  yahoo: {
    tokenUrl: "https://api.login.yahoo.com/oauth2/get_token",
    userinfoUrl: "https://api.login.yahoo.com/openid/v1/userinfo",
    idField: "sub",
    clientIdEnv: "YAHOO_CLIENT_ID",
    clientSecretEnv: "YAHOO_CLIENT_SECRET",
  },
  amazon: {
    tokenUrl: "https://api.amazon.com/auth/o2/token",
    userinfoUrl: "https://api.amazon.com/user/profile",
    idField: "user_id",
    clientIdEnv: "AMAZON_CLIENT_ID",
    clientSecretEnv: "AMAZON_CLIENT_SECRET",
  },
};

async function handleLinkOAuthExchange(request, env, provider) {
  const auth = await linkAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.status, request);
  const cfg = OAUTH_LINK_PROVIDERS[provider];
  const clientId = env[cfg.clientIdEnv] || "";
  const clientSecret = env[cfg.clientSecretEnv] || "";
  if (!clientId || !clientSecret) {
    return json({ ok: false, error: "provider_not_configured" }, 503, request);
  }
  const code = auth.body.code;
  const redirectUri = auth.body.redirectUri;
  if (typeof code !== "string" || !code || code.length > 512 ||
      typeof redirectUri !== "string") {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  // The redirect URI must be one of ours — no open-redirect games.
  let ru;
  try { ru = new URL(redirectUri); } catch { return json({ ok: false, error: "bad_redirect" }, 400, request); }
  if (!ALLOWED_ORIGINS.has(ru.origin)) {
    return json({ ok: false, error: "bad_redirect" }, 400, request);
  }
  let accessToken = "";
  try {
    const tr = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });
    if (!tr.ok) return json({ ok: false, error: provider + "_exchange_failed" }, 401, request);
    const tj = await tr.json();
    accessToken = tj.access_token || "";
  } catch {
    return json({ ok: false, error: provider + "_unreachable" }, 502, request);
  }
  if (!accessToken) return json({ ok: false, error: provider + "_exchange_failed" }, 401, request);
  let me;
  try {
    const ur = await fetch(cfg.userinfoUrl, {
      headers: { authorization: "Bearer " + accessToken },
    });
    if (!ur.ok) return json({ ok: false, error: provider + "_user_failed" }, 401, request);
    me = await ur.json();
  } catch {
    return json({ ok: false, error: provider + "_unreachable" }, 502, request);
  }
  const rawId = me && me[cfg.idField];
  if (!me || (typeof rawId !== "string" && typeof rawId !== "number") || rawId === "") {
    return json({ ok: false, error: provider + "_user_failed" }, 401, request);
  }
  const { links, key } = await getLinks(env, auth.email);
  links[provider] = {
    id: String(rawId),
    email: typeof me.email === "string" ? me.email : null,
    name: sanitizeName(me.name || ""),
    at: Date.now(),
  };
  await env.AUTH_KV.put(key, JSON.stringify(links));
  return json({ ok: true, [provider]: links[provider], links }, 200, request);
}

async function handleLinkGoogleExchange(request, env) {
  return handleLinkOAuthExchange(request, env, "google");
}

async function handleLinkYahooExchange(request, env) {
  return handleLinkOAuthExchange(request, env, "yahoo");
}

async function handleLinkAmazonExchange(request, env) {
  return handleLinkOAuthExchange(request, env, "amazon");
}

async function handleLinkUnlink(request, env) {
  const auth = await linkAuth(request, env);
  if (auth.error) return json({ ok: false, error: auth.error }, auth.status, request);
  const provider = auth.body.provider;
  if (provider !== "steam" && provider !== "discord" &&
      provider !== "google" && provider !== "yahoo" && provider !== "amazon") {
    return json({ ok: false, error: "bad_provider" }, 400, request);
  }
  const { links, key } = await getLinks(env, auth.email);
  links[provider] = null;
  await env.AUTH_KV.put(key, JSON.stringify(links));
  return json({ ok: true, links }, 200, request);
}

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      // Preflight must echo the caller's origin or the browser kills the
      // real request. corsHeaders() adds allow-origin for firebabys.io.
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname === "/auth/register" && request.method === "POST") {
      return handleRegister(request, env);
    }
    if (url.pathname === "/auth/google" && request.method === "POST") {
      return handleGoogleAuth(request, env);
    }
    if (url.pathname === "/auth/config" && (request.method === "GET" || request.method === "POST")) {
      return json({ ok: true, googleClientId: env.GOOGLE_CLIENT_ID || "", emailVerification: !!(env.RESEND_API_KEY) }, 200, request);
    }
    if (url.pathname === "/auth/session" && request.method === "POST") {
      return handleSession(request, env);
    }
    if (url.pathname === "/auth/password" && request.method === "POST") {
      return handlePasswordAuth(request, env);
    }
    if (url.pathname === "/auth/code" && request.method === "POST") {
      return handleAuthCode(request, env);
    }
    if (url.pathname === "/auth/verify" && request.method === "POST") {
      return handleAuthVerify(request, env);
    }
    if (url.pathname === "/auth/count" && request.method === "GET") {
      return handleCount(request, env);
    }
    if (url.pathname === "/profile/get" && request.method === "POST") {
      return handleProfileGet(request, env);
    }
    if (url.pathname === "/profile/stage" && request.method === "POST") {
      return handleProfileStage(request, env);
    }
    if (url.pathname === "/profile/stats" && request.method === "POST") {
      return handleProfileStats(request, env);
    }
    if (url.pathname === "/profile/silver" && request.method === "POST") {
      return handleProfileSilver(request, env);
    }
    if (url.pathname === "/profile/season" && request.method === "POST") {
      return handleProfileSeason(request, env);
    }
    if (url.pathname === "/profile/weapons" && request.method === "POST") {
      return handleProfileWeapons(request, env);
    }
    if (url.pathname === "/profile/onboarded" && request.method === "POST") {
      return handleProfileOnboarded(request, env);
    }
    if (url.pathname === "/admin/kick" && request.method === "POST") {
      return handleAdminKick(request, env);
    }
    if (url.pathname === "/locker/get" && request.method === "POST") {
      return handleLockerGet(request, env);
    }
    if (url.pathname === "/locker/migrate" && request.method === "POST") {
      return handleLockerMigrate(request, env);
    }
    if (url.pathname === "/locker/buy" && request.method === "POST") {
      return handleLockerBuy(request, env);
    }
    if (url.pathname === "/locker/equip" && request.method === "POST") {
      return handleLockerEquip(request, env);
    }
    if (url.pathname === "/locker/earn" && request.method === "POST") {
      return handleLockerEarn(request, env);
    }
    if (url.pathname === "/leaderboard" && request.method === "GET") {
      return handleLeaderboard(request, env, url);
    }
    if (url.pathname === "/presence" && request.method === "GET") {
      return handlePresence(request, env);
    }
    if (url.pathname === "/link/config" && request.method === "POST") {
      return handleLinkConfig(request, env);
    }
    if (url.pathname === "/link/list" && request.method === "POST") {
      return handleLinkList(request, env);
    }
    if (url.pathname === "/link/steam/verify" && request.method === "POST") {
      return handleLinkSteamVerify(request, env);
    }
    if (url.pathname === "/link/discord/exchange" && request.method === "POST") {
      return handleLinkDiscordExchange(request, env);
    }
    if (url.pathname === "/link/google/exchange" && request.method === "POST") {
      return handleLinkGoogleExchange(request, env);
    }
    if (url.pathname === "/link/yahoo/exchange" && request.method === "POST") {
      return handleLinkYahooExchange(request, env);
    }
    if (url.pathname === "/link/amazon/exchange" && request.method === "POST") {
      return handleLinkAmazonExchange(request, env);
    }
    if (url.pathname === "/link/unlink" && request.method === "POST") {
      return handleLinkUnlink(request, env);
    }
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("fire-babys-auth ok", { headers: CORS });
    }
    return json({ ok: false, error: "not_found" }, 404, request);
  },
};
