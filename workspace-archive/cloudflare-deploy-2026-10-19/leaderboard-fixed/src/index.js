/* Fire Babys worldwide leaderboard Worker.
 * KV bindings required: LEADERBOARD_KV (board data), AUTH_KV (session check).
 * Client contract:
 *   GET  /board?type=top|champions   -> { rows: [{title, score}] }
 *   POST /score {title, score, type, ts, token}
 *
 * Security (2026-10-19 fix, after the super-systems-check forgery demo):
 *  - POST /score REQUIRES a valid signed-in session token, verified against
 *    AUTH_KV `token:<token>` records issued by the auth Worker. No token, no post.
 *  - Timestamps must be fresh (<=10 min old, <=5 min in the future); the old
 *    code accepted stale-2020 timestamps.
 *  - Scores are clamped to sane absolute ceilings AND may only grow by a
 *    bounded amount per post per account, so a score can never jump
 *    0 -> 999,999,999 again. Real play grows far slower than these caps.
 *  - CORS is restricted to the game origin (was '*').
 * Titles must match the auto-generated format e.g. "Blaze Trainee #4821".
 * Purpose: teach fire safety — Fire Babys game by Jeffery Pruden.
 */
const TITLE_RE = /^[A-Za-z][A-Za-z0-9 ]{0,24} ?#[0-9]{4,6}$/;
const TYPES = { top: 'exp', champions: 'wins' };
const MAX_ENTRIES = 100;
const WRITE_LIMIT = 20;
const WINDOW_MS = 60 * 1000;
const ABS_MAX = { exp: 250000, wins: 25000 };
/* 2026-10-20 fix (black-hat test): the growth cap is per account per HOUR,
 * not per post — rapid repeat posts no longer stack. And a score title is
 * locked to the first account that posts under it (one title per account),
 * so nobody can post under another player's name. */
const GROWTH_PER_HOUR = { exp: 5000, wins: 25 };
const GROWTH_WINDOW_MS = 60 * 60 * 1000;
const TS_MAX_AGE_MS = 10 * 60 * 1000;
const TS_MAX_FUTURE_MS = 5 * 60 * 1000;
const CORS = {
  'Access-Control-Allow-Origin': 'https://firebabys.io',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function checkRateLimit(kv, ip) {
  const key = 'rl:' + ip;
  const now = Date.now();
  let rec = await kv.get(key, 'json');
  if (!rec || rec.reset < now) rec = { count: 0, reset: now + WINDOW_MS };
  rec.count += 1;
  await kv.put(key, JSON.stringify(rec), { expirationTtl: 120 });
  return rec.count <= WRITE_LIMIT;
}
async function readEntries(kv) {
  const entries = (await kv.get('board:entries', 'json')) || [];
  return Array.isArray(entries) ? entries : [];
}
function rowsFor(type, entries) {
  const field = TYPES[type];
  return entries
    .slice()
    .sort((a, b) => b[field] - a[field])
    .slice(0, 20)
    .map((e) => ({ title: e.title, score: e[field] }));
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const kv = env.LEADERBOARD_KV;
    if (!kv) return json({ error: 'storage not configured' }, 500);
    if (req.method === 'GET' && url.pathname === '/board') {
      const type = url.searchParams.get('type');
      if (!TYPES[type]) return json({ error: 'unknown board type' }, 400);
      const entries = await readEntries(kv);
      return json({ rows: rowsFor(type, entries) });
    }
    if (req.method === 'POST' && url.pathname === '/score') {
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      if (!(await checkRateLimit(kv, ip))) {
        return json({ error: 'slow down, hotshot' }, 429);
      }
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'bad json' }, 400);
      }
      const type = body.type;
      if (!TYPES[type]) return json({ error: 'unknown board type' }, 400);
      // --- session required (the fix) ---
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      if (!/^[A-Za-z0-9]{32}$/.test(token)) return json({ error: 'sign-in required' }, 401);
      if (!env.AUTH_KV) return json({ error: 'auth not configured' }, 500);
      const sess = await env.AUTH_KV.get(`token:${token}`, 'json');
      if (!sess || !sess.email) return json({ error: 'sign-in required' }, 401);
      // --- fresh timestamp ---
      const ts = Number(body.ts);
      const now = Date.now();
      if (!Number.isFinite(ts) || now - ts > TS_MAX_AGE_MS || ts - now > TS_MAX_FUTURE_MS) {
        return json({ error: 'stale timestamp' }, 400);
      }
      const title = String(body.title || '').trim();
      if (!TITLE_RE.test(title)) return json({ error: 'bad title format' }, 400);
      const field = TYPES[type];
      const score = clampInt(body.score, 0, ABS_MAX[field]);
      if (score === null) return json({ error: 'bad score' }, 400);
      // --- title lock: one score title per account, owned by first poster ---
      const emailHash = await sha256Hex(sess.email);
      const acctKey = 'acct:' + emailHash;
      const acct = (await kv.get(acctKey, 'json')) || { exp: 0, wins: 0 };
      if (acct.title && acct.title !== title) {
        return json({ error: 'this account already posts as another title' }, 403);
      }
      const lockKey = 'title:' + title;
      const lock = await kv.get(lockKey);
      if (lock && lock !== emailHash) {
        return json({ error: 'that title belongs to another player' }, 403);
      }
      // --- per-account HOURLY growth cap (2026-10-20) ---
      if (!acct.winStart || now - acct.winStart >= GROWTH_WINDOW_MS) {
        acct.winStart = now;
        acct.winExp = 0;
        acct.winWins = 0;
      }
      const winField = field === 'exp' ? 'winExp' : 'winWins';
      const entries = await readEntries(kv);
      let entry = entries.find((e) => e.title === title);
      if (!entry) {
        entry = { title, exp: 0, wins: 0, updated: now };
        entries.push(entry);
      }
      const remaining = Math.max(0, GROWTH_PER_HOUR[field] - (acct[winField] || 0));
      const allowed = Math.min(score, (entry[field] || 0) + remaining, ABS_MAX[field]);
      const gained = Math.max(0, allowed - (entry[field] || 0));
      entry[field] = Math.max(entry[field], allowed);
      entry.updated = now;
      acct[winField] = (acct[winField] || 0) + gained;
      acct[field] = Math.max(acct[field] || 0, entry[field]);
      acct.title = title;
      acct.updated = now;
      if (!lock) await kv.put(lockKey, emailHash);
      await kv.put(acctKey, JSON.stringify(acct));
      const pruned = entries
        .slice()
        .sort((a, b) => Math.max(b.exp, b.wins) - Math.max(a.exp, a.wins))
        .slice(0, MAX_ENTRIES);
      await kv.put('board:entries', JSON.stringify(pruned));
      return json({ ok: true, rows: rowsFor(type, pruned) });
    }
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/api')) {
      return json({
        game: 'Fire Babys',
        usage: 'GET /board?type=top|champions | POST /score {title,score,type,ts,token}',
      });
    }
    return json({ error: 'not found' }, 404);
  },
};
