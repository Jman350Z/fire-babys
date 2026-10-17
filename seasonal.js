/* ============================================================================
 * Fire Babys — Seasonal Themes (seasonal.js)
 * ----------------------------------------------------------------------------
 * ONE shared skin file for the whole site, loaded automatically by
 * auth-gate.js (which every page already includes). It lays a seasonal
 * "wallpaper" skin OVER the site — decorations, a banner, colour accents —
 * without touching gameplay, music, controls, or any game file.
 *
 * HOW IT WORKS
 *   1. The config below lists each theme with the dates it runs.
 *   2. On every page load this file checks today's date, picks the active
 *      theme, and applies it. Outside every window it does NOTHING —
 *      the site looks exactly as it always does.
 *   3. When a season ends the skin hides itself. When the next season
 *      starts, its skin appears. Nobody has to touch the site.
 *
 * HOW TO ADD NEXT SEASON'S THEME (e.g. November / winter)
 *   Copy the "halloween" object inside THEMES, give it a new name, new
 *   dates, new words/glyphs/CSS. That is the whole job — the plumbing
 *   (date check, banner, decorations, ambience) never changes.
 *
 * HOW TO FORCE OR PREVIEW A THEME
 *   - Edit SEASON_OVERRIDE below: "auto" (follow the calendar),
 *     "off" (never show a theme), or a theme id like "halloween"
 *     (show it all year — handy for checking art in September).
 *   - Or per-visit, no file edit: add ?season=halloween or ?season=off
 *     to any page URL. ?seasonDate=YYYY-MM-DD pretends today is that
 *     date (testing: ?seasonDate=2026-11-01 shows the site theme-free).
 *
 * SAFETY RULES BAKED IN
 *   - Decorations are pointer-events:none and sit below menus/overlays,
 *     so they can never block a tap or cover a game control.
 *   - Game pages get only a tiny floating glyph badge — no banner, no
 *     layout change, no falling-glyph animation (zero gameplay cost).
 *   - No external images or requests: glyphs are emoji text and CSS,
 *     so the strict 3d.html CSP (img-src data:/blob: only) is honoured.
 *   - Friendly-spooky only. The Fire Babys are never shown harmed.
 * ========================================================================== */
