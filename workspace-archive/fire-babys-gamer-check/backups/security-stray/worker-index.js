// Fire Babys auth — Cloudflare Worker entry point.
// Sign-in gate backend: collects player emails, issues session tokens.
//
// Routes:
//   POST /auth/register  {email, name?}  -> { ok, token }        (rate limited: 5/hr/IP)
//   POST /auth/session   {token}          -> { ok, email, name }  (token check)
//   GET  /auth/count                        -> { ok, count }       (dashboard)
//
// Storage: KV namespace AUTH_KV
//   user:{sha256(email)} -> { email, name, createdAt }
//   token:{token}        -> { email, createdAt }          (TTL 365 days)
//   rl:{ip}:{hourBucket} -> count                         (TTL 1 hour)
//
// Designed for upgrade: when Resend is available, add
//   POST /auth/code  (send email verification code)
//   POST /auth/verify (check code -> issue token)
// without changing the client gate contract.

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
    await env.AUTH_KV.put(`token:${token}`,
      JSON.stringify({ email, createdAt: existing.createdAt }),
      { expirationTtl: TOKEN_TTL });
  } else {
    // New player via Google.
    token = genToken();
    isNew = true;
    const now = Date.now();
    await env.AUTH_KV.put(userKey, JSON.stringify({
      email, name: sanitizeName(v.name || ""), token, createdAt: now, emailVerified: true,
    }));
    await env.AUTH_KV.put(`token:${token}`,
      JSON.stringify({ email, createdAt: now }),
      { expirationTtl: TOKEN_TTL });
  }
  return json({ ok: true, token, email, isNew }, 200, request);
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

// --- handlers ---

async function handleRegister(request, env) {
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: "bad_request" }, 400, request);

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
    token = genToken();
    const user = { email, name, createdAt: Date.now(), token, emailVerified: false };
    await env.AUTH_KV.put(userKey, JSON.stringify(user));
    await env.AUTH_KV.put(
      `token:${token}`,
      JSON.stringify({ email, createdAt: user.createdAt }),
      { expirationTtl: TOKEN_TTL }
    );
  }

  await env.AUTH_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });

  return json({ ok: true, token }, 200, request);
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
  const user = await env.AUTH_KV.get(
    `user:${await sha256Hex(rec.email)}`,
    "json"
  );
  return json({ ok: true, email: rec.email, name: (user && user.name) || "" }, 200, request);
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
    maxStage: p.maxStage || 0,
    armor,
    pieces,
    boost: baseBoost + seasonBoost,
    fullSet,
    silverUnlocked: silver,
    tasksDone: p.tasksDone || 0,
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

async function handleLeaderboard(request, env, url) {
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25", 10) || 25, 100);
  const rows = [];
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
  return json({ ok: true, leaders: rows.slice(0, limit) }, 200, request);
}

async function handleCount(request, env) {
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
    await env.AUTH_KV.put(`token:${token}`,
      JSON.stringify({ email, createdAt: existing.createdAt }),
      { expirationTtl: TOKEN_TTL });
  } else {
    token = genToken();
    isNew = true;
    await env.AUTH_KV.put(userKey, JSON.stringify({
      email, name, createdAt: now, token, emailVerified: true,
    }));
    await env.AUTH_KV.put(`token:${token}`,
      JSON.stringify({ email, createdAt: now }),
      { expirationTtl: TOKEN_TTL });
  }
  return json({ ok: true, token, email, isNew }, 200, request);
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
    if (url.pathname === "/leaderboard" && request.method === "GET") {
      return handleLeaderboard(request, env, url);
    }
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("fire-babys-auth ok", { headers: CORS });
    }
    return json({ ok: false, error: "not_found" }, 404, request);
  },
};
