// Fire Babys Creator Arcade — voting worker.
// Creator-only voting for the $10,000 phone-app prize.
//
// Routes:
//   GET  /votestatus            -> { ok, open, votedCount }                       (public)
//   POST /votestatus {token}    -> { ok, open, votedCount, signedIn, eligible,
//                                    voted, votedGameId, votedGameTitle,
//                                    ownGameId, reason }                          (voter state)
//   GET  /games                 -> { ok, open, games:[{gameId,title}] }           (public, no tallies)
//   POST /vote {token, gameId}  -> { ok:true } | { ok:false, error }             (one vote/email)
//   POST /rate {token?, gameId, stars} -> { ok:true } | { ok:false, error }     (star rating)
//   GET  /ratings               -> { ok, games:{gameId:{count, avg}} }          (public)
//   GET  /results?key=ADMIN_KEY[&format=html] -> tallies (owner only)
//   POST /admin/roll {key, roll:[{email,gameId,title}]} -> replace voter roll    (owner only)
//   GET  /admin/roll?key=ADMIN_KEY -> current roll                               (owner only)
//
// Auth: the client sends the session token issued by the fire-babys-auth
// worker (POST /auth/google). This worker shares the same KV namespace and
// looks up `token:{token}` -> {email}. Google ID tokens are verified ONLY by
// the auth worker — this worker never trusts client-claimed emails.
//
// Storage (KV, shared namespace with the auth worker):
//   voterroll            -> { updatedAt, voters:[{email, gameId, title}] }
//   rate:{gameId}        -> { sum, count }  (star-rating aggregate)
//   ratevote:{sha256(email)}:{gameId} -> { stars, ratedAt }  (one rating per
//                                    signed-in email per game; re-rating
//                                    adjusts the aggregate, never double-counts.
//                                    Anonymous ratings have no per-voter key —
//                                    they are only IP rate-limited, see /rate.)
//   vote:{sha256(email)} -> { gameId, votedAt, ipHash }
//   vrl:{ip}:{hourBucket}-> count  (rate limit, TTL 1h)
//
// Env:
//   KV          - KV namespace binding (same namespace id as the auth worker's AUTH_KV)
//   VOTING_OPEN - "1" = voting open, anything else = closed
//   ADMIN_KEY   - shared secret for /results and /admin/*

const CORS = {
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};
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
  return h;
}
function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json", ...corsHeaders(request || { headers: new Headers() }) },
  });
}

// --- pure helpers ---

export function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}
export function isValidSlug(s) {
  return typeof s === "string" && /^[a-z0-9-]{1,64}$/.test(s);
}
// Rating gameIds are full game slugs (e.g. "splash", "3d",
// "fire-world/games/game-12-volcanic-pinball.html") — wider than a
// contest slug but still a strict charset, 128 chars max, no "..".
export function isValidGameId(s) {
  return typeof s === "string" && s.length >= 1 && s.length <= 128 &&
    /^[a-z0-9][a-z0-9\-._/]*$/.test(s) && s.indexOf("..") === -1;
}
export function isValidStars(n) {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
}
export async function sha256Hex(str) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function safeEqual(a, b) {
  // Timing-safe compare for the admin key.
  const ab = new TextEncoder().encode(String(a || ""));
  const bb = new TextEncoder().encode(String(b || ""));
  if (ab.length !== bb.length || ab.length === 0) return false;
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(ab, bb);
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

const MAX_BODY_BYTES = 65536; // /admin/roll can carry a big voter list
async function readBody(request, maxBytes) {
  const text = await request.text();
  if (text.length > (maxBytes || 4096)) return null;
  try { return JSON.parse(text); } catch { return null; }
}

// --- voter roll ---

async function getRoll(env) {
  const r = await env.KV.get("voterroll", "json");
  if (r && Array.isArray(r.voters)) return r;
  return { updatedAt: 0, voters: [] };
}
function rollIndex(roll) {
  // email -> voter, and gameId -> {gameId,title}
  const byEmail = new Map();
  const games = new Map();
  for (const v of roll.voters) {
    if (!v || !v.email || !v.gameId) continue;
    const email = normalizeEmail(v.email);
    byEmail.set(email, { email, gameId: v.gameId, title: v.title || v.gameId });
    if (!games.has(v.gameId)) games.set(v.gameId, { gameId: v.gameId, title: v.title || v.gameId });
  }
  return { byEmail, games };
}

// Resolve a session token to a verified email via the shared auth KV.
async function emailForToken(env, token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9]{32}$/.test(token.trim())) return null;
  const rec = await env.KV.get("token:" + token.trim(), "json");
  if (!rec || !rec.email) return null;
  return normalizeEmail(rec.email);
}

