/*
 * Fire Babys Arcade — Creator-Only Voting endpoints (v1 draft).
 *
 * DROP-IN for ~/workspace/fire-babys-auth/worker/src/index.js:
 *   1. Paste the handlers below into the file (near the other handlers).
 *   2. Add the 4 route lines at the top of `fetch()` next to the other routes.
 *   3. Deploy with wrangler (same AUTH_KV namespace — no new KV needed).
 *
 * Design contract (from VOTING-SYSTEM.md):
 * - The voter signs in with Google (production OAuth app). The Google ID
 *   token is verified server-side with verifyGoogleIdToken() — never trusted
 *   from the client.
 * - Eligibility is decided ONLY here, from vote:creator:<emailHash> records
 *   that Bobby/Jeff write when a game passes review and goes live.
 * - One vote per verified email (sha256 of normalized email). Re-vote replaces.
 * - No self-votes. Window enforced server-side. Tally hidden until close.
 */

// ---- Routes to add inside fetch(), next to the other route ifs ----
// if (url.pathname === "/vote/eligibility" && request.method === "POST") { return handleVoteEligibility(request, env); }
// if (url.pathname === "/vote/cast" && request.method === "POST") { return handleVoteCast(request, env); }
// if (url.pathname === "/vote/tally" && request.method === "GET") { return handleVoteTally(request, env, url); }
// if (url.pathname === "/vote/admin" && request.method === "POST") { return handleVoteAdmin(request, env); }

// ---- Helpers ----

async function voteGetConfig(env) {
  const c = await env.AUTH_KV.get("vote:config", "json");
  return c && typeof c.open === "boolean" ? c : { open: false, closesAt: null };
}

async function voteVerifyVoter(env, idToken) {
  const clientId = env.GOOGLE_CLIENT_ID || "";
  if (!clientId) return { error: "google_not_configured" };
  const v = await verifyGoogleIdToken(idToken, clientId);
  if (v.error) return { error: "invalid_token" };
  const email = normalizeEmail(v.email || "");
  if (!email) return { error: "invalid_token" };
  const emailHash = await sha256Hex(email);
  const rec = await env.AUTH_KV.get(`vote:creator:${emailHash}`, "json");
  if (!rec) return { error: "not_eligible" };
  return { email, emailHash, rec };
}

async function votePublicGames(env) {
  // Games are stored as vote:game:<gameId>. List all.
  const list = await env.AUTH_KV.list({ prefix: "vote:game:" });
  const games = [];
  for (const k of list.keys) {
    const g = await env.AUTH_KV.get(k.name, "json");
    if (g) games.push({ id: k.name.slice("vote:game:".length), title: g.title, by: g.by });
  }
  return games;
}

// POST /vote/eligibility { idToken } — returns ballot or ineligibility.
async function handleVoteEligibility(request, env) {
  const body = await readBody(request);
  if (!body || typeof body.idToken !== "string") {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  const cfg = await voteGetConfig(env);
  if (!cfg.open) return json({ ok: false, error: "voting_closed" }, 403, request);

  const who = await voteVerifyVoter(env, body.idToken);
  if (who.error) return json({ ok: false, error: who.error }, who.error === "not_eligible" ? 403 : 401, request);

  const games = await votePublicGames(env);
  // No self-votes: exclude the voter's own game from their ballot.
  const ballot = games.filter((g) => g.id !== who.rec.gameId);
  const voted = await env.AUTH_KV.get(`vote:ballot:${who.emailHash}`, "json");
  return json({
    ok: true,
    eligible: true,
    votingOpen: true,
    hasVoted: voted ? voted.gameId : null,
    games: ballot,
    closesAt: cfg.closesAt,
  }, 200, request);
}

// POST /vote/cast { idToken, gameId } — one vote per verified email.
async function handleVoteCast(request, env) {
  const body = await readBody(request);
  if (!body || typeof body.idToken !== "string" || typeof body.gameId !== "string") {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  // Rate limit by IP (same pattern as /auth/google).
  const ip = clientIp(request);
  const hourBucket = Math.floor(Date.now() / 3600000);
  const rlKey = `vrl:${ip}:${hourBucket}`;
  const rlCount = parseInt((await env.AUTH_KV.get(rlKey)) || "0", 10) || 0;
  if (rlCount >= 30) return json({ ok: false, error: "rate_limited" }, 429, request);
  await env.AUTH_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });

  const cfg = await voteGetConfig(env);
  if (!cfg.open) return json({ ok: false, error: "voting_closed" }, 403, request);

  const who = await voteVerifyVoter(env, body.idToken);
  if (who.error) return json({ ok: false, error: who.error }, who.error === "not_eligible" ? 403 : 401, request);

  const gameId = body.gameId.trim().slice(0, 64);
  if (gameId === who.rec.gameId) return json({ ok: false, error: "self_vote" }, 403, request);
  const game = await env.AUTH_KV.get(`vote:game:${gameId}`, "json");
  if (!game) return json({ ok: false, error: "unknown_game" }, 400, request);

  const now = Date.now();
  const prev = await env.AUTH_KV.get(`vote:ballot:${who.emailHash}`, "json");
  await env.AUTH_KV.put(`vote:ballot:${who.emailHash}`,
    JSON.stringify({ gameId, ts: now }));
  await env.AUTH_KV.put(`vote:log:${now}:${who.emailHash}`,
    JSON.stringify({ gameId, ip }), { expirationTtl: 60 * 60 * 24 * 365 });
  return json({ ok: true, replaced: !!prev }, 200, request);
}

