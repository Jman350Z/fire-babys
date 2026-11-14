# Fire Babys SEO Pack — 2026-10-23
Audit of the staged site tree (`~/workspace/.deploy/`, the tree that ships in the pending GitHub push) plus ready-to-paste improvements. **No `.html` files were edited.** The JSON-LD snippets in §4 are kept as text in this doc on purpose: they get applied centrally later because every inline script on firebabys.io must pass through the CSP hash pipeline.
Positioning note: all new copy follows the house rule — Fire Babys is **for everyone**. No "for kids" / "kids' game" wording anywhere in this pack; fire-safety education wording is used instead.
Companion files shipped with this pack:
- `~/workspace/.deploy/sitemap.xml` — 69 URLs (every public page; see §5 for the one exclusion)
- `~/workspace/.deploy/robots.txt` — allow-all, points at the sitemap
- Both files were appended to `~/workspace/big-deploy-2026-10-21/github-push/push-paths.json` (77 → 79 entries)

## 1. Current state — the 8 key pages (quoted from the files)
### index.html
- **Title (53 chars):** `Fire Babys — The Fire-Safety Battle Game for Everyone`
- **Meta description (192 chars):** `Fire Babys is a free battle game for everyone that teaches fire safety — how to prevent house fires and what to do when a fire is nearby. Play the 2D battler, the 3D arena, and the open world.`
- **OG tags present:** og:title, og:description, og:type, og:image
- **Twitter tags present:** twitter:card, twitter:title, twitter:description
- **Note:** Current description is 192 chars — too long, Google truncates it. No `og:url`, no `twitter:image`.
### fire-world.html
- **Title (32 chars):** `Fire World — 57 Fire Babys Games`
- **Meta description (79 chars):** `Play 57 free Fire Babys games. Arcade fun for everyone by Jman350Z & fire team.`
- **OG tags present:** og:title, og:description, og:type, og:url, og:image
- **Twitter tags present:** twitter:card, twitter:title, twitter:description, twitter:image
- **Note:** Best-equipped page on the site (full OG + Twitter incl. image). Description is thin (79 chars) and repeats the title.
### blog.html
- **Title (32 chars):** `Fire Babys Blog — Fire Awareness`
- **Meta description (134 chars):** `Fire Babys blog: fire-safety for families, and how our game supports real fire awareness programs with US fire departments in schools.`
- **OG tags present:** og:title, og:description, og:type, og:url, og:image
- **Twitter tags present:** twitter:card, twitter:title, twitter:description, twitter:image
- **Note:** Full OG + Twitter set present. Title/description work, but neither says "tips" — the word people actually search.
### characters.html
- **Title (32 chars):** `Meet the Characters — Fire Babys`
- **Meta description (122 chars):** `Meet the Fire Babys crew: Ruko, Boulder, Sizzle, Cinder, and Blaze — plus the Wildfire Legion villains they're up against.`
- **OG tags present:** og:title, og:description, og:type, og:image
- **Twitter tags present:** twitter:card
- **Note:** OG present, but Twitter card has `twitter:card` only — no twitter:title/description/image.
### parents.html
- **Title (24 chars):** `For Parents — Fire Babys`
- **Meta description (150 chars):** `Fire Babys is built safe for everyone: no chat, no ads, no data collected, plays offline. Learn about the real fire-safety curriculum inside the game.`
- **OG tags present:** og:title, og:description, og:type, og:image
- **Twitter tags present:** twitter:card
- **Note:** OG present; Twitter card is `twitter:card` only — no twitter:title/description/image.
### arcade.html
- **Title (52 chars):** `The Fire Babys Arcade — Games Built by the Community`
- **Meta description (57 chars):** `Play community-built Fire Babys game modes in the Arcade.`
- **OG tags present:** none
- **Twitter tags present:** none
- **Note:** NO Open Graph or Twitter tags at all. Description is only 55 chars.
### play.html
- **Title (10 chars):** `Fire Babys`
- **Meta description:** — MISSING —
- **OG tags present:** none
- **Twitter tags present:** none
- **Note:** Weakest page on the site: title is just "Fire Babys", NO meta description, NO OG/Twitter tags — yet it is a flagship game page.
### 3d.html
- **Title (26 chars):** `Fire Babys 3D — Open World`
- **Meta description:** — MISSING —
- **OG tags present:** none
- **Twitter tags present:** none
- **Note:** NO meta description, NO OG/Twitter tags.

