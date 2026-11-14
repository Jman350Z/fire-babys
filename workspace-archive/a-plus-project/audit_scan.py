#!/usr/bin/env python3
"""CSP audit of ~/workspace/.deploy/ — counts everything a strict CSP cares about."""
import os, re, json, hashlib, base64
from html.parser import HTMLParser

ROOT = "/home/hatch/workspace/.deploy"
OUT = "/home/hatch/workspace/a-plus-project"

HANDLER_ATTRS = set("""onclick ondblclick onmousedown onmouseup onmouseover onmouseout onmousemove
onkeydown onkeyup onkeypress onload onunload onerror onsubmit onchange oninput onfocus onblur
ontouchstart ontouchend ontouchmove onpointerdown onpointerup onscroll onresize oncontextmenu
onanimationend ontransitionend onplay onpause onended oncanplay""".split())

class PageScan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.inline_scripts = []      # (attrs_dict, text)
        self.script_srcs = []
        self.inline_styles = []       # text of <style>
        self.style_attrs = 0
        self.handlers = []            # (tag, attr, value[:60])
        self.js_urls = []
        self.iframes = []
        self.imgs = set()
        self._cur = None              # ('script'|'style', attrs)
        self._buf = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for k, v in attrs:
            if k.lower() in HANDLER_ATTRS:
                self.handlers.append((tag, k, (v or "")[:60]))
            if k.lower() == "style":
                self.style_attrs += 1
            if k.lower() in ("href", "src") and v and v.strip().lower().startswith("javascript:"):
                self.js_urls.append(v[:60])
        if tag == "script":
            if a.get("src"):
                self.script_srcs.append(a["src"])
                self._cur = None
            else:
                self._cur = ("script", a); self._buf = []
        elif tag == "style":
            self._cur = ("style", a); self._buf = []
        elif tag == "iframe":
            self.iframes.append(a.get("src", ""))
        elif tag in ("img", "source", "video", "audio"):
            s = a.get("src", "")
            if s: self.imgs.add(s[:80])
    def handle_data(self, data):
        if self._cur: self._buf.append(data)
    def handle_endtag(self, tag):
        if self._cur and self._cur[0] == tag:
            text = "".join(self._buf)
            if tag == "script": self.inline_scripts.append((self._cur[1], text))
            else: self.inline_styles.append(text)
            self._cur = None; self._buf = []

def sha(t):
    return "sha256-" + base64.b64encode(hashlib.sha256(t.encode("utf-8")).digest()).decode()

pages = {}
tot = {"inline_scripts": 0, "script_blocks": 0, "style_blocks": 0, "style_attrs": 0,
       "handlers": 0, "js_urls": 0, "pages": 0, "pages_with_inline_script": 0,
       "pages_with_handlers": 0, "pages_with_style_attr": 0}
all_hashes = {}
ext_scripts = set()
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in ("node_modules",)]
    for f in sorted(files):
        if not f.endswith(".html"): continue
        p = os.path.join(dirpath, f)
        rel = os.path.relpath(p, ROOT)
        src = open(p, encoding="utf-8", errors="replace").read()
        sc = PageScan()
        try: sc.feed(src)
        except Exception as e: print("PARSE-ERR", rel, e)
        hs = []
        for attrs, text in sc.inline_scripts:
            h = sha(text)
            hs.append({"hash": h, "bytes": len(text), "type": attrs.get("type", "classic")})
            all_hashes.setdefault(h, []).append(rel)
        for s in sc.script_srcs: ext_scripts.add(s)
        pages[rel] = {
            "inline_scripts": len(sc.inline_scripts), "hashes": hs,
            "inline_styles": len(sc.inline_styles),
            "style_hashes": [sha(t) for t in sc.inline_styles],
            "style_attrs": sc.style_attrs, "handlers": sc.handlers,
            "js_urls": sc.js_urls, "iframes": sc.iframes,
            "ext_srcs": sc.script_srcs,
        }
        tot["pages"] += 1
        tot["inline_scripts"] += len(sc.inline_scripts)
        tot["style_blocks"] += len(sc.inline_styles)
        tot["style_attrs"] += sc.style_attrs
        tot["handlers"] += len(sc.handlers)
        tot["js_urls"] += len(sc.js_urls)
        if sc.inline_scripts: tot["pages_with_inline_script"] += 1
        if sc.handlers: tot["pages_with_handlers"] += 1
        if sc.style_attrs: tot["pages_with_style_attr"] += 1

# JS danger scan over all .js in tree + inline blocks
danger = {"eval(": [], "new Function": [], "setTimeout-string": [], "setInterval-string": [],
          "document.write": [], "innerHTML-script": []}
pats = {k: re.compile(v) for k, v in {
    "eval(": r"(?<![\w.])eval\s*\(", "new Function": r"new\s+Function\s*\(",
    "setTimeout-string": r"setTimeout\s*\(\s*['\"]", "setInterval-string": r"setInterval\s*\(\s*['\"]",
    "document.write": r"document\.write\s*\("}.items()}
for dirpath, dirs, files in os.walk(ROOT):
    for f in sorted(files):
        p = os.path.join(dirpath, f)
        rel = os.path.relpath(p, ROOT)
        if f.endswith(".js"):
            txt = open(p, encoding="utf-8", errors="replace").read()
            for k, rx in pats.items():
                for m in rx.finditer(txt):
                    ln = txt[:m.start()].count("\n") + 1
                    danger[k].append(f"{rel}:{ln}")
        if f.endswith(".html"):
            for attrs, text in pages[rel].items() if False else []:
                pass
            src = open(p, encoding="utf-8", errors="replace").read()
            for k, rx in pats.items():
                for m in rx.finditer(src):
                    ln = src[:m.start()].count("\n") + 1
                    danger[k].append(f"{rel}:{ln}(html)")

summary = {"totals": tot, "unique_inline_script_hashes": len(all_hashes),
           "ext_script_srcs": sorted(ext_scripts), "danger": danger}
json.dump({"summary": summary, "pages": pages, "hash_map": all_hashes},
          open(os.path.join(OUT, "audit-raw.json"), "w"), indent=1)
print(json.dumps(tot, indent=1))
print("unique inline script hashes:", len(all_hashes))
print("ext script srcs:", len(ext_scripts))
for s in sorted(ext_scripts): print("  EXT", s)
for k, v in danger.items(): print(f"DANGER {k}: {len(v)}", v[:8])
