# 50-Sites Daily Run Summary — 2026-10-14 (Charging Safety Week, Day 2)

**Status: PUBLISHED to 3 of 10 live sites. 7 sites failed/skipped — exact reasons below. No text-only posts were made anywhere; the picture rule was kept.**

Theme: Charging Safety Week Day 2 — use the right charger, check cords (frayed = unsafe, recycle it), unplug when full.

## Art
- `art.webp` — NEW concept image, visually verified: "CHARGING SAFETY WEEK — DAY 2" — Blaze (gold star crown) unplugging a phone at 100%, Ruko (black bandana) dropping a frayed cord into a RECYCLE bin with a "NO! FRAYED = UNSAFE!" bubble, Cinder (blue/purple flame tips) giving a thumbs-up beside a checked clipboard ("Use the right charger / Check cords / Unplug when full"). Matches the locked reference style (`character-lineup-poster.webp`, `west-ember-high-crowd.webp`): flame-teardrop bodies, toon-banded living fire, bold ink outlines. Kid-safe: no harm, no smoke, no burning homes, no beaks/wings/feathers.

## Posts written (10 — one per live site, unique angle each)
| File | Site | Angle |
|------|------|-------|
| `facebook.txt` | Facebook (Fire Babys group) | Day 2 family mission: cord check at home tonight |
| `firebabys-io.txt` | firebabys.io | Explainer: The Right Charger Rule |
| `instagram.txt` | Instagram | Short caption + Day 2 checklist |
| `threads.txt` | Threads | Punchy version (435 chars, under the 500 limit) |
| `discord.txt` | Discord | Day 2 server challenge: cord check with a grown-up |
| `substack.txt` | Substack (Fan Club) | Letter to grown-ups: check the cords |
| `devto.txt` | Dev.to | Game design: cord-check inspection mechanic |
| `blogger.txt` | Blogger | Story: "Blaze and the Frayed Cord" |
| `wordpress.txt` | WordPress.com | Cord-check checklist |
| `gamejolt.txt` | Game Jolt | IRL quest, 4-part thread (parts 122/150/235/172 chars, under the ~258 limit) |

Every post ends with `the future is BLAZING FOR FIRE BABYS 🔥`, includes one real quote from the quote bank with its source link, and uses accurate mission wording (proceeds INTENDED to fund U.S. fire-department school programs; no partnerships implied).

## PUBLISHED (3)
- **Discord** — posted via the "Fire Babys Daily" webhook WITH art.webp attached; webhook returned HTTP 200 with the posted message content matching discord.txt. No message URL was captured.
- **Instagram** (@jefferyzpruden) — feed post WITH art.webp: https://www.instagram.com/p/Dedc4zyDhmg/ — first attempt was interrupted with no durable result; readback confirmed no Day 2 post existed, so it was retried once and the retry's readback confirmed the caption matches instagram.txt exactly.
- **Threads** (@jefferyzpruden) — post WITH art.webp attached, published via threads-cli (publish receipt returned; no public URL returned by the CLI). First attempt was interrupted by a service restart; readback confirmed no Day 2 post existed before the successful retry.

## FAILED / SKIPPED (7) — one browser task, one attempt each
- **Facebook group** — FAILED: the browser WAS signed in (as Jeff Pruden) and the group composer opened with art.webp attached (665,340 bytes), but after the first text segment the textbox repeatedly returned "obscured" for type/click/scroll, so the full text could not be entered. The browser task did NOT post partial text; it discarded the draft. Feed afterwards showed only the previous post. Nothing posted.
- **Substack** — FAILED: site loaded as "Fire's Substack" with a Sign in button and no author dashboard/New post control — not signed in, no credentials available to the browser task, no sign-in attempted. Nothing posted.
- **Dev.to** — FAILED: header showed Log in / Create account, no signed-in firebabys session or Create Post control. Nothing posted.
- **WordPress.com** — FAILED: public site exists, but wp-admin redirected to the WordPress.com login page — not signed in. Nothing posted.
- **Game Jolt** — FAILED: showed Sign up / Log in, no signed-in firebabys session or composer. 4-part thread not posted.
- **Blogger** — FAILED: firebabysgame.blogspot.com returns "Blog has been removed — Sorry, the blog at firebabysgame.blogspot.com has been removed. This address is not available for new blogs." The blog is gone, not just a sign-in problem.
- **firebabys.io** — SKIPPED: a blog exists at firebabys.io/blog (1 post, Oct 5, 2026) but there is no Admin/Edit/New post/CMS path and /admin returns 404; nothing changed on the site.

## Not attempted (not live/working per SITES.md / TRACKER.md)
Steemit (signup API broken), Hive (VPN flag), Minds and LinkedIn (LIVE only as one-off 100-sites posts, not daily slots), Weebly (needs Jeff's phone tap), Medium (bot wall), Hashnode (account dead), Tumblr (terminated), Vocal.media (signup in flight), and all 40+ TODO new targets.

## Blocker to surface
Updated by the browser task's detailed report: Facebook IS signed in in the browser — its blocker is the group composer itself (textbox becomes obscured/unusable after the photo attaches), not sign-in. Substack, Dev.to, WordPress.com, and Game Jolt remain signed out with no logins saved in the Secure Vault — those 4 cannot publish until Jeff signs in once / saves credentials. Blogger's blog has been removed outright.