## 2. Improved title + meta description (ready to paste)
Limits held: every title ≤ 60 chars, every description ≤ 155 chars (verified by script).
### index.html
```html
<title>Fire Babys — Free Online Games That Teach Fire Safety</title>
<meta name="description" content="Play Fire Babys free in your browser — a 2D battler, 3D arena and open world, plus 57 mini-games that teach real fire safety. No downloads, no ads.">
```
Title: 53 chars · Description: 147 chars
### fire-world.html
```html
<title>Fire World — Play 57 Free Fire Babys Games Online</title>
<meta name="description" content="Play all 57 Fire Babys games free in your browser — racers, puzzlers and defenders that teach real fire safety while you play. No downloads, no ads.">
```
Title: 49 chars · Description: 148 chars
### blog.html
```html
<title>Fire Babys Blog — Fire Safety Tips & Fire Awareness</title>
<meta name="description" content="Fire-safety tips, escape planning and fire awareness from the Fire Babys team — and how our games support real fire-department programs in schools.">
```
Title: 51 chars · Description: 147 chars
### characters.html
```html
<title>Meet the Fire Babys Characters — Heroes & Villains</title>
<meta name="description" content="Meet the Fire Babys crew — Ruko, Boulder, Sizzle, Cinder and Blaze — and the Wildfire Legion villains they battle across 57 free fire safety games.">
```
Title: 50 chars · Description: 147 chars
### parents.html
```html
<title>For Parents — Fire Babys Safety, Privacy & Curriculum</title>
<meta name="description" content="Why Fire Babys is safe for everyone: no chat, no ads, no data collected, plays offline — plus the real fire-safety curriculum built into the games.">
```
Title: 53 chars · Description: 147 chars
### arcade.html
```html
<title>Fire Babys Arcade — Play Free Community Games Online</title>
<meta name="description" content="Play community-built Fire Babys game modes free in your browser. Every Arcade game is hand-reviewed by the Fire Babys team before it goes live.">
```
Title: 52 chars · Description: 143 chars
### play.html
```html
<title>Fire Babys 2D Battle — Play the Formation Battler Free</title>
<meta name="description" content="Play the original Fire Babys 2D formation battler free in your browser — deploy your squad, merge troops and capture the enemy castle across 6 towns.">
```
Title: 54 chars · Description: 149 chars
### 3d.html
```html
<title>Fire Babys 3D — Open World Game, Play Free in Browser</title>
<meta name="description" content="Explore the Fire Babys 3D open world free in your browser: story, rescue and survival modes, tournaments and worldwide leaderboards. No downloads.">
```
Title: 53 chars · Description: 146 chars

