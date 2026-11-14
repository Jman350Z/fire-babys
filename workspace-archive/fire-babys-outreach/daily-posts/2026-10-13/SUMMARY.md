# 50-Sites Daily Run Summary — 2026-10-13 (Charging Safety Week, Day 1)

**Status: PUBLISHED to 3 of 10 live sites. 7 sites failed/skipped — exact reasons below. No text-only posts were made anywhere; the picture rule was kept.**

Theme: Charging Safety Week Day 1 — charge lithium-battery devices on a hard, flat surface (table/counter), never on beds, couches, or under pillows.

## Art
- `art.webp` — NEW concept image, visually verified: "CHARGING SAFETY WEEK — DAY 1" — Blaze (gold star crown), Ruko (black bandana), and Cinder (blue/purple flame tips) giving thumbs-up beside a tablet and phone charging on a hard wooden table with a checked safety clipboard ("Use hard, flat surface / Don't cover while charging / Keep away from water"). Matches the locked reference style (`character-lineup-poster.webp`, `west-ember-high-crowd.webp`): flame-teardrop bodies, toon-banded living fire, bold ink outlines. Kid-safe: no harm, no smoke, no burning homes, no beaks/wings/feathers.

## Posts written (10 — one per live site, unique angle each)
| File | Site | Angle |
|------|------|-------|
| `facebook.txt` | Facebook (Fire Babys group) | Day 1 kickoff + family mission: move chargers off soft surfaces |
| `firebabys-io.txt` | firebabys.io | Explainer: the Hard, Flat Surface Rule |
| `instagram.txt` | Instagram | Short caption + checklist |
| `threads.txt` | Threads | Punchy one-liner version (476 chars, under the 500 limit) |
| `discord.txt` | Discord | Charging Safety Week Day 1 server challenge |
| `substack.txt` | Substack (Fan Club) | Letter to grown-ups: where the phones sleep |
| `devto.txt` | Dev.to | Game design: charging-station level as spatial pedagogy |
| `blogger.txt` | Blogger | Story: "Blaze and the Charging Table" |
| `wordpress.txt` | WordPress.com | Safe charging spot checklist |
| `gamejolt.txt` | Game Jolt | IRL quest, 4-part thread (parts 209/157/231/175 chars, under the ~258 limit) |

Every post ends with `the future is BLAZING FOR FIRE BABYS 🔥`, includes one real quote from the quote bank with its source link, and uses accurate mission wording (proceeds INTENDED to fund U.S. fire-department school programs; no partnerships implied).

## PUBLISHED (3)
- **Discord** — posted via the "Fire Babys Daily" webhook WITH art.webp attached. First attempt returned 403 (user-agent block); a curl retry succeeded and Discord returned the posted message content matching discord.txt. No message URL was captured.
- **Instagram** (@jefferyzpruden) — feed post WITH art.webp, published via instagram-cli; readback confirmed live at 2026-10-13 08:55 PT with the exact caption. No public URL was returned by the CLI.
- **Threads** (@jefferyzpruden) — post WITH art.webp attached, published via threads-cli; publish receipt returned. No public URL was returned by the CLI.

## FAILED / SKIPPED (7) — one attempt each, no retries beyond the Discord transport fix
- **Facebook group** — SKIPPED: group composer opened but the "Write something..." textbox stayed empty (fill refused as obscured; Post button stayed disabled) — the known flaky composer bug. Per the standing rule, skipped rather than forced; nothing posted.
- **Substack** — FAILED: browser session not signed in; sign-in required credentials not in the Secure Vault (capture_required). Nothing posted.
- **Dev.to** — FAILED: not signed in; same vault capture_required blocker. Nothing posted.
- **WordPress.com** — FAILED: site is public but wordpress.com not signed in; same vault capture_required blocker. Nothing posted.
- **Game Jolt** — FAILED: not signed in; same vault capture_required blocker. 4-part thread not posted.
- **Blogger** — FAILED: firebabysgame.blogspot.com now returns "Blog not found / Blog has been removed — the blog you were looking for does not exist"; Blogger dashboard also not signed in. This contradicts the 100-sites TRACKER "LIVE" entry — flagged for review.
- **firebabys.io** — SKIPPED: blog page is static with only the existing post and a player sign-in form; no admin/CMS publish path that adds a dated post without editing code/deploying. Nothing changed on the site.

## Not attempted (not live/working per SITES.md / TRACKER.md)
Steemit (signup API broken), Hive (VPN flag), Minds and LinkedIn (LIVE only as one-off 100-sites posts, not daily slots), Weebly (needs Jeff's phone tap), Medium (bot wall), Hashnode (account dead), Tumblr (terminated), Vocal.media (signup in flight), and all 40+ TODO new targets.

## Blocker to surface
The browser profile is signed out of Substack, Dev.to, WordPress.com, and Game Jolt, and no logins for them are saved in the Secure Vault — those 4 sites cannot publish until Jeff signs in once / saves credentials. Blogger additionally appears deleted or renamed.
