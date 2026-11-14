#!/usr/bin/env python3
"""Integrity checks: v3 staging build vs production source.
(a) every href in the original exists in the new build (multiset equality)
(b) every element id in the original exists in the new build (parsed DOM ids)
(c) every <script> block is byte-identical (full list equality, in order)
Plus: body segment byte-identity.
"""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

ORIG = Path.home() / "workspace/.deploy/fire-world.html"
NEW = Path.home() / "workspace/ui-redesign-v3/fire-world.html"

class IdHrefParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.ids, self.hrefs = [], []
    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if v is None: continue
            if k == "id": self.ids.append(v)
            if k == "href": self.hrefs.append(v)
    handle_startendtag = handle_starttag

def parse(p):
    t = p.read_text(encoding="utf-8")
    hp = IdHrefParser(); hp.feed(t)
    scripts = re.findall(r"<script\b[^>]*>.*?</script>", t, re.S)
    return t, hp, scripts

ot, op, os_ = parse(ORIG)
nt, np_, ns = parse(NEW)

results = {}
results["hrefs_original"] = len(op.hrefs)
results["hrefs_new"] = len(np_.hrefs)
results["hrefs_missing_in_new"] = sorted(set(op.hrefs) - set(np_.hrefs))
results["hrefs_added_in_new"] = sorted(set(np_.hrefs) - set(op.hrefs))
results["hrefs_multiset_equal"] = sorted(op.hrefs) == sorted(np_.hrefs)
results["ids_original"] = len(op.ids)
results["ids_new"] = len(np_.ids)
results["ids_missing_in_new"] = sorted(set(op.ids) - set(np_.ids))
results["ids_added_in_new"] = sorted(set(np_.ids) - set(op.ids))
results["ids_multiset_equal"] = sorted(op.ids) == sorted(np_.ids)
results["script_blocks_original"] = len(os_)
results["script_blocks_new"] = len(ns)
results["scripts_byte_identical_list"] = os_ == ns
results["body_byte_identical"] = ot[ot.index("<body"):] == nt[nt.index("<body"):]

ok = (results["hrefs_multiset_equal"] and results["ids_multiset_equal"]
      and results["scripts_byte_identical_list"] and results["body_byte_identical"]
      and not results["hrefs_missing_in_new"] and not results["ids_missing_in_new"])
results["ALL_PASS"] = ok
print(json.dumps(results, indent=2))
Path(__file__).with_name("integrity-results.json").write_text(json.dumps(results, indent=2))
sys.exit(0 if ok else 1)
