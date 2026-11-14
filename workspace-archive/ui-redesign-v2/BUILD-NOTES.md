# Fire World hub — VISUAL REDESIGN v2 ("Volcanic Arcade") — proof build, NOT shipped

**Staged file:** `~/workspace/ui-redesign-v2/fire-world.html` (100,216 bytes)
**Pristine v1 copy kept beside it:** `~/workspace/ui-redesign-v2/fire-world.v1.html` (byte-identical to the live `.deploy/fire-world.html`)
**Build script:** `~/workspace/ui-redesign-v2/build-v2.py` — reproducible; reads the v1 copy, appends ONE CSS layer, fails loudly on any anchor mismatch.
**Nothing deployed, pushed, or changed live.** The `.deploy` tree is untouched.

## How it was built (why it can't break the page's wiring)
V2 is **one override layer of CSS appended at the end of the page's existing `<style>` block**. The body HTML was never edited. Proven by hash comparison against v1:
- All **3 inline scripts byte-identical** (shop `9bccd81e…`, locker `e957f51f…`, hub UI `e35dacd6…` — same SHA-256 as v1).
- **Every element ID identical** (same elements, same order), **every href identical** (84, same order; all 58 Play links identical), external script tags unchanged, **zero `on*=` attributes**, **zero new external URLs/assets**, HTML parses with no errors, CSS braces balanced 270/270.

## The new look, in plain words
- **Colors:** the page sits on deep volcanic charcoal (near-black warm brown). The brand energy is a **molten gradient — ember red → flame orange → amber → gold** — used on the selected tab, buttons, card frames, and the big game numbers. Text is warm cream. **Water blue is the one cool accent**, saved for the Water side of the brand: the SPLASH featured card, the My Chest tab when selected, and the safety-lesson strips on cards.
- **Type:** headings are set in a heavy, condensed-feel system stack (Arial Narrow / Roboto Condensed where a phone has them, heavy system sans otherwise), weight 900, uppercase, tight spacing — visibly chunkier than v1's regular rounded type. "FIRE WORLD" in the hero is roughly **double** v1's size.
- **Masthead:** the top bar is now a branded lockup: a 5-color brand strip (red→orange→gold→blue) runs across the very top, "🔥 FIRE BABYS" is big, gold, uppercase with a gradient underline, the coin/gem balance is a dark pill with a gold ring, and the nav links are small spaced-out capitals.
- **Tabs:** no longer thin pills. Games / Shop / My Chest are **chunky arcade switches** — thick dark borders, hard bottom shadow, press-down feel. Each lights up in its own color when selected: Games = molten orange, Shop = gold, My Chest = water blue.
- **Background:** layered CSS-only atmosphere — an ember glow behind the hero, a faint red glow low-left, a whisper of water blue top-right, and a dark vignette at the edges. No images, no JavaScript.
- **Cards:** thicker presence — a **gradient metal frame** (gold fading to ember) around every card, a hard offset shadow, and a lava-orange under-glow when you hover/tap. The picture band cycles ember / deep-red / **water-blue** gradients so the grid has rhythm. **The game number is now a design element**: "GAME #57" in huge gradient display type at the top of every card. Badges are bold orange tags; the Play button is a chunky molten arcade button with a hard shadow; safety lessons sit in blue "water" strips.
- **Featured row:** the three spotlight cards get full gradient frames — and SPLASH gets a **blue water frame** while the other two burn orange.
- **Shop & Chest:** section titles in the same big display type with a red→gold→blue rule under them; shop boxes and merch cards wear the same gradient frames; item tiles are dark with gold edges; Buy buttons are chunky molten (owned items flip to water blue, confirm state to ember red); the first-run tour popup and toast were re-skinned to match.
- **Footer:** the sign-off line is set in display type over a glowing orange top rule.

