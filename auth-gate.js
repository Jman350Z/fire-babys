/* Fire Babys sign-in gate — drop-in auth for every firebabys.io page.
 *
 * Usage (put in <head>, synchronously — NOT async/defer — so the gate
 * renders before page content flashes):
 *
 *   <script src="https://firebabys.io/auth-gate.js"></script>
 *
 * Optional config BEFORE the script, or as data- attributes on the script tag:
 *   window.FB_AUTH_URL = "https://fire-babys-auth.<account>.workers.dev";
 *   <script src="..." data-auth-url="https://..." data-badge="1"></script>
 *
 * API:
 *   window.FireBabysAuth.getUser()      -> {email, name} | null
 *   window.FireBabysAuth.getToken()     -> string | null
 *   window.FireBabysAuth.signOut()      -> clears token, re-shows gate
 *   window.FireBabysAuth.onAuthed(cb)   -> cb(user) now or when signed in
 *   Event: document 'fb-authed' with detail {email, name}
 *
 * Security: the auth worker URL can only be set by page code
 * (window.FB_AUTH_URL) or a data-auth-url attribute on the script tag.
 * URL query parameters can never change it, and there is no mock mode —
 * every sign-in goes through the real server.
 */
(function () {
  "use strict";

  var TOKEN_KEY = "fb_auth_token";
  var USER_KEY = "fb_auth_user";

  // ---- config ----
  var scripts = document.getElementsByTagName("script");
  var thisScript = scripts[scripts.length - 1];
  var qs = new URLSearchParams(window.location.search || "");
  var AUTH_URL =
    window.FB_AUTH_URL ||
    (thisScript && thisScript.getAttribute("data-auth-url")) ||
    "https://fire-babys-auth.jeffpruden288.workers.dev";
  var GOOGLE_CLIENT_ID =
    window.FB_GOOGLE_CLIENT_ID ||
    (thisScript && thisScript.getAttribute("data-google-client-id")) ||
    "";
  // Auto-fetch from server if not configured inline.
  function fetchGoogleId(cb) {
    if (GOOGLE_CLIENT_ID) { cb(GOOGLE_CLIENT_ID); return; }
    post("/auth/config", {}).then(function (res) {
      if (res && res.ok && res.googleClientId) {
        GOOGLE_CLIENT_ID = res.googleClientId;
        cb(GOOGLE_CLIENT_ID);
      } else { cb(""); }
    }, function () { cb(""); });
  }
  var SHOW_BADGE =
    (thisScript && thisScript.getAttribute("data-badge") === "1") ||
    qs.get("badge") === "1";

  function post(path, body) {
    return fetch(AUTH_URL + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () {
        return { ok: false, error: "bad_response" };
      });
    });
  }

  // ---- state ----
  var authedUser = null;
  var authedCbs = [];
  var gateEl = null;

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }
  function setUser(u) {
    authedUser = u;
    try {
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_KEY);
    } catch (e) {}
  }

  // ---- page cloak: hide content until auth resolves (prevents flash) ----
  var htmlEl = document.documentElement;
  var prevVisibility = htmlEl.style.visibility;
  htmlEl.style.visibility = "hidden";
  function uncloak() {
    htmlEl.style.visibility = prevVisibility;
  }

  // ---- gate UI ----
  var CSS = [
    ".fbgate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;",
    "background:radial-gradient(ellipse at 50% 0%,rgba(255,106,26,.28),transparent 60%),rgba(12,5,2,.97);",
    "visibility:visible;padding:20px;box-sizing:border-box;overflow-y:auto;-webkit-overflow-scrolling:touch;}",
    ".fbgate-card{width:100%;max-width:420px;background:rgba(26,13,6,.92);border:2px solid rgba(255,140,46,.55);",
    "border-radius:22px;padding:34px 30px;text-align:center;box-shadow:0 0 80px rgba(255,90,20,.3);}",
    ".fbgate-logo{font-size:44px;font-weight:900;letter-spacing:3px;line-height:1.05;margin:0 0 6px;",
    "background:linear-gradient(180deg,#fff7c0 5%,#ffd76a 30%,#ff8c2e 62%,#e8352c 100%);",
    "-webkit-background-clip:text;background-clip:text;color:transparent;}",
    ".fbgate-h{color:#ffd9ae;font-size:20px;font-weight:800;margin:10px 0 4px;letter-spacing:1px;}",
    ".fbgate-sub{color:#d8b89a;font-size:14px;margin:0 0 22px;line-height:1.5;}",
    ".fbgate label{display:block;text-align:left;color:#ffd9ae;font-size:13px;font-weight:700;margin:12px 0 6px;}",
    ".fbgate input{width:100%;box-sizing:border-box;padding:14px 16px;font-size:16px;border-radius:14px;",
    "border:2px solid rgba(255,140,46,.4);background:rgba(0,0,0,.45);color:#ffe9d6;outline:none;}",
    ".fbgate input:focus{border-color:#ff8c2e;box-shadow:0 0 0 3px rgba(255,140,46,.25);}",
    ".fbgate-btn{display:block;width:100%;margin-top:20px;padding:16px;border:none;border-radius:18px;cursor:pointer;",
    "font-size:18px;font-weight:900;letter-spacing:2px;color:#2a1206;",
    "background:linear-gradient(180deg,#ffd76a,#ff8c2e);box-shadow:0 6px 0 #a33c10,0 10px 24px rgba(255,106,26,.35);}",
    ".fbgate-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #a33c10;}",
    ".fbgate-btn[disabled]{opacity:.6;cursor:wait;}",
    ".fbgate-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:12px;",
    "padding:14px;border:2px solid rgba(255,255,255,.35);border-radius:18px;cursor:pointer;",
    "font-size:16px;font-weight:800;color:#1a1a1a;background:#ffffff;}",
    ".fbgate-google:hover{background:#f0f0f0;}",
    ".fbgate-google[disabled]{opacity:.6;cursor:wait;}",
    ".fbgate-div{display:flex;align-items:center;gap:12px;margin:18px 0 4px;color:#a8815e;font-size:12px;font-weight:700;}",
    ".fbgate-div::before,.fbgate-div::after{content:'';flex:1;height:1px;background:rgba(255,140,46,.3);}",
    ".fbgate-err{display:none;margin-top:14px;padding:10px 14px;border-radius:12px;font-size:14px;font-weight:700;",
    "color:#ffd2c2;background:rgba(232,53,44,.18);border:1px solid rgba(232,53,44,.5);}",
    ".fbgate-fine{margin-top:18px;font-size:12px;color:#a8815e;line-height:1.6;}",
    ".fbbadge{position:fixed;left:10px;bottom:10px;z-index:2147483646;display:flex;align-items:center;gap:8px;",
    "background:rgba(26,13,6,.9);border:1px solid rgba(255,140,46,.5);border-radius:999px;padding:6px 12px;",
    "color:#ffd9ae;font-size:12px;font-weight:700;cursor:pointer;visibility:visible;}",
    ".fbbadge small{color:#a8815e;font-weight:400;}",
  ].join("");

  function showError(msg) {
    var e = gateEl && gateEl.querySelector(".fbgate-err");
    if (e) {
      e.textContent = msg;
      e.style.display = "block";
    }
  }

  function buildGate() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var el = document.createElement("div");
    el.className = "fbgate";
    el.innerHTML =
      '<div class="fbgate-card">' +
      '<div class="fbgate-logo">FIRE<br>BABYS</div>' +
      '<div class="fbgate-h">SIGN IN TO PLAY</div>' +
      '<p class="fbgate-sub">One sign-in unlocks every game, every mode, everywhere on Fire Babys.</p>' +
      '<form id="fbgate-form" autocomplete="on">' +
      '<label for="fbgate-email">Email</label>' +
      '<input id="fbgate-email" type="email" name="email" required placeholder="you@example.com" autocapitalize="off" />' +
      '<label for="fbgate-name">Fire Tamer name <span style="color:#a8815e;font-weight:400">(optional)</span></label>' +
      '<input id="fbgate-name" type="text" name="name" maxlength="40" placeholder="BlazeFan42" autocomplete="nickname" />' +
      '<button class="fbgate-btn" type="submit">SIGN IN</button>' +
      '<div class="fbgate-err" role="alert"></div>' +
      "</form>" +
      '<div id="fbgate-google-wrap" style="display:none;">' +
      '<div class="fbgate-div">OR</div>' +
      '<button class="fbgate-google" id="fbgate-google" type="button">' +
      '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>' +
      "Sign in with Google</button></div>" +
      '<p class="fbgate-fine">We use your email to keep your account safe.<br>No spam, ever. Kids: ask a grown-up first.</p>' +
      "</div>";

    el.querySelector("#fbgate-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = el.querySelector("#fbgate-email").value;
      var name = el.querySelector("#fbgate-name").value;
      var btn = el.querySelector(".fbgate-btn");
      btn.disabled = true;
      btn.textContent = "SIGNING IN...";
      var errBox = el.querySelector(".fbgate-err");
      errBox.style.display = "none";
      post("/auth/register", { email: email, name: name }).then(
        function (res) {
          if (res && res.ok && res.token) {
            setToken(res.token);
            finishAuth({
              email: String(email).trim().toLowerCase(),
              name: String(name || "").trim(),
            });
          } else {
            btn.disabled = false;
            btn.textContent = "SIGN IN";
            showError(
              res && res.error === "invalid_email"
                ? "Hmm, that email doesn't look right. Try again?"
                : res && res.error === "rate_limited"
                ? "Too many tries — give it an hour and come back."
                : "Couldn't reach the sign-in server. Check your connection and retry."
            );
          }
        },
        function () {
          btn.disabled = false;
          btn.textContent = "SIGN IN";
          showError("Couldn't reach the sign-in server. Check your connection and retry.");
        }
      );
    });

    document.body.appendChild(el);
    gateEl = el;

    // ---- Google Sign-In (fetch client ID, show button if configured) ----
    fetchGoogleId(function (gid) {
      if (!gid) return;
      var wrap = el.querySelector("#fbgate-google-wrap");
      if (wrap) wrap.style.display = "block";
      var gbtn = el.querySelector("#fbgate-google");
      if (gbtn) {
        gbtn.addEventListener("click", function () {
        gbtn.disabled = true;
        var errBox = el.querySelector(".fbgate-err");
        errBox.style.display = "none";
        function doGoogle() {
          try {
            google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: function (resp) {
                if (!resp || !resp.credential) {
                  gbtn.disabled = false;
                  showError("Google sign-in was cancelled. Try again?");
                  return;
                }
                post("/auth/google", { idToken: resp.credential }).then(
                  function (res) {
                    if (res && res.ok && res.token) {
                      setToken(res.token);
                      finishAuth({ email: res.email, name: "" });
                      // Fetch the name via session.
                      post("/auth/session", { token: res.token }).then(function (s) {
                        if (s && s.ok && s.name) {
                          setUser({ email: res.email, name: s.name });
                        }
                      });
                    } else {
                      gbtn.disabled = false;
                      showError(
                        res && res.error === "google_not_configured"
                          ? "Google sign-in isn't set up yet. Use email for now."
                          : "Google sign-in failed. Try email instead."
                      );
                    }
                  },
                  function () {
                    gbtn.disabled = false;
                    showError("Couldn't reach the sign-in server. Check your connection.");
                  }
                );
              },
            });
            google.accounts.id.prompt();
          } catch (e) {
            gbtn.disabled = false;
            showError("Couldn't load Google sign-in. Try email instead.");
          }
        }
        if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
          doGoogle();
        } else {
          var s = document.createElement("script");
          s.src = "https://accounts.google.com/gsi/client";
          s.async = true;
          s.defer = true;
          s.onload = doGoogle;
          s.onerror = function () {
            gbtn.disabled = false;
            showError("Couldn't load Google sign-in. Try email instead.");
          };
          document.head.appendChild(s);
        }
      });
      }
    });
    return el;
  }

  function removeGate() {
    if (gateEl && gateEl.parentNode) gateEl.parentNode.removeChild(gateEl);
    gateEl = null;
  }

  function showBadge(user) {
    if (!SHOW_BADGE) return;
    var b = document.createElement("div");
    b.className = "fbbadge";
    b.title = "Signed in — tap to sign out";
    var label = document.createElement("span");
    label.textContent = "🔥 " + (user.name || user.email);
    var out = document.createElement("small");
    out.textContent = "sign out";
    b.appendChild(label);
    b.appendChild(out);
    b.addEventListener("click", function () {
      window.FireBabysAuth.signOut();
    });
    document.body.appendChild(b);
  }

  function finishAuth(user) {
    setUser(user);
    removeGate();
    uncloak();
    showBadge(user);
    authedCbs.splice(0).forEach(function (cb) {
      try {
        cb(user);
      } catch (e) {}
    });
    try {
      document.dispatchEvent(
        new CustomEvent("fb-authed", { detail: user })
      );
    } catch (e) {}
  }

  // ---- boot ----
  function boot() {
    var token = getToken();
    if (!token) {
      buildGate();
      uncloak(); // gate itself is visible; page behind stays cloaked by overlay
      return;
    }
    post("/auth/session", { token: token }).then(
      function (res) {
        if (res && res.ok && res.email) {
          finishAuth({ email: res.email, name: res.name || "" });
        } else {
          setToken(null);
          setUser(null);
          buildGate();
          uncloak();
        }
      },
      function () {
        // Network failed: trust the cached user rather than locking players out.
        var cached = null;
        try {
          cached = JSON.parse(localStorage.getItem(USER_KEY) || "null");
        } catch (e) {}
        if (cached && cached.email) {
          finishAuth(cached);
        } else {
          buildGate();
          uncloak();
        }
      }
    );
  }

  window.FireBabysAuth = {
    getUser: function () {
      return authedUser;
    },
    getToken: getToken,
    isAuthed: function () {
      return !!authedUser;
    },
    onAuthed: function (cb) {
      if (authedUser) cb(authedUser);
      else authedCbs.push(cb);
    },
    signOut: function () {
      setToken(null);
      setUser(null);
      var b = document.querySelector(".fbbadge");
      if (b && b.parentNode) b.parentNode.removeChild(b);
      authedCbs = [];
      buildGate();
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
