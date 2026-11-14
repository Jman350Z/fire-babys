/* =====================================================================
   PATCH 021 — auth-gate-integration
   Date: 2026-10-03 | For: Jeff (Fire Babys)
   Directive: Jeff — when people sign in with Google, their account
     (armor, tasks, stats) must come up. The auth gate script was never
     included on the game pages, so FireBabysAuth was undefined and no
     one could sign in.
   What it changes:
     - Injects <script src="https://firebabys.io/auth-gate.js"> into <head>
       so the sign-in gate appears and FireBabysAuth API is available.
     - The gate includes "Sign in with Google" (Google Identity Services).
       Google-verified email -> existing profile loads (armor, tasks, stats).
   Touches: <head> only. No canvas, combat, or baseline changes.
   ===================================================================== */
(function () {
  "use strict";
  try {
    if (document.querySelector('script[src*="auth-gate.js"]')) return;
    var s = document.createElement("script");
    s.src = "https://firebabys.io/auth-gate.js";
    // Synchronous so the gate renders before page content flashes.
    s.async = false;
    var h = document.head || document.getElementsByTagName("head")[0];
    if (h) h.insertBefore(s, h.firstChild);
  } catch (e) {}
})();
