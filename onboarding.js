/* ============================================================
   Fire Babys FIRST-RUN ONBOARDING (Jeff, 2026-10-21)
   "after you sign back in you are took straight to the create
   your own character and shown a tutorial of all the new
   features including the chest, the store, the shops, where to
   sign in and out from, join the family..."

   Trigger: a SIGNED-IN player whose profile/local state lacks
   fb_onboarded_v1 sees this flow ONCE on the Fire World hub,
   immediately after sign-in — exactly the state every player is
   in after the Great Kick + fresh sign-in. Finishing OR
   explicitly skipping sets the flag server-side in the profile
   (POST /profile/onboarded) AND locally (localStorage
   fb_onboarded_v1), so it never reappears; the hub's "🎓 Tour"
   nav link replays it any time.

   LANDING LAW (Jeff, 2026-10-21, widened ~23:08): the ROUTE to
   the Creator lives in auth-gate.js — EVERY interactive sign-in
   (email code / register / Google / password) is sent STRAIGHT
   to 3d.html by the gate, onboarded or not: the Creator profile
   is the signed-in HOME. fb_tour_step="cards" is set, so when a
   still-touring player returns to the hub THIS flow resumes at
   the tour cards (Creator FIRST, tour after). A session RESTORE
   arriving at a home page from outside the site on a later visit
   is likewise sent home to the Creator — but only once the
   player has onboarded; players still touring are served by
   THIS overlay on the hub (its step-1 CREATE card is their
   Creator door), and in-site navigation never bounces. This
   overlay's step-1 card serves session-restore players still
   touring, players who signed in on the Creator itself, and
   tour replays.

   STEP 1 is character creation on the REAL surface: the 3D
   Arena (3d.html) — its mode hub has the 👤 PLAYER button
   (create/edit name + flame color, stored as fb3d_title /
   fb3d_color / fb3d_created) and the 🎨 CUSTOMIZE Style Studio
   (body color / eyes / flame hair / accessory / weapon, stored
   as fb_customization). No parallel creator is invented here;
   this flow walks the player to that surface and resumes at the
   tour cards when they come back (localStorage fb_tour_step).

   OFFLINE: the flag check and completion both work device-side.
   If the auth server can't be reached, the local flag alone
   decides and completes the flow — same device-side fallback
   pattern as the rest of the offline build.

   Links: the Discord invite below is the site's own link,
   reused verbatim. NOTE (2026-10-21): the site tree currently
   has NO Facebook group or Instagram URL anywhere — the Family
   card names them WITHOUT links rather than inventing URLs.
   Add the real URLs to the Family card when they exist on the
   site. TikTok is a "soon" card with NO link on purpose (the
   account's existence is unverified).
   ============================================================ */
