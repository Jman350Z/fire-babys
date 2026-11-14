# Fire Babys — LIVE CHECK — 2026-10-12

Fresh full check of https://firebabys.io after the 55-file game overhaul went live,
plus the Phase 1 update of the remaining site pages (fixes staged, see Phase 1 notes).
Method: Playwright headless Chromium, one visit per page — HTTP status, page errors,
console errors, and a render signal (canvas present or main content text/heading rendered).
Checked: 2026-10-12 ~15:55–16:05 PDT.

## Totals
- Pages checked: **70** (59 game entries + 11 main pages incl. site root and world/)
- Games: **59/59 PASS**
- Main pages: **11/11 PASS**
- Hard failures: **0** — every page returned HTTP 200, rendered its start gate/main content, and produced zero page errors.
- Console errors observed: only sandbox-proxy artifacts on external subresources (see classification below). No game or page code errors.

## Game entries (59)
| Page | HTTP | Page errors | Console errors | Renders | Verdict |
|---|---|---|---|---|---|
| fire-world/game-02-blaze-runner.html | 200 | 0 | 0 | yes | PASS |
| 3d.html | 200 | 0 | 2 | yes | PASS |
| play.html | 200 | 0 | 2 | yes | PASS |
| fire-world/games/game-04-cinders-ice-rink-chaos.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-05-lord-infernos-ballista-siege.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-06-blazes-magma-bounce.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-07-rukos-turbo-drift.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-08-sizzles-spark-jump.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-10-caldera-climb.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-11-magma-trench-dodge.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-12-volcanic-pinball.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-09-ember-cascade.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-13-pyra-prime-defense.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-14-sparky-speedway.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-16-inferno-drop.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-15-cinders-melt-down.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-17-flame-sprint-2d.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-18-blazes-thermal-run.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-20-boulders-fortress.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-19-rukos-lava-leap.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-21-sizzles-target-pop.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-22-magma-block-breaker.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-23-crater-catcher.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-24-ash-storm-survivor.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-25-lava-line-draw.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-26-pyra-paddle-battle.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-27-ember-bounce-2d.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-28-thermal-tug-of-war.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-29-blazes-jump-quest.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-30-rukos-dash-blitz.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-32-cinders-glide.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-31-boulders-rampart.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-33-inferno-aim.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-34-spark-jump-arcade.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-36-magma-drop-physics.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-35-lava-moat-defense.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-37-volcanic-stack-smash.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-38-fire-baby-rally.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-39-caldera-bounce.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-40-sizzles-spark-run.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-42-rukos-speed-trap.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-41-blazes-inferno-roll.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-43-boulders-blockade.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-44-cinders-slide.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-45-lord-infernos-strike.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-46-magma-jump-2d.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-47-pyra-prime-dash.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-48-ash-heap-hero.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-50-ember-bounce-master.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-49-thermal-track.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-52-lava-rush-arcade.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-51-volcanic-target.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-53-flame-drop-physics.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-54-blazes-zenith.html | 200 | 0 | 0 | yes | PASS |
| fire-world/games/game-55-rukos-final-dash.html | 200 | 0 | 0 | yes | PASS |
| fire-world/rukos-panic-dash/ | 200 | 0 | 0 | yes | PASS |
| fire-world/slingshot-cascade/ | 200 | 0 | 0 | yes | PASS |
| fire-world/trinitys-holy-lightning-rescue/ | 200 | 0 | 0 | yes | PASS |
| fire-world/tristans-dark-knight-rescue/ | 200 | 0 | 0 | yes | PASS |

