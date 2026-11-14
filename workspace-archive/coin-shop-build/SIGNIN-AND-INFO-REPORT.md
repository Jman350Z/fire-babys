# SIGN-IN LANDING FIX + INFO OFFLOAD — report (2026-10-21, ~23:55 PDT)

Two Jeff orders executed in the staged trees (`~/workspace/coin-shop-build/`
and `~/workspace/.deploy/`, kept in sync — the only remaining
source↔.deploy differences are the pre-existing offline-ZIP fingerprint
lines on `fire-world.html`/`index.html`, `.deploy` carrying the newer
5a016f0e… line). **Nothing deployed, nothing pushed.** Changed files are
also logged in
`~/workspace/big-deploy-2026-10-21/github-push/LATE-ADDITIONS.md`.

---

## ORDER 1 — post-sign-in landing: Creator FIRST, tour after

### Routing trace (where a signed-in player actually landed, before the fix)

Every sign-in surface on the site is the shared gate, `auth-gate.js`
(loaded by the hub, index, play, 3d, arcade, blog, and all game pages).
Its three interactive completions — email-code verify, legacy register,
Google — all funneled into `finishAuth()`, which only dismissed the gate
and fired `fb-authed`. **No code anywhere routed a freshly signed-in
player anywhere.** The only "Creator first" behavior that existed was
`onboarding.js` on the hub: a modal whose step 1 *described* the Creator
and offered a button to go there. So Jeff's exact experience tonight:

- Sign in (any page) → you stay on that page. No Creator, no tour.
- Land on the hub signed-in without `onboardedV1` → a card *about*
  creating your character, one extra click away from the Creator itself.

Two more defects found in the same trace (both pre-existing, verified
byte-identical in the untouched `.deploy` copy of the gate):

1. **Email-code sign-in was broken for everyone.** The code-step
   validation regex was `/^\\d{6}$/` (two literal backslashes), which
   matches a backslash + "dddddd" — every real 6-digit code was rejected
   client-side with "Enter the 6-digit code from your email." Google
   sign-in was the only interactive path that could complete.
2. **Every code-step submit threw** `Cannot read properties of null
   (reading 'value')`: the first-step submit listener stays attached
   after the code step swaps the form's contents, and read `.value` of
   the removed email input. (It didn't block sign-in; it polluted every
   code sign-in with a page error.)
3. Latent: the gate located its own `<script>` element as
   `scripts[scripts.length - 1]`, but the seasonal/landscape/i18n
   loaders append more scripts synchronously, so "last" was one of
   theirs — data-attributes (auth URL, Google id, Turnstile key, badge)
   were read off the wrong element. Fixed by matching on the
   `auth-gate.js` filename.

Also traced: **the new password sign-in has a live backend endpoint
(`POST /auth/password`) but NO page in the staged tree renders a
password form** — there is no password UI to route from yet. The router
below sits in the gate's shared completion path, so when a password
form is added to the gate it inherits the law automatically; flagged
here rather than invented.

### The fix (`auth-gate.js`)

- Interactive completions now call `finishFreshAuth()` (sets a flag);
  session restores (stored-token boot, trust-cache) are untouched.
- On a fresh sign-in, the gate checks `POST /profile/get`:
  - profile **lacks** `onboardedV1` → sets `fb_tour_step="cards"` and
    `location.replace(<site-root>/3d.html)` — **straight to the
    Creator**. Returning to the hub, the existing tour resumes at the
    cards (Chest → Shops → Sign in/out → Math Door → Family → TikTok).
  - profile **has** `onboardedV1` → stays exactly where they are.
  - already on `3d.html` → no redirect (they are standing in the
    Creator); tour marker still set.
  - server unreachable → device-side fallback (local `fb_onboarded_v1`
    flag decides), same pattern as the offline build.
- Regex fixed to `/^\d{6}$/`; first-step listener stands down quietly
  once the code step owns the form.
- `onboarding.js`: header comment updated to document the split (gate
  routes fresh sign-ins; the hub overlay now serves restore players and
  replays). Behavior unchanged.

### Test evidence

- **NEW suite `tests/test-signin-routing.py`** (+ `tests/signin-server.mjs`,
  a hub-server variant with a dummy Resend key and intercepted sends so
  the REAL gate UI drives the REAL email-code flow): **15/15 pass, zero
  page errors.**
  - A — Jeff's case: pre-existing account (created before onboarding
    existed, `onboardedV1=false`) signs in fresh → lands on `3d.html`,
    tour marker set. ✔
  - B — onboarded account signs in → stays on the hub, gate dismissed,
    no tour. ✔
  - C — brand-new account created by that very sign-in → Creator. ✔
  - D — session restore (stored token) → NOT rerouted; hub tour shows
    the CREATE step as before. ✔
- **Regression: existing `tests/test-onboarding.py` — 38/38 pass** on a
  clean rerun (13 s), including the offline `file://` suite. (A first
  run under heavy concurrent load showed S7-only timeouts at 3,026 s
  total; the isolated S7 repro passed and the clean rerun is 38/38 —
  environmental, not a code regression.)

