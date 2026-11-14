#!/usr/bin/env python3
"""Build ~/workspace/ui-redesign-v3/fire-world.html from production source.

Strategy: replace ONLY the two <style> blocks in <head>. Everything else —
head metadata, the entire body markup, and every <script> block — is copied
byte-for-byte, which is the strongest possible preservation guarantee.
The redesign is expressed entirely in CSS: the games grid is always in
normal flow; #shop / #locker become slide-over drawers driven by the same
.fb-on class the untouched hub script already toggles.
"""
import pathlib, re, sys

SRC = pathlib.Path.home() / "workspace/.deploy/fire-world.html"
DST = pathlib.Path.home() / "workspace/ui-redesign-v3/fire-world.html"

CSS = r"""
/* ================================================================
   FIRE WORLD — v3 STAGING REDESIGN ("Toy-Box Sky Arcade")
   Fresh from-scratch visual design, 2026-10-24.
   - Bright sticker-book / toy-box look: warm paper, sky tints,
     chunky ink outlines, hard offset shadows, big friendly buttons.
   - DESIGN LAW: the games grid is ALWAYS on the page. No tabs, no
     panels, nothing display:none's the games. Shop and My Chest are
     slide-over drawers (bottom sheet on phone, right rail on
     desktop) opened by the same .fb-on class the hub script toggles;
     opening them never hides, moves, or un-renders the games grid.
   ================================================================ */
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#26221f;
  --ink-soft:#5d5347;
  --ink-faint:#8a7a66;
  --paper:#fff6e8;
  --card:#fffdf7;
  --flame:#ff6a1a;
  --flame-deep:#e04e00;
  --red:#ef3e2c;
  --sun:#ffc53d;
  --sun-soft:#ffe29a;
  --sky:#2f9df4;
  --sky-soft:#d8efff;
  --grass:#37b24d;
  --grass-soft:#e2f7e6;
  --grape:#7b5cff;
  --grape-soft:#e7e1ff;
  --pink:#ff7bac;
  --pink-soft:#ffe0ec;
  --shadow:0 6px 0 rgba(38,34,31,.92);
}
::selection{background:var(--sun);color:var(--ink)}
[hidden]{display:none!important}
body{
  font-family:"Baloo 2","Arial Rounded MT Bold","Trebuchet MS",system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  background-color:var(--paper);
  background-image:radial-gradient(rgba(255,106,26,.14) 2.2px,transparent 2.3px),radial-gradient(rgba(47,157,244,.12) 2.2px,transparent 2.3px);
  background-size:34px 34px,34px 34px;
  background-position:0 0,17px 17px;
  color:var(--ink);
  line-height:1.55;
}
.wrap{max-width:1180px;margin:0 auto;padding:0 14px}
a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--sky);outline-offset:2px}

/* ---------- Top bar ---------- */
nav.top{position:sticky;top:0;z-index:100;background:var(--card);border-bottom:4px solid var(--ink);color:var(--ink)}
nav.top .wrap{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;flex-wrap:wrap;gap:8px 14px}
.brand{color:var(--flame-deep);font-weight:900;font-size:20px;letter-spacing:.5px;text-decoration:none;text-shadow:0 2px 0 var(--sun-soft)}
nav.top a.navlink{color:var(--ink);text-decoration:none;font-weight:800;font-size:15px;margin-left:14px;border-bottom:3px solid transparent;transition:color .15s,border-color .15s}
nav.top a.navlink:hover{color:var(--flame-deep);border-color:var(--sun)}
.balpill{display:inline-block;background:var(--sun);border:2.5px solid var(--ink);color:var(--ink);font-weight:900;border-radius:999px;padding:3px 13px;font-size:14px;box-shadow:0 3px 0 rgba(38,34,31,.9)}
#fb-signout-btn{background:#fff;border:2.5px solid var(--ink);color:var(--ink);font-weight:800;font-size:14px;font-family:inherit;border-radius:999px;padding:4px 14px;margin-left:14px;cursor:pointer;box-shadow:0 3px 0 rgba(38,34,31,.9)}
#fb-signout-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(38,34,31,.9)}

/* ---------- Section buttons (Games / Shop / My Chest) ----------
   These are controls, NOT panels: Games scrolls to the always-open
   grid (and closes any drawer), Shop / My Chest open drawers. */
.fb-tabrow{display:flex;gap:10px;flex-wrap:wrap;padding:2px 0 8px}
.fb-tab{background:#fff;border:3px solid var(--ink);color:var(--ink);font-weight:900;font-size:16px;line-height:1.25;font-family:inherit;border-radius:999px;padding:8px 20px;cursor:pointer;box-shadow:0 4px 0 rgba(38,34,31,.92);transition:transform .08s,box-shadow .08s,background .15s}
.fb-tab:hover{background:var(--sun-soft)}
.fb-tab:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(38,34,31,.92)}
.fb-tab[aria-selected="true"]{background:linear-gradient(180deg,#ffb25e,var(--flame));color:#fff;box-shadow:0 4px 0 rgba(38,34,31,.92),0 0 0 3px var(--sun) inset}

/* ---------- Hero ---------- */
.hero{background:linear-gradient(180deg,var(--sun-soft) 0%,#ffb25e 78%,#ff9a4d 100%);text-align:center;padding:14px 16px 10px;border-bottom:4px solid var(--ink)}
.hero h1{font-size:clamp(30px,6vw,40px);line-height:1.12;font-weight:900;letter-spacing:.5px;margin:2px 0 8px;color:var(--ink);text-shadow:0 3px 0 #fff,0 7px 0 rgba(38,34,31,.18)}
.hero p{max-width:660px;margin:0 auto 8px;font-size:clamp(14px,3vw,17px);line-height:1.45;font-weight:700;color:#4a3b2a}
.creator{background:rgba(255,253,247,.75);border:2.5px dashed var(--ink);color:var(--ink);border-radius:999px;padding:5px 18px;font-weight:800;display:inline-block;margin-top:8px;font-size:14px}
.dlbtn{display:inline-block;background:linear-gradient(180deg,#5fd35f,var(--grass));color:#fff;font-weight:900;font-size:clamp(19px,4.4vw,27px);line-height:1.2;letter-spacing:.4px;text-decoration:none;padding:13px 26px;border-radius:18px;border:3px solid var(--ink);box-shadow:0 8px 0 rgba(38,34,31,.92),0 18px 34px rgba(38,34,31,.25);margin:4px 0 8px;transition:transform .1s,box-shadow .1s;text-shadow:0 1px 0 rgba(0,0,0,.25)}
.dlbtn:hover{transform:translateY(-2px)}
.dlbtn:active{transform:translateY(5px);box-shadow:0 3px 0 rgba(38,34,31,.92),0 8px 16px rgba(38,34,31,.25)}
.dlsub{font-size:12px;line-height:1.45;color:#6d5b43;max-width:780px;margin:0 auto 6px;overflow-wrap:anywhere;font-weight:600}

/* ---------- News strips ---------- */
.whatsnew{background:var(--sun);border-bottom:3px solid var(--ink);padding:6px 14px;text-align:center}
.whatsnew a{color:var(--ink);font-weight:900;text-decoration:none;font-size:15px}
.whatsnew a:hover{color:var(--flame-deep);text-decoration:underline}
.whatsnew + .whatsnew{background:var(--sky-soft)}

/* ---------- Games controls (search / chips / jump) ---------- */
.fb-controls{padding:10px 0 2px}
.fb-searchwrap{display:flex;align-items:center;gap:9px;background:#fff;border:3px solid var(--ink);border-radius:16px;padding:9px 13px;box-shadow:0 4px 0 rgba(38,34,31,.92)}
.fb-search-ic{font-size:19px}
#fb-game-search{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--ink);font-size:16.5px;font-family:inherit;font-weight:600}
#fb-game-search::placeholder{color:var(--ink-faint)}
.fb-chips{display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;margin-top:11px;padding-bottom:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.fb-chips::-webkit-scrollbar{display:none}
.fb-chip{flex:0 0 auto;background:#fff;border:2.5px solid var(--ink);color:var(--ink);font-weight:800;font-size:13.5px;font-family:inherit;border-radius:999px;padding:6px 14px;cursor:pointer;transition:background .15s,color .15s}
.fb-chip:hover{background:var(--sun-soft)}
.fb-chip.fb-on{background:var(--sky);color:#fff}
.fb-jump{display:flex;gap:6px;overflow-x:auto;padding:8px 2px 4px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.fb-jnum{flex:0 0 auto;min-width:36px;height:36px;padding:0 6px;border-radius:11px;background:#fff;border:2.5px solid var(--ink);color:var(--ink);font-weight:900;font-size:14px;font-family:inherit;cursor:pointer}
.fb-jnum:hover{background:var(--sun);color:var(--ink)}
.fb-gcount{font-size:13.5px;color:var(--ink-soft);font-weight:800;margin-top:2px}
.fb-noresults{font-size:16px;color:var(--ink);font-weight:800;padding:16px 0 4px}

/* ---------- Featured trio ---------- */
.fb-featured{display:grid;grid-template-columns:1fr;gap:12px;margin:10px 0 4px}
.fb-feat{display:flex;align-items:center;gap:13px;background:var(--card);border:3px solid var(--ink);border-top:9px solid var(--grape);border-radius:18px;padding:10px 13px;text-decoration:none;color:var(--ink);box-shadow:var(--shadow);transition:transform .12s}
.fb-feat:hover{transform:translateY(-3px)}
.fb-feat:nth-child(2){border-top-color:var(--sky)}
.fb-feat:nth-child(3){border-top-color:var(--red)}
.fb-feat-em{font-size:36px;line-height:1}
.fb-feat-main{flex:1;display:flex;flex-direction:column;min-width:0}
.fb-feat-t{font-weight:900;color:var(--ink);font-size:18px}
.fb-feat-d{font-size:13px;color:var(--ink-soft);line-height:1.4;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fb-feat-go{font-weight:900;color:var(--flame-deep);white-space:nowrap}
@media(min-width:820px){.fb-featured{grid-template-columns:repeat(3,1fr)}}

/* ---------- THE GAMES GRID — always open, always visible ---------- */
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:10px 0 34px}
@media(min-width:720px){.grid{grid-template-columns:repeat(3,1fr);gap:16px}}
@media(min-width:1060px){.grid{grid-template-columns:repeat(4,1fr)}}
.card{background:var(--card);border:3px solid var(--ink);border-radius:20px;overflow:hidden;box-shadow:var(--shadow);display:flex;flex-direction:column;scroll-margin-top:190px;transition:transform .13s}
.card:hover{transform:translateY(-4px)}
.card .thumb{height:84px;display:flex;align-items:center;justify-content:center;font-size:42px;border-bottom:3px solid var(--ink);background:radial-gradient(circle at 50% 30%,#fff 0%,transparent 62%),linear-gradient(135deg,var(--sun-soft),#ffb25e)}
.card:nth-child(5n+2) .thumb{background:radial-gradient(circle at 50% 30%,#fff 0%,transparent 62%),linear-gradient(135deg,var(--sky-soft),#8ecdf9)}
.card:nth-child(5n+3) .thumb{background:radial-gradient(circle at 50% 30%,#fff 0%,transparent 62%),linear-gradient(135deg,var(--grass-soft),#8fe3a0)}
.card:nth-child(5n+4) .thumb{background:radial-gradient(circle at 50% 30%,#fff 0%,transparent 62%),linear-gradient(135deg,var(--grape-soft),#bdaeff)}
.card:nth-child(5n+5) .thumb{background:radial-gradient(circle at 50% 30%,#fff 0%,transparent 62%),linear-gradient(135deg,var(--pink-soft),#ffb1cd)}
.card .body{padding:13px;display:flex;flex-direction:column;flex:1}
.card .num{background:var(--ink);color:var(--sun);font-size:11.5px;font-weight:900;letter-spacing:1.2px;padding:3px 11px;border-radius:999px;display:inline-block;margin-bottom:8px;align-self:flex-start}
.badge{display:inline-block;align-self:flex-start;background:var(--grass);color:#fff;font-size:11.5px;font-weight:900;letter-spacing:.4px;padding:3px 11px;border-radius:999px;border:2px solid var(--ink);margin-bottom:8px;transform:rotate(-2deg)}
.card h3{font-size:16.5px;font-weight:900;margin-bottom:6px;color:var(--ink);line-height:1.25}
.card p.desc{font-size:13px;color:var(--ink-soft);margin-bottom:10px;flex:1;font-weight:600}
.card .lesson{font-size:12px;background:var(--grass-soft);border:2px solid var(--grass);border-radius:11px;padding:8px 10px;margin-bottom:12px;color:#176b2c;font-weight:700}
.card a.play{display:block;background:linear-gradient(180deg,#ff8a3d,var(--flame));color:#fff;text-align:center;font-weight:900;font-size:17px;padding:11px;border-radius:14px;text-decoration:none;border:3px solid var(--ink);box-shadow:0 5px 0 rgba(38,34,31,.92);transition:transform .08s,box-shadow .08s;text-shadow:0 1px 0 rgba(0,0,0,.22)}
.card a.play:hover{transform:translateY(-2px)}
.card a.play:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(38,34,31,.92)}
.card.fb-flash{animation:fbflash 1.6s ease}
@keyframes fbflash{0%,55%{box-shadow:0 0 0 4px var(--sun),0 0 42px rgba(255,197,61,.95)}100%{box-shadow:var(--shadow)}}
@media(min-width:720px){.card .thumb{height:104px;font-size:50px}.card h3{font-size:18px}}

/* ---------- Footer ---------- */
footer{background:var(--ink);border-top:5px solid var(--flame);color:#f3e4cd;text-align:center;padding:26px 16px;margin-top:8px;font-weight:600}
footer a{color:var(--sun)}

/* ================================================================
   SHOP + MY CHEST — slide-over drawers.
   Markup/IDs/classes untouched; the hub script adds .fb-on to
   #shop / #locker and removes it from the others. In v3 that class
   means "drawer open". #panel-games has NO display rule at all —
   the games are normal page flow and can never be hidden by CSS.
   ================================================================ */
#shop,#locker{
  position:fixed;left:0;right:0;bottom:0;top:auto;
  width:auto;max-width:none;margin:0;
  max-height:86dvh;overflow-y:auto;overscroll-behavior:contain;
  background:var(--paper);color:var(--ink);
  border-top:4px solid var(--ink);border-radius:22px 22px 0 0;
  box-shadow:0 -20px 55px rgba(38,34,31,.4);
  z-index:95;visibility:hidden;pointer-events:none;
  transform:translateY(106%);
  transition:transform .3s ease,visibility 0s linear .3s;
}
#shop.fb-on,#locker.fb-on{visibility:visible;pointer-events:auto;transform:translateY(0);transition:transform .3s ease,visibility 0s}
/* dim the page behind an open drawer; the sticky nav (z-100) stays
   bright and clickable above the dim so the Games button — the
   drawer's close control — is always reachable */
body:has(#shop.fb-on)::after,body:has(#locker.fb-on)::after{
  content:"";position:fixed;inset:0;background:rgba(38,34,31,.45);z-index:94;
}
body:has(#shop.fb-on),body:has(#locker.fb-on){overflow:hidden}
@media(min-width:900px){
  #shop,#locker{left:auto;top:0;bottom:0;right:0;width:min(480px,100vw);max-height:none;
    border-top:none;border-left:4px solid var(--ink);border-radius:0;
    transform:translateX(106%);padding-top:118px}
  #shop.fb-on,#locker.fb-on{transform:translateX(0)}
}
/* drawer contents */
.shop{padding:22px 2px 10px}
.shop h2{font-size:clamp(25px,5vw,34px);font-weight:900;color:var(--ink);text-align:center;letter-spacing:.4px}
#locker .shop h2{color:var(--grape)}
.shop .sub{text-align:center;color:var(--ink-soft);font-weight:700;max-width:640px;margin:8px auto 6px}
.shop .free-note{text-align:center;color:#176b2c;font-weight:800;background:var(--grass-soft);border:2px solid var(--grass);border-radius:12px;padding:9px 12px;max-width:720px;margin:10px auto 16px}
.shopbox{background:var(--card);border:3px solid var(--ink);border-radius:20px;padding:18px;margin-bottom:24px;box-shadow:var(--shadow)}
.shopbox h3{font-size:21px;font-weight:900;color:var(--ink);margin-bottom:5px}
.shopbox .boxsub{font-size:13px;color:var(--ink-soft);margin-bottom:14px;line-height:1.6;font-weight:600}
.shopgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:11px}
@media(min-width:560px){.shopgrid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}}
.shopitem{background:#fffaf0;border:2.5px solid var(--ink);border-radius:15px;padding:12px;text-align:center;display:flex;flex-direction:column;gap:4px}
.shopitem .em{font-size:38px}
.shopitem .nm{font-weight:900;color:var(--ink);font-size:15px}
.shopitem .ds{font-size:11.5px;color:var(--ink-soft);flex:1;font-weight:600}
.shopitem .fx{font-size:11.5px;color:#176b2c;font-weight:800}
.buybtn{background:linear-gradient(180deg,#ff8a3d,var(--flame));color:#fff;font-weight:900;border:3px solid var(--ink);border-radius:11px;padding:9px 6px;font-size:14px;cursor:pointer;box-shadow:0 4px 0 rgba(38,34,31,.92);font-family:inherit;text-shadow:0 1px 0 rgba(0,0,0,.2)}
.buybtn:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(38,34,31,.92)}
.buybtn.owned{background:var(--grass-soft);color:#176b2c;border-color:var(--grass);box-shadow:none;text-shadow:none}
.buybtn.confirm{background:linear-gradient(180deg,#ff6b57,var(--red));color:#fff}
.buybtn:disabled{opacity:.55;cursor:default}
.shopsec-title{font-size:16px;font-weight:900;color:var(--ink);letter-spacing:.6px;margin:17px 0 9px;border-bottom:3px solid var(--sun);padding-bottom:4px}
.merchgrid{display:grid;grid-template-columns:1fr;gap:14px}
@media(min-width:560px){.merchgrid{grid-template-columns:repeat(auto-fill,minmax(185px,1fr))}}
.merchcard{background:#fffaf0;border:3px solid var(--ink);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.merchcard img{width:100%;height:160px;object-fit:cover;display:block;border-bottom:3px solid var(--ink)}
.merchcard .mb{padding:12px;display:flex;flex-direction:column;gap:4px;flex:1}
.merchcard .nm{font-weight:900;color:var(--ink)}
.merchcard .ds{font-size:12px;color:var(--ink-soft);flex:1;font-weight:600}
.merchcard .pr{color:var(--flame-deep);font-weight:900;font-size:17px}
.merchcard a{margin-top:auto;display:block;text-align:center;background:#fff;border:3px solid var(--sky);color:#0b6cb8;font-weight:900;border-radius:11px;padding:9px 6px;text-decoration:none;font-size:14px}
.merchcard a:hover{background:var(--sky-soft)}
/* the gate-status line carries a dark-theme inline color (#ffd9ae);
   recolor it for the light drawer (CSS-only, markup untouched) */
#fbshop-gatestatus{color:#176b2c!important}
/* locker script injects two helper spans with a dark-theme inline
   color (#d8b89a); recolor them for the light drawer (CSS-only,
   script untouched) */
#fb-locker-body span[style]{color:var(--ink-soft)!important}

/* ---------- Toast ---------- */
#fbshop-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(90px);background:var(--ink);color:#ffeecb;border:3px solid var(--sun);border-radius:999px;padding:11px 20px;font-weight:800;z-index:999;transition:transform .25s;max-width:92vw;text-align:center;box-shadow:0 10px 30px rgba(38,34,31,.35)}
#fbshop-toast.show{transform:translateX(-50%) translateY(0)}

/* ---------- First-run tour (onboarding.js) ---------- */
.fbt-overlay{position:fixed;inset:0;z-index:9000;background:rgba(38,34,31,.72);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;overflow-y:auto}
.fbt-card{width:100%;max-width:520px;background:var(--card);border:3.5px solid var(--ink);border-radius:22px;padding:28px 26px;text-align:center;box-shadow:0 10px 0 rgba(38,34,31,.9),0 30px 60px rgba(0,0,0,.35);color:var(--ink)}
.fbt-step{font-size:12px;font-weight:900;letter-spacing:2px;color:var(--flame-deep);margin-bottom:6px}
.fbt-title{font-size:clamp(24px,5.4vw,32px);font-weight:900;letter-spacing:.5px;color:var(--ink);margin:2px 0 12px;line-height:1.15}
.fbt-body{font-size:16px;line-height:1.6;color:var(--ink);text-align:left}
.fbt-body b{color:var(--flame-deep)}
.fbt-body .fbt-row{display:flex;align-items:center;gap:10px;margin:10px 0}
.fbt-linkbtn{display:inline-block;background:linear-gradient(180deg,#ff8a3d,var(--flame));color:#fff;font-weight:900;font-size:16px;text-decoration:none;padding:12px 22px;border-radius:14px;border:3px solid var(--ink);box-shadow:0 5px 0 rgba(38,34,31,.92)}
.fbt-soon{display:inline-block;background:var(--sun-soft);border:2.5px dashed var(--ink);color:var(--ink);font-weight:800;border-radius:999px;padding:6px 16px}
.fbt-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:22px}
.fbt-btn{background:linear-gradient(180deg,#ff8a3d,var(--flame));color:#fff;font-weight:900;font-size:16px;border:3px solid var(--ink);border-radius:14px;padding:12px 20px;cursor:pointer;font-family:inherit;box-shadow:0 5px 0 rgba(38,34,31,.92)}
.fbt-btn:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(38,34,31,.92)}
.fbt-btn.ghost{background:#fff;color:var(--ink);box-shadow:none}
.fbt-dots{display:flex;gap:6px;justify-content:center}
.fbt-dot{width:9px;height:9px;border-radius:50%;background:rgba(38,34,31,.22)}
.fbt-dot.on{background:var(--flame)}
.fbt-skip{display:block;margin:16px auto 0;background:none;border:none;color:var(--ink-soft);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:underline}

/* ---------- Phone tightening (<=719px): GAMES IN THE FIRST SCREEN ----------
   Tightening pass, 2026-10-24. The grid never moves and nothing is
   hidden — everything stacked ABOVE it gets compact so the grid and
   its first row of numbered tiles land inside the first viewport
   (390x844) with zero scrolling. All text stays in the DOM; a few
   blocks are visually line-clamped on phone only. */
@media(max-width:719px){
  /* nav: one slim brand row + one row of pill buttons. The Home and
     Fire World links rest on phone (the brand IS the home link, and
     this page IS Fire World); they return at >=720px. */
  nav.top .wrap{padding:6px 10px;gap:5px 8px;line-height:1.25}
  .brand{font-size:17px}
  .balpill{font-size:11.5px;padding:2px 9px}
  nav.top a.navlink{font-size:12.5px;margin-left:8px}
  nav.top a.navlink[href="/"],nav.top a.navlink[href="/fire-world.html"]{display:none}
  #fb-signout-btn{font-size:12px;padding:3px 10px;margin-left:8px}
  .fb-tabrow{flex-wrap:nowrap;gap:7px;padding:6px 10px 6px}
  .fb-tab{font-size:13.5px;line-height:1.2;padding:7px 12px;white-space:nowrap;box-shadow:0 3px 0 rgba(38,34,31,.92)}
  /* hero: slim band, one-line subtext, one-line download button,
     tiny fingerprint lines (full text still in the DOM) */
  .hero{padding:10px 8px 9px}
  .hero h1{font-size:25px;margin:0 0 4px}
  .hero p{font-size:13px;line-height:1.35;margin:0 auto 7px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
  .dlbtn{font-size:15.5px;padding:9px 15px;margin:2px 0 6px;border-radius:14px;box-shadow:0 5px 0 rgba(38,34,31,.92),0 10px 20px rgba(38,34,31,.22);white-space:nowrap}
  .dlsub{font-size:9px;line-height:1.35;margin-bottom:2px}
  .creator{font-size:11.5px;line-height:1.25;padding:4px 12px;margin-top:6px}
  /* promo strips: short bars, at most two lines each */
  .whatsnew{padding:5px 10px}
  .whatsnew a{font-size:12.5px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  /* games controls: one scrollable chip rail, small jump numbers */
  .fb-controls{padding:9px 0 0}
  .fb-searchwrap{padding:7px 11px;border-radius:13px;box-shadow:0 3px 0 rgba(38,34,31,.92)}
  .fb-search-ic{font-size:16px}
  #fb-game-search{font-size:15px}
  .fb-chips{margin-top:8px;gap:6px}
  .fb-chip{font-size:12px;padding:4px 10px}
  .fb-jump{padding:7px 2px 3px;gap:5px}
  .fb-jnum{min-width:31px;height:31px;font-size:12.5px;border-radius:9px}
  .fb-gcount{font-size:12px}
  /* featured trio: a swipeable shelf instead of a tall stack */
  .fb-featured{display:flex;overflow-x:auto;gap:10px;margin:9px 0 2px;padding:2px 2px 6px;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .fb-featured::-webkit-scrollbar{display:none}
  .fb-feat{flex:0 0 84%;scroll-snap-align:start;padding:9px 11px;gap:10px;border-top-width:7px;border-radius:15px}
  .fb-feat-em{font-size:26px}
  .fb-feat-t{font-size:15px;line-height:1.2}
  .fb-feat-d{font-size:11.5px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
  /* the grid + cards: tighter, so the first row reads at a glance */
  .grid{gap:10px;padding:10px 0 26px}
  .card{border-radius:16px}
  .card .thumb{height:60px;font-size:31px}
  .card .body{padding:10px}
  .card .num{font-size:10.5px;margin-bottom:6px}
  .badge{font-size:10.5px;margin-bottom:6px}
  .card h3{font-size:14.5px;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .card p.desc{font-size:12px;line-height:1.45;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .card .lesson{font-size:11px;padding:6px 8px;margin-bottom:9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .card a.play{font-size:15px;padding:8px}
}

@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{transition:none!important;animation:none!important}
}
"""

def main() -> int:
    text = SRC.read_text(encoding="utf-8")
    if text.count("<style") != 2:
        print(f"ABORT: expected exactly 2 <style> blocks, found {text.count('<style')}")
        return 1
    start = text.index("<style>")
    end = text.index("</style>", text.index("</style>") + 1) + len("</style>")
    head_before, head_after = text[:start], text[end:]
    if "<script" in text[start:end]:
        print("ABORT: style span unexpectedly contains a script")
        return 1
    new = head_before + "<style>" + CSS + "</style>" + head_after
    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text(new, encoding="utf-8")
    print(f"wrote {DST} ({len(new)} bytes; original {len(text)})")
    # sanity: body must be byte-identical
    ob = text[text.index("<body"):]
    nb = new[new.index("<body"):]
    print("body byte-identical:", ob == nb)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
