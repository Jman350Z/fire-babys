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