// GET /vote/tally[?admin=<token>] — public only after close; admin anytime.
async function handleVoteTally(request, env, url) {
  const cfg = await voteGetConfig(env);
  let isAdmin = false;
  const adminTok = url.searchParams.get("admin") || "";
  if (adminTok) {
    const rec = await env.AUTH_KV.get("vote:admin", "json");
    const h = await sha256Hex(adminTok);
    isAdmin = !!(rec && rec.tokenHash === h);
  }
  if (cfg.open && !isAdmin) {
    return json({ ok: true, visible: false, closed: false }, 200, request);
  }
  // Tally: count all vote:ballot:* records.
  const counts = {};
  let total = 0;
  let cursor = undefined;
  do {
    const page = await env.AUTH_KV.list({ prefix: "vote:ballot:", cursor });
    for (const k of page.keys) {
      const b = await env.AUTH_KV.get(k.name, "json");
      if (b && b.gameId) { counts[b.gameId] = (counts[b.gameId] || 0) + 1; total++; }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json({ ok: true, visible: true, closed: !cfg.open, counts, total, admin: isAdmin }, 200, request);
}

// POST /vote/admin { adminToken, action, ... } — Bobby/Jeff only.
async function handleVoteAdmin(request, env) {
  const body = await readBody(request);
  if (!body || typeof body.adminToken !== "string" || typeof body.action !== "string") {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  const rec = await env.AUTH_KV.get("vote:admin", "json");
  const h = await sha256Hex(body.adminToken);
  if (!rec || rec.tokenHash !== h) return json({ ok: false, error: "forbidden" }, 403, request);

  const now = Date.now();
  switch (body.action) {
    case "open": {
      const closesAt = typeof body.closesAt === "string" ? body.closesAt : null;
      await env.AUTH_KV.put("vote:config", JSON.stringify({ open: true, closesAt }));
      return json({ ok: true }, 200, request);
    }
    case "close":
      await env.AUTH_KV.put("vote:config", JSON.stringify({ open: false, closesAt: null }));
      return json({ ok: true }, 200, request);
    case "add_creator": {
      // Called when a game passes review and goes live.
      const email = normalizeEmail(body.email || "");
      const gameId = String(body.gameId || "").trim().slice(0, 64);
      if (!email || !gameId) return json({ ok: false, error: "bad_request" }, 400, request);
      const emailHash = await sha256Hex(email);
      await env.AUTH_KV.put(`vote:creator:${emailHash}`,
        JSON.stringify({ name: String(body.name || "").slice(0, 80), gameId, addedAt: now }));
      await env.AUTH_KV.put(`vote:game:${gameId}`,
        JSON.stringify({ title: String(body.title || gameId).slice(0, 80), by: String(body.name || "").slice(0, 80) }));
      return json({ ok: true }, 200, request);
    }
    case "remove_creator": {
      const email = normalizeEmail(body.email || "");
      if (!email) return json({ ok: false, error: "bad_request" }, 400, request);
      const emailHash = await sha256Hex(email);
      const cr = await env.AUTH_KV.get(`vote:creator:${emailHash}`, "json");
      await env.AUTH_KV.delete(`vote:creator:${emailHash}`);
      await env.AUTH_KV.delete(`vote:ballot:${emailHash}`);
      if (cr && cr.gameId) await env.AUTH_KV.delete(`vote:game:${cr.gameId}`);
      return json({ ok: true }, 200, request);
    }
    default:
      return json({ ok: false, error: "unknown_action" }, 400, request);
  }
}

// SETUP (one-time, via wrangler kv:key put on the AUTH_KV namespace):
//   vote:config  -> {"open":false,"closesAt":null}
//   vote:admin   -> {"tokenHash":"<sha256 of the admin token Jeff/Bobby keep>"}
// The admin token itself is never stored anywhere in the repo.
