/* Fire Babys multiplayer client — fire-babys-net.js
 *
 * Classic script (no modules, no dependencies). Exposes window.FireBabysNet.
 *
 *   const net = new FireBabysNet({ server: "wss://<your-worker>.workers.dev" });
 *   const { code } = await net.createLobby({ mode: "4v4" });
 *   await net.connect(code, { name: "Jeff" });
 *   net.on("lobby", (state) => renderPlayerList(state));
 *   net.on("pos", (p) => moveRemoteDot(p.id, p.x, p.y));
 *   net.setReady(true);
 *   // host: net.start();
 *   net.sendMove({ x: 100, y: 200, dir: 90 });   // throttled to 12Hz internally
 *   net.sendAction({ kind: "extinguish", x, y });
 *
 * Protocol constants mirror worker/src/protocol.js — keep in sync.
 */
(function (global) {
  "use strict";

  var MAX_PLAYERS = 30;
  var MODES = { "2v2": 4, "4v4": 8, "6v6": 12, "7v7": 14, "15v15": 30 };
  var MOVE_HZ = 12;
  var PING_INTERVAL_MS = 20000;
  var RECONNECT_DELAYS = [1000, 2000, 5000, 10000]; // backoff steps

  function isValidMode(m) {
    return m === "coop" || Object.prototype.hasOwnProperty.call(MODES, m);
  }

  function FireBabysNet(opts) {
    opts = opts || {};
    this.server = (opts.server || "").replace(/\/$/, "");
    this.moveHz = opts.moveHz || MOVE_HZ;
    this.handlers = {};
    this.ws = null;
    this.code = null;
    this.playerId = null;
    this.token = null;
    this.isHost = false;
    this.state = null; // last lobby snapshot
    this.connected = false;
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.shouldReconnect = false;
    this.lastMoveSent = 0;
    this.lastPing = 0;
    this.latencyMs = null;
    this._name = "";
  }

  // ------------------------------------------------------------ events
  FireBabysNet.prototype.on = function (evt, fn) {
    (this.handlers[evt] = this.handlers[evt] || []).push(fn);
    return this;
  };
  FireBabysNet.prototype.off = function (evt, fn) {
    var h = this.handlers[evt];
    if (!h) return this;
    this.handlers[evt] = h.filter(function (f) { return f !== fn; });
    return this;
  };
  FireBabysNet.prototype.emit = function (evt, data) {
    var h = this.handlers[evt] || [];
    for (var i = 0; i < h.length; i++) {
      try { h[i](data); } catch (e) { /* never let a handler kill the socket */ }
    }
  };

  FireBabysNet.prototype.httpBase = function () {
    return this.server.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
  };

  // ------------------------------------------------------------ REST
  FireBabysNet.prototype.createLobby = function (opts) {
    var self = this;
    opts = opts || {};
    var mode = isValidMode(opts.mode) ? opts.mode : "coop";
    return fetch(this.httpBase() + "/api/lobby", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: mode }),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error || "create failed");
        return j.code;
      });
  };

  FireBabysNet.listLobbies = function (server) {
    var base = String(server || "").replace(/\/$/, "")
      .replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    return fetch(base + "/api/lobbies")
      .then(function (r) { return r.json(); })
      .then(function (j) { return j.ok ? j.lobbies : []; });
  };

  FireBabysNet.prototype.getLobby = function (code) {
    return fetch(this.httpBase() + "/lobby/" + encodeURIComponent(code))
      .then(function (r) { return r.json(); })
      .then(function (j) { return j.ok ? j.state : null; });
  };

  // ------------------------------------------------------------ websocket
  FireBabysNet.prototype.connect = function (code, opts) {
    var self = this;
    opts = opts || {};
    this.code = String(code || "").toUpperCase();
    this._name = String(opts.name || "Player").slice(0, 16);
    this.shouldReconnect = true;
    this.reconnectAttempt = 0;
    return this._open(this._name, opts.token || this.token);
  };

  FireBabysNet.prototype._open = function (name, token) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var url = self.server + "/lobby/" + encodeURIComponent(self.code) +
        "/ws?name=" + encodeURIComponent(name) +
        (token ? "&token=" + encodeURIComponent(token) : "");
      var ws;
      try { ws = new WebSocket(url); } catch (e) { reject(e); return; }
      var settled = false;
      var timeout = setTimeout(function () {
        if (!settled) { settled = true; try { ws.close(); } catch (e) {} reject(new Error("connect timeout")); }
      }, 10000);

      ws.onopen = function () { /* wait for welcome */ };
      ws.onmessage = function (ev) { self._onMessage(ev.data, resolve, reject, function(){ settled = true; clearTimeout(timeout); }); };
      ws.onerror = function () {
        if (!settled) { settled = true; clearTimeout(timeout); reject(new Error("websocket error")); }
      };
      ws.onclose = function () { self._onClose(); };
      self.ws = ws;
    });
  };

  FireBabysNet.prototype._onMessage = function (data, resolve, reject, settle) {
    var msg;
    try { msg = JSON.parse(data); } catch (e) { return; }
    if (!msg || typeof msg.t !== "string") return;

    // First message must be welcome (resolves connect()).
    if (msg.t === "welcome") {
      this.playerId = msg.playerId;
      this.token = msg.token;
      this.isHost = !!msg.isHost;
      this.state = msg.state || null;
      this.connected = true;
      this.reconnectAttempt = 0;
      this._startPing();
      try { localStorage.setItem("fbmp:" + this.code, this.token); } catch (e) {}
      settle();
      resolve({ playerId: this.playerId, isHost: this.isHost, reconnected: !!msg.reconnected });
      this.emit("welcome", msg);
      if (msg.state) this.emit("lobby", msg.state);
      return;
    }
    if (msg.t === "error") { this.emit("error", msg.msg || "error"); return; }

    switch (msg.t) {
      case "lobby":
        this.state = msg.state || this.state;
        this.emit("lobby", msg.state);
        break;
      case "joined": case "rejoined": case "left":
        this.emit("presence", msg);
        break;
      case "host":
        if (this.state) this.state.hostId = msg.hostId;
        this.isHost = (msg.hostId === this.playerId);
        this.emit("host", msg);
        break;
      case "pos": this.emit("pos", msg); break;
      case "action": this.emit("action", msg); break;
      case "start":
        this.state = msg.state || this.state;
        this.emit("start", msg);
        break;
      case "end": this.emit("end", msg); break;
      case "pong":
        if (msg.ts) this.latencyMs = Date.now() - msg.ts;
        this.emit("pong", { latencyMs: this.latencyMs });
        break;
      default: this.emit("message", msg);
    }
  };

  FireBabysNet.prototype._send = function (obj) {
    if (this.ws && this.ws.readyState === 1) {
      try { this.ws.send(JSON.stringify(obj)); return true; } catch (e) {}
    }
    return false;
  };

  FireBabysNet.prototype._startPing = function () {
    var self = this;
    this._stopPing();
    this._pingTimer = setInterval(function () {
      self._send({ t: "ping", ts: Date.now() });
    }, PING_INTERVAL_MS);
  };
  FireBabysNet.prototype._stopPing = function () {
    if (this._pingTimer) clearInterval(this._pingTimer);
    this._pingTimer = null;
  };

  FireBabysNet.prototype._onClose = function () {
    this.connected = false;
    this._stopPing();
    this.emit("close", {});
    if (!this.shouldReconnect || !this.code) return;
    var self = this;
    var delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;
    this.emit("reconnecting", { attempt: this.reconnectAttempt, delayMs: delay });
    this.reconnectTimer = setTimeout(function () {
      var token = self.token;
      try { token = token || localStorage.getItem("fbmp:" + self.code); } catch (e) {}
      self._open(self._name, token).catch(function () { /* will retry via onclose */ });
    }, delay);
  };

  FireBabysNet.prototype.disconnect = function () {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this._stopPing();
    try { if (this.ws) this.ws.close(); } catch (e) {}
    this.ws = null;
    this.connected = false;
  };

  // ------------------------------------------------------------ game actions
  FireBabysNet.prototype.setReady = function (ready) {
    return this._send({ t: "ready", ready: !!ready });
  };
  FireBabysNet.prototype.setMode = function (mode) {
    if (!isValidMode(mode)) return false;
    return this._send({ t: "mode", mode: mode });
  };
  FireBabysNet.prototype.start = function () { return this._send({ t: "start" }); };
  FireBabysNet.prototype.end = function (results) {
    return this._send({ t: "end", results: results || null });
  };

  /** Throttled movement send. Call every frame; library caps to moveHz. */
  FireBabysNet.prototype.sendMove = function (move) {
    var now = Date.now();
    var minInterval = 1000 / this.moveHz;
    if (now - this.lastMoveSent < minInterval) return false;
    this.lastMoveSent = now;
    return this._send({
      t: "move",
      x: +move.x || 0, y: +move.y || 0,
      dir: +move.dir || 0,
      anim: String(move.anim || "").slice(0, 16),
      ts: now,
    });
  };

  /** Unthrottled action (attack, extinguish, etc.). Keep data small (<512B JSON). */
  FireBabysNet.prototype.sendAction = function (action) {
    return this._send({
      t: "action",
      kind: String(action.kind || "").slice(0, 24),
      x: +action.x || 0, y: +action.y || 0,
      data: action.data || null,
    });
  };

  FireBabysNet.MAX_PLAYERS = MAX_PLAYERS;
  FireBabysNet.MODES = MODES;

  global.FireBabysNet = FireBabysNet;
})(typeof window !== "undefined" ? window : this);
