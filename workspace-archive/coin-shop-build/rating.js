/* Fire Babys — in-game star rating widget (Gamer Score collector).
 *
 * Local-first: a player's rating is stored ONLY in their own browser
 * (localStorage "fb_ratings_v1", keyed by game slug) and the widget only
 * ever shows the player's OWN rating — never an invented global average
 * or player count.
 *
 * Optional server hook: if window.FB_RATE_URL is defined before this
 * script loads, each rating is also POSTed there fire-and-forget as
 * { gameId, stars, token }. With no FB_RATE_URL (the default) the
 * widget makes NO network calls at all.
 *
 * Integration: <script src="https://firebabys.io/rating.js"></script>
 */
(function () {
  "use strict";

  if (window.__FB_RATING_WIDGET__) return;
  window.__FB_RATING_WIDGET__ = true;

  var STORE_KEY = "fb_ratings_v1";
  var TOKEN_KEY = "fb_auth_token";
  var WIN_RE = /(you win|victory|game over|level complete|you did it|great job)/i;
  var AUTO_DELAY_MS = 45000;

  /* ---- game slug ---- */
  function gameSlug() {
    var p = "";
    try { p = String(window.location.pathname || ""); } catch (e) { p = ""; }
    if (/(^|\/)play\.html$/.test(p)) return "splash";
    if (/(^|\/)3d\.html$/.test(p)) return "3d";
    return p.replace(/^\//, "");
  }
  var SLUG = gameSlug();

  /* ---- storage (own rating only) ---- */
  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) { return {}; }
  }
  function myRating() {
    var rec = loadStore()[SLUG];
    if (rec && typeof rec.stars === "number" && rec.stars >= 1 && rec.stars <= 5) {
      return Math.floor(rec.stars);
    }
    return 0;
  }
  function saveRating(stars) {
    try {
      var store = loadStore();
      store[SLUG] = { stars: stars, ts: Date.now() };
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) { /* storage unavailable — rating still shows this session */ }
  }
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  /* ---- optional server hook (fire-and-forget, errors swallowed) ---- */
  function sendToServer(stars) {
    try {
      var url = window.FB_RATE_URL;
      if (!url) return; /* default: local only, no network calls */
      var body = JSON.stringify({ gameId: SLUG, stars: stars, token: getToken() });
      if (typeof fetch === "function") {
        var p = fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: body
        });
        if (p && typeof p.catch === "function") p.catch(function () {});
      } else if (typeof XMLHttpRequest !== "undefined") {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("content-type", "application/json");
        xhr.send(body);
      }
    } catch (e) { /* hook must never break the game */ }
  }

  /* ---- UI ---- */
  var CSS = [
    "#fbr-wrap{position:fixed;right:12px;bottom:12px;z-index:5000;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
    "#fbr-pill{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:10px 18px;border-radius:999px;cursor:pointer;",
    "background:rgba(16,8,4,.88);color:#ffd76a;border:1px solid rgba(255,150,60,.55);font-size:15px;font-weight:800;letter-spacing:.3px;",
    "box-shadow:0 6px 20px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,220,160,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}",
    "#fbr-pill:hover{border-color:rgba(255,180,80,.9);color:#ffe9a8}",
    "#fbr-card{display:none;width:300px;max-width:92vw;padding:18px 18px 14px;border-radius:18px;text-align:center;",
    "background:rgba(16,8,4,.92);color:#ffe9d6;border:1px solid rgba(255,150,60,.55);",
    "box-shadow:0 16px 44px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,220,160,.18);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}",
    "#fbr-card.fbr-open{display:block}",
    "#fbr-title{font-size:17px;font-weight:900;color:#ffd76a;margin:0 24px 10px 0;letter-spacing:.3px}",
    "#fbr-stars{display:flex;justify-content:center;gap:4px;margin:6px 0 4px}",
    ".fbr-star{min-width:44px;min-height:44px;width:44px;height:44px;padding:0;background:transparent;border:none;cursor:pointer;",
    "font-size:34px;line-height:1;color:#8a6a4a}",
    ".fbr-star.fbr-on{color:#ffb03a;text-shadow:0 0 10px rgba(255,140,46,.65)}",
    ".fbr-star:hover{color:#ffd76a}",
    "#fbr-thanks{display:none;font-size:14px;font-weight:700;color:#ffe9d6;line-height:1.45;margin-top:8px}",
    "#fbr-close{position:absolute;top:6px;right:8px;min-width:44px;min-height:44px;width:44px;height:44px;background:transparent;",
    "border:none;color:#c98a5a;font-size:24px;line-height:1;cursor:pointer}",
    "#fbr-close:hover{color:#ffe9d6}",
    "#fbr-cardwrap{position:relative}"
  ].join("\n");

  function starString(n) {
    var filled = "", empty = "", i;
    for (i = 0; i < n; i++) filled += "★";
    for (i = n; i < 5; i++) empty += "☆";
    return filled + empty;
  }

  var pill = null, card = null, starsRow = null, thanksEl = null;
  var expanded = false;
  var interacted = false;   /* player opened/closed/rated manually */
  var autoPrompted = false; /* auto-expand may fire at most once per load */
  var sessionStars = 0;     /* fallback if localStorage is unavailable */

  function currentStars() { return myRating() || sessionStars; }

  function renderPill() {
    if (!pill) return;
    var n = currentStars();
    pill.textContent = n > 0 ? ("Your rating " + starString(n)) : "★ Rate this game";
    pill.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function paintStars(hoverN) {
    if (!starsRow) return;
    var n = hoverN || currentStars();
    var btns = starsRow.children, i;
    for (i = 0; i < btns.length; i++) {
      if (i < n) btns[i].className = "fbr-star fbr-on";
      else btns[i].className = "fbr-star";
      btns[i].textContent = i < n ? "★" : "☆";
    }
  }

  function expand(auto) {
    if (expanded) return;
    expanded = true;
    if (!auto) interacted = true;
    if (thanksEl) thanksEl.style.display = "none";
    paintStars(0);
    if (card) card.className = "fbr-open";
    if (pill) pill.style.display = "none";
    renderPill();
  }

  function collapse() {
    expanded = false;
    if (card) card.className = "";
    if (pill) pill.style.display = "";
    renderPill();
  }

  function choose(stars) {
    interacted = true;
    sessionStars = stars;
    saveRating(stars);
    sendToServer(stars);
    paintStars(stars);
    renderPill();
    if (thanksEl) thanksEl.style.display = "block";
    setTimeout(function () { collapse(); }, 1600);
  }

  function build() {
    if (!document.body || document.getElementById("fbr-wrap")) return;

    var style = document.createElement("style");
    style.id = "fbr-css";
    style.textContent = CSS;
    document.head.appendChild(style);

    var wrap = document.createElement("div");
    wrap.id = "fbr-wrap";

    pill = document.createElement("button");
    pill.id = "fbr-pill";
    pill.type = "button";
    pill.setAttribute("aria-label", "Rate this game");
    pill.addEventListener("click", function () { expand(false); });

    card = document.createElement("div");
    card.id = "fbr-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Rate this game");

    var cardWrap = document.createElement("div");
    cardWrap.id = "fbr-cardwrap";

    var closeBtn = document.createElement("button");
    closeBtn.id = "fbr-close";
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close rating");
    closeBtn.addEventListener("click", function () { interacted = true; collapse(); });

    var heading = document.createElement("div");
    heading.id = "fbr-title";
    heading.textContent = "How fun was this game?";

    starsRow = document.createElement("div");
    starsRow.id = "fbr-stars";
    var i, btn;
    for (i = 1; i <= 5; i++) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fbr-star";
      btn.textContent = "☆";
      btn.setAttribute("aria-label", i + (i === 1 ? " star" : " stars"));
      btn.setAttribute("data-stars", String(i));
      (function (n, b) {
        b.addEventListener("click", function () { choose(n); });
        b.addEventListener("mouseover", function () { paintStars(n); });
        b.addEventListener("mouseout", function () { paintStars(0); });
      })(i, btn);
      starsRow.appendChild(btn);
    }

    thanksEl = document.createElement("div");
    thanksEl.id = "fbr-thanks";
    thanksEl.textContent = "Thanks, Fire Chief! Your stars help us make the games better. 🔥";

    cardWrap.appendChild(closeBtn);
    cardWrap.appendChild(heading);
    cardWrap.appendChild(starsRow);
    cardWrap.appendChild(thanksEl);
    card.appendChild(cardWrap);
    wrap.appendChild(card);
    wrap.appendChild(pill);
    document.body.appendChild(wrap);

    renderPill();
    paintStars(0);
    startAutoPrompt();
  }

  /* ---- auto-prompt: once per load, unrated games only ---- */
  function tryAutoPrompt() {
    if (autoPrompted || interacted || expanded) return;
    if (currentStars() > 0) return;
    autoPrompted = true;
    expand(true);
  }

  function nodeTextMatches(node) {
    try {
      if (!node || node.nodeType !== 1) return false;
      if (node.id && String(node.id).indexOf("fbr-") === 0) return false;
      var t = node.textContent || "";
      if (!t || t.length > 600) return false;
      return WIN_RE.test(t);
    } catch (e) { return false; }
  }

  function startAutoPrompt() {
    /* (a) 45-second timer */
    setTimeout(tryAutoPrompt, AUTO_DELAY_MS);

    /* (b) end-of-game text appearing in the DOM */
    if (typeof MutationObserver === "undefined" || !document.body) return;
    var lastScan = 0;
    var observer = new MutationObserver(function (mutations) {
      if (autoPrompted || interacted || expanded || currentStars() > 0) return;
      var now = Date.now();
      if (now - lastScan < 200) return;
      lastScan = now;
      for (var m = 0; m < mutations.length; m++) {
        var mut = mutations[m], j, node;
        if (mut.addedNodes) {
          for (j = 0; j < mut.addedNodes.length; j++) {
            if (nodeTextMatches(mut.addedNodes[j])) { tryAutoPrompt(); return; }
          }
        }
        /* pre-existing overlays revealed via class/style changes */
        if (mut.type === "attributes" && nodeTextMatches(mut.target)) {
          tryAutoPrompt(); return;
        }
        node = mut.target;
        if (node && node.parentNode && nodeTextMatches(node.parentNode)) {
          tryAutoPrompt(); return;
        }
      }
    });
    try {
      observer.observe(document.body, {
        childList: true, subtree: true,
        attributes: true, attributeFilter: ["class", "style", "hidden"]
      });
    } catch (e) { /* observer is best-effort only */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
