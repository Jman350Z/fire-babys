// Fire Babys multiplayer — Cloudflare Worker entry point.
// Routes:
//   POST /api/lobby            -> create a lobby, returns { code }
//   GET  /api/lobbies          -> list open lobbies
//   GET  /lobby/:code          -> lobby state snapshot (no WS needed)
//   WS   /lobby/:code/ws       -> join lobby over WebSocket (?name= & optional ?token=)

import { GameLobby } from "./lobby.js";
import { LobbyDirectory } from "./directory.js";
import {
  CODE_ALPHABET,
  isValidMode,
  isAllowedOrigin,
  MAX_CREATE_BODY_BYTES,
  MAX_ACTIVE_LOBBIES,
  CREATE_MAX_PER_IP_PER_MIN,
} from "./protocol.js";

export { GameLobby, LobbyDirectory };

// MP-3 fix (2026-10-12): CORS is an allowlist, not "*". Allowed browser
// origins are echoed back; disallowed origins get no CORS headers (and a
// 403 on preflight / WebSocket upgrade). Requests without an Origin
// header (non-browser clients) get no CORS headers either — CORS only
// governs browser access, it is not an auth mechanism.
function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (!origin || !isAllowedOrigin(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(request) },
  });
}

function genCode() {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

// MP-1 fix (2026-10-12), part 1: best-effort per-IP lobby-creation rate
// limit. This Map lives in one worker isolate, so it blunts floods but is
// not a global guarantee — the hard global cap is the directory check
// below (MAX_ACTIVE_LOBBIES). A Cloudflare rate-limit rule on
// POST /api/lobby can still be added dashboard-side for defence in depth.
const createHits = new Map(); // ip -> [timestamps within the last minute]
function createRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  const hits = (createHits.get(ip) || []).filter((t) => t > windowStart);
  hits.push(now);
  createHits.set(ip, hits);
  // Opportunistic cleanup so the Map cannot grow without bound.
  if (createHits.size > 1000) {
    for (const [k, v] of createHits) {
      if (!v.length || v[v.length - 1] <= windowStart) createHits.delete(k);
    }
  }
  return hits.length > CREATE_MAX_PER_IP_PER_MIN;
}

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      // Preflight from a disallowed browser origin: refuse it outright.
      if (origin && !isAllowedOrigin(origin)) {
        return new Response("Forbidden origin", { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // --- create lobby
    if (url.pathname === "/api/lobby" && request.method === "POST") {
      // MP-1 fix, part 2: reject oversized bodies before parsing. The
      // client sends only { mode } (~20 bytes); 1 KB is generous.
      const declared = Number(request.headers.get("content-length") || 0);
      if (declared > MAX_CREATE_BODY_BYTES) {
        return json(request, { ok: false, error: "body too large" }, 413);
      }
      const raw = await request.text().catch(() => "");
      if (raw.length > MAX_CREATE_BODY_BYTES) {
        return json(request, { ok: false, error: "body too large" }, 413);
      }
      // 2026-10-20 fix (black-hat test): malformed JSON is REJECTED, not
      // silently treated as {} — garbage in must not create a lobby.
      let body;
      try {
        body = JSON.parse(raw || "{}");
      } catch (_) {
        return json(request, { ok: false, error: "bad json" }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return json(request, { ok: false, error: "bad json" }, 400);
      }

      // MP-1 fix, part 1: per-IP rate limit (see note above).
      const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        "unknown";
      if (createRateLimited(ip)) {
        return json(request, { ok: false, error: "too many lobbies — try again in a minute" }, 429);
      }

      // MP-1 fix, part 3: global cap on active lobbies, enforced via the
      // directory Durable Object (a singleton, so this count is global).
      // The directory prunes stale entries as part of /list.
      try {
        const dir = env.LOBBY_DIR.get(env.LOBBY_DIR.idFromName("directory"));
        const lr = await dir.fetch("https://internal/list");
        const lj = await lr.json().catch(() => ({ lobbies: [] }));
        if (Array.isArray(lj.lobbies) && lj.lobbies.length >= MAX_ACTIVE_LOBBIES) {
          return json(request, { ok: false, error: "server busy — too many open lobbies" }, 503);
        }
      } catch (_) {
        // If the directory check itself fails, fall through and let the
        // create proceed rather than taking multiplayer down with it.
      }

      // 2026-10-20 fix: a mode that is present but not a real mode is
      // REJECTED (was silently coerced to "coop", so junk created lobbies).
      // A missing mode still defaults to "coop" for older clients.
      if (body.mode !== undefined && !isValidMode(body.mode)) {
        return json(request, { ok: false, error: "bad mode" }, 400);
      }
      const mode = isValidMode(body.mode) ? body.mode : "coop";
      for (let i = 0; i < 5; i++) {
        const code = genCode();
        const stub = env.GAME_LOBBY.get(env.GAME_LOBBY.idFromName(code));
        const r = await stub.fetch(
          `https://internal/internal/create?code=${code}`,
          { method: "POST", body: JSON.stringify({ mode }) }
        );
        if (r.status === 409) continue; // code collision, retry
        const j = await r.json().catch(() => ({}));
        if (j.ok) return json(request, { ok: true, code });
      }
      return json(request, { ok: false, error: "could not allocate lobby" }, 500);
    }

    // --- list lobbies
    if (url.pathname === "/api/lobbies" && request.method === "GET") {
      const dir = env.LOBBY_DIR.get(env.LOBBY_DIR.idFromName("directory"));
      const r = await dir.fetch("https://internal/list");
      const j = await r.json().catch(() => ({ ok: false }));
      return json(request, j);
    }

    // --- lobby state snapshot / websocket join
    const m = url.pathname.match(/^\/lobby\/([A-Za-z0-9]{6})(\/ws)?$/);
    if (m) {
      // MP-3 fix: browsers always send Origin on a WebSocket upgrade;
      // refuse upgrades from origins outside the allowlist. No Origin
      // header (non-browser client) is allowed through.
      if (m[2] && origin && !isAllowedOrigin(origin)) {
        return new Response("Forbidden origin", { status: 403 });
      }
      const code = m[1].toUpperCase();
      const stub = env.GAME_LOBBY.get(env.GAME_LOBBY.idFromName(code));
      const target = m[2] ? "/ws" : "/internal/state";
      const fwd = new Request(`https://internal${target}${url.search}`, request);
      return stub.fetch(fwd);
    }

    if (url.pathname === "/") {
      return new Response("fire-babys-multiplayer ok", { headers: corsHeaders(request) });
    }
    return new Response("Not found", { status: 404 });
  },
};
