# Fire World hub rebuild — BUILD NOTES (v4 "Night Arcade")

**Date:** 2026-10-28 · **Status:** PREVIEW ONLY — not deployed, not pushed to GitHub, no other page touched.
**Output:** `fire-world-v4.html` (89,440 bytes, sha256 begins `35b9117a1733f742`)
**Source of truth:** `live-fire-world.html` (the live hub fetched 2026-10-28, 91,640 bytes). The rebuild was generated from it programmatically: card blocks, shop section, locker section, controls, featured trio, footer, and script blocks were extracted from the source, not retyped.

## What Jeff asked for, and what changed

Jeff: tear down the UI and rebuild it — games untouched, only the hub's look/layout. His open complaint (Oct 24): the Games / Shop / My Chest tab system and slide-over drawers **hide the games**.

- **Tabs and drawers are GONE.** No `.fb-tab` buttons, no tab controller, no off-canvas panels, no hash-based panel switching. Everything is one continuous page.
- **New page flow:** slim top bar (brand, balance pill, Shop / Tour / Sign out + three jump pills: All Games / Shop / My Chest) → compact hero ("FIRE BABYS" big, download-the-full-game button, news strips) → **sticky catalog toolbar** (search, filter chips, jump-to-number strip, live "N of 58 games" count, Clear button) → **the full game catalog grid, in the open, in page flow** → featured trio (3D Creator, SPLASH, Arena) → **Shop as a full static section** → **My Chest ("Your Locker") as a full static section** → footer.
- **Completely new look:** "Night Arcade" identity replaces "Toy-Box Sky Arcade" — deep navy (`#060d1d`) background, flame-orange + aqua neon accents, chunky numbered cards with rotating neon thumbnail gradients, flame-gradient hero title. No light/cream surfaces anywhere.
- **Search filters in place:** typing filters the grid live with a visible count; the new **✕ Clear search & filters** button (`#fb-search-reset`) resets query + chip to All and re-runs the filter. Default state shows everything.
- **Audience wording:** no "for kids" claim anywhere new; hero says "for everyone." No power stats added; the Arena card copy is byte-identical to the live source (gear = style).

## Game inventory — 58 cards relisted, 0 dropped, 0 invented

Programmatic diff of source vs v4 (data-num, data-name, data-tags, title, description, play href, in order): **identical — 58 of 58.**

