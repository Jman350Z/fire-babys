// GameLobby Durable Object — one instance per lobby (keyed by 6-char lobby code).
// Holds authoritative lobby state and relays real-time game events over WebSocket.
// Uses the WebSocket Hibernation API so connections survive DO eviction.

import {
  MAX_PLAYERS,
  MODES,
  MAX_MSG_BYTES,
  PHASE_LOBBY,
  PHASE_PLAYING,
  sanitizeName,
  assignTeams,
  isValidMode,
  num,
} from "./protocol.js";

const EMPTY_TTL_MS = 5 * 60 * 1000; // delete lobby 5 min after last player leaves
const MOVE_MIN_INTERVAL_MS = 66; // ~15Hz per-player cap on relayed moves

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export class GameLobby {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.state = null;
    this.lastMoveAt = new Map(); // playerId -> timestamp (in-memory move throttle)
    this.ctx.blockConcurrencyWhile(async () => {
      this.state = await this.ctx.storage.get("lobby");
    });
  }

  // ------------------------------------------------------------------ fetch
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/internal/create" && request.method === "POST") {
      if (this.state) return json({ ok: false, error: "exists" }, 409);
      const code = url.searchParams.get("code") || "??????";
      const body = await request.json().catch(() => ({}));
      this.state = {
        code,
        mode: isValidMode(body.mode) ? body.mode : "coop",
        phase: PHASE_LOBBY,
        maxPlayers: MAX_PLAYERS,
        hostId: null,
        players: [],
        createdAt: Date.now(),
        seed: Math.floor(Math.random() * 2 ** 31),
      };
      await this.persist();
      await this.register();
      return json({ ok: true, code });
    }

    if (url.pathname === "/internal/state") {
      if (!this.state) return json({ ok: false, error: "no lobby" }, 404);
      return json({ ok: true, state: this.publicState() });
    }

    if (url.pathname === "/internal/close" && request.method === "POST") {
      await this.unregister();
      await this.ctx.storage.deleteAll();
      this.state = null;
      return json({ ok: true });
    }

    const upgrade = request.headers.get("Upgrade") || "";
    if (upgrade.toLowerCase() === "websocket") {
      return this.handleJoin(request);
    }
    return new Response("Not found", { status: 404 });
  }

  // ------------------------------------------------------------------ join
  async handleJoin(request) {
    if (!this.state) return new Response("No such lobby", { status: 404 });
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const name = sanitizeName(url.searchParams.get("name"));

    let player = token ? this.state.players.find((p) => p.token === token) : null;
    let isNew = false;
    if (!player) {
      if (this.state.phase !== PHASE_LOBBY) {
        return new Response("Game already in progress", { status: 403 });
      }
      if (this.state.players.length >= this.state.maxPlayers) {
        return new Response("Lobby full", { status: 403 });
      }
      player = {
        id: crypto.randomUUID(),
        token: crypto.randomUUID(),
        name,
        ready: false,
        team: 0,
        connected: true,
        joinedAt: Date.now(),
      };
      this.state.players.push(player);
      if (!this.state.hostId) this.state.hostId = player.id;
      isNew = true;
    } else {
      player.connected = true;
      player.name = name; // allow name update on rejoin
    }

    // A player (re)joined: cancel any pending empty-lobby cleanup.
    try {
      await this.ctx.storage.deleteAlarm();
    } catch (_) {}

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: player.id });

    server.send(
      JSON.stringify({
        t: "welcome",
        playerId: player.id,
        token: player.token,
        isHost: this.state.hostId === player.id,
        reconnected: !isNew,
        state: this.publicState(),
      })
    );
    this.broadcast({ t: isNew ? "joined" : "rejoined", id: player.id });
    this.broadcastLobby();
    await this.persist();
    await this.register();
    return new Response(null, { status: 101, webSocket: client });
  }

  // ------------------------------------------------------- websocket events
  async webSocketMessage(ws, message) {
    if (!this.state) return;
    let msg;
    try {
      if (typeof message !== "string" || message.length > MAX_MSG_BYTES) return;
      msg = JSON.parse(message);
      if (!msg || typeof msg.t !== "string") return;
    } catch (_) {
      return;
    }
    const att = ws.deserializeAttachment() || {};
    const player = this.state.players.find((p) => p.id === att.playerId);
    if (!player) {
      this.send(ws, { t: "error", msg: "unknown player — reconnect" });
      return;
    }
    player.connected = true;

    switch (msg.t) {
      case "ping":
        this.send(ws, { t: "pong", ts: msg.ts });
        break;

      case "ready":
        if (this.state.phase !== PHASE_LOBBY) break;
        player.ready = !!msg.ready;
        this.broadcastLobby();
        break;

      case "mode": {
        // Host-only, lobby phase only.
        if (player.id !== this.state.hostId || this.state.phase !== PHASE_LOBBY) break;
        if (!isValidMode(msg.mode)) break;
        this.state.mode = msg.mode;
        for (const p of this.state.players) {
          p.ready = false;
          p.team = 0;
        }
        this.broadcastLobby();
        break;
      }

      case "start":
        if (player.id !== this.state.hostId || this.state.phase !== PHASE_LOBBY) break;
        this.tryStart();
        break;

      case "move":
        if (this.state.phase !== PHASE_PLAYING) break;
        this.relayMove(player, msg);
        break;

      case "action":
        if (this.state.phase !== PHASE_PLAYING) break;
        this.broadcast(
          {
            t: "action",
            id: player.id,
            kind: String(msg.kind || "").slice(0, 24),
            x: num(msg.x),
            y: num(msg.y),
            data: safeData(msg.data),
          },
          player.id
        );
        break;

      case "end":
        if (player.id !== this.state.hostId || this.state.phase !== PHASE_PLAYING) break;
        this.state.phase = PHASE_LOBBY;
        for (const p of this.state.players) p.ready = false;
        this.broadcast({ t: "end", results: safeData(msg.results) });
        this.broadcastLobby();
        break;

      default:
        break;
    }
    await this.persist();
  }

  async webSocketClose(ws, _code, _reason, _wasClean) {
    await this.handleDisconnect(ws);
  }

  async webSocketError(ws, _error) {
    await this.handleDisconnect(ws);
  }

  async handleDisconnect(ws) {
    if (!this.state) return;
    let att = {};
    try {
      att = ws.deserializeAttachment() || {};
    } catch (_) {}
    const player = this.state.players.find((p) => p.id === att.playerId);
    if (!player || !player.connected) return;
    player.connected = false;

    // Host migration: earliest-joined connected player becomes host.
    if (player.id === this.state.hostId) {
      const next = this.state.players.find((p) => p.connected);
      this.state.hostId = next ? next.id : null;
      if (next) this.broadcast({ t: "host", hostId: next.id, name: next.name });
    }
    this.broadcast({ t: "left", id: player.id, name: player.name });
    this.broadcastLobby();

    const anyConnected = this.state.players.some((p) => p.connected);
    if (!anyConnected) {
      await this.ctx.storage.setAlarm(Date.now() + EMPTY_TTL_MS);
    }
    await this.persist();
    await this.register();
  }

  async alarm() {
    if (!this.state) return;
    const anyConnected = this.state.players.some((p) => p.connected);
    if (!anyConnected) {
      await this.unregister();
      await this.ctx.storage.deleteAll();
      this.state = null;
    }
  }

  // ---------------------------------------------------------------- helpers
  tryStart() {
    const s = this.state;
    const n = s.players.length;
    if (s.mode === "coop") {
      if (n < 1) return;
      for (const p of s.players) p.team = 0;
    } else {
      const need = MODES[s.mode];
      if (n !== need) {
        this.sendTo(s.hostId, {
          t: "error",
          msg: `Need ${need} players for ${s.mode} (have ${n})`,
        });
        return;
      }
      const teams = assignTeams(s.players.map((p) => p.id));
      for (const p of s.players) p.team = teams[p.id];
    }
    s.phase = PHASE_PLAYING;
    s.seed = Math.floor(Math.random() * 2 ** 31);
    this.broadcast({
      t: "start",
      mode: s.mode,
      seed: s.seed,
      state: this.publicState(),
    });
  }

  relayMove(player, msg) {
    const now = Date.now();
    const last = this.lastMoveAt.get(player.id) || 0;
    if (now - last < MOVE_MIN_INTERVAL_MS) return; // drop over-fast moves
    this.lastMoveAt.set(player.id, now);
    const x = num(msg.x);
    const y = num(msg.y);
    if (Math.abs(x) > 5000 || Math.abs(y) > 5000) return; // sanity clamp
    this.broadcast(
      {
        t: "pos",
        id: player.id,
        x,
        y,
        dir: num(msg.dir),
        anim: String(msg.anim || "").slice(0, 16),
        ts: num(msg.ts, now),
      },
      player.id
    );
  }

  publicState() {
    const s = this.state;
    return {
      code: s.code,
      mode: s.mode,
      phase: s.phase,
      maxPlayers: s.maxPlayers,
      hostId: s.hostId,
      seed: s.seed,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
        team: p.team,
        connected: p.connected,
      })),
    };
  }

  broadcast(msg, excludeId) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment() || {};
        if (excludeId && att.playerId === excludeId) continue;
        ws.send(data);
      } catch (_) {}
    }
  }

  broadcastLobby() {
    this.broadcast({ t: "lobby", state: this.publicState() });
  }

  send(ws, msg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (_) {}
  }

  sendTo(playerId, msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment() || {};
        if (att.playerId === playerId) ws.send(data);
      } catch (_) {}
    }
  }

  async persist() {
    if (this.state) await this.ctx.storage.put("lobby", this.state);
  }

  dirInfo() {
    const s = this.state;
    return {
      mode: s.mode,
      players: s.players.filter((p) => p.connected).length,
      maxPlayers: s.maxPlayers,
      phase: s.phase,
      updatedAt: Date.now(),
    };
  }

  async register() {
    try {
      const dir = this.env.LOBBY_DIR.get(this.env.LOBBY_DIR.idFromName("directory"));
      await dir.fetch("https://internal/register", {
        method: "POST",
        body: JSON.stringify({ code: this.state.code, info: this.dirInfo() }),
      });
    } catch (_) {}
  }

  async unregister() {
    try {
      const dir = this.env.LOBBY_DIR.get(this.env.LOBBY_DIR.idFromName("directory"));
      await dir.fetch("https://internal/unregister", {
        method: "POST",
        body: JSON.stringify({ code: this.state ? this.state.code : "" }),
      });
    } catch (_) {}
  }
}

/** Keep action/end payloads small and JSON-safe. */
function safeData(d) {
  if (d == null) return null;
  try {
    const s = JSON.stringify(d);
    if (!s || s.length > 512) return null;
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}