async function rateLimit(env, ip, prefix, maxPerHour) {
  const bucket = Math.floor(Date.now() / 3600000);
  const key = prefix + ":" + ip + ":" + bucket;
  const raw = await env.KV.get(key);
  const count = raw ? parseInt(raw, 10) || 0 : 0;
  if (count >= maxPerHour) return false;
  await env.KV.put(key, String(count + 1), { expirationTtl: 3600 });
  return true;
}

function votingOpen(env) {
  return String(env.VOTING_OPEN || "") === "1";
}

async function countVotes(env) {
  let n = 0, cursor;
  do {
    const page = await env.KV.list({ prefix: "vote:", limit: 1000, cursor });
    n += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return n;
}

async function computeTallies(env) {
  const { games } = rollIndex(await getRoll(env));
  const tallies = new Map();
  for (const [id, g] of games) tallies.set(id, { gameId: id, title: g.title, votes: 0 });
  let totalVotes = 0, cursor;
  do {
    const page = await env.KV.list({ prefix: "vote:", limit: 1000, cursor });
    for (const k of page.keys) {
      const rec = await env.KV.get(k.name, "json");
      if (rec && tallies.has(rec.gameId)) { tallies.get(rec.gameId).votes++; totalVotes++; }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return { tallies: [...tallies.values()].sort((a, b) => b.votes - a.votes), totalVotes };
}

// --- handlers ---

async function handlePublicStatus(request, env) {
  if (!(await rateLimit(env, clientIp(request), "srl", 120)))
    return json({ ok: false, error: "rate_limited" }, 429, request);
  return json({ ok: true, open: votingOpen(env), votedCount: await countVotes(env) }, 200, request);
}

async function handleVoterStatus(request, env) {
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: "bad_request" }, 400, request);
  if (!(await rateLimit(env, clientIp(request), "srl", 120)))
    return json({ ok: false, error: "rate_limited" }, 429, request);

  const base = { ok: true, open: votingOpen(env), votedCount: await countVotes(env) };
  const email = await emailForToken(env, body.token);
  if (!email) return json({ ...base, signedIn: false }, 200, request);

  const { byEmail } = rollIndex(await getRoll(env));
  const voter = byEmail.get(email);
  if (!voter) {
    return json({ ...base, signedIn: true, email, eligible: false, voted: false,
      reason: "not_a_creator" }, 200, request);
  }
  const existing = await env.KV.get("vote:" + (await sha256Hex(email)), "json");
  if (existing) {
    const { games } = rollIndex(await getRoll(env));
    const g = games.get(existing.gameId);
    return json({ ...base, signedIn: true, email, eligible: true, voted: true,
      votedGameId: existing.gameId, votedGameTitle: (g && g.title) || existing.gameId,
      ownGameId: voter.gameId }, 200, request);
  }
  return json({ ...base, signedIn: true, email, eligible: true, voted: false,
    ownGameId: voter.gameId }, 200, request);
}

async function handleGames(request, env) {
  if (!(await rateLimit(env, clientIp(request), "srl", 120)))
    return json({ ok: false, error: "rate_limited" }, 429, request);
  const { games } = rollIndex(await getRoll(env));
  return json({ ok: true, open: votingOpen(env),
    games: [...games.values()].sort((a, b) => a.title.localeCompare(b.title)) }, 200, request);
}

async function handleVote(request, env) {
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: "bad_request" }, 400, request);
  const ip = clientIp(request);
  if (!(await rateLimit(env, ip, "vrl", 20)))
    return json({ ok: false, error: "rate_limited" }, 429, request);

  // 1. Must present a valid session token (verified Google email, server-side).
  const email = await emailForToken(env, body.token);
  if (!email) return json({ ok: false, error: "not_signed_in" }, 401, request);

  // 2. Voting must be open.
  if (!votingOpen(env)) return json({ ok: false, error: "voting_closed" }, 403, request);

  // 3. Must be on the creator voter roll.
  const { byEmail, games } = rollIndex(await getRoll(env));
  const voter = byEmail.get(email);
  if (!voter) return json({ ok: false, error: "not_a_creator" }, 403, request);

  // 4. One vote per email — server-side enforced.
  const emailHash = await sha256Hex(email);
  const voteKey = "vote:" + emailHash;
  if (await env.KV.get(voteKey)) return json({ ok: false, error: "already_voted" }, 409, request);

  // 5. Valid target game, and never your own.
  const gameId = body.gameId;
  if (!isValidSlug(gameId) || !games.has(gameId))
    return json({ ok: false, error: "bad_game" }, 400, request);
  if (gameId === voter.gameId)
    return json({ ok: false, error: "no_self_vote" }, 403, request);

  // 6. Record the vote + audit trail.
  const ipHash = (await sha256Hex(ip)).slice(0, 16);
  const record = { gameId, votedAt: Date.now(), ipHash };
  await env.KV.put(voteKey, JSON.stringify(record));
  await env.KV.put("votelog:" + Date.now() + ":" + emailHash.slice(0, 12),
    JSON.stringify({ emailHash, gameId, votedAt: record.votedAt, ipHash }),
    { expirationTtl: 60 * 60 * 24 * 365 });

  return json({ ok: true, votedGameId: gameId,
    votedGameTitle: games.get(gameId).title }, 200, request);
}

