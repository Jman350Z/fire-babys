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
 *
 * Bot check (2026-10-21): the register and email-code requests carry a
 * Cloudflare Turnstile token (body field turnstileToken) when a site
 * key is configured below. The server enforces it only when its
 * TURNSTILE_SECRET is set, and if the Turnstile script fails to load,
 * forms submit with no token and the server decides — sign-in can
 * never be bricked by the bot check.
 */

/* ---- Seasonal themes loader (added 2026-10-17) ----
 * Every page already loads this gate, so the gate also loads the
 * site-wide seasonal skin (/seasonal.js) — Halloween in October,
 * nothing at all outside a theme window. ALL theme logic lives in
 * seasonal.js; this block only loads it. If seasonal.js is missing
 * or fails, the site runs exactly as before — decoration can never
 * break sign-in. */
(function () {
  try {
    var s = document.currentScript;
    var base = s && s.src ? s.src.replace(/auth-gate\.js(\?.*)?$/, "") : "https://firebabys.io/";
    var t = document.createElement("script");
    t.src = base + "seasonal.js";
    t.async = true;
    (document.head || document.documentElement).appendChild(t);
  } catch (e) { /* seasonal skin is optional decoration — never break the gate */ }
})();

/* ---- Landscape play loader (added 2026-10-17) ----
 * Jeff's order: games are played with the phone turned SIDEWAYS.
 * The gate also loads /landscape.js, which shows a "turn your phone"
 * overlay on game pages while a phone is in portrait. ALL logic lives
 * in landscape.js; this block only loads it. If landscape.js is
 * missing or fails, the site runs exactly as before. */
(function () {
  try {
    var s = document.currentScript;
    var base = s && s.src ? s.src.replace(/auth-gate\.js(\?.*)?$/, "") : "https://firebabys.io/";
    var t = document.createElement("script");
    t.src = base + "landscape.js";
    t.async = true;
    (document.head || document.documentElement).appendChild(t);
  } catch (e) { /* landscape helper is optional — never break the gate */ }
})();

/* ---- Language system loader (added 2026-10-17) ----
 * Jeff's order: let the world choose the game's language. The gate
 * also loads /i18n.js — a 🌐 picker on every page plus a translation
 * engine that covers DOM text AND canvas-drawn text, so every game
 * re-renders in the chosen language like a string-table build. ALL
 * logic lives in i18n.js; this block only loads it. If i18n.js is
 * missing or fails, the site runs exactly as before, in English. */
(function () {
  try {
    var s = document.currentScript;
    var base = s && s.src ? s.src.replace(/auth-gate\.js(\?.*)?$/, "") : "https://firebabys.io/";
    var t = document.createElement("script");
    t.src = base + "i18n.js";
    t.async = true;
    (document.head || document.documentElement).appendChild(t);
  } catch (e) { /* i18n is optional — never break the gate */ }
})();