## 3. Open Graph + Twitter card blocks (ready to paste)
### index.html (homepage) — replaces the current block; adds `og:url` and `twitter:image`, upgrades the card to `summary_large_image`
```html
<meta property="og:title" content="Fire Babys — Free Online Games That Teach Fire Safety">
<meta property="og:description" content="Play Fire Babys free in your browser — a 2D battler, 3D arena and open world, plus 57 mini-games that teach real fire safety. No downloads, no ads.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://firebabys.io/">
<meta property="og:image" content="https://firebabys.io/icon-512.png">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Fire Babys — Free Online Games That Teach Fire Safety">
<meta name="twitter:description" content="Play Fire Babys free in your browser — a 2D battler, 3D arena and open world, plus 57 mini-games that teach real fire safety. No downloads, no ads.">
<meta name="twitter:image" content="https://firebabys.io/icon-512.png">
```
### fire-world.html — replaces the current block; text aligned with the improved title/description
```html
<meta property="og:title" content="Fire World — Play 57 Free Fire Babys Games Online">
<meta property="og:description" content="Play all 57 Fire Babys games free in your browser — racers, puzzlers and defenders that teach real fire safety while you play. No downloads, no ads.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://firebabys.io/fire-world.html">
<meta property="og:image" content="https://firebabys.io/icon-512.png">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Fire World — Play 57 Free Fire Babys Games Online">
<meta name="twitter:description" content="Play all 57 Fire Babys games free in your browser — racers, puzzlers and defenders that teach real fire safety while you play. No downloads, no ads.">
<meta name="twitter:image" content="https://firebabys.io/icon-512.png">
```

