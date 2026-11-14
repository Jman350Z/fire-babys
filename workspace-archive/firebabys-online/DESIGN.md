# Fire Babys Rebellion — firebabys.online — Design Notes

Built 2026-10-28 on Jeff's order: **the site first, the game after.** This is the
complete, deploy-ready home/world site for "Fire Babys Rebellion," a Metal Gear
Solid-style stealth action-adventure. The playable game build is a later phase
and mounts into `rebellion.html` (see "Game mount point" below). Nothing here
is deployed — the tree is staged and ready for the go-live steps in DEPLOY.md.

## What was built

### Pages (`site/`)

| File | Purpose |
| --- | --- |
| `index.html` | Home. Hero ("FIRE BABYS REBELLION" + the invasion premise), "The Homeland Is Under Attack" story section (The Breach / The Occupation / The Answer), mode cards (Single Player / Online Co-Op), featured heroes strip (Blaze, Ruko, Aqua, Splash), a 4-step Mission Briefing teaser, footer linking the firebabys.io arcade. |
| `rebellion.html` | The game page. Full story briefing ("Why We Fight"), How It Plays field manual (stealth + vision cones, rescue, sabotage, and the Gear Up transformation step), hero-select preview grid with all 12 heroes and a working element filter, modes detail, a 3-phase roadmap, and the play area placeholder (`#game-root`) where the playable build will mount. |
| `heroes.html` | Full roster: 12 hero cards (name, element, role, signature feature, one-line specialty) with element filter, plus the villains section — the Slimers (with the smother canon) and the Bonehead crew. |
| `404.html` | Branded error page ("Off the Patrol Route"), `noindex`, same nav/footer. |
| `robots.txt` | Allow-all + sitemap pointer (firebabys.online). |
| `sitemap.xml` | The three public pages on firebabys.online URLs, lastmod 2026-10-28. |
| `site.webmanifest` | PWA manifest: "Fire Babys Rebellion", navy `#060b1d` background, flame `#ff6a1a` theme, icon-192/512. |
| `icon-192.png`, `icon-512.png` | Copied verbatim from the firebabys.io tree (`~/workspace/.deploy/`). |

### Shared assets (`site/assets/`)

| File | Purpose |
| --- | --- |
| `site.css` | All site-wide styling: night palette (deep navy `#060b1d`, flame orange `#ff6a1a`/`#ffa53a`, aqua `#2fd8e0`), system-font stack only, sticky header + mobile nav, hero, cards, mode cards, hero roster cards with CSS-gradient element orbs, filter bar, briefing lists, villain cards, footer, 404. Mobile-first, designed at 390px portrait, breakpoints at 560/640/760/860/960px. `prefers-reduced-motion` respected. |
| `site.js` | All behaviour, zero dependencies: marks `<html class="js">` (so CSS hides scroll-reveal targets only when JS can reveal them), mobile nav toggle with `aria-expanded` handling and close-on-link-tap, IntersectionObserver scroll reveals (with no-IO fallback), live footer year, and the roster element filter (All / Fire / Water + a live "Showing X of 12 heroes" count, `aria-pressed` states) used by both `rebellion.html` and `heroes.html`. |
| `rebellion.css` | Game-page-only styling: the `#game-root` play frame (dashed deploy frame over a blueprint grid), briefing prose, numbered how-it-plays steps, roadmap list. |

## A+ standard — how it was applied

Mirrors the firebabys.io standard, verified by grep over the finished tree:

- **Zero inline `<script>` blocks** — every page loads exactly one external
  script, `assets/site.js`, with `defer`.
- **Zero inline `<style>` blocks, zero `style=` attributes, zero inline event
  handlers** anywhere in the HTML.
- **Zero external assets** — no CDNs, no webfonts, no third-party images. The
  only outbound URL in the markup is the navigation link to
  `https://firebabys.io/`. CSS contains no `@import` and no `url()` fetches.
- Because all CSS/JS is external and same-origin, the strict CSP in DEPLOY.md
  needs **no hashes and no `'unsafe-inline'`** — `script-src 'self'` and
  `style-src 'self'` just work, exactly the property that makes the policy
  trivially enforceable.
- Semantic HTML5 (`header/nav/main/section/article/footer`), one `h1` per page,
  `aria-current` on the active nav item, labelled nav regions, keyboard-safe
  buttons for interactive controls.

## Canon — how Jeff's world rules were applied

- **The premise is Jeff's, verbatim in spirit:** the Underworld attacked the
  Fire Babys homeland; one hero goes in to stop the bad guys. World names kept:
  the homeland, the Caldera, Fire World.
- **All 12 heroes present with their locked signatures:** Blaze (star crown),
  Ruko (black bandana), Boulder (rock plates), Sizzle (archer), Cinder
  (blue/purple flame tips), Lord Inferno (commander); Aqua (star crown),
  Splash (bandana + droplet), Pebble (ice-rock), Drift (archer), Bubble
  (splash crown), Lord Tidal (commander). Cards carry **role + specialty in
  words only — no power stats, no numbers, no gear stats anywhere.**
- **Transformation Law, stated on both the heroes page and the field manual:**
  in ball form a hero is a round elemental ball; the moment one puts on
  tactical gear they morph into a sleek athletic humanoid of living fire or
  water, keeping elemental texture, flame/water hair, glowing eyes and face.
  No "ball in a suit" copy or imagery anywhere — the CSS orbs are plain
  elemental spheres (peace-form portraits), and gear is always described as
  triggering the morph.
- **Slimer canon:** they are **smothered** (Caldera ash and earth), **never
  sprayed** — stated as a "Rebellion rule" on the heroes page and in the
  sabotage step of the field manual, with the reason (water spreads oil).
- **Boneheads are goofy, never scary-gory:** wobbly patrols, fall apart when
  startled, argue with their own bones. The stealth fantasy is out-waiting a
  patrol, not fighting one.
- **Heroes are gold:** never harmed, never the butt of a joke — the comedy is
  aimed at the Boneheads. Footer on every page: "All heroes report home safe."
- **Audience wording:** the game/site is described as "for everyone" (meta
  descriptions, manifest, footer). The words "for kids" appear nowhere.
- **No commerce:** nothing to buy, no shop links. The only off-site link is to
  the firebabys.io arcade ("Play the 58-game arcade"), as ordered.
- **Honest modes:** Single Player is the Phase 1 campaign. Online Co-Op is
  presented as **Phase 2 — on the roadmap**, with explicit "not live yet / no
  fake lobbies" copy in both mode cards. There is no fake lobby, no fake
  player counts, no fake game.

## Game mount point (for the next phase)

`rebellion.html` contains `<div class="game-root" id="game-root">` inside a
`.game-frame` in the `#play` section, with an HTML comment marking it. The
playable build should mount its canvas inside `#game-root`, replacing the
"MISSION 1 — DEPLOYING SOON" placeholder card. **Do not rename the id** — the
future game loader targets it. Keep the game build to the same A+ rules:
external `.js`/`.css` only, self-hosted assets only, so the DEPLOY.md CSP
continues to hold without modification.

## Verification

- Grep audit of the finished tree: 0 inline scripts, 0 style blocks, 0 `style=`
  attributes, 0 inline handlers, 0 external asset references.
- Playwright/Chromium screenshots at 390×844 in `~/workspace/firebabys-online/`:
  `shot-home.png` (home first screen), `shot-home-story.png` (home story
  section), `shot-rebellion.png` (game page), `shot-heroes.png` (roster).
  Console status is reported with the screenshots.
