#!/usr/bin/env python3
"""Remove the voting/star-rating system (rating.js include) from game pages.
Jeff's order 2026-10-14. The widget is injected by rating.js at runtime, so
removing the <script src=...rating.js> tag removes the whole system.
Only that tag is touched; everything else stays byte-identical."""
import os, re, sys

TAG = re.compile(r'[ \t]*<script[^>]*src="https://firebabys\.io/rating\.js"[^>]*></script>[ \t]*\n?')

roots = sys.argv[1:]
total_files, total_tags = 0, 0
for root in roots:
    for dirpath, _, names in os.walk(root):
        for n in sorted(names):
            if not n.endswith(".html"):
                continue
            p = os.path.join(dirpath, n)
            with open(p, encoding="utf-8") as fh:
                src = fh.read()
            if "play.html" in p:  # flagship battler: build-pipeline only, never hand-edit
                print(f"SKIP (build pipeline): {p}")
                continue
            new, cnt = TAG.subn("", src)
            if cnt:
                with open(p, "w", encoding="utf-8") as fh:
                    fh.write(new)
                total_files += 1; total_tags += cnt
                print(f"{p}: removed {cnt} rating.js tag(s)")
            elif "rating.js" in src:
                print(f"WARN no tag matched but 'rating.js' present: {p}")
print(f"== {total_tags} tag(s) removed from {total_files} file(s)")
