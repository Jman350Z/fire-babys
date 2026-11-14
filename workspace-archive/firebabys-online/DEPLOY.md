# Fire Babys Rebellion — firebabys.online — Go-Live Checklist (A+ Standard)

Status: **NOT deployed.** The site tree in `~/workspace/firebabys-online/site/`
is complete and deploy-ready. The steps below take it live at the same A+
security standard as firebabys.io. Do them in order — headers last-but-verified,
because a page live without its headers is not an A+ launch.

One step in this list (Step 2) can only be done by **Jeff himself** — it is
flagged clearly. Everything else is agent-doable with the usual approvals.

---

## Step 0 — Pre-flight (before anything is wired)

- [ ] Re-run the inline-code audit on the final tree; all must return zero:
  - `grep -rn "<style" site/*.html` → none
  - `grep -rn 'style=' site/*.html` → none
  - `grep -rniE 'on(click|load|error|mouseover|submit|change|input|keydown|keyup)=' site/*.html` → none
  - every `<script>` tag carries `src=` and points inside `assets/`
- [ ] Confirm no file in `site/` references an external asset (no CDNs, no
      hotlinked images/fonts). Only outbound *links* allowed: firebabys.io.
- [ ] Open all four pages from a local server at 390×844 and check the console
      is clean (see the shot-*.png verification set in this folder).

## Step 1 — GitHub Pages hosting repo

Modeled on how firebabys.io is served (static tree, custom domain via CNAME).

- [ ] Create a **new** repository for this site (e.g. `firebabys-online`) —
      do **not** reuse the fire-babys repo; firebabys.io stays untouched.
- [ ] Push the contents of `site/` (not the folder itself) to the repo root:
      `index.html`, `rebellion.html`, `heroes.html`, `404.html`,
      `robots.txt`, `sitemap.xml`, `site.webmanifest`, `icon-192.png`,
      `icon-512.png`, `assets/`.
- [ ] Add a `CNAME` file at the repo root containing exactly:
      `firebabys.online`
- [ ] Enable GitHub Pages on the repo (deploy from the default branch, root).
- [ ] In Pages settings, set the custom domain to `firebabys.online`.
      (Leave "Enforce HTTPS" OFF until Step 3 gives the domain a certificate.)

## Step 2 — ⛔ JEFF-ONLY: the Namecheap registrar step

**This is the one step only Jeff can do.** firebabys.online is registered at
Namecheap, and its account recovery is Jeff's own track. Until the registrar
record changes, no DNS or hosting wiring on our side can make the name resolve
to the new host.

Jeff's options (his call, on his recovery track):

- **Option A (keeps DNS at Namecheap):** in the Namecheap panel for
  firebabys.online, point the host records at GitHub Pages —
  A records for `@` to `185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, `185.199.111.153`, and a CNAME for `www` to the Pages
  hostname — then head to Step 4 for headers (headers then need to come from
  a Cloudflare Worker in front, or wait for Option B).
- **Option B (moves DNS to Cloudflare, same as firebabys.io):** in Namecheap,
  set the domain's nameservers to the pair Cloudflare assigns when the zone
  is created in Step 3. This matches how firebabys.io runs today and is the
  recommended path.

Nobody else can do this step, and nothing in Steps 1/3 is blocked by it —
build everything else first so the site flips live the moment Jeff's step lands.

## Step 3 — Cloudflare zone for firebabys.online

(Skip if Jeff chose Option A and prefers to stay at Namecheap DNS — but then
the headers in Step 4 must be delivered another way; Cloudflare is the
A+ route because it matches firebabys.io exactly.)

- [ ] Add firebabys.online as a zone in the same Cloudflare account that
      holds firebabys.io.
- [ ] If Jeff chose Option B, give him the two assigned nameservers for the
      Step 2 registrar change; wait for the zone to show **Active**.
- [ ] DNS records (proxied / orange-cloud ON):
  - `@` → GitHub Pages (A records above, or an ALIAS/CNAME-flattening to the
    Pages hostname, matching whatever Step 1 produced)
  - `www` → CNAME to the Pages hostname
- [ ] SSL/TLS mode: **Full (strict)**. Wait for the edge certificate to be
      active, then go back to GitHub Pages and turn **Enforce HTTPS** ON.
- [ ] Enable the wallet protections from day one, same as firebabys.io:
      usage alerts, plus the per-IP rate-limit rule ("Wallet shield") at the
      zone's max free-plan settings.

## Step 4 — Security headers Worker (the A+ set)

Create a headers Worker for this zone, modeled **exactly** on the
fire-babys-headers Worker that enforces on firebabys.io: it fetches origin,
then sets the headers below on every response. Because this site has **no
inline code at all** (see DESIGN.md), the CSP needs no per-page hash map —
one static policy covers every page, present and future.

Set these headers on all responses:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
```

Notes:

- `frame-ancestors 'self'` in the CSP plus `X-Frame-Options: DENY` mirrors
  the firebabys.io belt-and-suspenders clickjacking posture (DENY is the
  stricter legacy header; keep both, as on the .io worker).
- No `report-uri`/`report-to` initially — firebabys.io collects reports in a
  KV namespace; add the same reporting endpoint later if wanted. It is not
  required for the enforcing grade.
- When the Phase 1 game build lands, re-check this policy before changing it:
  an external-file game (canvas + same-origin JS) needs **no CSP changes**.
  Online co-op (Phase 2) will need `connect-src` extended to the exact
  multiplayer Worker origin (`wss:`) — add that origin then, never before,
  and never as a wildcard.
- Rollout discipline, same as the .io A+ project: deploy the Worker in
  **report-only first** (same value in `Content-Security-Policy-Report-Only`)
  for one full pass over all four pages, confirm zero violations, then flip
  to the enforcing header name. Rollback = the report-only copy stays saved.

## Step 5 — Go-live verification (the A+ proof)

- [ ] `curl -sI https://firebabys.online/` — confirm the enforcing
      `Content-Security-Policy` header (not Report-Only) and the full header
      set from Step 4 are present, status 200.
- [ ] Repeat for `/rebellion.html`, `/heroes.html`, and a bogus path
      (the 404 page must carry the same headers).
- [ ] Check the grade at securityheaders.com — target **A+**, same as
      firebabys.io.
- [ ] Load all four pages on a real phone viewport (390×844): nav opens,
      roster filter works, zero console errors, zero CSP violations.
- [ ] Confirm `https://www.firebabys.online/` redirects/resolves to the apex
      and HTTPS is enforced end to end.
- [ ] Save the verification output with this checklist (date, header dump,
      grade screenshot) into `~/workspace/firebabys-online/`.

## Boundaries (do not cross during go-live)

- firebabys.io is **not** touched by any step above — separate repo, separate
  zone, separate Worker.
- No DNS changes are made by the agent to firebabys.online until Jeff's
  Step 2 lands; no registrar contact on Jeff's behalf.
- Nothing goes live "temporarily" without the Step 4 headers — an unheadered
  launch window is how A+ sites stop being A+.
...[truncated 4173 chars]