## Every difference a reviewer would see vs v1
1. Brand strip across the very top of the page (new).
2. Bigger, heavier, all-caps masthead and headings everywhere.
3. Tabs are chunky switches with per-tab colors (blue Chest) instead of soft pills.
4. Hero headline ~2× larger; download button chunkier with a hard arcade shadow (and see bug #2 below — it now actually renders as the designed button).
5. Announcement bars are darker with uppercase gold text and orange rules.
6. Search box has a thick orange ring and glow; filter chips are squared arcade chips; jump-to-number tiles are bigger with hard shadows; the counter is a spaced-caps kicker ("58 OF 58 GAMES").
7. Cards: gradient frames, hard shadows, lava under-glow, giant gradient game numbers, rotating ember/red/water picture bands, blue lesson strips, chunkier Play buttons.
8. Featured SPLASH card is blue-framed (was same as the others).
9. Shop/Chest panels fully re-skinned (frames, tiles, buttons, headings).
10. The Shop and My Chest tabs **actually show their content** (see bug #1 — in v1 they don't).

## Two real bugs found in v1 while building this (both proven in a real browser)
1. **Shop and My Chest tabs are blank on the live v1 site.** In the v1 markup, the Shop and Locker panels were wrapped *inside* the Games panel div. Picking Shop removes the highlight class from the Games panel, whose `display:none` then hides the Shop panel sitting inside it. The v1 jsdom test only checked classes/attributes, so it passed while a real browser shows nav + footer and nothing between. Playwright visibility test on the live v1 file: **3 FAILs** (game shop, merch shop, locker all invisible in their own views). **V2 repairs this with CSS only** (`:has()` rules keep the Games wrapper transparent and hide its games-only children while a sibling panel is active): **8/8 visibility checks pass**, and the jsdom behavioral suite still passes unchanged. *Permanent fix when this ships for real: move the two panel divs out of the Games panel in the HTML — a two-line structural change. The CSS repair is safe to ship as-is too; browsers older than ~2022 without `:has()` would fall back to v1's behavior, no worse.*
2. **The big DOWNLOAD button's base styles are dead in v1 (and in the pre-v1 original).** The known spliced segment in the page's original CSS swallows the `.dlbtn` and `.dlsub` rules into the broken `.creator` rule, so the button renders as plain blue underlined text fragments instead of the designed gradient button. V2's layer defines both rules completely, so the button renders as designed (see screenshots). *The splice itself is still in the file underneath; repairing it in the source is a separate small job, same as flagged in the v1 notes.*

## Verification results
- **Integrity:** scripts/IDs/hrefs/URLs identical to v1 (details above); `node --check` passes on all 3 inline scripts; HTML structure clean; CSP hygiene (no `on*`, no new external URLs) holds.
- **Behavior (jsdom, same approach as v1): 20/20 PASS with full v1 parity, zero page errors** — default Games view with 58 cards and "58 of 58 games" counter; shop script renders its items; locker script renders its sign-in prompt in the Chest panel; tab clicks switch panels + `aria-selected` + hash; search "ruko" → 6 cards, "57" → 1 card; Puzzle chip → 13; Sizzle chip → 3; no-match search shows the note and "0 of 58 games"; jump-to-57 clears filters, shows all 58, flashes card #57; loading with `#locker` / `#shop` opens the right tab. Test: `test/smoke-v2.mjs` (runs both files, compares every result).
- **Rendered visibility (Playwright/Chromium): v2 8/8 PASS; v1 3 FAIL** (bug #1). Test: `test/visibility.py`.
- **Screenshots (real Chromium, page served locally):** `shot-phone.png` (390×844, top 2 viewports), `shot-desktop.png` (1280×800, top 2 viewports), plus `shot-desktop-cards.png` (featured row + cards), `shot-phone-cards.png` (grid), `shot-phone-shop.png` and `shot-phone-chest.png` (both panels). Method note: the live sign-in gate script (a separate overlay, not part of the hub design and unchanged by v2) was request-blocked and the first-run tour marked as seen, so the shots show the hub exactly as a signed-in player sees it. Script: `test/shots.py`.

## Honest limitations
- The sticky header is tall on small phones because the inherited nav links and the tab row wrap onto multiple rows — same structure as v1, just chunkier. If Jeff wants a slimmer phone header, that's a small follow-up inside this same CSS layer.
- On phones without a condensed system font, headings fall back to the regular heavy system sans — still bold and uppercase, slightly less "arcade."
- This proof restyles the **hub only**, per the brief. The 60+ game pages keep the current look until Jeff rules on the direction.

## If Jeff approves and this ships (do not skip)
The inline `<style>` content changes, so **the CSP hash map must be regenerated** before pushing (`~/workspace/a-plus-project/`: audit_scan.py → gen_hashmap.py → build_worker.py enforce → deploy_worker.py enforce), or the enforced CSP will block the new styles. Same standing rule that applied to v1.
