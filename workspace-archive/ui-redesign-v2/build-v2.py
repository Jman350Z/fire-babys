#!/usr/bin/env python3
"""Fire World hub VISUAL REDESIGN v2 (2026-10-23) — CSS-only reskin.

Reads the pristine v1 copy (fire-world.v1.html) and appends ONE override
layer at the end of the page's single existing <style> block. Body HTML,
every ID, every href, and all three inline scripts are never touched —
byte-identical by construction. Fails loudly on any anchor mismatch.
"""
import re

HERE = '/home/hatch/workspace/ui-redesign-v2'
src = open(f'{HERE}/fire-world.v1.html', encoding='utf-8').read()
orig = src

assert src.count('<style>') == 1 and src.count('</style>') == 1, 'expected exactly one style block'

V2_CSS = """
/* ================================================================
   FIRE WORLD VISUAL REDESIGN v2 (2026-10-23) — "VOLCANIC ARCADE"
   Pure CSS override layer. No HTML, ID, href or script changes.
   Palette: volcanic charcoal + molten gradient (ember red ->
   flame orange -> amber -> gold), warm cream text, water blue
   reserved as the secondary (Fire + Water) accent.
   ================================================================ */
:root{--flame:#ff5a00;--ember:#ff3d00;--gold:#ffd76a;--amber:#ffb347;--cream:#fff3e2;--ink:#160b04;--water:#38b6ff;--waterlt:#aee6ff}
::selection{background:rgba(255,61,0,.55);color:#fff}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--cream);background-color:#0a0503;background-image:radial-gradient(900px 480px at 50% -80px,rgba(255,106,26,.30),transparent 60%),radial-gradient(700px 520px at 92% 10%,rgba(56,182,255,.08),transparent 60%),radial-gradient(820px 620px at 6% 80%,rgba(232,53,44,.12),transparent 62%),radial-gradient(1300px 950px at 50% 42%,transparent 55%,rgba(0,0,0,.52)),linear-gradient(180deg,#150a05,#0a0503 42%,#070302);background-attachment:fixed,fixed,fixed,fixed,scroll}

/* ---------- Masthead: branded lockup, not a utility bar ---------- */
nav.top{background:linear-gradient(180deg,rgba(24,11,4,.98),rgba(13,6,3,.98));border-bottom:3px solid #ff5a00;box-shadow:0 3px 28px rgba(255,61,0,.35),0 10px 34px rgba(0,0,0,.5);backdrop-filter:blur(8px)}
nav.top::before{content:"";display:block;height:5px;background:linear-gradient(90deg,#e8352c 0%,#ff5a00 30%,#ffb347 55%,#ffd76a 72%,#38b6ff 100%)}
nav.top .wrap{padding-top:10px;padding-bottom:4px}
.brand{font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;font-size:29px;font-weight:900;letter-spacing:.5px;text-transform:uppercase;color:#ffd76a;text-shadow:0 2px 0 rgba(163,60,16,.65),0 0 22px rgba(255,106,26,.5);padding-bottom:3px;background:linear-gradient(90deg,#ff3d00,#ffd76a) left bottom/100% 3px no-repeat}
nav.top a.navlink{font-size:12.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#ffe9d6;margin-left:18px}
nav.top a.navlink:hover{color:var(--waterlt)}
.balpill{background:#170b04;border:2px solid var(--gold);color:#ffd76a;border-radius:999px;padding:3px 12px;font-weight:900;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 14px rgba(255,183,71,.18)}
#fb-signout-btn{background:#241207;border:2px solid rgba(255,179,71,.55);color:#ffd9ae;border-radius:9px;font-weight:800;font-size:12px;letter-spacing:1px;text-transform:uppercase;padding:5px 12px;cursor:pointer}
#fb-signout-btn:hover{border-color:#ff5a00;color:#fff}

/* ---------- Tabs: chunky arcade switches ---------- */
.fb-tabrow{gap:10px;padding-top:8px;padding-bottom:12px}
.fb-tab{font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;background:linear-gradient(180deg,#2a1407,#170b04);border:3px solid #46260f;color:#ffd9ae;font-weight:900;font-size:17px;letter-spacing:1.2px;text-transform:uppercase;border-radius:12px;padding:11px 22px;box-shadow:0 5px 0 #000,inset 0 1px 0 rgba(255,255,255,.14);transition:transform .08s,box-shadow .08s,background .15s,color .15s}
.fb-tab:hover{color:#fff;border-color:#ff8c2e}
.fb-tab:active{transform:translateY(3px);box-shadow:0 2px 0 #000,inset 0 1px 0 rgba(255,255,255,.14)}
.fb-tab[aria-selected="true"][data-tab="games"]{background:linear-gradient(180deg,#ffd76a,#ff8c2e 55%,#ff3d00);color:#2a1206;border-color:#ffe9a8;box-shadow:0 5px 0 #7a2403,0 0 28px rgba(255,106,26,.55)}
.fb-tab[aria-selected="true"][data-tab="shop"]{background:linear-gradient(180deg,#fff0b3,#ffb347 55%,#ff8c2e);color:#2a1206;border-color:#ffe9a8;box-shadow:0 5px 0 #7a3c03,0 0 28px rgba(255,179,71,.5)}
.fb-tab[aria-selected="true"][data-tab="chest"]{background:linear-gradient(180deg,#cdefff,#38b6ff 55%,#1a7fd4);color:#04182a;border-color:#cdefff;box-shadow:0 5px 0 #0a3c63,0 0 28px rgba(56,182,255,.5)}

/* ---------- Tab-visibility repair (CSS-only, markup untouched) ----------
   In the v1 markup, #shop and #locker are nested INSIDE #panel-games.
   Selecting Shop/Chest removes .fb-on from #panel-games, whose
   display:none then hides the very panel just selected — Shop and
   Chest render as a blank page (verified in a real browser, see
   BUILD-NOTES). Repair: the games wrapper stays transparent, and
   while a sibling panel is active its games-only children hide. */
#panel-games.fb-panel{display:block}
#panel-games:has(>#shop.fb-on)>*:not(#shop),
#panel-games:has(>#locker.fb-on)>*:not(#locker){display:none}

/* ---------- Hero: display type over an ember burst ---------- */
.hero{background:radial-gradient(ellipse 90% 120% at 50% -20%,rgba(255,140,46,.34),rgba(255,61,0,.10) 55%,transparent 75%);border-bottom:3px solid rgba(255,90,0,.5);box-shadow:0 18px 44px -18px rgba(255,61,0,.35);padding:34px 16px 26px}
.hero h1{font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;font-size:clamp(46px,9.5vw,86px);font-weight:900;text-transform:uppercase;letter-spacing:-.01em;line-height:.98;color:#ffb347;text-shadow:0 3px 0 #a33c10,0 10px 38px rgba(255,61,0,.55);margin:4px 0 12px}
.hero p{font-size:clamp(15.5px,3.4vw,19px);font-weight:700;color:#ffe9d6;max-width:660px}
.creator{display:inline-block;background:#170b04;border:2px solid rgba(255,215,106,.6);color:#ffd76a;border-radius:9px;padding:6px 16px;font-weight:800;font-size:12px;letter-spacing:2.2px;text-transform:uppercase;margin-top:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}
.dlbtn{display:inline-block;text-decoration:none;text-align:center;color:#2a1206;font-weight:900;background:linear-gradient(180deg,#ffd76a,#ff8c2e 55%,#ff3d00);border:3px solid #ffe9a8;border-radius:16px;font-size:clamp(17px,3.8vw,24px);letter-spacing:.6px;padding:15px 28px;box-shadow:0 8px 0 #7a2403,0 20px 40px rgba(0,0,0,.55),0 0 30px rgba(255,106,26,.35)}
.dlbtn:hover{transform:translateY(-2px);text-decoration:none}
.dlbtn:active{transform:translateY(5px);box-shadow:0 3px 0 #7a2403,0 10px 22px rgba(0,0,0,.5)}
.dlsub{font-size:13px;line-height:1.55;max-width:680px;margin:0 auto 16px;word-break:break-all;color:#d8b89a}
.whatsnew{background:linear-gradient(90deg,rgba(255,61,0,.20),rgba(255,215,106,.10) 50%,rgba(56,182,255,.12));border-top:2px solid #ff5a00;border-bottom:2px solid #ff5a00;padding:12px 20px}
.whatsnew a{color:#ffd76a;font-size:15.5px;font-weight:900;letter-spacing:.4px;text-transform:uppercase}
.whatsnew a:hover{color:#fff}

/* ---------- Controls: search, chips, jump strip ---------- */
.fb-controls{padding:22px 0 2px}
.fb-searchwrap{background:#140a04;border:3px solid #ff5a00;border-radius:14px;padding:12px 16px;box-shadow:0 0 0 3px rgba(0,0,0,.55),0 0 24px rgba(255,90,0,.28),inset 0 2px 0 rgba(255,255,255,.06)}
#fb-game-search{font-size:17px;font-weight:700;color:#fff3e2}
#fb-game-search::placeholder{color:#c99a68}
.fb-chips{gap:8px;margin-top:14px}
.fb-chip{background:#1c0f06;border:2.5px solid #4a2a12;color:#ffd9ae;border-radius:10px;font-weight:900;font-size:12.5px;letter-spacing:.9px;text-transform:uppercase;padding:8px 14px;box-shadow:0 3px 0 #000}
.fb-chip:hover{color:#fff;border-color:#ff8c2e}
.fb-chip.fb-on{background:linear-gradient(180deg,#ffd76a,#ff8c2e 60%,#ff5a00);color:#2a1206;border-color:#ffe9a8;box-shadow:0 3px 0 #7a2403,0 0 18px rgba(255,106,26,.45)}
.fb-jump{gap:7px;padding:14px 2px 8px}
.fb-jnum{min-width:43px;height:43px;border-radius:10px;background:linear-gradient(180deg,#2a1407,#130a05);border:2px solid rgba(255,179,71,.55);color:#ffd76a;font-weight:900;font-size:15px;box-shadow:0 3px 0 #000}
.fb-jnum:hover{border-color:#ffd76a;color:#fff;background:linear-gradient(180deg,#3a1c08,#1c0f06);box-shadow:0 3px 0 #000,0 0 16px rgba(255,140,46,.4)}
.fb-gcount{font-size:12.5px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:var(--amber)}
.fb-noresults{color:#ffd9ae}

/* ---------- Featured row: gradient-frame spotlights ---------- */
.fb-featured{gap:14px;margin:16px 0 4px}
.fb-feat{background:linear-gradient(180deg,#221207,#130a05) padding-box,linear-gradient(135deg,#ffd76a,#ff5a00) border-box;border:3px solid transparent;border-radius:18px;padding:16px;box-shadow:0 8px 0 rgba(0,0,0,.5),0 16px 32px rgba(0,0,0,.45)}
.fb-feat:hover{transform:translateY(-3px);box-shadow:0 11px 0 rgba(0,0,0,.5),0 22px 40px rgba(0,0,0,.5),0 10px 34px rgba(255,90,0,.35)}
.fb-feat[href="/play.html"]{background:linear-gradient(180deg,#0a1a26,#071018) padding-box,linear-gradient(135deg,#aee6ff,#1a7fd4) border-box}
.fb-feat[href="/play.html"]:hover{box-shadow:0 11px 0 rgba(0,0,0,.5),0 22px 40px rgba(0,0,0,.5),0 10px 34px rgba(56,182,255,.4)}
.fb-feat[href="/play.html"] .fb-feat-t{color:#aee6ff}
.fb-feat[href="/play.html"] .fb-feat-go{color:#7fd8ff}
.fb-feat-em{font-size:44px}
.fb-feat-t{font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;font-size:20px;font-weight:900;letter-spacing:.4px;text-transform:uppercase;color:#ffd76a}
.fb-feat-d{font-size:13px;color:#e8c9a8}
.fb-feat-go{color:#ffb347;font-size:15px}

/* ---------- Game cards: molten frames, giant numbers ---------- */
.grid{grid-template-columns:repeat(auto-fill,minmax(238px,1fr));gap:16px;padding:20px 0 34px}
.card{background:linear-gradient(180deg,#221207,#130a05) padding-box,linear-gradient(180deg,rgba(255,215,106,.8),rgba(255,106,26,.55) 42%,rgba(232,53,44,.5)) border-box;border:3px solid transparent;border-radius:18px;box-shadow:0 9px 0 rgba(0,0,0,.45),0 18px 34px rgba(0,0,0,.5);scroll-margin-top:190px}
.card:hover{transform:translateY(-5px);border-color:transparent;box-shadow:0 13px 0 rgba(0,0,0,.45),0 26px 44px rgba(0,0,0,.55),0 16px 44px -4px rgba(255,90,0,.5)}
.card .thumb{height:112px;font-size:54px;background:radial-gradient(circle at 50% 32%,rgba(255,233,168,.55),transparent 68%),linear-gradient(140deg,#7a2403,#e8352c 52%,#ff6a1a);box-shadow:inset 0 -14px 28px rgba(0,0,0,.35);text-shadow:0 8px 20px rgba(0,0,0,.45)}
.card:nth-child(3n) .thumb{background:radial-gradient(circle at 50% 32%,rgba(255,233,168,.5),transparent 68%),linear-gradient(140deg,#5c0e04,#c21807 55%,#ff3d00)}
.card:nth-child(4n) .thumb{background:radial-gradient(circle at 50% 32%,rgba(230,248,255,.55),transparent 68%),linear-gradient(140deg,#0a3c63,#1a7fd4 55%,#38b6ff)}
.card .body{padding:14px 14px 16px}
.card .num{display:block;background:none;border:none;padding:0;margin:0 0 2px;align-self:auto;font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;font-size:31px;font-weight:900;letter-spacing:.5px;line-height:1;color:#ffb347}
@supports ((-webkit-background-clip:text) or (background-clip:text)){.card .num{background:linear-gradient(180deg,#ffe9a8 10%,#ffb347 55%,#ff5a00);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}}
.card .badge{display:inline-block;background:linear-gradient(90deg,#ff3d00,#ff6a1a);border:2px solid #ffd76a;color:#fff;border-radius:8px;font-size:11px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;padding:3px 9px;margin-bottom:8px;box-shadow:0 3px 10px rgba(255,61,0,.35)}
.card h3{font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;font-size:19.5px;font-weight:900;letter-spacing:.2px;line-height:1.12;color:#fff3e2;margin-bottom:6px}
.card p.desc{font-size:13.5px;color:#e8c9a8}
.card .lesson{background:rgba(56,182,255,.10);border:2px solid rgba(56,182,255,.45);border-radius:10px;color:#cfeeff;font-size:12px}
.card a.play{background:linear-gradient(180deg,#ffd76a,#ff8c2e 55%,#ff5a00);border:3px solid #ffe9a8;border-radius:12px;font-size:16.5px;letter-spacing:1.2px;text-transform:uppercase;padding:11px;box-shadow:0 6px 0 #7a2403,0 12px 24px rgba(255,61,0,.3)}
.card a.play:hover{transform:translateY(-2px)}
.card a.play:active{transform:translateY(4px);box-shadow:0 2px 0 #7a2403}
.card.fb-flash{animation:fbf2flash 1.6s ease}
@keyframes fbf2flash{0%,55%{box-shadow:0 0 0 4px #ffd76a,0 0 54px rgba(255,140,46,.95)}100%{box-shadow:0 9px 0 rgba(0,0,0,.45),0 18px 34px rgba(0,0,0,.5)}}

/* ---------- Shop + Chest panels ---------- */
.fb-panel .shop{padding-top:26px}
.shop h2{font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;font-size:clamp(30px,6vw,40px);font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#ffb347;text-shadow:0 2px 0 rgba(163,60,16,.6),0 0 24px rgba(255,106,26,.35)}
.shop h2::after{content:"";display:block;width:72px;height:5px;border-radius:3px;margin-top:8px;background:linear-gradient(90deg,#ff3d00,#ffd76a,#38b6ff)}
.shop .sub{color:#e8c9a8;font-weight:600}
.shop .free-note{background:rgba(255,215,106,.08);border:2px solid rgba(255,215,106,.45);border-radius:12px;padding:10px 14px;color:#ffe9d6}
.shopbox{background:linear-gradient(180deg,#1e1006,#120a05) padding-box,linear-gradient(180deg,rgba(255,215,106,.55),rgba(255,106,26,.35)) border-box;border:3px solid transparent;border-radius:18px;box-shadow:0 9px 0 rgba(0,0,0,.4),0 18px 34px rgba(0,0,0,.45)}
.shopbox h3{font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;font-size:21px;font-weight:900;letter-spacing:.6px;text-transform:uppercase;color:#ffd76a}
.shopbox .boxsub{color:#d8b89a}
.shopsec-title{color:var(--amber);font-weight:900;font-size:14.5px;letter-spacing:1.8px;text-transform:uppercase}
.shopitem{background:#170b04;border:2px solid rgba(255,179,71,.35);border-radius:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
.shopitem:hover{border-color:rgba(255,215,106,.8)}
.shopitem .em{font-size:34px}
.shopitem .nm{font-weight:900;color:#fff3e2}
.shopitem .ds{color:#d8b89a}
.buybtn{background:linear-gradient(180deg,#ffd76a,#ff8c2e 55%,#ff5a00);border:2.5px solid #ffe9a8;color:#2a1206;border-radius:10px;font-weight:900;letter-spacing:.6px;text-transform:uppercase;box-shadow:0 4px 0 #7a2403}
.buybtn:active{transform:translateY(3px);box-shadow:0 1px 0 #7a2403}
.buybtn.owned{background:linear-gradient(180deg,#aee6ff,#38b6ff 55%,#1a7fd4);border-color:#cdefff;color:#04182a;box-shadow:0 4px 0 #0a3c63}
.buybtn.confirm{background:linear-gradient(180deg,#ff9a7a,#ff3d00 60%,#c21807);border-color:#ffd0bd;color:#fff;box-shadow:0 4px 0 #5c0e04}
.buybtn:disabled{background:#33241a;border-color:#4a3423;color:#9a8266;box-shadow:none}
.merchcard{background:linear-gradient(180deg,#1e1006,#120a05) padding-box,linear-gradient(180deg,rgba(255,215,106,.5),rgba(255,106,26,.3)) border-box;border:3px solid transparent;border-radius:16px;box-shadow:0 8px 0 rgba(0,0,0,.4),0 14px 28px rgba(0,0,0,.4)}
.merchcard .nm{font-weight:900;color:#fff3e2}
.merchcard .ds{color:#d8b89a}
.merchcard .pr{color:#ffd76a;font-weight:900}
.merchcard a{color:var(--waterlt);font-weight:800}
#fbshop-toast{background:#170b04;border:2.5px solid var(--gold);color:#ffe9d6;border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.6),0 0 24px rgba(255,140,46,.3)}

/* ---------- First-run tour (injected by onboarding.js) ---------- */
.fbt-overlay{background:rgba(5,2,0,.82)}
.fbt-card{background:linear-gradient(180deg,#221207,#130a05) padding-box,linear-gradient(160deg,#ffd76a,#ff5a00,#38b6ff) border-box;border:3px solid transparent;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.65),0 0 40px rgba(255,90,0,.25);color:#fff3e2}
.fbt-title{font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#ffb347}
.fbt-btn{background:linear-gradient(180deg,#ffd76a,#ff8c2e 55%,#ff5a00);border:2.5px solid #ffe9a8;color:#2a1206;border-radius:10px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;box-shadow:0 4px 0 #7a2403}
.fbt-btn.ghost{background:#241207;border-color:rgba(255,179,71,.55);color:#ffd9ae;box-shadow:none}
.fbt-dot.on{background:linear-gradient(180deg,#ffd76a,#ff5a00)}
.fbt-linkbtn{color:var(--waterlt)}

/* ---------- Footer ---------- */
footer{background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.5));border-top:3px solid #ff5a00;box-shadow:0 -8px 30px rgba(255,61,0,.18);color:#d8b89a}
footer p:first-child{font-family:"Arial Narrow","Liberation Sans Narrow","Roboto Condensed","Helvetica Neue",system-ui,sans-serif;font-size:20px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;color:#ffb347}

/* ---------- Responsive: phone portrait first ---------- */
@media(max-width:760px){.fb-featured{grid-template-columns:1fr}}
@media(max-width:640px){.grid{grid-template-columns:repeat(2,1fr);gap:11px}.brand{font-size:23px}.fb-tab{padding:10px 13px;font-size:14.5px}.card .thumb{height:82px;font-size:38px}.card .num{font-size:23px}.card h3{font-size:15.5px}.card p.desc{font-size:12px}.card a.play{font-size:13.5px;padding:10px}.fb-feat-em{font-size:36px}.fb-jnum{min-width:39px;height:39px}}
"""

assert src.count('</style>') == 1
out = src.replace('</style>', V2_CSS + '\n</style>')
assert out.count('</style>') == 1

# integrity: everything outside the style block must be untouched
pre_o, post_o = orig.split('</style>')
pre_n, post_n = out.split('</style>')
assert post_o == post_n, 'content after </style> changed!'
head_o = pre_o.split('<style>')[0]
head_n = pre_n.split('<style>')[0]
assert head_o == head_n, 'content before <style> changed!'

# CSS brace balance inside the style block
style = re.search(r'<style>(.*)</style>', out, re.S).group(1)
assert style.count('{') == style.count('}'), f"brace imbalance {style.count('{')} vs {style.count('}')}"

open(f'{HERE}/fire-world.html', 'w', encoding='utf-8').write(out)
print(f'written {len(orig.encode())} -> {len(out.encode())} bytes (CSS layer +{len(V2_CSS.encode())})')
print(f'style braces balanced: {style.count("{")} open / {style.count("}")} close')
