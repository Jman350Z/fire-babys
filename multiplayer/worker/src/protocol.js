// Shared protocol constants + pure helpers for Fire Babys multiplayer.
// Used by the Cloudflare Worker (ESM). The client library (fire-babys-net.js)
// carries its own copy of these constants — keep them in sync.

export const MAX_PLAYERS = 30;

// Versus modes: key -> required player count. "coop" is players-vs-game.
export const MODES = Object.freeze({
  "2v2": 4,
  "4v4": 8,
  "6v6": 12,
  "7v7": 14,
  "15v15": 30,
});

export const CODE_RE = /^[A-Z0-9]{6}$/;
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Lobby phases
export const PHASE_LOBBY = "lobby";
export const PHASE_PLAYING = "playing";

// How often clients should send movement (Hz). Server caps at ~15Hz per player.
export const MOVE_HZ = 12;

// Message size guard (bytes)
export const MAX_MSG_BYTES = 4096;

export function isValidMode(m) {
  return m === "coop" || Object.prototype.hasOwnProperty.call(MODES, m);
}

/** Kid-safe name: trim, cap length, strip HTML-significant chars. */
export function sanitizeName(n) {
  let s = String(n ?? "").trim().slice(0, 16);
  s = s.replace(/[<>&"'`]/g, "");
  return s || "Player";
}

/**
 * Snake-draft team assignment by join order.
 * ids: array of player ids in join order. Returns { playerId: 0|1 }.
 * Produces balanced alternation: 0,1,1,0,0,1,1,0,...
 */
export function assignTeams(ids) {
  const teams = {};
  ids.forEach((id, i) => {
    const pair = Math.floor(i / 2);
    teams[id] = pair % 2 === 0 ? i % 2 : 1 - (i % 2);
  });
  return teams;
}

/** Clamp a number, returning fallback when not finite. */
export function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
