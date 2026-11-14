# Fire Safety Hub — go-live plan

**Status: PREP ONLY.** Nothing is published, no DNS has been changed, and nothing ships until Jeff says go.
Hub files (built, in this folder): `index.html` + `styles.css` (zero inline code, zero JavaScript, zero external assets) and `RESEARCH.md` (the verified USFA program list).
Target address: **safety.firebabys.io**

---

## (a) Where the hub hosts — recommendation

**Recommended: its own GitHub repo on GitHub Pages, with `safety.firebabys.io` as its custom domain.**

| Option | For | Against |
|---|---|---|
| **A. Own repo + GitHub Pages (pick this)** | Hub deploys are fully separate from the game site — a safety-page edit can never touch a game page, a CSP hash, or an offline ZIP. Free hosting, automatic HTTPS certificate, and it's the same GitHub account/workflow we already run (`Jman350Z`). The subdomain makes it a real separate website, which is what Jeff ordered — the load (bytes, updates, responsibility) genuinely leaves firebabys.io. | One extra repo to keep an eye on (it's 2 files). |
| B. A folder inside the main `fire-babys` repo/site (e.g. `firebabys.io/safety/` or a subdomain pointing at the same host) | One repo, one deploy pipeline. | Not its own website — it *is* firebabys.io, so it doesn't take the load off; every hub edit rides the game deploy pipeline (hash-map regen, offline reseal, big-deploy packaging) and a hub mistake can break the game site. A subdomain on the same host still shares the same Worker/CSP regime. |

**Pick: Option A.** Concrete setup when Jeff says go:

1. Create repo `Jman350Z/fire-safety-hub` (public), containing `index.html`, `styles.css`, and a one-line `CNAME` file whose entire content is `safety.firebabys.io`.
2. Repo → Settings → Pages → Source: deploy from branch `main`, root folder → Save. (GitHub shows the account's Pages host — `jman350z.github.io` — on this screen; that string is the DNS target used in step (b).)
3. Same screen → Custom domain: `safety.firebabys.io` → Save → tick **Enforce HTTPS** once the certificate shows as issued (can take up to ~an hour after DNS lands).

## (b) Cloudflare dashboard steps for the DNS record

Our Cloudflare API token **cannot write DNS** (verified repeatedly — zone/DNS writes return 403 code 10000), so this is dashboard-only. It's Bobby's signed-in browser route when Jeff says go; Jeff's only part is being signed in (or scanning/approving if the session has expired).

1. Cloudflare dashboard → select the **firebabys.io** zone.
2. Left sidebar → **DNS** → **Records**.
3. **Add record**:
   - Type: **CNAME**
   - Name: `safety`
   - Target: `jman350z.github.io` (the host GitHub Pages confirms in step (a)-2 — copy it from that screen, don't type it from memory)
   - Proxy status: **DNS only** (grey cloud) — GitHub Pages needs to see the real request to issue its own HTTPS certificate; proxying (orange cloud) can stall cert issuance.
   - TTL: Auto.
4. **Save.** Propagation is usually minutes.
5. Verify: `https://safety.firebabys.io` loads the hub with a valid padlock; then flip on **Enforce HTTPS** in GitHub Pages settings (step (a)-3) if it wasn't already.
6. Optional hardening later: once the GitHub cert is live and stable, the record can be switched to Proxied and put behind the same fortress headers as the main site — not required for launch, and if that ever happens the hub's zero-inline-code design means the strict CSP needs **no hash work at all** (one external stylesheet, no scripts).

Half-limit note: this is a single DNS record and a single repo — no platform limits are anywhere near being touched.

## (c) What changes on firebabys.io

Goal: every heavy or duplicated safety block on the game site collapses to **one light card/link** pointing at `https://safety.firebabys.io`. Inventory measured 2026-10-21 in `~/workspace/coin-shop-build/` (the current build tree):

| Page | Size | Safety load today | Change at go-live |
|---|---|---|---|
| `fire-world.html` (main menu) | 67 KB | The heavyweight: **59 "fire safety" mentions** — a rotating "🔥 Fire Safety:" tip line embedded on game cards throughout the page, plus smoke-alarm and escape-plan tips. | Replace the rotating in-page tip lines with **one hub card** ("🔥 Fire Safety Hub — real safety guides from the U.S. Fire Administration → safety.firebabys.io"). Biggest single win. |
| `play.html` (SPLASH battler) | 568 KB | Safety lines baked into the game file: 6 "fire safety", 4 "grown-up", 4 "never a toy", 6 "stop, drop". | Phase 2 (play.html edits only via the patch pipeline): trim in-game safety text to the short house rules + one hub link in the pause/menu area. |
| `3d.html` | 1.02 MB | Smoke-alarm and "never a toy" strings in the 3D game. | Leave the one-line house rules; no structural change (3D file goes through its own pre-deploy check; not worth churn for 2 strings). |
| `parents.html` ("For Parents") | 8 KB | "Safe by design", "A real fire-safety curriculum", and a "Trusted resources" section — this is the page the hub replaces. | Keep the page (parents look for it), but its curriculum/resources sections become **one link card to the hub** instead of locally maintained resource text. |
| `index.html` (landing) | 13 KB | 6 "fire safety" mentions incl. the house rules ("never a toy", "get a grown-up", "stop, drop"). | Keep the short house rules (they're tiny and they're the brand promise); add one hub link beside them. |
| `history.html`, `characters.html` | 8–12 KB | Light mentions only (3 and 1). | No change. |
| All **52 game pages** under `fire-world/games/` | — | Every one carries the "fire safety" wording from the shared gate/footer blocks (52 of 52 matched). | No per-file edits: if the shared block is ever regenerated, its line becomes "Fire safety guides: safety.firebabys.io". The per-game math-gate block itself is never swept by hand (standing rule). |

Sequencing rule: any firebabys.io edit ships through the **A+ hash pipeline** (`~/workspace/a-plus-project/`: audit_scan.py → gen_hashmap.py → build_worker.py → deploy_worker.py) — the hub link change to `fire-world.html` is a normal content edit, but it still rides that pipeline like every other main-site change. Do the hub DNS first, verify the hub is live, **then** swap the main-site blocks for links — never point players at a subdomain that doesn't resolve yet.

## (d) Rollback

- **Full rollback (30 seconds):** Cloudflare dashboard → DNS → Records → delete the `safety` CNAME record. The subdomain stops resolving; nothing else anywhere is affected (the hub repo can sit dormant on GitHub indefinitely, costing nothing).
- **Partial rollback:** if the hub is fine but a main-site link swap misbehaves, revert just the `fire-world.html` / `parents.html` edits through the normal deploy pipeline — the hub itself is independent and stays up.
- Nothing in this plan touches player accounts, sessions, the locker, the leaderboard, or any Worker.

## Jeff-side actions remaining

- **One decision:** say "go" (and confirm the repo name `fire-safety-hub` is fine).
- **Clicks for Jeff: zero planned.** The GitHub repo creation and the Cloudflare DNS record are Bobby's browser route in his signed-in sessions. The only way Jeff gets pulled in is if the Cloudflare dashboard session has expired at go-live time and needs his sign-in/2FA tap — same standing gate as every other dashboard job.