---

## ORDER 2 — informational content offloaded to the Fire Safety Hub

Hub staging: `~/workspace/fire-safety-hub/index.html`. Main-site cards
link to **https://safety.firebabys.io** (goes live per the hub PLAN's
DNS step; the links ship with this push, the hub with its own).

### Inventory + disposition

| Page | Informational block | Size | Disposition |
|---|---|---|---|
| `fire-world.html` (hub) | 58 per-game-card `🔥 Fire Safety:` one-line lesson divs | 6,979 B | **MOVED** — divs removed; ONE hub bar (existing `.whatsnew` styling) links to the Hub. All 58 tips now live in the Hub's "Fire-safety tips from the games" section (verbatim, minus the repeated prefix). Game grid, shops, locker untouched (verified in a browser render). |
| `index.html` | "🎓 FIRE SAFETY ACADEMY" 4-lesson list (fire classes, Stop Drop & Roll, Get Out & Stay Out, Charge safe) | 497 B | **MOVED** — replaced by ONE hub card. The 4 lessons live in the Hub's new Academy section. Mission strip (the house-rules brand promise) kept, per plan. |
| `parents.html` | "🎓 A real fire-safety curriculum" section + "📚 Trusted resources" section | ~1.8 KB | **MOVED** — replaced by ONE hub card; school FAQ answer now points to the Hub. Curriculum (incl. the full NFPA class detail) and all 3 trusted links (sparky.org, sparkyschoolhouse.org, usfa.fema.gov) live in the Hub's Academy + Trusted Resources sections. "Safe by design" + product FAQ kept — that's product fact, not curriculum. |
| `play.html` | In-game safety strings: 6× "fire safety", 6× "stop, drop", grown-up/toy lines | woven into the 570 KB game file | **NOT moved** — these are gameplay strings inside the SPLASH battler, and play.html ships only through its canonical baseline+patch pipeline (never hand-edited). Listed for a future patch-pipeline pass per the hub PLAN's phase 2. |
| `3d.html` | Safety-themed game content ("Smoke Alarm Hero Badge", house-rule lines) | inside the 1.03 MB game | **NOT moved** — gameplay content in the 3D game (own pre-deploy pipeline); no lesson blocks exist here to lift out. |
| 53 game pages in `fire-world/games/` + 5 standalone fire-world pages | In-game `🔥 Fire Safety:` overlay lesson (`#olesson`) + win/lose safety strings, wired into each game's JS | 1–3 lines each | **NOT moved** — functionally part of each game (the overlay element is updated by game code mid-play); the shared per-game gate/lesson block is never hand-swept (standing rule). They are one line inside a game, not page-weight info blocks. |
| `blog.html` | Jeff's own Oct 5 post ("My fellow nerds…") | 3.9 KB page | **NOT moved** — Jeff's personal blog voice/story post, not a reference/education block. |
| `history.html` | Brand-story timeline (mission mentions) | 8.5 KB page | **NOT moved** — brand narrative, light mentions only (hub plan agrees). |
| `characters.html`, `arcade.html`, `play-all.html`, `404.html`, `world/index.html` | No informational/educational blocks found (characters = roster, arcade/play-all = launchers, world/index = redirect) | — | No change. |

### Hub additions (staging only)

`~/workspace/fire-safety-hub/index.html` gained, in the hub's existing
zero-JS style system: (1) **🎓 The Fire Babys Fire-Safety Academy** —
the union of the site's own lesson copy from index + parents (Two Ways
Out, Stop Drop & Roll, safe charging, NFPA fire classes, the
"grown-ups handle flame" rule); (2) **🔥 Fire-safety tips from the
games** — all 58 one-liners; (3) **📚 Trusted resources** — the three
parents-page links verbatim. All content is the site's existing copy —
no safety facts were invented.

### CSP verification

Edits touched only body markup in the 3 HTML pages and two EXTERNAL
JS files (no hash implications). The project's own pipeline
(`audit_scan.py` → `gen_hashmap.py`) was run in a scratch dir against
the edited `.deploy` tree: for `/fire-world.html`, `/index.html`, and
`/parents.html`, the fresh per-page hash needs are a **subset of the
deployed map in every kind (script/style/handler/style-attr) — zero
new hashes required**, so the push needs no hash-map regeneration for
these changes. (parents.html's remaining style attributes are a strict
subset of its pre-edit set; one novel attribute value introduced during
editing was caught and removed.) Browser renders of all edited pages +
the Hub: correct content, **zero page errors**.

### Byte-weight note

Removed from the main site: ~7.0 KB of lesson divs (hub page, the
highest-traffic page), ~0.5 KB (index), ~1.8 KB (parents) — modest
bytes; the real win is Jeff's actual point: the education content now
lives in ONE separately-hosted place instead of being maintained (and
loaded) inside the game site.
