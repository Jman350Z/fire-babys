#!/usr/bin/env python3
"""Split a Godot web export's index.wasm into two parts (GitHub's 25 MB
per-file limit) and patch index.html with the fetch-reassembly loader —
the exact treatment used for the Oct 3 fire-babys-web build.

Usage: python3 split_wasm.py <export_dir>
- writes index.wasm.aa / index.wasm.ab (byte split at the midpoint)
- removes index.wasm
- inserts the loader IIFE into index.html just before <script src="index.js">
Idempotent: re-running on an already-split dir re-splits from index.wasm
if present, and never double-patches the HTML.
"""
import os
import sys

PATCH_MARKER = "index.wasm ships split"
LOADER = """
<script>
// Fire Babys: index.wasm ships split (GitHub's 25MB file limit) — reassemble on fetch.
(function () {
	const origFetch = window.fetch.bind(window);
	window.fetch = function (url, opts) {
		const u = String((url && url.url) || url);
		if (u.endsWith('index.wasm')) {
			return Promise.all([
				origFetch('index.wasm.aa').then(r => { if (!r.ok) throw new Error('wasm part 1 failed'); return r.arrayBuffer(); }),
				origFetch('index.wasm.ab').then(r => { if (!r.ok) throw new Error('wasm part 2 failed'); return r.arrayBuffer(); }),
			]).then(parts => {
				const full = new Uint8Array(parts[0].byteLength + parts[1].byteLength);
				full.set(new Uint8Array(parts[0]), 0);
				full.set(new Uint8Array(parts[1]), parts[0].byteLength);
				return new Response(full, { 'headers': { 'Content-Type': 'application/wasm' } });
			});
		}
		return origFetch(url, opts);
	};
})();
</script>
"""


def main() -> int:
    d = sys.argv[1]
    wasm = os.path.join(d, "index.wasm")
    html_path = os.path.join(d, "index.html")
    if os.path.exists(wasm):
        data = open(wasm, "rb").read()
        half = len(data) // 2
        with open(wasm + ".aa", "wb") as f:
            f.write(data[:half])
        with open(wasm + ".ab", "wb") as f:
            f.write(data[half:])
        os.remove(wasm)
        print(f"split index.wasm ({len(data)} bytes) -> .aa {half} + .ab {len(data) - half}")
    else:
        print("index.wasm not present (already split?) — skipping split")
    html = open(html_path, encoding="utf-8").read()
    if PATCH_MARKER in html:
        print("index.html already patched — skipping")
        return 0
    anchor = '<script src="index.js">'
    if anchor not in html:
        print("ERROR: engine script tag not found in index.html", file=sys.stderr)
        return 1
    html = html.replace(anchor, LOADER + "\t\t" + anchor, 1)
    open(html_path, "w", encoding="utf-8").write(html)
    print("index.html patched with wasm-split loader")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
