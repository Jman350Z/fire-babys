# Fire Babys Creator Arcade — Build Log
**Built:** October 5, 2026
**File:** `arcade.html` (19.6 KB — well under the 250 KB target)

## What's on the page

1. **Top nav** — Fire Babys brand link back to firebabys.io, Submit shortcut
2. **Hero** — "The Fire Babys Arcade" with flame-teardrop mascots (inline SVG, no beaks/wings/feathers), pitch, big Submit button, $10,000 competition banner, and the "All games are reviewed by our team" moderation badge
3. **Game grid** — 1 real featured card (🌊 SPLASH, links to firebabys.io/3d.html?mode=splash) + 5 clearly-labeled "COMING SOON" placeholder cards showing the card format (title, creator, description, play count)
4. **Ad slots** — 2 clearly-marked placeholder containers (in-grid + sidebar) labeled for kid-safe contextual ads later
5. **App CTA banner** — "Play in the app" email/news CTA
6. **Submission form** — creator name, email, game title, description, game URL, required rules-agreement checkbox linking to COMPETITION-RULES.md. Posts to a placeholder endpoint; always shows "under review" message; **nothing goes live automatically**
7. **Email capture** — "Get new arcade games weekly" signup (client-side only for now)
8. **Footer** — mission line + "the future is BLAZING FOR FIRE BABYS 🔥"

**Tech:** single self-contained HTML file, zero external JS/CSS/fonts, mobile-first CSS, no frameworks. All form handling is inline vanilla JS.

## What the site owner needs to do next

1. **Deploy:** copy `arcade.html` to the fire-babys repo root and push — it goes live at firebabys.io/arcade.html. Link it from the homepage nav.
2. **Submission endpoint:** the form currently POSTs to `https://example.com/api/arcade-submissions` (fire-and-forget, no-cors). Wire this to a real review inbox/endpoint (e.g. a Cloudflare Worker writing to a private review queue + email notification). Review EVERY submission manually — scan for malware, check brand/Six-Pillar fit, confirm originality — before publishing any card.
3. **Ad network:** connect a COPPA-friendly kid-safe ad provider; replace the `.adslot` placeholders with real units. No behavioral tracking, no adult content.
4. **Email list:** the newsletter form is client-side only — connect it to the existing Substack (firebabyofficial.substack.com) or another list provider.
5. **Publishing new games:** add a card to the grid per approved game (copy the SPLASH card markup). Never add a card without completing the review workflow.
