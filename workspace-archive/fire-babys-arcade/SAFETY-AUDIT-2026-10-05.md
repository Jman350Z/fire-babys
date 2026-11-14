# Fire Babys — Public Safety Audit
**Date:** 2026-10-05
**Scope:** all public surfaces (site, creator kit, form, workers, live articles, voting code)
**Method:** read-only. No publishing, no form submissions, no logins, no votes.

---

## CRITICAL (fix immediately)

### C1. Arcade submission form silently discards entries
- **Where:** `~/workspace/fire-babys-arcade/arcade.html`, bottom `<script>` — `ENDPOINT = "https://example.com/api/arcade-submissions"` (placeholder).
- **What:** The on-page form shows "Got it! Your game is under review" but POSTs creator data (name, email, game URL) to `example.com` — it goes nowhere. Creators will believe they submitted; we receive nothing.
- **Also:** the form collects only creator name / email / title / description / URL. It does **not** collect the now-required real full name, phone number, and mailing address (per COMPETITION-RULES.md eligibility).
- **Fix:** Replace the on-page form with the Google Form embed/link (the live form at `docs.google.com/forms/d/e/1FAIpQLSfD5lHC6apj5JqVs8yatzPMn2SVlUr-pybYmsNgAIcAC52jYg/viewform` already has all required fields). Do not ship arcade.html with the placeholder form.

### C2. $10,000 contest rules have legal holes
- **Where:** `https://github.com/Jman350Z/fire-babys-creator-kit/blob/main/COMPETITION-RULES.md`
- **What a lawyer would flag:**
  - No contest end date ("open now... until the Fire Babys team announces a winner") — open-ended prize contests are a regulatory red flag.
  - No tax disclosure — US winners owe income tax on $10,000; rules don't mention it.
  - No governing law / jurisdiction; "Open worldwide" with no void-where-prohibited clause.
  - "Fire Babys may end or extend the competition at any time" + "the Fire Babys team's call is final" — combined with a $10,000 promise, this reads as an illusory offer.
  - No tie-breaking or winner-selection criteria beyond "from community favorites."
  - PII collection (real name + phone + mailing address, incl. potential minors via parent/guardian) has only an in-rules promise ("never sold or published") — no privacy policy, no data-retention/deletion terms.
- **Fix:** Professional legal review before large-scale promotion. At minimum: add end date (or judging cadence), tax language, governing law, and a real privacy policy linked from the form.

### C3. Definitive proceeds claims on public pages
- **Where:**
  - `https://firebabys.io/blog.html` — "every dollar this game makes is going to REAL fire awareness programs with actual US fire departments"
  - `https://dev.to/firebabys/my-fellow-nerds-i-need-your-help-38ba` — same claim
  - `https://firebabysgame.blogspot.com/2026/10/stop-drop-and-roll-how-fire-babys.html` — "Every dollar goes to REAL fire awareness programs with US fire departments in schools"
- **Why it matters:** No programs exist yet. Stating donations *are going* to fire departments (vs. the approved "game proceeds are *intended to help start/fund*...") is a deceptive-claims risk, especially on a kids' brand.
- **Fix:** Replace with the approved wording everywhere: "Our goal is for game proceeds to help start and fund real US fire-department school-awareness programs."

---

## HIGH (bugs / broken / brand)

### H1. Live site contradicts the SPLASH-only directive
- **Where:** `https://firebabys.io/` (homepage), `https://firebabys.io/3d.html`, `/play.html`, `/world/`
- **What:** Homepage still advertises "2D Battle," "3D Arena" (Story/Rescue/Survival/Tournaments), and "Open World." Live `3d.html` (1,019,545 bytes) still contains all old mode references (Story, Survival, Rescue, Tournament, Free Roam, Practice, Co-op, Versus). `/play.html` and `/world/` serve old content, not redirects.
- **Why:** GitHub Pages builds are down (runner failures) — the SPLASH-only commits exist but aren't deployed. Public state is stale.
- **Fix:** Verify deployment the moment Pages recovers; re-check all four URLs.

### H2. Fabricated play count on arcade page
- **Where:** `arcade.html` SPLASH card — "🔥 12,408 plays".
- **What:** Invented statistic. No tracking backs it.
- **Fix:** Remove the number or wire it to real analytics.

### H3. Newsletter signup is fake
- **Where:** `arcade.html` "Get new arcade games weekly" form.
- **What:** On submit it shows "You're on the list!" and clears the field — the email goes nowhere (no endpoint). Collecting emails under false pretenses, even accidentally, is a trust and compliance problem.
- **Fix:** Wire to the real Substack (`https://firebabyofficial.substack.com`) or remove until wired.

### H4. Submission instructions are outdated and contradictory
- **Where:** COMPETITION-RULES.md "How to submit" (Discord/email); STARTER-PROMPT.md "What to submit" (name/username + email only).
- **What:** The real submission path is the Google Form, which requires real full name + phone + mailing address. The docs describe a different process with different fields.
- **Fix:** Point both docs at the Google Form URL and list the actual required fields.