// --- star ratings (Gamer Score) ---

async function handleRate(request, env) {
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: "bad_request" }, 400, request);
  const ip = clientIp(request);
  // Anonymous ratings are allowed, so the existing IP rate-limit helper
  // is the abuse guard for them (signed-in ratings are additionally
  // deduplicated per email below).
  if (!(await rateLimit(env, ip, "rrl", 30)))
    return json({ ok: false, error: "rate_limited" }, 429, request);

  if (!isValidGameId(body.gameId))
    return json({ ok: false, error: "bad_game" }, 400, request);
  if (!isValidStars(body.stars))
    return json({ ok: false, error: "bad_stars" }, 400, request);
  const gameId = body.gameId;
  const stars = body.stars;

  // Token is optional. If one is supplied it must be a real session —
  // a bad token is rejected rather than silently treated as anonymous.
  let email = null;
  if (typeof body.token === "string" && body.token.trim() !== "") {
    email = await emailForToken(env, body.token);
    if (!email) return json({ ok: false, error: "not_signed_in" }, 401, request);
  }

  const aggKey = "rate:" + gameId;
  const agg = (await env.KV.get(aggKey, "json")) || { sum: 0, count: 0 };
  let sum = (typeof agg.sum === "number" ? agg.sum : 0);
  let count = (typeof agg.count === "number" ? agg.count : 0);

  if (email) {
    // One rating per signed-in email per game: a re-rating replaces the
    // previous stars in the aggregate instead of inflating the count.
    const voterKey = "ratevote:" + (await sha256Hex(email)) + ":" + gameId;
    const prev = await env.KV.get(voterKey, "json");
    if (prev && isValidStars(prev.stars)) {
      sum += stars - prev.stars;
    } else {
      sum += stars; count += 1;
    }
    await env.KV.put(voterKey, JSON.stringify({ stars, ratedAt: Date.now() }));
  } else {
    sum += stars; count += 1;
  }

  await env.KV.put(aggKey, JSON.stringify({ sum, count }));
  return json({ ok: true, gameId, stars }, 200, request);
}