## 4. JSON-LD structured data (snippets — do NOT paste by hand; applied centrally via the CSP hash pipeline)
### Homepage (index.html) — Organization + WebSite
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://firebabys.io/#organization",
      "name": "Fire Babys",
      "url": "https://firebabys.io/",
      "logo": "https://firebabys.io/icon-512.png",
      "description": "Fire Babys makes free browser games for everyone that teach real fire safety — how to prevent house fires and what to do when a fire is nearby.",
      "sameAs": [
        "https://discord.gg/sfdsWKzhWh",
        "https://firebabyofficial.substack.com"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://firebabys.io/#website",
      "name": "Fire Babys",
      "url": "https://firebabys.io/",
      "publisher": {
        "@id": "https://firebabys.io/#organization"
      },
      "inLanguage": "en"
    }
  ]
}
</script>
```
### Fire World hub (fire-world.html) — ItemList of all 58 games linked from the hub (57 numbered games + the Arena), in hub order, names taken from each game page's own `<title>`
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Fire World — 57 Fire Babys Games",
  "description": "Every Fire Babys game in Fire World, free to play in the browser.",
  "numberOfItems": 58,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Fire Babys Slingshot Cascade",
      "url": "https://firebabys.io/fire-world/slingshot-cascade/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Fire Babys Arena",
      "url": "https://firebabys.io/fire-world/games/game-60-fire-babys-arena.html"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Ruko's Panic Dash",
      "url": "https://firebabys.io/fire-world/rukos-panic-dash/"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "Blaze Runner",
      "url": "https://firebabys.io/fire-world/game-02-blaze-runner.html"
    },
    {
      "@type": "ListItem",
      "position": 5,
      "name": "Cinder's Ice Rink Chaos",
      "url": "https://firebabys.io/fire-world/games/game-04-cinders-ice-rink-chaos.html"
    },
    {
      "@type": "ListItem",
      "position": 6,
      "name": "Lord Inferno's Ballista Siege",
      "url": "https://firebabys.io/fire-world/games/game-05-lord-infernos-ballista-siege.html"
    },
    {
      "@type": "ListItem",
      "position": 7,
      "name": "Blaze's Magma Bounce",
      "url": "https://firebabys.io/fire-world/games/game-06-blazes-magma-bounce.html"
    },
    {
      "@type": "ListItem",
      "position": 8,
      "name": "Ruko's Turbo Drift",
      "url": "https://firebabys.io/fire-world/games/game-07-rukos-turbo-drift.html"
    },
    {
      "@type": "ListItem",
      "position": 9,
      "name": "Sizzle's Spark Jump",
      "url": "https://firebabys.io/fire-world/games/game-08-sizzles-spark-jump.html"
    },
    {
      "@type": "ListItem",
      "position": 10,
      "name": "Ember Cascade",
      "url": "https://firebabys.io/fire-world/games/game-09-ember-cascade.html"
    },
    {
      "@type": "ListItem",
      "position": 11,
      "name": "Caldera Climb",
      "url": "https://firebabys.io/fire-world/games/game-10-caldera-climb.html"
    },
    {
      "@type": "ListItem",
      "position": 12,
      "name": "Magma Trench Dodge",
      "url": "https://firebabys.io/fire-world/games/game-11-magma-trench-dodge.html"
    },
    {
      "@type": "ListItem",
      "position": 13,
      "name": "Volcanic Pinball",
      "url": "https://firebabys.io/fire-world/games/game-12-volcanic-pinball.html"
    },
    {
      "@type": "ListItem",
      "position": 14,
      "name": "Pyra Prime Defense",
      "url": "https://firebabys.io/fire-world/games/game-13-pyra-prime-defense.html"
    },
    {
      "@type": "ListItem",
      "position": 15,
      "name": "Sparky Speedway",
      "url": "https://firebabys.io/fire-world/games/game-14-sparky-speedway.html"
    },
    {
      "@type": "ListItem",
      "position": 16,
      "name": "Cinder's Melt-Down",
      "url": "https://firebabys.io/fire-world/games/game-15-cinders-melt-down.html"
    },
    {
      "@type": "ListItem",
      "position": 17,
      "name": "Inferno Drop",
      "url": "https://firebabys.io/fire-world/games/game-16-inferno-drop.html"
    },
    {
      "@type": "ListItem",
      "position": 18,
      "name": "Flame Sprint 2D",
      "url": "https://firebabys.io/fire-world/games/game-17-flame-sprint-2d.html"
    },
    {
      "@type": "ListItem",
      "position": 19,
      "name": "Blaze's Thermal Run",
      "url": "https://firebabys.io/fire-world/games/game-18-blazes-thermal-run.html"
    },
    {
      "@type": "ListItem",
      "position": 20,
      "name": "Ruko's Lava Leap",
      "url": "https://firebabys.io/fire-world/games/game-19-rukos-lava-leap.html"
    },
    {
      "@type": "ListItem",
      "position": 21,
      "name": "Boulder's Fortress",
      "url": "https://firebabys.io/fire-world/games/game-20-boulders-fortress.html"
    },
    {
      "@type": "ListItem",
      "position": 22,
      "name": "Sizzle's Puzzle Snap",
      "url": "https://firebabys.io/fire-world/games/game-21-sizzles-target-pop.html"
    },
    {
      "@type": "ListItem",
      "position": 23,
      "name": "Magma Tap Smash",
      "url": "https://firebabys.io/fire-world/games/game-22-magma-block-breaker.html"
    },
    {
      "@type": "ListItem",
      "position": 24,
      "name": "Crater Catcher",
      "url": "https://firebabys.io/fire-world/games/game-23-crater-catcher.html"
    },
    {
      "@type": "ListItem",
      "position": 25,
      "name": "Ash Storm Survivor",
      "url": "https://firebabys.io/fire-world/games/game-24-ash-storm-survivor.html"
    },
    {
      "@type": "ListItem",
      "position": 26,
      "name": "Lava Line Draw",
      "url": "https://firebabys.io/fire-world/games/game-25-lava-line-draw.html"
    },
    {
      "@type": "ListItem",
      "position": 27,
      "name": "Pyra Paddle Battle",
      "url": "https://firebabys.io/fire-world/games/game-26-pyra-paddle-battle.html"
    },
    {
      "@type": "ListItem",
      "position": 28,
      "name": "Ember Bounce 2D",
      "url": "https://firebabys.io/fire-world/games/game-27-ember-bounce-2d.html"
    },
    {
      "@type": "ListItem",
      "position": 29,
      "name": "Thermal Tug-of-War",
      "url": "https://firebabys.io/fire-world/games/game-28-thermal-tug-of-war.html"
    },
    {
      "@type": "ListItem",
      "position": 30,
      "name": "Blaze's Jump Quest",
      "url": "https://firebabys.io/fire-world/games/game-29-blazes-jump-quest.html"
    },
    {
      "@type": "ListItem",
      "position": 31,
      "name": "Ruko's Dash Blitz",
      "url": "https://firebabys.io/fire-world/games/game-30-rukos-dash-blitz.html"
    },
    {
      "@type": "ListItem",
      "position": 32,
      "name": "Boulder's Rampart",
      "url": "https://firebabys.io/fire-world/games/game-31-boulders-rampart.html"
    },
    {
      "@type": "ListItem",
      "position": 33,
      "name": "Cinder's Glide",
      "url": "https://firebabys.io/fire-world/games/game-32-cinders-glide.html"
    },
    {
      "@type": "ListItem",
      "position": 34,
      "name": "Inferno Aim",
      "url": "https://firebabys.io/fire-world/games/game-33-inferno-aim.html"
    },
    {
      "@type": "ListItem",
      "position": 35,
      "name": "Spark Jump Arcade",
      "url": "https://firebabys.io/fire-world/games/game-34-spark-jump-arcade.html"
    },
    {
      "@type": "ListItem",
      "position": 36,
      "name": "Lava Moat Defense",
      "url": "https://firebabys.io/fire-world/games/game-35-lava-moat-defense.html"
    },
    {
      "@type": "ListItem",
      "position": 37,
      "name": "Magma Drop Physics",
      "url": "https://firebabys.io/fire-world/games/game-36-magma-drop-physics.html"
    },
    {
      "@type": "ListItem",
      "position": 38,
      "name": "Volcanic Stack Smash",
      "url": "https://firebabys.io/fire-world/games/game-37-volcanic-stack-smash.html"
    },
    {
      "@type": "ListItem",
      "position": 39,
      "name": "Fire Baby Rally",
      "url": "https://firebabys.io/fire-world/games/game-38-fire-baby-rally.html"
    },
    {
      "@type": "ListItem",
      "position": 40,
      "name": "Caldera Bounce",
      "url": "https://firebabys.io/fire-world/games/game-39-caldera-bounce.html"
    },
    {
      "@type": "ListItem",
      "position": 41,
      "name": "Sizzle's Spark Run",
      "url": "https://firebabys.io/fire-world/games/game-40-sizzles-spark-run.html"
    },
    {
      "@type": "ListItem",
      "position": 42,
      "name": "Blaze's Inferno Roll",
      "url": "https://firebabys.io/fire-world/games/game-41-blazes-inferno-roll.html"
    },
    {
      "@type": "ListItem",
      "position": 43,
      "name": "Ruko's Speed Trap",
      "url": "https://firebabys.io/fire-world/games/game-42-rukos-speed-trap.html"
    },
    {
      "@type": "ListItem",
      "position": 44,
      "name": "Boulder's Blockade",
      "url": "https://firebabys.io/fire-world/games/game-43-boulders-blockade.html"
    },
    {
      "@type": "ListItem",
      "position": 45,
      "name": "Cinder's Slide",
      "url": "https://firebabys.io/fire-world/games/game-44-cinders-slide.html"
    },
    {
      "@type": "ListItem",
      "position": 46,
      "name": "Lord Inferno's Strike",
      "url": "https://firebabys.io/fire-world/games/game-45-lord-infernos-strike.html"
    },
    {
      "@type": "ListItem",
      "position": 47,
      "name": "Magma Jump 2D",
      "url": "https://firebabys.io/fire-world/games/game-46-magma-jump-2d.html"
    },
    {
      "@type": "ListItem",
      "position": 48,
      "name": "Pyra Prime Dash",
      "url": "https://firebabys.io/fire-world/games/game-47-pyra-prime-dash.html"
    },
    {
      "@type": "ListItem",
      "position": 49,
      "name": "Ash Heap Hero",
      "url": "https://firebabys.io/fire-world/games/game-48-ash-heap-hero.html"
    },
    {
      "@type": "ListItem",
      "position": 50,
      "name": "Thermal Track",
      "url": "https://firebabys.io/fire-world/games/game-49-thermal-track.html"
    },
    {
      "@type": "ListItem",
      "position": 51,
      "name": "Ember Bounce Master",
      "url": "https://firebabys.io/fire-world/games/game-50-ember-bounce-master.html"
    },
    {
      "@type": "ListItem",
      "position": 52,
      "name": "Volcanic Target",
      "url": "https://firebabys.io/fire-world/games/game-51-volcanic-target.html"
    },
    {
      "@type": "ListItem",
      "position": 53,
      "name": "Lava Rush Arcade",
      "url": "https://firebabys.io/fire-world/games/game-52-lava-rush-arcade.html"
    },
    {
      "@type": "ListItem",
      "position": 54,
      "name": "Flame Drop Physics",
      "url": "https://firebabys.io/fire-world/games/game-53-flame-drop-physics.html"
    },
    {
      "@type": "ListItem",
      "position": 55,
      "name": "Blaze's Zenith",
      "url": "https://firebabys.io/fire-world/games/game-54-blazes-zenith.html"
    },
    {
      "@type": "ListItem",
      "position": 56,
      "name": "Ruko's Final Dash",
      "url": "https://firebabys.io/fire-world/games/game-55-rukos-final-dash.html"
    },
    {
      "@type": "ListItem",
      "position": 57,
      "name": "Tristan's Dark Knight Rescue",
      "url": "https://firebabys.io/fire-world/tristans-dark-knight-rescue/"
    },
    {
      "@type": "ListItem",
      "position": 58,
      "name": "Trinity's Holy Lightning Rescue",
      "url": "https://firebabys.io/fire-world/trinitys-holy-lightning-rescue/"
    }
  ]
}
</script>
```