### H5. Godot accepted but impossible under 250KB
- **Where:** README.md ("one HTML file preferred, or a Godot 4 project") vs. the hard 250KB limit.
- **What:** A Godot 4 project cannot realistically stay under 250KB. Creators will waste work.
- **Fix:** Either drop Godot as an option or carve out an explicit exception with its own size rule.

---

## MEDIUM (improvements / disclosures)

### M1. Personal info in public sources (Jeff asked about this)
- `https://firebabys.io/play.html` source: HTML comment "Copyright (c) 2026 Jeffery Pruden" — full legal name in public page source.
- COMPETITION-RULES.md fine print: "paid by Jeffery Pruden / Fire Babys" — full name on the public rules.
- LinkedIn article byline: "jeff pruden". Dev.to: "I'm Jeff" + profile alt text "Jeff". Blogger: Google-account byline may show full name.
- No phone, address, email, or password found in any public page source checked. No emails/phones in homepage HTML.
- **Fix (if Jeff wants a scrub):** replace "Jeffery Pruden" with "Fire Babys" in play.html comments and rules fine print; bylines are platform-controlled.

### M2. Voting worker — admin hardening gaps
- **Where:** `~/workspace/fire-babys-arcade/voting/worker.js` (not yet deployed)
- Findings:
  - `/admin/roll` and `/results` have **no rate limiting** (public endpoints get 120/hr and 20/hr). ADMIN_KEY brute-force is theoretical but cheap to mitigate — add the same `rateLimit` wrapper.
  - ADMIN_KEY travels in the URL query string (`/results?key=...`) — keys in URLs land in server/CDN logs. Prefer a header or POST body.
  - `clientIp` falls back to `x-forwarded-for` when `cf-connecting-ip` is absent — fine behind Cloudflare, spoofable otherwise.
  - KV read-then-write races on rate-limit counters and vote keys: concurrent double-votes collapse to one record (deterministic key), so no extra-vote exploit — acceptable.
  - Gmail dot/plus addressing (`user+tag@gmail.com`) isn't normalized — a voter with multiple Google accounts is the residual Sybil vector (already noted in SECURITY-NOTES.md).
- **Verdict:** core logic is sound (server-side roll, no self-votes, hidden tallies, timing-safe key compare, HTML-escaped results). Fix the two admin issues before deploy.

### M3. voting.js — unescaped gameId in HTML attribute
- **Where:** `~/workspace/fire-babys-arcade/voting/voting.js`, `zoneHtmlFor` — `data-vote="' + gameId + '"`.
- **Risk:** Low — gameId comes from owner-authored `data-game-id` attributes and is slug-validated server-side (`[a-z0-9-]{1,64}`). Still, escape or validate client-side too for defense in depth.

### M4. Multiplayer worker CORS is wide open
- **Where:** `https://fire-babys-multiplayer.jeffpruden288.workers.dev/` — `Access-Control-Allow-Origin: *`, allows GET/POST/OPTIONS.
- **What:** Root returns only "fire-babys-multiplayer ok"; `/health`, `/status`, `/api`, `/rooms`, `/lobbies` all 404. No debug info exposed. The open CORS is worth tightening to firebabys.io origins when convenient, but nothing sensitive leaks today.

### M5. Could not independently verify (access-blocked this pass)
- Google Form (401 without a Google session via fetch) — field list and privacy notice per the verified setup report: 10 fields, all required except thumbnail; privacy notice present; email collection set to Verified. Trust but re-verify in a signed-in browser before promoting the link widely.
- WordPress article (403), Minds post (401) — PII/byline not re-checked. Minds "bedro!om" typo fix still unverified.

---

## LOW (nitpicks)

- L1. README.md Discord link is circular ("see #creator-start-here for the invite") — no clickable invite URL.
- L2. Homepage has no external scripts and no `<img>` tags (all inline SVG) — good for privacy/performance; nothing to fix.
- L3. Arcade page "COMING SOON" cards (5x) are clearly labeled — fine.
- L4. Game Jolt post: no PII, no proceeds claim in visible text — clean.
- L5. `3d.html` live version is ~1MB (4x the 250KB pillar) — already tracked as needing a diet pass.

---

## Verification notes
- Homepage/blog fetched live 2026-10-05 ~14:20 PDT. `3d.html` (1,019,545 bytes) confirms pre-SPLASH-only build is still serving.
- Creator-kit files read from `raw.githubusercontent.com` (live).
- Social URLs: Dev.to, Blogger, Game Jolt, LinkedIn verified; WordPress/Minds blocked by upstream auth.
- Voting code reviewed read-only; not deployed.
- No console-error check was possible without a live browser; recommend a real browser pass over homepage, arcade (once live), and 3d.html post-deploy.
