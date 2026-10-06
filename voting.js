/* Fire Babys Arcade — creator-only voting UI.
 *
 * INTEGRATION (arcade.html):
 *   1. Add data-game-id="your-game-slug" to each <article class="card"> that
 *      holds a live creator game. (The OFFICIAL SPLASH card gets NO
 *      data-game-id — the flagship isn't in the creator vote.)
 *   2. Add before </body>:
 *        <script src="https://accounts.google.com/gsi/client" async defer></script>
 *        <script>window.FB_VOTE_URL="https://fire-babys-vote.jeffpruden288.workers.dev";</script>
 *        <script src="/voting.js"></script>
 *      (voting.js must live next to arcade.html, or use an absolute URL.)
 *   3. Optional overrides before voting.js:
 *        window.FB_AUTH_URL  (default https://fire-babys-auth.jeffpruden288.workers.dev)
 *
 * Behavior:
 *   - Not signed in: card shows "Sign in to vote" (Google button in banner).
 *   - Signed in, not a live creator: "Submit a game to earn your vote".
 *   - Signed in creator: "Vote" button on every OTHER creator's game.
 *   - After voting: "You voted for X 🔥", all buttons disabled.
 *   - Public banner shows "N creators have voted" — tallies stay hidden.
 */
(function () {
  "use strict";

  var VOTE_URL = window.FB_VOTE_URL || "https://fire-babys-vote.jeffpruden288.workers.dev";
  var AUTH_URL = window.FB_AUTH_URL || "https://fire-babys-auth.jeffpruden288.workers.dev";
  var TOKEN_KEY = "fb_auth_token";
  var USER_KEY = "fb_auth_user";
  var BRAND_LINE = "the future is BLAZING FOR FIRE BABYS 🔥";

  function $(id) { return document.getElementById(id); }

  function post(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: "network" }; });
  }
  function get(url) {
    return fetch(url).then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: "network" }; });
  }
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function setSession(token, email) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
      if (email) localStorage.setItem(USER_KEY, JSON.stringify({ email: email }));
      else localStorage.removeItem(USER_KEY);
    } catch (e) {}
  }

  var CSS = [
    ".vote-zone{margin-top:10px}",
    ".vote-btn{display:inline-block;background:#fff;color:#e63900;font-weight:800;font-size:14px;",
    "padding:8px 20px;border-radius:999px;border:2px solid #2b1a0e;cursor:pointer}",
    ".vote-btn:hover{background:#ffe9d6}",
    ".vote-btn[disabled]{opacity:.55;cursor:default}",
    ".vote-btn.voted{background:#eefbe8;color:#1e6b26;border-color:#3fae4a}",
    ".vote-note{font-size:13px;color:#7a5f43;font-weight:600}",
    ".vote-banner{background:#fff;border:3px solid #2b1a0e;border-radius:18px;padding:16px 18px;",
    "margin:0 0 18px;text-align:center}",
    ".vote-banner h3{font-size:19px;margin-bottom:6px}",
    ".vote-banner p{font-size:14px;color:#5b4632;margin-bottom:10px}",
    "#fbVoteGoogleBtn{display:flex;justify-content:center;min-height:44px}",
    ".vote-count{font-weight:800;color:#e63900}",
  ].join("\n");

  function injectCss() {
    var s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function bannerHtml() {
    return '<div class="vote-banner" id="voteBanner">' +
      '<h3>🗳️ Creator Vote — $10,000 on the line</h3>' +
      '<p id="voteBannerText">Live creators pick which game ships in the phone app. ' +
      'One vote per creator. Results stay secret until the big reveal.</p>' +
      '<div id="fbVoteGoogleBtn"></div>' +
      '<p style="margin-top:10px"><span class="vote-count" id="voteCount">…</span> creators have voted so far.</p>' +
      "</div>";
  }

  function renderBanner(state) {
    var banner = $("voteBanner");
    if (!banner) return;
    $("voteCount").textContent = state.votedCount;
    var host = $("fbVoteGoogleBtn");
    host.innerHTML = "";
    if (!state.open) {
      $("voteBannerText").textContent = "Voting is closed right now — check back soon. " + BRAND_LINE;
      return;
    }
    if (!state.signedIn) {
      renderGoogleButton(host);
    } else if (!state.eligible) {
      $("voteBannerText").textContent =
        "You're signed in as " + state.email + " — submit a game and get it approved to earn your vote. " + BRAND_LINE;
    } else if (state.voted) {
      $("voteBannerText").textContent =
        "You voted for " + state.votedGameTitle + " 🔥 Thanks for voting — " + BRAND_LINE;
    } else {
      $("voteBannerText").textContent =
        "You're eligible! Pick your favorite below — you can't vote for your own game. " + BRAND_LINE;
    }
  }

  function renderGoogleButton(host) {
    // Get the Google client id from the auth worker, then render GIS button.
    post(AUTH_URL + "/auth/config", {}).then(function (cfg) {
      if (!cfg || !cfg.ok || !cfg.googleClientId) {
        host.innerHTML = '<span class="vote-note">Sign-in is unavailable right now.</span>';
        return;
      }
      function render() {
        if (!(window.google && google.accounts && google.accounts.id)) {
          setTimeout(render, 300);
          return;
        }
        google.accounts.id.initialize({
          client_id: cfg.googleClientId,
          callback: function (resp) {
            if (!resp || !resp.credential) return;
            host.innerHTML = '<span class="vote-note">Signing you in…</span>';
            post(AUTH_URL + "/auth/google", { idToken: resp.credential }).then(function (r) {
              if (r && r.ok && r.token) {
                setSession(r.token, r.email);
                boot(); // re-render everything as signed-in
              } else {
                host.innerHTML = '<span class="vote-note">Sign-in failed — please try again.</span>';
                renderGoogleButton(host);
              }
            });
          },
        });
        google.accounts.id.renderButton(host, { theme: "outline", size: "large", text: "signin_with" });
      }
      render();
    });
  }

  function zoneHtmlFor(card, gameId, state) {
    // Returns the vote-zone HTML for one card.
    if (!state.open) return '<div class="vote-zone"><span class="vote-note">Voting is closed.</span></div>';
    if (!state.signedIn)
      return '<div class="vote-zone"><span class="vote-note">🔒 <a href="#voteBanner">Sign in</a> to vote.</span></div>';
    if (!state.eligible)
      return '<div class="vote-zone"><span class="vote-note">Submit a game to earn your vote.</span></div>';
    if (state.voted) {
      if (state.votedGameId === gameId)
        return '<div class="vote-zone"><button class="vote-btn voted" disabled>✅ You voted for this game</button></div>';
      return '<div class="vote-zone"><button class="vote-btn" disabled>Voted</button></div>';
    }
    if (state.ownGameId === gameId)
      return '<div class="vote-zone"><span class="vote-note">This is your game — no self-votes! 🔥</span></div>';
    // gameId is owner-authored + server slug-validated; escape anyway (defense in depth).
    var safeId = String(gameId).replace(/[^a-z0-9-]/gi, "").slice(0, 64);
    return '<div class="vote-zone"><button class="vote-btn" data-vote="' + safeId + '">🗳️ Vote</button></div>';
  }

  function renderCards(state) {
    var cards = document.querySelectorAll("article.card[data-game-id]");
    cards.forEach(function (card) {
      var gameId = card.getAttribute("data-game-id");
      var old = card.querySelector(".vote-zone");
      if (old) old.remove();
      var meta = card.querySelector(".meta");
      var tmp = document.createElement("div");
      tmp.innerHTML = zoneHtmlFor(card, gameId, state);
      var zone = tmp.firstChild;
      if (meta) meta.parentNode.insertBefore(zone, meta.nextSibling);
      else card.querySelector(".body").appendChild(zone);
    });
    // Wire vote buttons.
    document.querySelectorAll("[data-vote]").forEach(function (btn) {
      if (btn.disabled) return;
      btn.addEventListener("click", function () {
        castVote(btn.getAttribute("data-vote"), btn);
      });
    });
  }

  function castVote(gameId, btn) {
    btn.disabled = true;
    btn.textContent = "Voting…";
    post(VOTE_URL + "/vote", { token: getToken(), gameId: gameId }).then(function (r) {
      if (r && r.ok) {
        boot(); // re-render: shows "You voted for X"
        var banner = $("voteBanner");
        if (banner) banner.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        btn.disabled = false;
        btn.textContent = "🗳️ Vote";
        var msg = "Couldn't record your vote — please try again.";
        if (r && r.error === "already_voted") msg = "You already voted — one vote per creator! 🔥";
        else if (r && r.error === "no_self_vote") msg = "No voting for your own game! 🔥";
        else if (r && r.error === "voting_closed") msg = "Voting is closed right now.";
        else if (r && r.error === "not_a_creator") msg = "Only live creators can vote.";
        alert(msg);
        boot();
      }
    });
  }

  function boot() {
    injectCssOnce();
    var games = $("games");
    if (games && !$("voteBanner")) {
      var tmp = document.createElement("div");
      tmp.innerHTML = bannerHtml();
      games.parentNode.insertBefore(tmp.firstChild, games);
    }
    // Public count first (fast), then personal state.
    get(VOTE_URL + "/votestatus").then(function (pub) {
      var state = {
        open: !!(pub && pub.ok && pub.open),
        votedCount: (pub && pub.ok && typeof pub.votedCount === "number") ? pub.votedCount : 0,
        signedIn: false,
      };
      renderBanner(state);
      renderCards(state);
      var token = getToken();
      if (!token) return;
      post(VOTE_URL + "/votestatus", { token: token }).then(function (s) {
        if (s && s.ok) {
          state.signedIn = !!s.signedIn;
          state.email = s.email;
          state.eligible = !!s.eligible;
          state.voted = !!s.voted;
          state.votedGameId = s.votedGameId;
          state.votedGameTitle = s.votedGameTitle;
          state.ownGameId = s.ownGameId;
          renderBanner(state);
          renderCards(state);
        }
      });
    });
  }

  var cssDone = false;
  function injectCssOnce() {
    if (!cssDone) { injectCss(); cssDone = true; }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