- Display numbers **1–57** plus **#60** (the Arena) = **58 `.card` entries** in `#game-grid`.
- #1 `/fire-world/slingshot-cascade/` · #2 `/fire-world/rukos-panic-dash/` · #3 `/fire-world/game-02-blaze-runner.html` · #4–#55 = the 52 games under `/fire-world/games/` · #56 `/fire-world/tristans-dark-knight-rescue/` · #57 `/fire-world/trinitys-holy-lightning-rescue/` · #60 `/fire-world/games/game-60-fire-babys-arena.html`.
- Featured trio (separate from the 58): `/3d.html`, `/play.html`, Arena href repeated — all preserved.
- Also preserved: offline zip link `/fire-babys-offline.zip` with its SHA-256 fingerprint text, safety hub link (https://safety.firebabys.io), Fourthwall store links (11 in source, 11 in v4), all 10 merch cards with `/shop-img/` images.
- Note: the page `<title>`/meta description now say **58** games to match the actual card count (source said 57 while shipping 58 cards). The download blurb still says "All 57 games in ONE file" — that is the offline zip's own copy from the source, left untouched.

## Preserved hooks (verified by diff, not by eye)

- **Inline scripts:** the shops IIFE and the locker IIFE are **byte-identical** to the live source (`window.FBShop`, `window.FBLocker`, economy/migration, starter kit, equip, Math-Check status line all untouched).
- **External scripts, same tags, same order:** `https://firebabys.io/auth-gate.js` (synchronous, in head), `dark-knight.js` (defer, in head), `onboarding.js` (before the hub script).
- **Every element ID from the source is present** (`fbshop-navbal`, `fb-tour-replay`, `fb-signout-btn`, `panel-games`, `shop`, `fbshop-gatestatus`, `gameshop`, `fbshop-bal`, `fbshop-items`, `fbshop-boostline`, `merchshop`, `locker`, `lockerbox`, `fb-locker-body`, `fb-game-search`, `fb-chips`, `fb-jump`, `fb-gcount`, `fb-noresults`, `game-grid`, …). The **only ID added** is `fb-search-reset` (the new Clear button). No duplicate IDs in markup.
- **All localStorage keys** the source scripts use are still used (`fb_coins`, `fb_gems`, `fb_inventory`, `fb_shop_boost`, `fb_economy_v2`, `fb_gate_unlock_until`, auth/onboarding keys via their own scripts).
- **Dynamic classes** the scripts create/rely on are all styled in the new CSS: `shopgrid/shopitem/em/nm/ds/fx/buybtn(+owned/confirm)`, `balpill`, `shopsec-title`, `boxsub`, `#fbshop-toast`, and the onboarding tour's full `.fbt-*` set (restyled to the night theme).
- **No inline event-handler attributes** in the markup (same as source — CSP-safe pattern kept).

## Altered hooks (the complete list — each proven in the render test)

1. **Tab controller retired** (the one hook that cannot coexist with the design law): `PANELS`, `activate()`, `fromHash()`, the `hashchange` listener, and the `.fb-tab` button handling were removed from the hub UI script. `#shop` / `#locker` / `#game-grid` are now native anchor targets (top-bar jump pills + the pre-existing Shop nav link). `data-panel` attributes were kept on all three sections.
2. **`#panel-games` scope narrowed:** in the source it wrapped the entire page body (because of the panel nesting); in v4 it wraps the catalog + featured sections only. Nothing references it except the retired controller.
3. **Jump-to-number handler refactored** to call a shared `clearFilters()` (drops its old `activate('games')` call); behavior otherwise identical (clears search/filter, scrolls the card into view centered, flashes it). **New:** the Clear button calls the same `clearFilters()`.
4. **Shop/Locker wrappers:** opening tags changed from `<div class="wrap fb-panel">` to `<section class="wrap hub-section">` — IDs, `data-panel`, and all inner markup unchanged; the drawer CSS (fixed position, off-canvas transform, `.fb-on`) is simply not carried over.
5. **Head metadata:** title/description game count 57 → 58 (see above); `theme-color` `#ff6a1a` → `#060d1d`; added `color-scheme: dark`. Auth/Dark-Knight script tags untouched.

## Render test (Playwright/Chromium, 390×844 portrait, mobile emulation)

**Harness disclosure (read this before trusting the screenshots):** the sandbox browser has no route to the public internet (egress proxy refuses the tunnel — verified `ERR_TUNNEL_CONNECTION_FAILED` / TLS `EPROTO`), so the page was served locally from a staging root containing **the site's own deployed asset files** from `~/workspace/.deploy/` (the same tree the live hub was fetched from — its `fire-world.html` is byte-size-identical to the live source): real `auth-gate.js`, `dark-knight.js`, `onboarding.js`, `seasonal.js`, `i18n.js`, `landscape.js`, shop images, icons. Absolute `https://firebabys.io/*` requests were fulfilled from those files. The auth Worker was stubbed with response shapes its clients already handle: `/presence` → no arrival; `/locker/get` → unknown-token answer; `/auth/session` → a **transient 500**, which makes the real gate take its own documented F1 trust-cache path with a seeded throwaway local profile (token kept, page uncloaked, sign-out wired). No page code was patched or bypassed.

**Results:**
- First load: document uncloaked by the real gate, **no sign-in overlay, no tabs (0 `.fb-tab` elements)**, **58/58 cards in the DOM and visible**, count reads **"58 of 58 games"**, game cards already in the first screen (`shot-first.png`).
- Search: typing **"lava" → "4 of 58 games"**, visible cards #19, #25, #35, #52 (`shot-search-lava.png`). Clicking **Clear** → search emptied, **"58 of 58 games"**, all 58 visible again.
- Chips: **Racing → "5 of 58 games"**; back to All restores.
- Jump strip: **#57** scrolls its card fully into view (settled top 471 / bottom 757 of 844).
- Anchors: **Shop** jump lands the section in view (top ≈171, below the sticky toolbar); **My Chest** lands at top ≈250 — the page cannot scroll further (locker + footer end the page), heading and content fully visible (`shot-chest.png`).
- Shop section renders live: **16 shop items, 10 merch cards**, balance pill migrated to **🪙 100 · 💎 5** (`shot-shop.png`). `window.FBShop` and `window.FBLocker` both present as objects.
- **Onboarding tour works:** clicking Tour opened the real tour — "STEP 1 · FIRST THINGS FIRST / 🎨 CREATE YOUR FIRE BABY", personalized with the profile name (`shot-tour.png`). (Skip-close was clicked but its completion posts to the stubbed Worker; close-after-skip was not asserted.)
- **My Chest content:** with the stubbed unknown-token answer, the locker rendered its own production fallback copy ("Your locker couldn't be reached just now…") — that is the script working as designed on an unreachable locker, not a v4 defect. Live, signed in, it fetches the real locker the same way the current hub does (script byte-identical).
- **Console:** zero page errors, zero warnings, zero failed requests. **Exactly one console error**, verbatim: `Failed to load resource: the server responded with a status of 500 (Internal Server Error)` — that is the harness's own deliberate transient-500 stub on `/auth/session` (see disclosure above), not a page defect.
- The Halloween banner/decorations in the screenshots are the site's own `seasonal.js` (live October behavior, also present on today's live hub) — not part of v4.

**Screenshots:** `shot-first.png` (first screen) · `shot-catalog.png` (mid-catalog, cards #27–#32) · `shot-shop.png` (Shop section) · `shot-chest.png` (My Chest section) · `shot-search-lava.png` (search filtered to 4) · `shot-tour.png` (onboarding tour, bonus proof).

## Before any deploy (not done here, per orders)

- The enforced A+ CSP means the deploy must regenerate the hash map for the new inline CSS/JS via `~/workspace/a-plus-project/` (audit → gen_hashmap → build_worker enforce → deploy_worker enforce), or the strict policy will block the new inline blocks.
- The offline-zip blurb's "57 games" wording and the zip itself were left exactly as the live source has them.
