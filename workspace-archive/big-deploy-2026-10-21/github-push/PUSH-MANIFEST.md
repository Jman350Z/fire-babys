# GitHub push package — big deploy 2026-10-21 (firebabys.io frontend)

- **Repository:** Jman350Z/fire-babys — **branch:** main — **current head:** ea100a402d6f810d0fbd6fa3126a9f656cb5c48b (contains ONLY the original offline ZIP, pushed via the web UI before that window died; all other files verified still old/missing in the repo). **The ZIP must be pushed AGAIN** — it was resealed for the contest takedown (new hash below) after ea100a4 landed.
- **Source tree (canonical, push from here):** /home/hatch/workspace/.deploy
- **Suggested commit message:** Big deploy 2026-10-21 refresh: Fire Babys Arena (Game 60) + hub card, starter-kit creator/locker frontend, Dark Knight admin-arrival announcement, shops + player locker, Math Check gate rebrand + 24h unlock, onboarding tour + hub sign-out, sign-in fixes (F1/F2/F4), Game 1 Slingshot tab-bar HUD, i18n refresh, offline fingerprint update, 3d.html meta-CSP repair

## Why this package exists
Connector push attempts on 2026-10-21 (user-approved) both failed at GitHub:
push_files -> 403 "Resource not accessible by integration" (git/trees);
create_or_update_file -> same 403 (contents). The Muse GitHub App installation
has no Contents-write permission on this repo. Git SSH is blocked by the VM
egress proxy; no git HTTPS credentials exist; gh is not logged in. The working
route is the signed-in GitHub web UI (browser task) — upload the files below
from the source tree, or fix the App permission and re-run:
  github push-files --owner Jman350Z --repo fire-babys --branch main \
    --source-dir /home/hatch/workspace/.deploy --paths-file <the NUL manifest>
(text files only — the connector snapshot format cannot carry binaries at all.)

## Files: 88 total still to push (77 text + 11 binary)
push-paths.json = the 77 text paths (connector text route); the 11 binaries below ride the web-UI route. Total push set = 88.
- TEXT (77): the exact list in push-paths.json (73 modified incl. 3d.html,
  auth-gate.js, fire-world.html, index.html, i18n.js + 12 shards, 52 game
  pages, slingshot-cascade WITH the new tab bar; 4 new: onboarding.js,
  rating.js, dark-knight.js, and
  fire-world/games/game-60-fire-babys-arena.html — 53rd game page).
- BINARY (11) — connector cannot push these in any case; web UI only:
  fire-babys-offline.zip (RESEALED 2026-10-21 for the contest takedown: cleaned arcade.html + history.html, voting.js REMOVED, hub footer fix — 2,697,032 B, sha256 5a016f0e86fb2053e04fd303b963e17c4e82b47ac058252c98b5abce3d5ca4a1 — re-verified in staging 2026-10-22. The earlier b305e89d… version is what's in commit ea100a4 — this resealed file REPLACES it and must be pushed again. Full record: ~/workspace/contest-takedown-2026-10-21/RESEAL-REPORT.md)
  shop-img/aqua-hero-tee.jpg, shop-img/blaze-hero-tee.jpg, shop-img/boulder-hero-tee.jpg,
  shop-img/candy-moon-halloween-tee.jpg, shop-img/fire-safety-academy-tee.jpg,
  shop-img/full-cast-hoodie.jpg, shop-img/full-cast-tee.jpg, shop-img/ruko-hero-tee.jpg,
  shop-img/slimer-smother-tee.jpg, shop-img/sticker-pack-sheet.jpg
- DO NOT PUSH: fire-babys-offline.zip.bak-* (4 local backup files, not site content);
  repo-only files (CNAME, README.md, docs/, faq.html, multiplayer/, world/, press/privacy/terms,
  parents-dashboard.html, trailer.mp4, fire-baby-homeland.jpg) are untouched — no deletions.

## Refresh addendum (2026-10-22) — "update everything" pass
The manifest above was frozen before the last frontend builds landed. The
staging tree (~/workspace/.deploy) has been refreshed from
~/workspace/coin-shop-build/ so the push now also carries:

- **NEW — fire-world/games/game-60-fire-babys-arena.html** (115,689 B):
  Fire Babys Arena, round-2 build (double jump, kicks/low kicks,
  controller support). Added to push-paths.json.
- **NEW — dark-knight.js**: admin-arrival watcher ("⚔️ A Dark Knight is
  coming..." once per top-admin arrival). Staged byte-identical in
  .deploy (md5 8f9ebcf04e5c1b7cd647665218d4473c). External same-origin
  script — allowed by `script-src 'self'`, NO hash-map change needed.
  Full record: LATE-ADDITIONS.md in this folder.
- **UPDATED — fire-world.html**: starter-kit logic (free school outfit +
  bronze battle kit in the player locker), Arena (Game #60) hub card,
  dark-knight.js include. Its offline-ZIP fingerprint line stays the
  resealed 5a016f0e… / 2.57 MB (do NOT overwrite from the source tree —
  the source copy still carries the stale b6d410aa… fingerprint).
- **UPDATED — 3d.html**: starter-kit creator rows + dark-knight.js
  include. Also carries a **bug fix found during this refresh**: its
  meta CSP was missing one inline-script hash
  (sha256-y0vgYMqPN08i13vkz3Q53tSuecST14XNS/lISpkRo84=) for a script
  block the starter-kit build added; appended to the meta script-src in
  BOTH the source tree and staging (copies byte-identical). Without the
  fix the block would have been CSP-blocked on the live page.
- **REMOVED from staging — voting.js**: mirrors the contest takedown.
  The repo copy is untouched (delete-nothing rule); it is simply no
  longer part of this push set.
- **Offline ZIP snapshot note**: the staged ZIP is unchanged (resealed
  contest-clean 5a016f0e…). The pages packaged INSIDE the ZIP predate
  the Arena + starter-kit builds — the ZIP was not resealed in this
  refresh (out of scope); its fingerprint as displayed in index.html /
  fire-world.html matches the staged file.
- **play.html** carries the dark-knight.js include in staging but stays
  OUT of this push set (it ships through its own patch/build route) —
  see LATE-ADDITIONS.md.
- **CSP**: refreshed hash map staged alongside this manifest as
  csp-hashmap-staged.json — see CSP-REFRESH.md. The headers Worker was
  NOT redeployed in this refresh; the map ships with the push.

## Ordering note for whoever pushes
Land the 11 binaries in the SAME sitting as the text files: the new hub links
shop-img/*.jpg and the offline download, and index.html/fire-world.html now
display the NEW zip fingerprint (5a016f0e…, re-stamped after the takedown reseal). Until this push lands, the live
site keeps serving the previous frontend (safe: the enforced CSP hash map is a
union of old+new, and the backend + session kick are already live).
