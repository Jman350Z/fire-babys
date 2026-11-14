# Live-Worker protocol verification for Fire Babys Arena online mode.
# Two REAL clients against wss://fire-babys-multiplayer.jeffpruden288.workers.dev,
# speaking EXACTLY the message shapes the Arena page sends (mirrored from
# 3d.html's FireBabysNet / worker protocol):
#   REST POST /api/lobby {mode:'coop'} -> {ok, code}
#   WS /lobby/{code}/ws?name=... -> welcome {playerId, isHost, state}
#   {t:'action', kind, x, y, data} -> rebroadcast to the room with sender id
#   host {t:'start'} -> broadcast 'start'
# Run with the venv python:  /tmp/wsvenv/bin/python tests/arena/test-live-worker.py
# (websockets uses the sandbox egress proxy from the environment automatically.)
import asyncio
import json
import subprocess
import sys

import websockets

BASE = "https://fire-babys-multiplayer.jeffpruden288.workers.dev"
WSBASE = "wss://fire-babys-multiplayer.jeffpruden288.workers.dev"

passed = failed = 0


def check(cond, label):
    global passed, failed
    if cond:
        passed += 1
        print("  PASS " + label)
    else:
        failed += 1
        print("  FAIL " + label)


async def recv_until(ws, pred, timeout=15):
    async def _go():
        while True:
            msg = json.loads(await ws.recv())
            if pred(msg):
                return msg
    return await asyncio.wait_for(_go(), timeout)


async def main():
    out = subprocess.run(
        ["curl", "-s", "-m", "20", "-X", "POST", BASE + "/api/lobby",
         "-H", "content-type: application/json", "-d", '{"mode":"coop"}'],
        capture_output=True, text=True)
    j = json.loads(out.stdout)
    check(j.get("ok") and j.get("code"), "REST create lobby -> code %s" % j.get("code"))
    code = j["code"]

    uri = WSBASE + "/lobby/" + code + "/ws?name="
    async with websockets.connect(uri + "HostTester") as a, \
               websockets.connect(uri + "GuestTester") as b:
        wa = await recv_until(a, lambda m: m.get("t") == "welcome")
        wb = await recv_until(b, lambda m: m.get("t") == "welcome")
        check(wa.get("isHost") is True, "first client is host (playerId %s)" % wa.get("playerId"))
        check(wb.get("isHost") is False, "second client is guest (playerId %s)" % wb.get("playerId"))
        aid, bid = wa["playerId"], wb["playerId"]

        # VERIFIED WORKER RULE: 'action' messages are dropped until the host
        # starts the lobby. A pre-start pick must NOT arrive:
        pick = {"charId": "aqua", "charName": "Aqua", "name": "GuestTester",
                "gear": {"armorId": "bronze_set", "weaponId": "wooden_sword", "outfit": "battle", "shades": False}}
        await b.send(json.dumps({"t": "action", "kind": "arena_pick", "x": 0, "y": 0, "data": pick}))
        try:
            await recv_until(a, lambda m: m.get("t") == "action", timeout=3)
            check(False, "pre-start action is dropped by the Worker (expected drop did not happen)")
        except asyncio.TimeoutError:
            check(True, "pre-start action is dropped by the Worker (page holds picks until start)")

        # host starts the lobby -> phase 'playing', actions now relay
        await a.send(json.dumps({"t": "start"}))
        s = await recv_until(b, lambda m: m.get("t") == "start")
        check(s.get("state", {}).get("phase") == "playing", "host start flips lobby to 'playing'")

        # now the guest's pick relays, tagged with the guest's id, data intact
        await b.send(json.dumps({"t": "action", "kind": "arena_pick", "x": 0, "y": 0, "data": pick}))
        got = await recv_until(a, lambda m: m.get("t") == "action" and m.get("kind") == "arena_pick")
        check(got.get("id") == bid and got["data"]["charId"] == "aqua",
              "host receives guest arena_pick with sender id + data intact")

        # host sends arena_begin carrying both picks
        begin = {"p1": {"charId": "blaze", "gear": {"armorId": "bronze_set", "weaponId": "wooden_sword", "outfit": "battle", "shades": True}},
                 "p2": pick}
        await a.send(json.dumps({"t": "action", "kind": "arena_begin", "x": 0, "y": 0, "data": begin}))
        got = await recv_until(b, lambda m: m.get("t") == "action" and m.get("kind") == "arena_begin")
        check(got.get("id") == aid and got["data"]["p1"]["charId"] == "blaze",
              "guest receives arena_begin with both picks")

        # guest streams an input frame; host must receive it tagged with guest id
        await b.send(json.dumps({"t": "action", "kind": "arena_in", "x": 0, "y": 0,
                                 "data": {"left": False, "right": True, "jump": False, "down": False,
                                          "light": True, "heavy": False, "special": False}}))
        got = await recv_until(a, lambda m: m.get("t") == "action" and m.get("kind") == "arena_in")
        check(got.get("id") == bid and got["data"]["light"] is True, "host receives guest arena_in input")

        # host streams a state snapshot; guest must receive it verbatim
        snap = {"ph": "fight", "rd": 1, "tm": 57, "wn": 0,
                "f1": [300, 458, 1, 0, 116, 20, 0, 0, 0, 0], "f2": [402, 458, -1, 7, 98, 25, 0, 1, 40, 0],
                "pr": [[350, 380, 11, 0, 1]]}
        await a.send(json.dumps({"t": "action", "kind": "arena_state", "x": 0, "y": 0, "data": snap}))
        got = await recv_until(b, lambda m: m.get("t") == "action" and m.get("kind") == "arena_state")
        check(got["data"]["f2"][4] == 98 and got["data"]["pr"][0][0] == 350,
              "guest receives arena_state snapshot verbatim (hp + projectiles)")

        # ping/pong keepalive
        await a.send(json.dumps({"t": "ping", "ts": 12345}))
        got = await recv_until(a, lambda m: m.get("t") == "pong")
        check(got.get("ts") == 12345, "ping -> pong with ts echo")

    print("\n%d passed, %d failed (live Worker protocol)" % (passed, failed))
    return 1 if failed else 0


sys.exit(asyncio.run(main()))