## 5. Missing-meta report (whole tree — all 70 pages audited)
- **Pages missing a `<title>`:** none — all 70 pages have one.
- **Pages missing a meta description (5):**
  - `play.html` — flagship 2D battler; fixed by the §2 copy above.
  - `3d.html` — flagship 3D game; fixed by the §2 copy above.
  - `fire-world/game-02-blaze-runner.html` — suggested: `Play Blaze Runner free in your browser — sprint through the volcanic wilds, leap the lava gaps and see how far you can run. A Fire Babys game.` (142 chars)
  - `world/index.html` — suggested: `Walk the first world ever made for Fire Babys — explore five kingdoms around the great volcano, battle skeletons and discover hidden places.` (140 chars)
  - `404.html` — error page; a description is not needed, and it is the **one page deliberately excluded from sitemap.xml** (submitting an error page in a sitemap only earns a Search Console error).
- **Pages with no OG/Twitter tags at all:** `play.html`, `3d.html`, `arcade.html` (arcade gets its title/description in §2; OG blocks for the two flagships follow the §3 pattern).
- **Incomplete Twitter cards:** `characters.html` and `parents.html` have `twitter:card` only — add twitter:title, twitter:description and twitter:image mirroring their OG values.
- **No canonical tags anywhere in the tree.** Worth adding `<link rel="canonical">` per page in the same central pass as the JSON-LD, especially for the directory-style game URLs (`/fire-world/slingshot-cascade/` etc.), which the sitemap already uses as the canonical form (matching the site's own internal links).

## 6. Sitemap & robots
- `sitemap.xml`: 69 URLs, all `https://firebabys.io/…`, directory-style URLs for folder games (`index.html` → trailing-slash form, root `index.html` → `https://firebabys.io/`), `<lastmod>` 2026-10-23, weekly changefreq, priorities 1.0 (home) → 0.6 (info pages). Validated: parses as well-formed XML.
- `robots.txt`: `User-agent: *` / `Allow: /` + `Sitemap: https://firebabys.io/sitemap.xml`.
- Push list: `sitemap.xml` and `robots.txt` appended to `push-paths.json` (77 → 79 entries; file re-validated as JSON after the edit).
