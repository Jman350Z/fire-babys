/* ============================================================================
 * Fire Babys — Landscape Play System (landscape.js)
 * ----------------------------------------------------------------------------
 * Jeff's order (2026-10-17): players turn their phone SIDEWAYS to play.
 * Landscape = a wider playfield, more room, more fun. Game pages therefore
 * show a friendly full-screen "turn your phone" overlay while a phone or
 * tablet is held in portrait, and the game appears the moment the player
 * rotates to landscape. Non-game pages (hub, blog, parents, characters)
 * are never blocked.
 *
 * Loaded site-wide by auth-gate.js (every page already includes the gate).
 * ALL logic lives here; the gate only loads this file. If this file is
 * missing or fails, the site runs exactly as before.
 *
 * Rules baked in:
 *   - Game pages only (explicit path list below).
 *   - Portrait only, and only on touch/phone-sized screens — desktop
 *     players are never blocked, whatever their window shape.
 *   - No external images or requests: emoji + CSS only, so the strict
 *     3d.html CSP is honoured.
 *   - The overlay hides itself the instant the device is landscape.
 *   - ?landscape=off in the URL disables it for one visit (testing).
 * ========================================================================== */
(function () {
  "use strict";

  try {
    if (/[?&]landscape=off\b/.test(location.search)) return;

    var path = location.pathname || "";

    function isGamePage(p) {
      if (/\/fire-world\/games\//.test(p)) return true;              // 52 hub games
      if (/\/fire-world\/game-02-blaze-runner\.html$/.test(p)) return true;
      if (/\/fire-world\/(slingshot-cascade|rukos-panic-dash|trinitys-holy-lightning-rescue|tristans-dark-knight-rescue)\//.test(p)) return true;
      if (/\/(play|play-all)\.html$/.test(p)) return true;           // formation battler
      if (/\/3d\.html$/.test(p)) return true;                        // 3D world
      return false;
    }
    if (!isGamePage(path)) return;

    function isPhoneLike() {
      try {
        if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
      } catch (e) {}
      return ("ontouchstart" in window) && Math.min(screen.width, screen.height) <= 920;
    }
    if (!isPhoneLike()) return;

    var overlay = null;

    function isPortrait() {
      return window.innerHeight > window.innerWidth;
    }

    function build() {
      if (overlay) return;
      var st = document.createElement("style");
      st.textContent =
        "#fb-rotate{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(120% 120% at 50% 20%,#3b1157 0%,#1c0533 55%,#0d0219 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:inherit;color:#fff}" +
        "#fb-rotate .fb-rot-phone{font-size:84px;line-height:1;animation:fbRotTilt 1.6s ease-in-out infinite}" +
        "#fb-rotate h1{font-size:clamp(26px,7vw,40px);margin:18px 0 8px;font-weight:900;letter-spacing:.5px;color:#ffd23f;text-shadow:0 2px 0 #b3541e,0 4px 14px rgba(0,0,0,.6)}" +
        "#fb-rotate p{font-size:clamp(15px,4.4vw,19px);margin:0;max-width:420px;color:#ffe9c9}" +
        "@keyframes fbRotTilt{0%,100%{transform:rotate(0deg)}50%{transform:rotate(90deg)}}";
      (document.head || document.documentElement).appendChild(st);

      overlay = document.createElement("div");
      overlay.id = "fb-rotate";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-label", "Please rotate your device to landscape to play");
      overlay.innerHTML =
        '<div class="fb-rot-phone">📱</div>' +
        "<h1>TURN YOUR PHONE SIDEWAYS!</h1>" +
        "<p>Fire Babys games play in landscape — a bigger playfield, more room, more fun. Rotate your phone to start playing!</p>";
      // The overlay intentionally takes all taps while portrait: rotating is
      // how you play. It removes itself the moment the device is landscape.
      document.body.appendChild(overlay);
    }

    function update() {
      if (isPortrait()) {
        if (document.body) build();
        if (overlay) overlay.style.display = "flex";
      } else if (overlay) {
        overlay.style.display = "none";
      }
    }

    window.FB_LANDSCAPE = { update: update, isPortrait: isPortrait };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", update);
    } else {
      update();
    }
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", function () { setTimeout(update, 60); });
  } catch (e) { /* landscape helper must never break a game */ }
})();
