# Fire World Hub — v3 Staging Redesign ("Toy-Box Sky Arcade")

**Status: STAGING ONLY.** Built in `~/workspace/ui-redesign-v3/`. Nothing deployed;
`~/workspace/.deploy/` and the GitHub repo were not touched.
Rebuild anytime with `python3 build.py` (source: `~/workspace/.deploy/fire-world.html`).

## Why this build exists
Jeff's order (2026-10-24): "start all over with the website design… change everything
around, not hide all 60 of the games." The 2026-10-23 hub put the games, the Shop and
My Chest into a tab/panel system (`.fb-panel{display:none}` + a `:has()` hotfix rule
that hid the games' container children whenever Shop/Chest was selected). v3 removes
that entire mechanism.

## The new design (fresh direction — NOT the unapproved "Volcanic Arcade" v2)
Bright, light "toy-box / sticker-book" arcade look, designed phone-first:
warm paper background with a subtle dot pattern, chunky 3px ink outlines, hard offset
shadows, big pill buttons, sunny hero band, white game cards whose emoji thumbs rotate
through five sky/sun/grass/grape/pink tints. Dark volcanic theme is gone entirely.

## How the design laws are met
1. **Games always visible.** The games grid is ordinary page flow. There is NO CSS
   rule anywhere in v3 that can display:none the grid or `#panel-games` — the old
   `.fb-panel{display:none}` rule and the `:has()` hiding hotfix are deleted, not
   replaced. All 58/58 tiles are rendered on first load with zero interaction —
   and after the tightening pass below, the first row of numbered tiles is also
   inside the *first viewport* on phone and desktop (see "Tightening pass").
2. **Shop / My Chest as drawers.** `#shop` and `#locker` keep their exact markup,
   IDs, classes and contents, and are restyled as slide-over drawers:
   bottom sheet (max 86dvh) on phone, right rail (480px) on desktop ≥900px.
   They open/close via the *same* `.fb-on` class the untouched hub script already
   toggles, and via the existing Games/Shop/My Chest buttons and `#shop`/`#locker`
   hash links. Opening a drawer never hides, moves, or un-renders the grid —
   verified: 58/58 tiles still rendered while each drawer is open. A page dim
   (`body:has(...)::after`) sits *below* the sticky nav, so the Games button —
   the drawer's close control — stays bright and clickable above the drawer.
   Body scroll locks while a drawer is open (pure CSS `:has()`).
3. **Everything else preserved.** See "Preservation" below.

## What actually changed — the honest version
**Only the two `<style>` blocks in `<head>` were replaced** (merged into one new
stylesheet). Everything else is byte-for-byte the production file:

- `<body>…</body>`: **byte-identical** (build script asserts this on every build).
- All 6 `<script>` blocks (auth-gate loader, dark-knight, shops, locker,
  onboarding loader, hub UI): **byte-identical, same order**.
- All 84 hrefs: identical multiset. All 20 static element IDs: identical.
- Head metadata (title, OG, manifest, icons): untouched.

Markup restructuring was *permitted* but deliberately *not* used: the shops/locker/
hub scripts address everything by ID and class, so a CSS-only rebuild gives a
genuinely new design with zero functional risk. The tab buttons remain in the nav —
they are now plain controls (Games = show grid/close drawers), no longer panels.

## Tightening pass (2026-10-24, CSS-only — body still byte-identical)
The first build's render test counted tiles *rendered in the DOM* — but on a
390×844 phone the first screen was still all chrome (nav, hero, download
button, fingerprint, promo banners) and **zero** game tiles were inside the
first viewport: the grid started at y≈1839. That is the exact complaint this
redesign exists to fix, so the header stack was compacted (grid itself never
moved, nothing was removed from the DOM):

- Nav: slimmer rows; the three section pills fit one row on phone; the Home
  and Fire World links rest at ≤719px only (the brand is the home link, and
  this page is Fire World — both links return at ≥720px).
- Hero: padding/heading cut, subtext visually clamped to one line on phone,
  DOWNLOAD shrunk to a one-line button, the SHA fingerprint paragraph set
  tiny (9px on phone; full text still in the DOM), creator pill slimmed.
  The fingerprint block also got a wider measure on desktop (780px) so the
  hash fits on one line there.
- Promo strips: shorter bars, text clamped to ≤2 lines on phone.
- Games controls: category chips became a single swipeable rail at every
  width (they wrapped to ~5 rows on phone), smaller jump-number buttons.
- Featured trio: on phone it's a swipeable shelf (~88px) instead of a
  ~430px stack; descriptions clamp to 1 line on phone, 2 lines on desktop.
- Cards on phone: smaller thumbs (60px), titles ≤2 lines, descriptions
  ≤3 lines, lessons ≤2 lines (full text remains in the DOM).

**Corrected metric — tiles intersecting the initial viewport, no scrolling**
(added to `render_test.py` as `phone_first_viewport` / `desktop_first_viewport`):

| Viewport | Before | After |
|---|---|---|
| Phone 390×844 | grid top y=1839 → **0 tiles** | grid top y=707 → **2 tiles** (the full first row of the 2-col grid: GAME #1 + GAME #2, thumbs + titles on screen); "58 of 58 games" count line at y=590, in view |
| Desktop 1440×900 | grid top y=1137 → **0 tiles** | grid top y=829 → **4 tiles** (the full first row of the 4-col grid, thumb bands on screen); count line at y=668, in view |

Note: the page markup has no separate "grid heading" element — the section's
heading is the hero H1 plus the "58 of 58 games" count line (`#fb-gcount`),
which sits directly above the grid and is inside the first viewport at both
sizes. Two full rows on phone was not reachable without deleting hero /
download content outright; one full row + the count line is where it lands.

## Tests (in `test/`, rerunnable)
- `check_integrity.py` → `integrity-results.json`: href multiset equal (84/84),
  ID multiset equal (20/20), all 6 script blocks byte-identical, body byte-identical.
  **ALL PASS.**
- `render_test.py` → `render-results.json` (Playwright, local `file://`):
  - First load, 390×844: **58 of 58 game tiles rendered/visible** (games #1–57 plus
    the #60 Arena card; the page's own copy says "57 games").
  - Desktop 1440px first load: 58/58.
  - Click Shop (real button, untouched hub script): `#shop` gains `.fb-on`, drawer
    on-screen, shop script had rendered 16 items into `#fbshop-items`; grid still 58/58.
  - Click My Chest: locker drawer on-screen, shop drawer closed; grid still 58/58.
  - Click Games: both drawers closed (`visibility:hidden`); grid still 58/58.
  - First-viewport gates (tightening pass): phone ≥2 tiles and desktop ≥4
    tiles intersecting the initial viewport — **PASS** (2 and 4; full first
    rows at both widths).
  - Zero page errors from the inline scripts. **ALL PASS.**
- Screenshots: `shot-phone.png` (first load), `shot-phone-games.png` (grid),
  `shot-desktop.png` (1440px), plus `shot-phone-shop.png` (drawer open, bonus).

## Caveats — what could NOT be fully preserved / verified
1. **No ✕ button inside the drawers.** Adding one would require new markup/JS.
   Closing is: tap **Games** (or tap Shop/Chest again) — the buttons stay visible
   above the dim at all times. The dim backdrop is visual only; clicking it does
   not close the drawer (no existing JS hook for that).
2. **External scripts not exercised locally.** `auth-gate.js` (absolute
   firebabys.io URL), `dark-knight.js` and `onboarding.js` (relative) can't load
   under `file://` in this sandbox (proxy), so the auth gate, math check, tour and
   Dark Knight watcher were not run end-to-end here. Their loader tags are
   byte-identical, every ID/hook they use is unchanged, and the tour's `.fbt-*`
   classes are fully restyled in-theme. They should be smoke-tested once this is
   served over HTTP before any go-live.
3. **Desktop drawer** uses the identical `.fb-on` mechanism and was rendered at
   1440px, but the click-through drawer test was executed at phone size; the
   desktop drawer also carries a fixed 118px top padding to clear the sticky nav
   (nav height assumption — visually fine at 1440px first load).
4. **Two dark-theme colors baked into JS/inline styles** (locker helper spans
   `color:#d8b89a` in the locker script's HTML strings, and the `#fbshop-gatestatus`
   inline `color:#ffd9ae`) are recolored via CSS `!important` overrides because the
   scripts/markup themselves were not allowed to change. Works, but it's a patch
   on a patch — worth cleaning up properly if scripts are ever reopened.
5. **Merch photos** use absolute `/shop-img/…` paths (unchanged from production):
   they 404 under `file://` staging and will resolve normally when served from the
   site root.
6. Search/filter/jump still hide individual cards **by user action** (that's the
   untouched hub script's filtering feature, same as production) — the design
   itself hides nothing on load.
7. **Tightening-pass visual clamps (phone only unless noted):** the hero
   subtext shows 1 line, promo strips ≤2 lines, featured descriptions
   1 line (2 on desktop), card titles ≤2 lines, card descriptions ≤3 lines,
   card lessons ≤2 lines, and the Home / Fire World nav links don't render
   at ≤719px. In every case the full text/markup is unchanged in the DOM —
   these are `-webkit-line-clamp` / responsive-display choices so the games
   can own the first screen, not content removals. If any clamp displeases,
   it's a one-line CSS change in `build.py`.
