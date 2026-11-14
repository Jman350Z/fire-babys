# 50-Sites Daily Run Summary — 2026-10-20 (Two Ways Out Tuesday)

**Status: PUBLISHED correctly (with picture) to 2 of 10 live sites: Discord, Threads. Instagram FAILED on its daily publish limit (429). 7 browser-route sites SKIPPED under today's circuit breaker — no browser task was spawned. No text-only posts were made anywhere; the picture rule was kept.**

Theme: Regular rotation resumes after Charging Safety Week (Oct 13–19). Two Ways Out Tuesday — every room needs two ways out (door + window), feel doors (hot = use the second way), keep exit paths clear, windows open, and meet at one outside meeting place.

## Art
- `art.webp` — NEW concept image, visually verified: "TWO WAYS OUT TUESDAY" — Blaze (gold star crown, pointing), Ruko (black bandana, checked clipboard), and Cinder (blue/purple flame tips, pointing to the meeting place) in front of an escape-plan board ("TWO WAYS OUT", WAY OUT 1 to the door, WAY OUT 2 to the window), a crowd of Fire Babys on tiered steps (every face visible, per the height rule), a grown-up supervisor, a "Family Meeting Place" tree, and a cozy fully intact house behind. Matches the locked reference style (`character-lineup-poster.webp`, `west-ember-high-crowd.webp`): flame-teardrop bodies, toon-banded living fire, bold ink outlines. No harm, no smoke, no burning homes; no beaks/wings/feathers.

## Posts written (10 — one per live site, unique angle each)
| File | Site | Angle |
|------|------|-------|
| `facebook.txt` | Facebook (Fire Babys group) | Family mission: name two ways out per room + meeting place |
| `firebabys-io.txt` | firebabys.io | Explainer: why two ways out saves lives |
| `instagram.txt` | Instagram | Short caption + two-ways-out checklist |
| `threads.txt` | Threads | Punchy version (376 chars, under the 500 limit) |
| `discord.txt` | Discord | Server challenge: name two ways out of bedroom + living room |
| `substack.txt` | Substack (Fan Club) | Letter to grown-ups: ten-minute home walk |
| `devto.txt` | Dev.to | Game design: two-exits level rule |
| `blogger.txt` | Blogger | Story: "Blaze and the Two Ways Out" |
| `wordpress.txt` | WordPress.com | Full two-ways-out checklist |
| `gamejolt.txt` | Game Jolt | IRL quest, 4-part thread (parts 168/180/218/188 chars, under the ~258 limit) |

Every post ends with `the future is BLAZING FOR FIRE BABYS 🔥`, includes one real quote from the quote bank with its source link, and uses accurate mission wording (proceeds INTENDED to fund U.S. fire-department school programs; no partnerships implied) and "for everyone" positioning.

## PUBLISHED correctly, with picture (2)
- **Discord** — via the "Fire Babys Daily" webhook WITH art.webp attached; HTTP 200, message id 1562130215814045756, returned content matches discord.txt (except trailing newline), single art.webp attachment (814,086 bytes). Follow-me comment posted as the next webhook message (HTTP 200, message id 1562130385360396311, exact text verified).
- **Threads** (@jefferyzpruden) — https://www.threads.com/@jefferyzpruden/post/Deug4Qbjqye — post WITH art.webp; readback confirmed caption matches threads.txt exactly and media_type is image. First publish attempt was interrupted by a service restart; readback confirmed no Two Ways Out post existed, so it was retried once and succeeded. Follow-me reply FAILED: HTTP 429 "Threads Write Rate Limit Reached — daily limit" on the reply attempt; per the connector rule a 429 is final and was not retried. The Threads post itself is live; only its follow-me comment is owed.

## FAILED (1) — daily publish limit, not retried per the 429 hard-stop rule
- **Instagram** (@jefferyzpruden) — first `post-feed` attempt WITH art.webp was interrupted by a service restart with no durable result; readback confirmed no Two Ways Out post existed, so it was retried once and the retry returned HTTP 429: "Daily publish limit reached." No Instagram calls were made after the 429 (connector rule). Draft + art saved; today's Instagram post is owed after the limit resets. Follow-me comment also not possible: instagram-cli cannot comment (connector limitation).

## SKIPPED (7) — no browser task spawned today
Same-day circuit breaker: today's log (`~/memory/2026-10-20.md`, 02:47 PDT BDM News Rush run) records a Facebook browser preflight failure — group loaded signed-in, but the composer textbox was covered / non-accepting, accepted no text, Post button stayed disabled — breaker tripped for the browser surface for 2026-10-20. The 06:41 stock catalyst run already skipped on the same breaker. Per the local facebook-group-post-preflight skill and the token-waste rule (no same-way re-run of a failed browser job), no browser task was spawned in this run.
- **Facebook group** — SKIPPED (browser surface blocked today). Draft saved, not posted text-only — the picture rule was kept. Today's Facebook group picture post is owed.
- **Substack** — SKIPPED with the browser batch; also verified signed out on 2026-10-14 with no credentials available.
- **Dev.to** — SKIPPED with the browser batch; also verified not signed in on 2026-10-14.
- **Blogger** — SKIPPED with the browser batch; also verified on 2026-10-14 that the blog has been removed ("Blog has been removed").
- **WordPress.com** — SKIPPED with the browser batch; also verified wp-admin redirects to login on 2026-10-14.
- **Game Jolt** — SKIPPED with the browser batch; also verified signed out on 2026-10-14. 4-part thread saved.
- **firebabys.io** — SKIPPED with the browser batch; also verified on 2026-10-14 that there is no Admin/Edit/New post/CMS path and /admin returns 404.

## Not attempted (not live/working per SITES.md / TRACKER.md)
Steemit (signup API broken), Hive (VPN flag), Minds and LinkedIn (LIVE only as one-off 100-sites posts, not daily slots), Weebly (needs Jeff's phone tap), Medium (bot wall), Hashnode (account dead), Tumblr (terminated), Vocal.media (signup in flight), and all 40+ TODO new targets.

## Blockers to surface
- The Facebook group composer failure from 02:47 today (covered / non-accepting) tripped the browser breaker for all of 2026-10-20 — today's Facebook group picture post, plus Substack, Dev.to, Blogger, WordPress, Game Jolt, and firebabys.io posts, are still owed. Substack/Dev.to/WordPress/Game Jolt remain signed out with no logins saved, Blogger's blog is removed, firebabys.io has no publishing path.
- Instagram hit its daily publish limit (429) today — today's Instagram post is owed once the limit resets.
- Threads follow-me comment for today is owed — the reply hit the daily write limit (429) right after the main post published. Instagram follow-me comments remain impossible via instagram-cli (no comment function).
- Carried over from prior days: Instagram Day 5 (2026-10-17) still owed from its 429; Discord Day 3 (2026-10-15) still owed from its 429; Threads Day 7 follow-me comment (2026-10-19) still owed from its 429.
