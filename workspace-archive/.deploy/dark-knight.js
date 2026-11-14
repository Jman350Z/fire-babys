/* Fire Babys — Dark Knight arrival watcher (Jeff, 2026-10-21).
 *
 * When a top admin signs in, the auth Worker records an arrival
 * (GET /presence -> { ok, arrival: { id, at } | null }). Every page
 * that loads this file polls that endpoint and, the FIRST time it
 * sees a fresh arrival id, flashes the announcement banner:
 *
 *     ⚔️ A Dark Knight is coming...
 *
 * It means an admin just came online — the owner's entrance.
 *
 * Rules baked in:
 *  - Poll on load, then every 30s. Fresh = arrival < 120s old.
 *  - Each arrival id shows EXACTLY ONCE per browser: shown ids are
 *    kept in localStorage (fb_dk_seen, capped) and never re-shown,
 *    even across polls, page loads, or tabs on the same device.
 *  - The banner OVERLAYS the page (position:fixed, top) — it never
 *    pushes the play field or touches the tab-bar HUD. Visible ~6s:
 *    flashing red for ~5s, then a 1s fade, then removed.
 *  - CSP-clean by construction: no inline <style>, no style
 *    attributes, no innerHTML styling, no eval. Every visual is set
 *    through CSSOM (element.style) and the flash runs on a timer,
 *    so the enforced hash CSP (script-src 'self', style hashes) is
 *    never tripped. All errors are swallowed — this decoration can
 *    never break a page boot, the math gate, or a game.
 *  - Offline / local preview: if the presence fetch fails or the
 *    endpoint 404s (backend not deployed yet), the watcher quietly
 *    keeps polling and shows nothing.
 */
(function () {
  "use strict";
  if (window.__fbDarkKnight) return; // include twice = run once
  window.__fbDarkKnight = true;

  var AUTH_URL =
    window.FB_AUTH_URL ||
    "https://fire-babys-auth.jeffpruden288.workers.dev";
  var POLL_MS = 30000;
  var FRESH_MS = 120000;
  var SHOW_MS = 6000;
  var FADE_MS = 1000;
  var SEEN_KEY = "fb_dk_seen";
  var SEEN_CAP = 20;

  function seenIds() {
    try {
      var v = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === "string"; }) : [];
    } catch (e) { return []; }
  }
  function markSeen(id) {
    try {
      var v = seenIds();
      if (v.indexOf(id) < 0) v.push(id);
      while (v.length > SEEN_CAP) v.shift();
      localStorage.setItem(SEEN_KEY, JSON.stringify(v));
    } catch (e) { /* storage off: in-memory guard below still applies */ }
  }
  var shownThisPage = {};

  function showBanner() {
    try {
      if (document.getElementById("fb-dark-knight-banner")) return;
      var b = document.createElement("div");
      b.id = "fb-dark-knight-banner";
      b.setAttribute("role", "alert");
      b.textContent = "⚔️ A Dark Knight is coming...";
      var s = b.style;
      s.position = "fixed";
      s.top = "0";
      s.left = "0";
      s.right = "0";
      s.zIndex = "2147483647";
      s.margin = "0";
      s.padding = "14px 16px";
      s.textAlign = "center";
      s.fontFamily = "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
      s.fontSize = "clamp(18px,4.5vw,30px)";
      s.fontWeight = "900";
      s.letterSpacing = "2px";
      s.color = "#ffffff";
      s.backgroundColor = "#c40000";
      s.textShadow = "0 2px 6px rgba(0,0,0,.65)";
      s.boxShadow = "0 4px 30px rgba(255,0,0,.55)";
      s.pointerEvents = "none";
      s.opacity = "1";
      s.transition = "opacity " + FADE_MS + "ms ease";
      (document.body || document.documentElement).appendChild(b);

      // Flash: alternate the red on a timer (no CSS keyframes —
      // CSP hashes cover <style> blocks; CSSOM + timers need none).
      var on = true;
      var flash = setInterval(function () {
        on = !on;
        try { b.style.backgroundColor = on ? "#c40000" : "#ff2020"; } catch (e) {}
      }, 350);
      setTimeout(function () {
        clearInterval(flash);
        try { b.style.opacity = "0"; } catch (e) {}
        setTimeout(function () {
          try { if (b.parentNode) b.parentNode.removeChild(b); } catch (e) {}
        }, FADE_MS + 60);
      }, SHOW_MS - FADE_MS);
    } catch (e) { /* the banner must never break the page */ }
  }

  function check() {
    try {
      fetch(AUTH_URL + "/presence", { method: "GET" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.ok || !data.arrival) return;
          var a = data.arrival;
          if (typeof a.id !== "string" || !a.id) return;
          if (typeof a.at !== "number" || Date.now() - a.at >= FRESH_MS || Date.now() - a.at < -5000) {
            markSeen(a.id); // stale: retire it so it can never pop late
            return;
          }
          if (shownThisPage[a.id] || seenIds().indexOf(a.id) >= 0) return;
          shownThisPage[a.id] = true;
          markSeen(a.id);
          showBanner();
        })
        .catch(function () { /* offline or not deployed yet: stay quiet */ });
    } catch (e) { /* stay quiet */ }
  }

  function start() {
    check();
    setInterval(check, POLL_MS);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
