#!/usr/bin/env python3
"""Build the fire-babys-headers Worker (report-only or enforce mode) from hashmap.json."""
import json, os, sys

AP = "/home/hatch/workspace/a-plus-project"
MODE = sys.argv[1] if len(sys.argv) > 1 else "reportonly"   # reportonly | enforce
assert MODE in ("reportonly", "enforce")
data = json.load(open(os.path.join(AP, "hashmap.json")))

TEMPLATE = r"""
const MAP = __MAP__;
const UNION = __UNION__;
const OLD_CSP = "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'";
const REPORT_PATH = "/__csp_report";
const MODE = "__MODE__";

function lookup(path) {
  let p = path;
  try { p = decodeURIComponent(path); } catch (e) {}
  const cands = [p];
  if (p.endsWith("/")) cands.push(p + "index.html");
  if (!p.endsWith(".html")) cands.push(p + ".html");
  if (p.length > 1 && p.endsWith("/")) cands.push(p.slice(0, -1) + ".html");
  if (!p.endsWith("/")) cands.push(p + "/index.html");
  for (const c of cands) if (MAP[c]) return MAP[c];
  // Unmapped path: origin can only serve 404.html content for it (the staging
  // tree IS the whole site), so use the 404 page's own small hash set. The
  // global union (~17 KB header) broke the egress path in testing.
  return MAP["/404.html"] || UNION;
}
function q(list) { return list.map(h => "'" + h + "'").join(" "); }
function strictCsp(path) {
  const e = lookup(path);
  return "default-src 'self'; " +
    "script-src 'self' https://accounts.google.com https://static.cloudflareinsights.com " + q(e.s) + "; " +
    "script-src-attr 'unsafe-hashes' " + q(e.a) + "; " +
    "style-src 'self' https://accounts.google.com " + q(e.y) + "; " +
    "style-src-attr 'unsafe-hashes' " + q(e.t) + "; " +
    "img-src 'self' data: blob: https:; media-src 'self' data: blob:; font-src 'self' data:; " +
    "connect-src 'self' https: wss:; frame-src 'self' https://accounts.google.com; " +
    "worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; " +
    "form-action 'self' https://accounts.google.com; frame-ancestors 'self'";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === REPORT_PATH && request.method === "POST") {
      try {
        const body = (await request.text()).slice(0, 8192);
        if (env && env.REPORTS) await env.REPORTS.put("r" + Date.now() + "-" + Math.random().toString(36).slice(2, 8), body, { expirationTtl: 7200 });
      } catch (e) {}
      return new Response(null, { status: 204 });
    }
    const res = await fetch(request);
    const h = new Headers(res.headers);
    const ct = res.headers.get("content-type") || "";
    const isHtml = ct.includes("text/html");
    const strict = strictCsp(url.pathname) + "; report-uri " + REPORT_PATH;
    if (MODE === "enforce") {
      if (isHtml) h.set("Content-Security-Policy", strict);
      else h.set("Content-Security-Policy", OLD_CSP);
    } else {
      h.set("Content-Security-Policy", OLD_CSP);
      if (isHtml) h.set("Content-Security-Policy-Report-Only", strict);
    }
    h.set("X-Frame-Options", "SAMEORIGIN");
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    h.set("Permissions-Policy", "interest-cohort=()");
    h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  }
};
"""

code = (TEMPLATE
        .replace("__MAP__", json.dumps(data["map"], separators=(",", ":")))
        .replace("__UNION__", json.dumps(data["union"], separators=(",", ":")))
        .replace("__MODE__", MODE))
out = os.path.join(AP, f"worker-{MODE}.js")
open(out, "w").write(code)
print("wrote", out, len(code), "bytes")