(function () {
  "use strict";

  /* ================= CONFIG — edit here, nowhere else ================= */

  var SEASON_OVERRIDE = "auto"; // "auto" | "off" | theme id, e.g. "halloween"

  var THEMES = {

    halloween: {
      label: "Halloween",
      start: [10, 1], // [month, day] — first day the theme shows
      end: [10, 31],  // [month, day] — last day the theme shows

      banner: "🎃 Happy Halloween from the Fire Babys! 👻",
      bannerSub: "Friendly frights, safe nights — keep costumes & candy buckets away from candles and jack-o'-lantern flames! 🕯️🍬",

      // Small floating glyph row used on game pages (bottom centre).
      badge: "🎃 👻 🦇 🍬",

      // Gently falling glyphs on hub/content pages (never on game pages).
      ambience: ["🦇", "🍂", "👻", "🍁", "🎃"],

      // Corner/edge decorations on hub/content pages. `css` positions each
      // glyph; `bob: true` gives it a slow float. Kept at the edges so they
      // never sit on top of text or buttons.
      decor: [
        { glyph: "🎃", css: "left:10px;bottom:6px;font-size:46px;opacity:.9" },
        { glyph: "🍬", css: "right:12px;bottom:10px;font-size:27px;opacity:.85" },
        { glyph: "👻", css: "right:16px;top:96px;font-size:34px;opacity:.65", bob: true },
        { glyph: "🦇", css: "left:18px;top:132px;font-size:22px;opacity:.5", bob: true }
      ],

      // Hub "wallpaper": big, very faint glyphs BEHIND the content, placed
      // at stepped heights (never one flat row) like a printed pattern.
      wallpaper: [
        { glyph: "🎃", css: "left:4%;top:10%;font-size:96px" },
        { glyph: "👻", css: "left:23%;top:36%;font-size:64px" },
        { glyph: "🦇", css: "left:44%;top:6%;font-size:72px" },
        { glyph: "🕸️", css: "left:66%;top:28%;font-size:60px" },
        { glyph: "🎃", css: "left:85%;top:12%;font-size:88px" },
        { glyph: "🍬", css: "left:12%;top:62%;font-size:68px" },
        { glyph: "👻", css: "left:54%;top:56%;font-size:98px" },
        { glyph: "🦇", css: "left:79%;top:64%;font-size:62px" }
      ],

      css: [
        "/* ---- banner (hub + content pages) ---- */",
        "#fb-seasonal-banner{background:linear-gradient(90deg,#2a1052,#4b1d8f 45%,#2a1052);color:#ffe9d6;text-align:center;padding:12px 16px 11px;border-bottom:3px solid #ff8c1a;box-shadow:0 4px 24px rgba(124,58,237,.35);position:relative;z-index:60}",
        "#fb-seasonal-banner .fb-sb-main{font-size:clamp(18px,3.6vw,26px);font-weight:900;letter-spacing:.5px;color:#ffb347;text-shadow:0 2px 14px rgba(255,140,26,.45);line-height:1.25}",
        "#fb-seasonal-banner .fb-sb-sub{font-size:clamp(12px,2.6vw,14.5px);font-weight:600;color:#e9defc;margin-top:3px;line-height:1.4}",
        "/* ---- decoration layers (never clickable, below menus) ---- */",
        "#fb-seasonal-wall{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}",
        "#fb-seasonal-wall .fb-sb-wall-glyph{position:absolute;line-height:1;opacity:.09}",
        "#fb-seasonal-decor{position:fixed;inset:0;pointer-events:none;z-index:90}",
        "html.fb-mode-game #fb-seasonal-decor{z-index:2}",
        "#fb-seasonal-decor .fb-sb-glyph{position:absolute;line-height:1;filter:drop-shadow(0 4px 10px rgba(0,0,0,.45))}",
        "#fb-seasonal-ambience{position:fixed;inset:0;pointer-events:none;z-index:89;overflow:hidden}",
        "#fb-seasonal-ambience .fb-sb-fall{position:absolute;top:-8vh;line-height:1;opacity:.5;animation-name:fb-sb-fall;animation-timing-function:linear;animation-iteration-count:infinite}",
        "@keyframes fb-sb-fall{from{transform:translate3d(0,-8vh,0) rotate(-8deg)}to{transform:translate3d(3vw,112vh,0) rotate(38deg)}}",
        "@keyframes fb-sb-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}",
        ".fb-sb-bob{animation:fb-sb-bob 3.6s ease-in-out infinite}",
        "/* ---- game-page badge ---- */",
        ".fb-sb-badge{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);font-size:17px;letter-spacing:2px;opacity:.55;line-height:1;white-space:nowrap}",
        "/* ---- accents: every page ---- */",
        "html.fb-theme-halloween ::selection{background:rgba(255,140,26,.5);color:#fff}",
        "html.fb-mode-page body{background-color:#1c0a2a}",
        "/* ---- hub showcase: deep-purple night + pumpkin glow ---- */",
        "html.fb-mode-hub body{background:radial-gradient(1100px 560px at 50% -120px,rgba(124,58,237,.34),transparent 62%),radial-gradient(700px 380px at 85% 110%,rgba(255,140,26,.16),transparent 60%),#170a26}",
        "html.fb-mode-hub nav.top{background:rgba(23,10,38,.96);border-bottom-color:rgba(155,89,182,.55)}",
        "html.fb-mode-hub .hero{background:radial-gradient(ellipse at 50% 0%,rgba(255,140,26,.20),transparent 65%);border-bottom-color:rgba(155,89,182,.55)}",
        "html.fb-mode-hub .hero h1{color:#ffb347;text-shadow:0 0 26px rgba(124,58,237,.65),0 4px 30px rgba(255,106,26,.35)}",
        "html.fb-mode-hub .card{border-color:rgba(155,89,182,.5)}",
        "html.fb-mode-hub .card:hover{border-color:#ff8c1a;box-shadow:0 16px 36px rgba(0,0,0,.45),0 0 26px rgba(124,58,237,.35)}",
        "html.fb-mode-hub footer{border-top-color:rgba(155,89,182,.5)}",
        "html.fb-mode-hub .hero,html.fb-mode-hub .whatsnew,html.fb-mode-hub .wrap,html.fb-mode-hub footer{position:relative;z-index:1}",
        "/* ---- reduced motion: no falling/floating glyphs ---- */",
        "@media (prefers-reduced-motion: reduce){#fb-seasonal-ambience{display:none}.fb-sb-bob{animation:none}}"
      ].join("\n")
    }

    /* NEXT THEME GOES HERE — copy the object above, change the name,
       dates, words, glyphs and colours. Nothing else changes. */

  };

  /* ================= end of config — plumbing below ================= */

  function query() {
    try { return new URLSearchParams(window.location.search || ""); }
    catch (e) { return null; }
  }

  function testDate() {
    var q = query();
    var v = q && q.get("seasonDate");
    if (!v) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  function md(month, day) { return month * 100 + day; }

  function inWindow(now, theme) {
    var cur = md(now.getMonth() + 1, now.getDate());
    var s = md(theme.start[0], theme.start[1]);
    var e = md(theme.end[0], theme.end[1]);
    if (s <= e) return cur >= s && cur <= e;
    return cur >= s || cur <= e; // window wraps over New Year
  }

  function pickTheme() {
    var forced = null;
    var q = query();
    if (q && q.get("season")) forced = q.get("season");
    if (!forced && typeof window.FB_SEASON === "string") forced = window.FB_SEASON;
    if (!forced && SEASON_OVERRIDE !== "auto") forced = SEASON_OVERRIDE;
    if (forced) {
      if (forced === "off") return null;
      return THEMES[forced] ? withId(forced) : null;
    }
    var now = testDate() || new Date();
    for (var id in THEMES) {
      if (Object.prototype.hasOwnProperty.call(THEMES, id) && inWindow(now, THEMES[id])) {
        return withId(id);
      }
    }
    return null;
  }

  function withId(id) {
    var t = THEMES[id];
    var out = { id: id };
    for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) out[k] = t[k];
    return out;
  }

  function detectMode() {
    var p = window.location.pathname || "";
    if (/(^|\/)fire-world\.html$/.test(p)) return "hub";
    if (/\/(games|rukos-panic-dash|slingshot-cascade|trinitys-holy-lightning-rescue|tristans-dark-knight-rescue)\//.test(p)) return "game";
    if (/(^|\/)(play|3d)\.html$/.test(p)) return "game";
    if (/(^|\/)game-02-blaze-runner\.html$/.test(p)) return "game";
    return "page";
  }

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  function addBanner(theme) {
    if (document.getElementById("fb-seasonal-banner")) return;
    var b = document.createElement("div");
    b.id = "fb-seasonal-banner";
    var main = document.createElement("div");
    main.className = "fb-sb-main";
    main.textContent = theme.banner;
    var sub = document.createElement("div");
    sub.className = "fb-sb-sub";
    sub.textContent = theme.bannerSub;
    b.appendChild(main);
    b.appendChild(sub);
    document.body.insertBefore(b, document.body.firstChild);
  }

  function glyphSpan(item, cls) {
    var s = document.createElement("span");
    s.className = cls + (item.bob ? " fb-sb-bob" : "");
    s.textContent = item.glyph;
    s.style.cssText = item.css || "";
    return s;
  }

  function addDecor(theme, mode) {
    if (mode === "hub" && theme.wallpaper && theme.wallpaper.length) {
      var wall = document.createElement("div");
      wall.id = "fb-seasonal-wall";
      wall.setAttribute("aria-hidden", "true");
      theme.wallpaper.forEach(function (item) {
        wall.appendChild(glyphSpan(item, "fb-sb-wall-glyph"));
      });
      document.body.appendChild(wall);
    }
    var d = document.createElement("div");
    d.id = "fb-seasonal-decor";
    d.setAttribute("aria-hidden", "true");
    if (mode === "game") {
      var badge = document.createElement("div");
      badge.className = "fb-sb-badge";
      badge.textContent = theme.badge;
      d.appendChild(badge);
    } else if (theme.decor) {
      theme.decor.forEach(function (item) {
        d.appendChild(glyphSpan(item, "fb-sb-glyph"));
      });
    }
    document.body.appendChild(d);
  }

  function addAmbience(theme) {
    if (!theme.ambience || !theme.ambience.length) return;
    var box = document.createElement("div");
    box.id = "fb-seasonal-ambience";
    box.setAttribute("aria-hidden", "true");
    var COUNT = 10;
    for (var i = 0; i < COUNT; i++) {
      var s = document.createElement("span");
      s.className = "fb-sb-fall";
      s.textContent = theme.ambience[i % theme.ambience.length];
      var size = 16 + Math.floor(Math.random() * 11); // 16–26px
      var dur = 9 + Math.random() * 7;                // 9–16s per fall
      var delay = -Math.random() * 16;                // start mid-flight
      s.style.cssText =
        "left:" + (2 + Math.random() * 94).toFixed(1) + "%;" +
        "font-size:" + size + "px;" +
        "animation-duration:" + dur.toFixed(1) + "s;" +
        "animation-delay:" + delay.toFixed(1) + "s";
      box.appendChild(s);
    }
    document.body.appendChild(box);
  }

  function apply(theme) {
    var mode = detectMode();
    var root = document.documentElement;
    root.classList.add("fb-seasonal", "fb-theme-" + theme.id, "fb-mode-" + mode);

    var style = document.createElement("style");
    style.id = "fb-seasonal-css";
    style.textContent = theme.css;
    (document.head || root).appendChild(style);

    var build = function () {
      if (!document.body) return;
      if (mode !== "game") addBanner(theme);
      addDecor(theme, mode);
      if (mode !== "game" && !reducedMotion()) addAmbience(theme);
    };
    if (document.body) build();
    else document.addEventListener("DOMContentLoaded", build);

    window.FireBabysSeasonal = { theme: theme.id, mode: mode, label: theme.label };
  }

  try {
    var theme = pickTheme();
    if (theme) apply(theme);
  } catch (e) {
    /* A skin must never break a page: on any error, the site just
       runs un-themed, exactly as it did before this file existed. */
  }
})();
