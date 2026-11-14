# Local MIRROR of the Fire Babys multiplayer Worker, for page-level tests only.
# Implements the exact semantics verified against the live Worker
# (tests/arena/test-live-worker.py):
#   REST  POST /api/lobby {mode}        -> {ok, code}          (HTTP :8947, CORS *)
#   WS    /lobby/{code}/ws?name=...     -> welcome {playerId, token, isHost, state}
#   'action' messages are DROPPED until the host sends {t:'start'} (phase lobby),
#   then relayed to the OTHER room members with the sender's id attached.
#   {t:'start'} -> broadcast 'start' + phase 'playing';  ping -> pong (ts echo);
#   joins/leaves broadcast 'joined'/'left' + 'lobby' state snapshots.
# The Arena page is pointed here in tests via an init-script shim that rewrites
# the Worker origin (fetch + WebSocket) — page code and logic run unchanged.
# Run:  /tmp/wsvenv/bin/python tests/arena/mock-worker.py
import asyncio
import json
import random
import string
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import websockets

ROOMS = {}  # code -> {"members": {playerId: ws}, "host": playerId, "started": bool, "mode": str}
LOCK = threading.Lock()


def new_code():
    return "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))


def room_state(code):
    r = ROOMS[code]
    return {"code": code, "mode": r["mode"], "phase": "playing" if r["started"] else "lobby",
            "maxPlayers": 30, "hostId": r["host"],
            "players": [{"id": pid, "name": r["names"][pid]} for pid in r["members"]]}


class RestHandler(BaseHTTPRequestHandler):
    def _send(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send({}, 204)

    def do_POST(self):
        if self.path == "/api/lobby":
            n = int(self.headers.get("content-length") or 0)
            body = json.loads(self.rfile.read(n) or b"{}")
            code = new_code()
            with LOCK:
                ROOMS[code] = {"members": {}, "names": {}, "host": None,
                               "started": False, "mode": body.get("mode", "coop")}
            self._send({"ok": True, "code": code})
        else:
            self._send({"ok": False, "error": "not found"}, 404)

    def do_GET(self):
        if self.path == "/api/lobbies":
            with LOCK:
                lst = [{"code": c, "mode": r["mode"], "players": len(r["members"]),
                        "maxPlayers": 30, "phase": "playing" if r["started"] else "lobby"}
                       for c, r in ROOMS.items()]
            self._send({"ok": True, "lobbies": lst})
        else:
            self._send({"ok": False, "error": "not found"}, 404)

    def log_message(self, *args):
        pass


async def broadcast(code, obj, skip=None):
    r = ROOMS.get(code)
    if not r:
        return
    dead = []
    for pid, ws in list(r["members"].items()):
        if pid == skip:
            continue
        try:
            await ws.send(json.dumps(obj))
        except Exception:
            dead.append(pid)
    for pid in dead:
        r["members"].pop(pid, None)


async def ws_handler(ws):
    path = ws.request.path if hasattr(ws, "request") else ws.path
    # /lobby/{code}/ws?name=X
    parts = path.split("?")[0].strip("/").split("/")
    query = path.split("?", 1)[1] if "?" in path else ""
    name = "Player"
    for kv in query.split("&"):
        if kv.startswith("name="):
            name = kv[5:] or "Player"
    if len(parts) != 3 or parts[0] != "lobby":
        await ws.close()
        return
    code = parts[1].upper()
    with LOCK:
        r = ROOMS.get(code)
        if r is None:
            r = ROOMS[code] = {"members": {}, "names": {}, "host": None,
                               "started": False, "mode": "coop"}
        pid = str(uuid.uuid4())
        is_host = r["host"] is None
        if is_host:
            r["host"] = pid
        r["members"][pid] = ws
        r["names"][pid] = name
    await ws.send(json.dumps({"t": "welcome", "playerId": pid, "token": str(uuid.uuid4()),
                              "isHost": is_host, "reconnected": False, "state": room_state(code)}))
    await broadcast(code, {"t": "joined", "id": pid})
    await broadcast(code, {"t": "lobby", "state": room_state(code)})
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            t = msg.get("t")
            if t == "ping":
                await ws.send(json.dumps({"t": "pong", "ts": msg.get("ts")}))
            elif t == "start":
                with LOCK:
                    r["started"] = True
                await broadcast(code, {"t": "start", "mode": r["mode"], "state": room_state(code)})
            elif t == "action":
                with LOCK:
                    started = r["started"]
                if started:  # the verified Worker rule: dropped before start
                    await broadcast(code, {"t": "action", "id": pid, "kind": msg.get("kind"),
                                           "x": msg.get("x", 0), "y": msg.get("y", 0),
                                           "data": msg.get("data")}, skip=pid)
            elif t == "end":
                await broadcast(code, {"t": "end", "results": msg.get("results")}, skip=pid)
    finally:
        with LOCK:
            r["members"].pop(pid, None)
            if r["host"] == pid and r["members"]:
                r["host"] = next(iter(r["members"]))
        await broadcast(code, {"t": "left", "id": pid})
        await broadcast(code, {"t": "lobby", "state": room_state(code)})


async def main():
    ThreadingHTTPServer(("127.0.0.1", 8947), RestHandler).serve_forever()
    # unreachable in this form; run HTTP in a thread instead (see __main__)


if __name__ == "__main__":
    http_thread = threading.Thread(target=lambda: ThreadingHTTPServer(("127.0.0.1", 8947), RestHandler).serve_forever(), daemon=True)
    http_thread.start()
    print("mock worker REST on :8947, WS on :8948")

    async def serve():
        async with websockets.serve(ws_handler, "127.0.0.1", 8948):
            await asyncio.Future()

    asyncio.run(serve())