(function () {
  "use strict";

  var TOKEN_KEY = "fb_auth_token";
  var USER_KEY = "fb_auth_user";

  // ---- config ----
  // Find OUR script element (the loaders above append more script
  // elements to the head synchronously, so scripts[last] is no longer
  // guaranteed to be auth-gate.js — match by filename).
  var thisScript = null;
  (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var el = scripts[i];
      if (el.src && /auth-gate\.js(\?.*)?$/.test(el.src)) { thisScript = el; break; }
    }
    if (!thisScript) thisScript = scripts[scripts.length - 1];
  })();
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

  // ---- Cloudflare Turnstile site key (PUBLIC — safe in client code) ----
  // >>> DEPLOY: paste the site key of the "firebabys.io auth" Turnstile
  // >>> widget here (see DEPLOY.md, "Turnstile" section). Until then it
  // >>> stays empty: nothing loads, no token is sent, and the server
  // >>> side is a no-op too unless TURNSTILE_SECRET is configured.
  var TURNSTILE_SITE_KEY =
    window.FB_TURNSTILE_SITE_KEY ||
    (thisScript && thisScript.getAttribute("data-turnstile-site-key")) ||
    ""; // <<< DEPLOY: widget site key goes here

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

  // ---- Turnstile machinery ----
  // The widget host lives in the gate card, OUTSIDE the form bodies
  // that showCodeStep() rewrites, so it survives the code step. The
  // widget runs in execute + interaction-only mode: invisible unless
  // Cloudflare wants interaction. Tokens are single-use — tsGetToken()
  // hands out the stored token (or waits for the in-flight challenge)
  // and immediately arms a fresh one for the next submit.
  var tsScriptLoaded = false;
  var tsScriptFailed = false;
  var tsWidgetId = null;
  var tsTokenValue = "";
  var tsWaiters = [];
  function tsArm() {
    if (tsWidgetId === null || typeof turnstile === "undefined") return;
    try {
      turnstile.execute(tsWidgetId);
    } catch (e) {}
  }
  function tsOnToken(token) {
    if (tsWaiters.length) {
      var cb = tsWaiters.shift();
      try {
        cb(token);
      } catch (e) {}
      tsArm(); // line up the next token
    } else {
      tsTokenValue = token;
    }
  }
  function tsRender() {
    if (!TURNSTILE_SITE_KEY || !tsScriptLoaded || tsWidgetId !== null) return;
    var host = gateEl && gateEl.querySelector("#fbgate-turnstile");
    if (!host || typeof turnstile === "undefined") return;
    try {
      tsWidgetId = turnstile.render(host, {
        sitekey: TURNSTILE_SITE_KEY,
        execution: "execute",
        appearance: "interaction-only",
        callback: tsOnToken,
        "error-callback": function () {
          tsOnToken("");
        },
        "expired-callback": function () {
          tsTokenValue = "";
          tsArm();
        },
      });
      tsArm();
    } catch (e) {
      tsScriptFailed = true;
    }
  }
  function tsLoad() {
    if (!TURNSTILE_SITE_KEY || tsScriptLoaded || tsScriptFailed) return;
    if (document.querySelector("script[data-fb-turnstile]")) return;
    var s = document.createElement("script");
    s.setAttribute("data-fb-turnstile", "1");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = function () {
      tsScriptLoaded = true;
      tsRender();
    };
    s.onerror = function () {
      tsScriptFailed = true;
    };
    document.head.appendChild(s);
  }
  // cb(token) — token is "" whenever Turnstile is unconfigured, failed
  // to load, or too slow; the server then decides (its outage rule).
  function tsGetToken(cb) {
    if (!TURNSTILE_SITE_KEY || tsScriptFailed || tsWidgetId === null) {
      cb("");
      return;
    }
    if (tsTokenValue) {
      var t = tsTokenValue;
      tsTokenValue = "";
      cb(t);
      tsArm(); // pre-arm a fresh token for the next submit
      return;
    }
    tsWaiters.push(cb);
    tsArm();
    // Never hang a sign-in on the bot check.
    setTimeout(function () {
      var i = tsWaiters.indexOf(cb);
      if (i >= 0) {
        tsWaiters.splice(i, 1);
        try {
          cb("");
        } catch (e) {}
      }
    }, 12000);
  }

  // ---- state ----
  var authedUser = null;
  var authedCbs = [];
  var gateEl = null;
  // Jeff's landing law (2026-10-21, widened ~23:08): after ANY
  // interactive sign-in (email code, legacy register, Google,
  // password) the player lands on the Creator (3d.html) — the
  // Creator profile is the signed-in HOME, onboarded or not; the
  // tour cards resume on the hub for players still touring. Only
  // fresh sign-ins set this flag; session restores route through
  // routeRestoredHome() instead (see finishAuth).
  var freshSignIn = false;

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }
  function setToken(t) {
    try {
      if (t) {
        localStorage.setItem(TOKEN_KEY, t);
        // F1: remember when this token was stored — a token younger
        // than 5 minutes gets a propagation grace in boot() before a
        // 401 is believed (KV eventual consistency after sign-in).
        localStorage.setItem("fb_auth_token_at", String(Date.now()));
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("fb_auth_token_at");
      }
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
      '<p class="fbgate-fine" style="margin-top:14px">Have a password on your account?<br>' +
      '<a href="#" id="fbgate-pw-open" style="color:#ffb066;font-weight:800">Sign in with a password</a></p>' +
      "</form>" +
      '<div id="fbgate-turnstile" style="display:flex;justify-content:center;margin-top:14px;"></div>' +
      '<div id="fbgate-google-wrap" style="display:none;">' +
      '<div class="fbgate-div">OR</div>' +
      '<div id="fbgate-google-btn" style="display:flex;justify-content:center;margin-top:12px;min-height:44px;"></div></div>' +
      '<p class="fbgate-fine">We use your email to keep your account safe.<br>No spam, ever.</p>' +
      "</div>";

    // Show the 6-digit code entry step (email verification / account recovery).
    function showCodeStep(email, name, purpose, btn, errBox) {
      var form = el.querySelector("#fbgate-form");
      form.innerHTML =
        '<div class="fbgate-h">CHECK YOUR EMAIL</div>' +
        '<p class="fbgate-sub">We sent a 6-digit code to<br><b style="color:#ffd9ae">' +
        String(email).replace(/[<>"'&]/g, "") +
        '</b><br>It expires in 10 minutes.</p>' +
        '<label for="fbgate-code">Code</label>' +
        '<input id="fbgate-code" type="text" inputmode="numeric" maxlength="6" placeholder="123456" autocomplete="one-time-code" />' +
        '<button class="fbgate-btn" type="submit">VERIFY</button>' +
        '<div class="fbgate-err" role="alert"></div>' +
        '<p class="fbgate-fine"><a href="#" id="fbgate-resend" style="color:#ffb066">Resend code</a></p>';
      var codeInput = form.querySelector("#fbgate-code");
      var vbtn = form.querySelector(".fbgate-btn");
      var verr = form.querySelector(".fbgate-err");
      codeInput.focus();
      form.querySelector("#fbgate-resend").addEventListener("click", function (ev) {
        ev.preventDefault();
        verr.style.display = "none";
        vbtn.disabled = true; vbtn.textContent = "SENDING...";
        tsGetToken(function (tt) {
          post("/auth/code", { email: email, purpose: purpose, turnstileToken: tt }).then(function (r) {
            vbtn.disabled = false; vbtn.textContent = "VERIFY";
            if (!(r && r.ok)) {
              verr.textContent =
                r && r.error === "bot_check_failed"
                  ? "Quick bot check failed — tap Resend code to try again."
                  : "Couldn't resend the code. Try again in a bit.";
              verr.style.display = "block";
            }
          }, function () {
            vbtn.disabled = false; vbtn.textContent = "VERIFY";
          });
        });
      });
      form.addEventListener("submit", function (ev2) {
        ev2.preventDefault();
        var code = codeInput.value.trim();
        if (!/^\d{6}$/.test(code)) {
          verr.textContent = "Enter the 6-digit code from your email.";
          verr.style.display = "block";
          return;
        }
        vbtn.disabled = true; vbtn.textContent = "VERIFYING...";
        verr.style.display = "none";
        post("/auth/verify", { email: email, code: code, name: name }).then(function (res) {
          if (res && res.ok && res.token) {
            setToken(res.token);
            finishFreshAuth({ email: String(email).trim().toLowerCase(), name: String(name || "").trim() });
          } else {
            vbtn.disabled = false; vbtn.textContent = "VERIFY";
            verr.textContent =
              res && res.error === "bad_code"
                ? "Wrong code — " + (res.attemptsLeft || 0) + " tries left."
                : res && res.error === "code_expired"
                ? "That code expired. Tap Resend code for a fresh one."
                : res && res.error === "too_many_attempts"
                ? "Too many wrong tries. Tap Resend code for a fresh one."
                : "Couldn't verify. Check your connection and retry.";
            verr.style.display = "block";
          }
        }, function () {
          vbtn.disabled = false; vbtn.textContent = "VERIFY";
          verr.textContent = "Couldn't reach the sign-in server. Check your connection.";
          verr.style.display = "block";
        });
      });
    }

    // Legacy direct register (used only when the server has no email service).
    function legacyRegister(email, name, btn, errBox, turnstileToken) {
      post("/auth/register", { email: email, name: name, turnstileToken: turnstileToken || "" }).then(
        function (res) {
          if (res && res.ok && res.token) {
            setToken(res.token);
            finishFreshAuth({
              email: String(email).trim().toLowerCase(),
              name: String(name || "").trim(),
            });
          } else {
            btn.disabled = false;
            btn.textContent = "SIGN IN";
            if (res && res.error === "already_registered") {
              // Offer email-code recovery instead of a dead end.
              errBox.innerHTML = "This email already has a Fire Babys account.<br>" +
                '<a href="#" id="fbgate-recover" style="color:#ffb066;font-weight:800">Email me a sign-in code</a>' +
                " to play on this device — or use Sign in with Google with the same email (that works right now).";
              errBox.style.display = "block";
              var rl = errBox.querySelector("#fbgate-recover");
              if (rl) rl.addEventListener("click", function (ev) {
                ev.preventDefault();
                errBox.style.display = "none";
                btn.disabled = true; btn.textContent = "SENDING CODE...";
                tsGetToken(function (tt) {
                  post("/auth/code", { email: email, purpose: "recover", turnstileToken: tt }).then(function (r) {
                    if (r && r.ok) {
                      showCodeStep(email, name, "recover", btn, errBox);
                    } else {
                      btn.disabled = false; btn.textContent = "SIGN IN";
                      showError(r && r.error === "email_not_configured"
                        ? "Email codes aren't set up yet — use Sign in with Google with the same email to get back in."
                        : r && r.error === "bot_check_failed"
                        ? "Quick bot check failed — tap the link to try again."
                        : "Couldn't send the code. Try again in a bit.");
                    }
                  }, function () {
                    btn.disabled = false; btn.textContent = "SIGN IN";
                    showError("Couldn't reach the sign-in server. Check your connection.");
                  });
                });
              });
            } else {
              showError(
                res && res.error === "invalid_email"
                  ? "Hmm, that email doesn't look right. Try again?"
                  : res && res.error === "rate_limited"
                  ? "Too many tries — give it an hour and come back."
                  : res && res.error === "bot_check_failed"
                  ? "Quick bot check failed — tap SIGN IN to try again."
                  : "Couldn't reach the sign-in server. Check your connection and retry."
              );
            }
          }
        },
        function () {
          btn.disabled = false;
          btn.textContent = "SIGN IN";
          showError("Couldn't reach the sign-in server. Check your connection and retry.");
        }
      );
    }

    // Password sign-in step (2026-10-21): accounts that carry a
    // password (POST /auth/password) get a form too — the endpoint
    // shipped before any page rendered one. Completions funnel into
    // finishFreshAuth exactly like the code/register/Google paths,
    // so a fresh password sign-in inherits the Creator-first
    // landing law automatically. EVERY failure shows the same
    // generic message: the endpoint answers 401 invalid_credentials
    // for unknown email, no-password account and wrong password
    // alike, and this form never hints which one it was.
    function showPasswordStep(prefillEmail) {
      var form = el.querySelector("#fbgate-form");
      var firstStepHtml = form.innerHTML;
      form.innerHTML =
        '<div class="fbgate-h">SIGN IN WITH A PASSWORD</div>' +
        '<p class="fbgate-sub">Use the email and password on your Fire Babys account.</p>' +
        '<label for="fbgate-pw-email">Email</label>' +
        '<input id="fbgate-pw-email" type="email" name="email" autocomplete="username" autocapitalize="off" />' +
        '<label for="fbgate-pw-pass">Password</label>' +
        '<input id="fbgate-pw-pass" type="password" name="password" autocomplete="current-password" />' +
        '<button class="fbgate-btn" type="submit">SIGN IN</button>' +
        '<div class="fbgate-err" role="alert"></div>' +
        '<p class="fbgate-fine"><a href="#" id="fbgate-pw-back" style="color:#ffb066">← All sign-in options</a></p>';
      var emInput = form.querySelector("#fbgate-pw-email");
      var pwInput = form.querySelector("#fbgate-pw-pass");
      if (prefillEmail) emInput.value = prefillEmail;
      (prefillEmail ? pwInput : emInput).focus();
      form.querySelector("#fbgate-pw-back").addEventListener("click", function (ev) {
        ev.preventDefault();
        form.innerHTML = firstStepHtml;
        wirePasswordOpen();
      });
    }

    function wirePasswordOpen() {
      var link = el.querySelector("#fbgate-pw-open");
      if (!link || link._fbpwWired) return;
      link._fbpwWired = true;
      link.addEventListener("click", function (ev) {
        ev.preventDefault();
        // Clear any stale first-step error so a later "back" restore
        // doesn't resurrect it.
        var eb = el.querySelector(".fbgate-err");
        if (eb) eb.style.display = "none";
        var em = el.querySelector("#fbgate-email");
        showPasswordStep(em ? em.value : "");
      });
    }

    el.querySelector("#fbgate-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      // The email-code step replaces this form's contents and adds
      // its OWN submit listener; once the email field is gone, this
      // first-step listener must quietly stand down (it used to throw
      // reading .value of the removed inputs on every code sign-in).
      var emailInput = el.querySelector("#fbgate-email");
      if (!emailInput) return;
      var email = emailInput.value;
      var name = el.querySelector("#fbgate-name").value;
      var btn = el.querySelector(".fbgate-btn");
      btn.disabled = true;
      btn.textContent = "SIGNING IN...";
      var errBox = el.querySelector(".fbgate-err");
      errBox.style.display = "none";
      // Turnstile tokens are single-use: each protected call below gets
      // its own fresh token via tsGetToken.
      function legacyFresh() {
        tsGetToken(function (tt) {
          legacyRegister(email, name, btn, errBox, tt);
        });
      }
      // Ask the server whether email verification is available.
      post("/auth/config", {}).then(function (cfg) {
        if (cfg && cfg.ok && cfg.emailVerification) {
          // Verified flow: send a code, then verify it.
          tsGetToken(function (tt) {
            post("/auth/code", { email: email, purpose: "verify", turnstileToken: tt }).then(function (r) {
              if (r && r.ok && r.sent) {
                showCodeStep(email, name, "verify", btn, errBox);
              } else if (r && r.error === "bot_check_failed") {
                btn.disabled = false;
                btn.textContent = "SIGN IN";
                showError("Quick bot check failed — tap SIGN IN to try again.");
              } else if (r && r.error === "already_registered") {
                legacyFresh();
              } else {
                // Server couldn't send (or rate limited) — fall back honestly.
                legacyFresh();
              }
            }, function () { legacyFresh(); });
          });
        } else {
          legacyFresh();
        }
      }, function () { legacyFresh(); });
    });

    // Password-step submit. ONE listener for the gate's lifetime:
    // it stands down unless the password step is what the form
    // currently shows (the first-step and code-step listeners own
    // the other states), and it reads the CURRENT inputs at submit
    // time — the step swaps the form's innerHTML in and out, so
    // closure references to its fields would go stale. Offline
    // (file:// build / no network) the fetch simply rejects into
    // the same "couldn't reach the server" message every other
    // network path shows — the step fails quietly, nothing breaks.
    el.querySelector("#fbgate-form").addEventListener("submit", function (ev) {
      var pwInput = el.querySelector("#fbgate-pw-pass");
      if (!pwInput) return; // password step not showing — not ours
      ev.preventDefault();
      var form = el.querySelector("#fbgate-form");
      var emInput = form.querySelector("#fbgate-pw-email");
      var email = emInput ? emInput.value.trim() : "";
      var password = pwInput.value;
      var pbtn = form.querySelector(".fbgate-btn");
      var perr = form.querySelector(".fbgate-err");
      if (!email || !password) {
        perr.textContent = "Enter your email and your password.";
        perr.style.display = "block";
        return;
      }
      pbtn.disabled = true;
      pbtn.textContent = "SIGNING IN...";
      perr.style.display = "none";
      post("/auth/password", { email: email, password: password }).then(
        function (res) {
          if (res && res.ok && res.token) {
            setToken(res.token);
            finishFreshAuth({
              email: String(res.email || email).trim().toLowerCase(),
              name: "",
            });
            // Fetch the display name via session, like the Google path.
            post("/auth/session", { token: res.token }).then(function (s) {
              if (s && s.ok && s.name) {
                setUser({ email: res.email || email, name: s.name });
              }
            });
          } else {
            pbtn.disabled = false;
            pbtn.textContent = "SIGN IN";
            perr.textContent =
              res && res.error === "rate_limited"
                ? "Too many tries — give it an hour and come back."
                : "That email and password don't match. Check them and try again — or go back and use another way in.";
            perr.style.display = "block";
          }
        },
        function () {
          pbtn.disabled = false;
          pbtn.textContent = "SIGN IN";
          perr.textContent = "Couldn't reach the sign-in server. Check your connection.";
          perr.style.display = "block";
        }
      );
    });

    wirePasswordOpen();

    document.body.appendChild(el);
    gateEl = el;

    // Turnstile: load the API (once) and render into the card host.
    tsLoad();
    tsRender();

    // ---- Google Sign-In (fetch client ID, show button if configured) ----
    fetchGoogleId(function (gid) {
      if (!gid) return;
      var wrap = el.querySelector("#fbgate-google-wrap");
      if (wrap) wrap.style.display = "block";
      var btnHost = el.querySelector("#fbgate-google-btn");
      function onGoogleCredential(resp) {
        if (!resp || !resp.credential) {
          showError("Google sign-in was cancelled. Try again?");
          return;
        }
        post("/auth/google", { idToken: resp.credential }).then(
          function (res) {
            if (res && res.ok && res.token) {
              setToken(res.token);
              finishFreshAuth({ email: res.email, name: "" });
              // Fetch the name via session.
              post("/auth/session", { token: res.token }).then(function (s) {
                if (s && s.ok && s.name) {
                  setUser({ email: res.email, name: s.name });
                }
              });
            } else {
              showError(
                res && res.error === "google_not_configured"
                  ? "Google sign-in isn't set up yet. Use email for now."
                  : "Google sign-in failed. Try email instead."
              );
            }
          },
          function () {
            showError("Couldn't reach the sign-in server. Check your connection.");
          }
        );
      }
      function renderGoogleButton() {
        try {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: onGoogleCredential,
          });
          // Official Google-rendered button: its own click opens the
          // account chooser directly. (One-Tap prompt() is unreliable —
          // it can be silently suppressed with no callback — so the
          // button is the dependable path.)
          google.accounts.id.renderButton(btnHost, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            width: 320,
          });
        } catch (e) {
          showError("Couldn't load Google sign-in. Try email instead.");
        }
      }
      if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
        renderGoogleButton();
      } else {
        var s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = renderGoogleButton;
        s.onerror = function () {
          showError("Couldn't load Google sign-in. Try email instead.");
        };
        document.head.appendChild(s);
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

  function finishFreshAuth(user) {
    freshSignIn = true;
    finishAuth(user);
  }

  function settleAuth(user) {
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

  // ---- post-sign-in landing (Jeff's law, 2026-10-21) ----
  // The Creator profile (3d.html) is the signed-in HOME:
  //  * EVERY fresh (interactive) sign-in lands there, onboarded or
  //    not. The fb_tour_step="cards" marker tells the hub tour to
  //    resume at the cards when a still-touring player comes back —
  //    Creator FIRST, tour after.
  //  * A session RESTORE that arrives at a home page from outside
  //    the site (typed URL / bookmark / external link) on a later
  //    visit also lands there — but ONLY for onboarded players: a
  //    player still touring is owned by the hub tour (its CREATE
  //    step is their Creator door), and restores inside the same
  //    sitting as the sign-in (reloads, the tour's detour return)
  //    never move. An unreachable server always stays (trust-cache
  //    rules unchanged).
  //  * In-site navigation NEVER bounces: arriving at the hub from
  //    anywhere on the site (Creator -> hub above all) stays put,
  //    and the home-route fires at most once per browser session.
  function creatorUrl() {
    var base = thisScript && thisScript.src
      ? thisScript.src.replace(/auth-gate\.js(\?.*)?$/, "")
      : "";
    return base + "3d.html";
  }
  function onCreatorPage() {
    return /(^|\/)3d\.html$/.test(window.location.pathname || "");
  }
  function onHomePage() {
    var p = window.location.pathname || "";
    return p === "/" || /(^|\/)(index|fire-world)\.html$/.test(p);
  }
  function cameFromSite() {
    var ref = document.referrer || "";
    if (!ref) return false;
    try {
      return new URL(ref).origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }
  var HOME_ROUTED_KEY = "fb_home_routed";
  function goCreator(markTour) {
    if (markTour) {
      try { localStorage.setItem("fb_tour_step", "cards"); } catch (e) {}
    }
    try { sessionStorage.setItem(HOME_ROUTED_KEY, "1"); } catch (e) {}
    window.location.replace(creatorUrl());
  }
  function settleHere(user) {
    removeGate();
    uncloak();
    settleAuth(user);
  }
  function routeAfterSignIn(user) {
    if (onCreatorPage()) {
      // Already standing in the Creator: the "land on the Creator"
      // half of the law is satisfied. Mark the tour to resume at the
      // cards on the hub, and let the player create.
      try { localStorage.setItem("fb_tour_step", "cards"); } catch (e) {}
      settleHere(user);
      return;
    }
    goCreator(true);
  }
  function routeRestoredHome(user) {
    if (!onHomePage() || onCreatorPage()) { settleHere(user); return; }
    // In-site navigation (Creator -> hub above all) never bounces.
    if (cameFromSite()) { settleHere(user); return; }
    var routed = null;
    try { routed = sessionStorage.getItem(HOME_ROUTED_KEY); } catch (e) {}
    if (routed === "1") { settleHere(user); return; }
    // Same sitting as the sign-in itself (a fresh token stamp):
    // reloads and first-run flows stay on the hub untouched. Only a
    // genuinely later visit counts as "arriving at home".
    if (tokenAgeMs() < 6 * 60 * 60 * 1000) { settleHere(user); return; }
    post("/profile/get", { token: getToken() }).then(
      function (r) {
        if (r && r.ok && r.profile && r.profile.onboardedV1) {
          goCreator(false);
        } else {
          settleHere(user);
        }
      },
      function () { settleHere(user); }
    );
  }

  function finishAuth(user) {
    setUser(user);
    if (freshSignIn) {
      freshSignIn = false;
      routeAfterSignIn(user);
      return;
    }
    routeRestoredHome(user);
  }

  // ---- boot ----
  // F1 (sign-in audit 2026-10-21, defect D1): only a DEFINITIVE 401
  // invalid_token may clear the stored token. Every other session-check
  // failure (500, non-JSON "bad_response", 429, KV hiccup) trusts the
  // cached user and KEEPS the token — exactly like the network-down
  // path. Deleting the token on any glitch was the "it signed me out
  // for no reason" bug.
  function trustCachedOrGate() {
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
  function tokenAgeMs() {
    try {
      var at = parseInt(localStorage.getItem("fb_auth_token_at") || "0", 10);
      return at ? Date.now() - at : Infinity;
    } catch (e) {
      return Infinity;
    }
  }
  function checkSession(token, isRetry) {
    post("/auth/session", { token: token }).then(
      function (res) {
        if (res && res.ok && res.email) {
          finishAuth({ email: res.email, name: res.name || "" });
        } else if (res && res.error === "invalid_token") {
          // Propagation grace: a brand-new token may 401 for a few
          // seconds while the KV write reaches every replica.
          if (!isRetry && tokenAgeMs() < 5 * 60 * 1000) {
            setTimeout(function () {
              checkSession(token, true);
            }, 1500);
          } else {
            setToken(null);
            setUser(null);
            buildGate();
            uncloak();
          }
        } else {
          trustCachedOrGate();
        }
      },
      function () {
        trustCachedOrGate();
      }
    );
  }
  function boot() {
    var token = getToken();
    if (!token) {
      buildGate();
      uncloak(); // gate itself is visible; page behind stays cloaked by overlay
      return;
    }
    checkSession(token, false);
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