async function handleRatings(request, env) {
  if (!(await rateLimit(env, clientIp(request), "srl", 120)))
    return json({ ok: false, error: "rate_limited" }, 429, request);
  const games = {};
  let cursor;
  do {
    const page = await env.KV.list({ prefix: "rate:", limit: 1000, cursor });
    for (const k of page.keys) {
      const agg = await env.KV.get(k.name, "json");
      if (agg && typeof agg.count === "number" && agg.count > 0) {
        const gameId = k.name.slice("rate:".length);
        games[gameId] = {
          count: agg.count,
          avg: Math.round((agg.sum / agg.count) * 100) / 100,
        };
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json({ ok: true, games }, 200, request);
}

function resultsHtml(data) {
  const rows = data.tallies.map((t, i) =>
    `<tr><td>${i + 1}</td><td>${escapeHtml(t.title)}</td>` +
    `<td><code>${escapeHtml(t.gameId)}</code></td><td><b>${t.votes}</b></td></tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Fire Babys Arcade — voting results (owner only)</title></head>` +
    `<body style="font-family:sans-serif;max-width:640px;margin:40px auto;padding:0 16px">` +
    `<h1>🔥 Arcade voting results</h1>` +
    `<p><b>${data.totalVotes}</b> creators have voted. Voting is <b>${data.open ? "OPEN" : "CLOSED"}</b>.</p>` +
    `<p style="color:#888;font-size:13px">Generated ${new Date(data.generatedAt).toLocaleString()}. Keep these numbers private until the reveal.</p>` +
    `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">` +
    `<tr><th>#</th><th>Game</th><th>ID</th><th>Votes</th></tr>${rows}</table>` +
    `<p>the future is BLAZING FOR FIRE BABYS 🔥</p></body></html>`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function handleResults(request, env, url) {
  if (!(await rateLimit(env, clientIp(request), "arl", 20)))
    return json({ ok: false, error: "rate_limited" }, 429, request);
  // Prefer X-Admin-Key header — keys in URLs land in server/CDN logs.
  const key = request.headers.get("x-admin-key") || url.searchParams.get("key") || "";
  if (!(await safeEqual(key, env.ADMIN_KEY || "")))
    return json({ ok: false, error: "forbidden" }, 403, request);
  const { tallies, totalVotes } = await computeTallies(env);
  const data = { ok: true, open: votingOpen(env), totalVotes, tallies,
    generatedAt: Date.now() };
  if (url.searchParams.get("format") === "html") {
    return new Response(resultsHtml(data),
      { headers: { "content-type": "text/html; charset=utf-8", ...corsHeaders(request) } });
  }
  return json(data, 200, request);
}

async function handleAdminRoll(request, env, url) {
  if (!(await rateLimit(env, clientIp(request), "arl", 20)))
    return json({ ok: false, error: "rate_limited" }, 429, request);
  const checkKey = async (k) => safeEqual(k, env.ADMIN_KEY || "");
  const headerKey = request.headers.get("x-admin-key") || "";
  if (request.method === "GET") {
    const k = headerKey || url.searchParams.get("key") || "";
    if (!(await checkKey(k)))
      return json({ ok: false, error: "forbidden" }, 403, request);
    const roll = await getRoll(env);
    return json({ ok: true, voterCount: roll.voters.length,
      updatedAt: roll.updatedAt, voters: roll.voters }, 200, request);
  }
  // POST: replace the whole roll.
  const body = await readBody(request, MAX_BODY_BYTES);
  const postKey = headerKey || (body && body.key) || "";
  if (!body || !(await checkKey(String(postKey))))
    return json({ ok: false, error: "forbidden" }, 403, request);
  if (!Array.isArray(body.roll))
    return json({ ok: false, error: "bad_roll" }, 400, request);
  const voters = [];
  const seen = new Set();
  for (const v of body.roll) {
    if (!v || typeof v.email !== "string" || !isValidSlug(v.gameId)) continue;
    const email = normalizeEmail(v.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) continue;
    if (seen.has(email)) continue; // one entry per email
    seen.add(email);
    voters.push({ email, gameId: v.gameId, title: String(v.title || v.gameId).slice(0, 80) });
  }
  await env.KV.put("voterroll", JSON.stringify({ updatedAt: Date.now(), voters }));
  return json({ ok: true, voterCount: voters.length }, 200, request);
}

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    const p = url.pathname;
    if (p === "/votestatus" && request.method === "GET") return handlePublicStatus(request, env);
    if (p === "/votestatus" && request.method === "POST") return handleVoterStatus(request, env);
    if (p === "/games" && request.method === "GET") return handleGames(request, env);
    if (p === "/vote" && request.method === "POST") return handleVote(request, env);
    if (p === "/rate" && request.method === "POST") return handleRate(request, env);
    if (p === "/ratings" && request.method === "GET") return handleRatings(request, env);
    if (p === "/results" && request.method === "GET") return handleResults(request, env, url);
    if (p === "/admin/roll" && (request.method === "GET" || request.method === "POST"))
      return handleAdminRoll(request, env, url);
    if (p === "/" && request.method === "GET") {
      return new Response("fire-babys-vote ok", { headers: corsHeaders(request) });
    }
    return json({ ok: false, error: "not_found" }, 404, request);
  },
};
