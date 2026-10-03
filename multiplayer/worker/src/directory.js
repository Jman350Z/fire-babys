// LobbyDirectory Durable Object (singleton, id "directory").
// Tracks open lobbies so clients can browse and join them.
// Entries are refreshed by lobbies on join/leave and pruned when stale.

const STALE_MS = 3 * 3600 * 1000; // drop directory entries untouched for 3h

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export class LobbyDirectory {
  constructor(ctx, _env) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/register" && request.method === "POST") {
      const { code, info } = await request.json().catch(() => ({}));
      if (!/^[A-Z0-9]{6}$/.test(code || "")) return json({ ok: false }, 400);
      const all = (await this.ctx.storage.get("lobbies")) || {};
      all[code] = { ...info, createdAt: all[code]?.createdAt || Date.now() };
      await this.ctx.storage.put("lobbies", all);
      return json({ ok: true });
    }

    if (url.pathname === "/unregister" && request.method === "POST") {
      const { code } = await request.json().catch(() => ({}));
      const all = (await this.ctx.storage.get("lobbies")) || {};
      delete all[code];
      await this.ctx.storage.put("lobbies", all);
      return json({ ok: true });
    }

    if (url.pathname === "/list") {
      const all = (await this.ctx.storage.get("lobbies")) || {};
      const now = Date.now();
      const out = [];
      let dirty = false;
      for (const [code, info] of Object.entries(all)) {
        if (now - (info.updatedAt || 0) > STALE_MS) {
          delete all[code];
          dirty = true;
          continue;
        }
        out.push({ code, ...info });
      }
      if (dirty) await this.ctx.storage.put("lobbies", all);
      out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return json({ ok: true, lobbies: out });
    }

    return new Response("Not found", { status: 404 });
  }
}