## Main pages (11)
| Page | HTTP | Page errors | Console errors | Renders | Verdict | Notes |
|---|---|---|---|---|---|---|
| (root) | 200 | 0 | 0 | yes | PASS |  |
| index.html | 200 | 0 | 0 | yes | PASS |  |
| fire-world.html | 200 | 0 | 0 | yes | PASS | LIVE page is still the pre-fix version: title says 55 games, 56 cards, only 2 inside the layout grid. Fix staged (upload-list-2.txt). |
| play-all.html | 200 | 0 | 0 | yes | PASS | LIVE page still lists 56 games (Blaze Runner missing). Fix staged (upload-list-2.txt). |
| arcade.html | 200 | 0 | 1 | yes | PASS |  |
| blog.html | 200 | 0 | 0 | yes | PASS |  |
| history.html | 200 | 0 | 0 | yes | PASS | LIVE page still says "55 games" in the timeline. Fix staged (upload-list-2.txt). |
| characters.html | 200 | 0 | 2 | yes | PASS |  |
| parents.html | 200 | 0 | 2 | yes | PASS |  |
| 404.html | 200 | 0 | 0 | yes | PASS | Custom 404 page; also served for unknown paths (verified via /blog-single.html). |
| world/ | 200 | 0 | 2 | yes | PASS | Redirect stub → 3d.html?mode=splash. Resolves and loads fine (console entries are the 3D page’s, below). |

## Console-error classification (no real errors found)
- **play.html (2):** CSP "frame-ancestors delivered via <meta> is ignored" notice + `ERR_CERT_AUTHORITY_INVALID` — the two known pre-existing artifacts (SSL-to-localhost + beacon/CSP notice class). Excluded per the check spec.
- **3d.html (2):** Cloudflare beacon script blocked by the page’s own CSP (beacon notice) + `ERR_CERT_AUTHORITY_INVALID` (SSL artifact). The two known artifacts. Excluded per spec.
- **world/ (2):** same two entries as 3d.html — world/ redirects into 3d.html?mode=splash, so these belong to the 3D page.
- **arcade.html (1), characters.html (2), parents.html (2):** `ERR_CERT_AUTHORITY_INVALID` on external subresources (Google sign-in client / Cloudflare beacon) fetched through this sandbox’s egress proxy. Same artifact family was observed against the local mirror in Phase 1 (tunnel failures on the same external scripts). Zero page errors, full render, all links 200 — not page defects.

## Outbound essentials
- SPLASH multiplayer worker `https://fire-babys-multiplayer.jeffpruden288.workers.dev/` → **HTTP 200** (also 200 with WebSocket upgrade headers).
- Discord invite `https://discord.gg/sfdsWKzhWh` → **HTTP 200**, resolves to discord.com/invite/sfdsWKzhWh; Discord API confirms a valid active invite.

## Failure list
**None.** No page failed HTTP, render, or page-error checks.

### Known live discrepancies — fixes already staged, pending upload (upload-list-2.txt)
1. **fire-world.html** — 54 of 56 game cards sat OUTSIDE the layout grid (broken page structure), a stale "More games coming soon — 53 to go!" line, Blaze Runner (game-02) missing from the hub, and the count said 55 while the hub actually holds 57 games. Fixed/staged: all 57 cards in the grid, stale line removed, Blaze Runner card added as Game #3, counts set to 57.
2. **play-all.html** — Blaze Runner missing from the game list; count said 56. Fixed/staged: entry added (57 games), title/hero/filter/count text set to 57.
3. **history.html** — timeline said "55 games". Fixed/staged: 57.

### Observations for Jeff (no change made — content calls, not bugs)
- **Blog:** live blog.html shows a single post (Oct 5, 2026, "day one"). A 100-post version exists only as a local file (blog-100posts-backup.html in the staging folder — it is NOT in the repo and returns 404 live), and the local staging folder also holds a stray blog-single.html duplicate of blog.html (also 404 live; no page links to either). If the 100-post blog was meant to be live, say the word and it can be restored from that backup.
- **Open World link:** index.html advertises an "Open World" explore page at world/, but world/ is a redirect stub into 3D SPLASH mode. It works, but the copy promises exploring the five kingdoms while the link lands in SPLASH. Left as-is — changing the destination or the copy is a product call.
- Hub cross-check: a few game descriptions/mechanic labels differ between fire-world.html and play-all.html for the same game (written at different times). Links and counts now agree; rewriting the blurbs to match verified gameplay is a possible follow-up pass.