(function () {
  "use strict";

  var API =
    window.FB_AUTH_URL ||
    "https://fire-babys-auth.jeffpruden288.workers.dev";
  var LOCAL_FLAG = "fb_onboarded_v1";
  var STEP_KEY = "fb_tour_step"; // "cards" = creator detour done, resume at the cards
  var DISCORD_URL = "https://discord.gg/sfdsWKzhWh";

  var overlay = null;
  var stepIndex = 0;
  var started = false;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function token() { return lsGet("fb_auth_token"); }

  function post(path, body) {
    body = body || {};
    body.token = token();
    return fetch(API + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[<>&"']/g, "");
  }

  /* ---------------- the steps ----------------
   * Index 0 is the CREATE YOUR FIRE BABY step (always first).
   * Indices 1..6 are the tour cards in Jeff's order. */
  function steps(user) {
    var who = user && (user.name || user.email) ? esc(user.name || user.email) : "Fire Tamer";
    return [
      {
        tag: "STEP 1 · FIRST THINGS FIRST",
        title: "🎨 CREATE YOUR FIRE BABY",
        body:
          "<p>Welcome, <b>" + who + "</b>! Before anything else — make your Fire Baby <b>yours</b>.</p>" +
          "<p style='margin-top:10px'>In the <b>3D Arena</b>, tap <b>👤 PLAYER</b> in the mode hub to create your Fire Baby — your name and your flame color. Then <b>🎨 CUSTOMIZE</b> sets their body color, eyes, flame hair, accessory and weapon.</p>" +
          "<p style='margin-top:10px'>What you set there is who you play as. And your gear lives in your <b>Chest</b> — so every character you play can use everything you own.</p>",
        primary: { label: "🎨 Create My Fire Baby →", act: "create" },
        next: "Show me the tour first →",
      },
      {
        tag: "THE TOUR · 1 OF 6",
        title: "🗝️ THE CHEST",
        body:
          "<p>This is your <b>locker</b> — right here on the main menu, under the shops.</p>" +
          "<p style='margin-top:10px'><b>Everything</b> you earn or buy lives in your Chest: armor, weapons, emotes, Star Charms and collectibles. It is saved to your <b>account</b> — not just this device — so you never lose it.</p>" +
          "<p style='margin-top:10px'>And it is <b>one Chest per player</b>: any character you play can wear and use everything in it.</p>",
        next: "Next →",
      },
      {
        tag: "THE TOUR · 2 OF 6",
        title: "🛒 THE SHOPS",
        body:
          "<p>Two shops live right here at the main menu:</p>" +
          "<p style='margin-top:10px'>🎮 <b>The Game Shop</b> — boosts, armor and power-ups, bought with the 🪙 <b>coins you earn</b> by playing.</p>" +
          "<p style='margin-top:10px'>👕 <b>The Real-World Shop</b> — real Fire Babys merch, for real money.</p>" +
          "<p style='margin-top:10px'>Remember: <b>playing is ALWAYS free.</b> No game ever costs coins to play — coins are earned, and they are for shopping. That's it.</p>",
        next: "Next →",
      },
      {
        tag: "THE TOUR · 3 OF 6",
        title: "🔑 SIGN IN & SIGN OUT",
        body:
          "<p>You are <b>signed in right now</b> — that is how your Chest, your coins and your progress found you.</p>" +
          "<p style='margin-top:10px'>To sign out, use the <b>Sign out</b> button in the <b>top bar</b> of this page. It is always right there.</p>" +
          "<p style='margin-top:10px'>Signed out? The sign-in screen pops up on its own. Sign in once and <b>every</b> game on Fire Babys is open to you — on any device, with your Chest waiting.</p>",
        next: "Next →",
      },
      {
        tag: "THE TOUR · 4 OF 6",
        title: "🔢 THE MATH DOOR",
        body:
          "<p>Every game opens with a quick <b>Math Check</b> — a little door at the entrance.</p>" +
          "<p style='margin-top:10px'>Solve <b>5 problems</b> in a row and the door stays open: <b>ALL games unlock for 24 hours</b> — no more math until tomorrow.</p>" +
          "<p style='margin-top:10px'>The unlock lives on your device, so it works <b>offline</b> too.</p>",
        next: "Next →",
      },
      {
        tag: "THE TOUR · 5 OF 6",
        title: "🎉 JOIN THE FAMILY",
        body:
          "<p>The Fire Babys family hangs out beyond the games, too. Come say hi!</p>" +
          "<div class='fbt-row' style='margin-top:14px'><a class='fbt-linkbtn' href='" + DISCORD_URL + "' target='_blank' rel='noopener'>💬 Join the Discord →</a></div>" +
          "<div class='fbt-row'><span class='fbt-soon'>📘 Facebook — the Fire Babys group</span></div>" +
          "<div class='fbt-row'><span class='fbt-soon'>📸 Instagram — Fire Babys, every day</span></div>" +
          "<p style='margin-top:10px'>One family, every arena. Fire safety, new games, and the crew — for everyone.</p>",
        next: "Next →",
      },
      {
        tag: "THE TOUR · 6 OF 6",
        title: "👀 TIKTOK — SOON!",
        body:
          "<p style='text-align:center;font-size:19px'><b>Look for us on TikTok soon!</b></p>" +
          "<p style='margin-top:10px'>The family is growing. Discord is live today — TikTok is on its way. When it lands, this is where you will hear it first.</p>" +
          "<p style='margin-top:10px'>That is the whole tour — now go play. <b>Playing is free, forever.</b> 🔥</p>",
        next: "Finish 🎉",
      },
    ];
  }

  /* ---------------- rendering ---------------- */
  function render(user) {
    var list = steps(user);
    if (stepIndex >= list.length) stepIndex = list.length - 1;
    var s = list[stepIndex];
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "fbt-overlay";
      overlay.id = "fbtour";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-label", "Fire Babys first-run tour");
      document.body.appendChild(overlay);
    }
    var dots = "";
    for (var i = 0; i < list.length; i++) {
      dots += "<span class='fbt-dot" + (i === stepIndex ? " on" : "") + "'></span>";
    }
    var primary = "";
    if (s.primary) {
      primary =
        "<div style='margin-top:18px;text-align:center'><button type='button' class='fbt-btn' id='fbt-primary'>" +
        s.primary.label + "</button></div>";
    }
    overlay.innerHTML =
      "<div class='fbt-card'>" +
      "<div class='fbt-step'>" + s.tag + "</div>" +
      "<div class='fbt-title'>" + s.title + "</div>" +
      "<div class='fbt-body'>" + s.body + "</div>" +
      primary +
      "<div class='fbt-nav'>" +
      (stepIndex > 0
        ? "<button type='button' class='fbt-btn ghost' id='fbt-back'>← Back</button>"
        : "<span></span>") +
      "<div class='fbt-dots'>" + dots + "</div>" +
      "<button type='button' class='fbt-btn' id='fbt-next'>" + s.next + "</button>" +
      "</div>" +
      "<button type='button' class='fbt-skip' id='fbt-skip'>Skip the tour</button>" +
      "</div>";
    overlay.style.display = "flex";

    var back = overlay.querySelector("#fbt-back");
    if (back) back.addEventListener("click", function () { stepIndex--; render(user); });
    overlay.querySelector("#fbt-next").addEventListener("click", function () {
      if (stepIndex >= list.length - 1) { complete(); return; }
      stepIndex++;
      render(user);
    });
    overlay.querySelector("#fbt-skip").addEventListener("click", complete);
    var prim = overlay.querySelector("#fbt-primary");
    if (prim) prim.addEventListener("click", function () {
      if (s.primary.act === "create") {
        // Off to the REAL creator in the 3D Arena. Mark the detour so
        // the hub resumes at the tour cards when the player returns.
        lsSet(STEP_KEY, "cards");
        window.location.href = "3d.html";
      }
    });
  }

  function hide() {
    if (overlay) overlay.style.display = "none";
  }

  /* Finishing OR skipping lands here exactly once per completion:
   * local flag first (device-side, works offline), then the server
   * flag in the profile (fire-and-forget — a failed POST never traps
   * the player in the tour; the local flag already completed it). */
  function complete() {
    lsSet(LOCAL_FLAG, "1");
    lsDel(STEP_KEY);
    hide();
    if (token()) {
      post("/profile/onboarded", {}).catch(function () { /* offline: local flag stands */ });
    }
  }

  function startTour(user, atCards) {
    stepIndex = atCards ? 1 : 0;
    render(user);
  }

  /* ---------------- hub sign-out control ----------------
   * The tour's Sign In/Out card points at the top-bar Sign out
   * button (#fb-signout-btn in fire-world.html). It appears only
   * while signed in and uses the gate's own signOut(). */
  function wireChrome(user) {
    var btn = document.getElementById("fb-signout-btn");
    if (btn) {
      btn.style.display = "";
      if (!btn._fbtWired) {
        btn._fbtWired = true;
        btn.addEventListener("click", function () {
          hide();
          btn.style.display = "none";
          if (window.FireBabysAuth && window.FireBabysAuth.signOut) {
            window.FireBabysAuth.signOut();
          }
        });
      }
    }
    var replay = document.getElementById("fb-tour-replay");
    if (replay && !replay._fbtWired) {
      replay._fbtWired = true;
      replay.addEventListener("click", function (ev) {
        ev.preventDefault();
        // Replay works even for onboarded players; completing again
        // simply re-sets the same flag (idempotent server-side).
        startTour(user, false);
      });
    }
  }

  /* ---------------- the trigger ---------------- */
  function onSignedIn(user) {
    wireChrome(user);
    if (started) return;
    started = true;
    if (lsGet(LOCAL_FLAG) === "1") return; // this device already toured
    var resumeCards = lsGet(STEP_KEY) === "cards";
    if (!token()) {
      // No server session to check/flag (e.g. gate trust-cache with an
      // unreachable server): the local flag is the whole state. Show.
      startTour(user, resumeCards);
      return;
    }
    post("/profile/get", {})
      .then(function (r) {
        if (r && r.ok && r.profile && r.profile.onboardedV1) {
          lsSet(LOCAL_FLAG, "1"); // account already toured — sync local, stay quiet
          lsDel(STEP_KEY);
          return;
        }
        startTour(user, resumeCards);
      })
      .catch(function () {
        // Server unreachable (offline build): device-side fallback —
        // local flag unset means show the tour once, here.
        startTour(user, resumeCards);
      });
  }

  function init() {
    var A = window.FireBabysAuth;
    if (A && A.onAuthed) {
      A.onAuthed(onSignedIn);
      return;
    }
    // Gate missing (should not happen on the hub): mirror its
    // trust-cache rule — a stored token + cached user means signed in.
    if (token() && lsGet("fb_auth_user")) {
      var u = null;
      try { u = JSON.parse(lsGet("fb_auth_user")); } catch (e) {}
      if (u && u.email) onSignedIn(u);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
