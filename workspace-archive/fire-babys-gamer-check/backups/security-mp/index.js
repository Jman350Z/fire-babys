// Fire Babys multiplayer — Cloudflare Worker entry point.
// Routes:
//   POST /api/lobby            -> create a lobby, returns { code }
//   GET  /api/lobbies          -> list open lobbies
//   GET  /lobby/:code          -> lobby state snapshot (no WS needed)
//   WS   /lobby/:code/ws       -> join lobby over WebSocket (?name= & optional ?token=)

import { GameLobby } from "./lobby.js";
import { LobbyDirectory } from "./directory.js";
import { CODE_ALPHABET, isValidMode } from "./protocol.js";

export { GameLobby, LobbyDirectory };

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

function genCode() {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // --- create lobby
    if (url.pathname === "/api/lobby" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
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
        if (j.ok) return json({ ok: true, code });
      }
      return json({ ok: false, error: "could not allocate lobby" }, 500);
    }

    // --- list lobbies
    if (url.pathname === "/api/lobbies" && request.method === "GET") {
      const dir = env.LOBBY_DIR.get(env.LOBBY_DIR.idFromName("directory"));
      const r = await dir.fetch("https://internal/list");
      const j = await r.json().catch(() => ({ ok: false }));
      return json(j);
    }

    // --- lobby state snapshot / websocket join
    const m = url.pathname.match(/^\/lobby\/([A-Za-z0-9]{6})(\/ws)?$/);
    if (m) {
      const code = m[1].toUpperCase();
      const stub = env.GAME_LOBBY.get(env.GAME_LOBBY.idFromName(code));
      const target = m[2] ? "/ws" : "/internal/state";
      const fwd = new Request(`https://internal${target}${url.search}`, request);
      return stub.fetch(fwd);
    }

    if (url.pathname === "/") {
      return new Response("fire-babys-multiplayer ok", { headers: CORS });
    }
    return new Response("Not found", { status: 404 });
  },
};
