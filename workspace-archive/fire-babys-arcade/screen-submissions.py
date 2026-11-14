#!/usr/bin/env python3
"""
Fire Babys Arcade — submission auto-screener (v1).

Reads new rows from the submission Google Sheet (via sheet URL in config),
downloads the linked game, and runs automated safety checks:

  1. Size check: total submission under 250KB (Six Pillars)
  2. Static red-flag scan of JS/HTML for dangerous patterns
     (eval of remote code, exfiltration, miners, popups/redirects)
  3. External-URL inventory (must be documented/approved)
  4. Brand keyword pre-scan (flags, does not decide)

Output: a per-submission report card (PASS / FLAG w/ reasons) written to
~/workspace/fire-babys-arcade/review-queue/<date>/<slug>/REPORT.md

Human review (Bobby) still required before Jeff's batch approval.
Nothing here publishes anything.

Config: ~/workspace/fire-babys-arcade/screener-config.json
  { "sheet_csv_url": "https://docs.google.com/spreadsheets/d/<ID>/export?format=csv" }
"""

import csv, json, os, re, sys, urllib.request, zipfile, tarfile
from datetime import date
from pathlib import Path

WORK = Path.home() / "workspace" / "fire-babys-arcade"
QUEUE = WORK / "review-queue" / date.today().isoformat()
CONFIG = WORK / "screener-config.json"
MAX_BYTES = 250 * 1024

# Patterns that auto-FLAG a submission for human review (not auto-reject —
# context matters, e.g. eval in a comment vs. live code).
RED_FLAGS = [
    (r"eval\s*\(", "eval() call"),
    (r"Function\s*\(\s*['\"]", "Function() constructor with string"),
    (r"fetch\s*\(\s*['\"]https?://(?!firebabys\.io)", "fetch() to external URL"),
    (r"XMLHttpRequest", "XMLHttpRequest usage"),
    (r"WebSocket\s*\(", "WebSocket usage"),
    (r"document\.cookie", "cookie access"),
    (r"localStorage|sessionStorage", "browser storage access"),
    (r"navigator\.sendBeacon", "sendBeacon (possible exfiltration)"),
    (r"\.src\s*=\s*['\"]https?://", "dynamic remote script/image src"),
    (r"coinhive|cryptonight|miner", "crypto miner signature"),
    (r"window\.open\s*\(", "popup window.open"),
    (r"location\s*=\s*['\"]https?://", "forced redirect"),
    (r"<iframe", "iframe embed"),
]

# Brand pre-scan: flags words/phrases a human must check in context.
BRAND_FLAGS = [
    r"angry\s*bird", r"\bbeak\b", r"\bwing(s)?\b", r"\bfeather(s)?\b",
    r"\bkill\b", r"\bdie\b", r"\bdeath\b", r"\bblood\b", r"\bgun\b",
    r"\bburn(ing)?\s+(down|house|home)", r"destroy(s|ed)?\s+(house|home|city)",
]

SKIP_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp3", ".wav", ".ogg",
            ".woff", ".woff2", ".ttf", ".otf"}


def download(url: str, dest: Path) -> Path | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FireBabysScreener/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
            f.write(r.read(10 * 1024 * 1024 + 1))  # cap 10MB
        return dest
    except Exception as e:  # noqa: BLE001
        print(f"download failed for {url}: {e}")
        return None


def scan_text(text: str, rel: str, report: dict):
    for pat, label in RED_FLAGS:
        for m in re.finditer(pat, text, re.IGNORECASE):
            line = text.count("\n", 0, m.start()) + 1
            report["red_flags"].append(f"{label} — {rel}:{line}")
    for pat in BRAND_FLAGS:
        for m in re.finditer(pat, text, re.IGNORECASE):
            line = text.count("\n", 0, m.start()) + 1
            report["brand_flags"].append(f"brand check: '{m.group(0)}' — {rel}:{line}")
    for m in re.finditer(r"https?://[^\s'\"<>]+", text):
        url = m.group(0).rstrip(".,);")
        if "firebabys.io" not in url and url not in report["external_urls"]:
            report["external_urls"].append(url)


def screen_submission(title: str, game_url: str, outdir: Path) -> dict:
    report = {"title": title, "url": game_url, "red_flags": [],
              "brand_flags": [], "external_urls": [], "notes": []}
    outdir.mkdir(parents=True, exist_ok=True)
    dl = outdir / "download"
    if not download(game_url, dl):
        report["notes"].append("DOWNLOAD FAILED — needs manual fetch")
        return report
    size = dl.stat().st_size
    report["bytes"] = size
    if size > MAX_BYTES:
        report["notes"].append(f"OVER 250KB ({size} bytes) — Six Pillars violation")
    files = []
    try:
        if zipfile.is_zipfile(dl):
            with zipfile.ZipFile(dl) as z:
                z.extractall(outdir / "src")
                files = [p for p in (outdir / "src").rglob("*") if p.is_file()]
        else:
            files = [dl]
    except Exception as e:  # noqa: BLE001
        report["notes"].append(f"could not unpack: {e}")
        files = [dl]
    for f in files:
        if f.suffix.lower() in SKIP_EXT:
            continue
        try:
            text = f.read_text(errors="replace")
        except OSError:
            continue
        if len(text) > 2_000_000:
            report["notes"].append(f"skipped huge file {f.name}")
            continue
        scan_text(text, str(f.relative_to(outdir)), report)
    # dynamic sandbox for HTML submissions
    srcdir = outdir / "src" if (outdir / "src").exists() else outdir
    run_sandbox(srcdir, outdir, report)
    return report


def run_sandbox(srcdir: Path, outdir: Path, report: dict):
    """Dynamic analysis: execute HTML submissions in the isolated sandbox."""
    import subprocess
    htmls = list(srcdir.glob("*.html")) + list(srcdir.glob("*.htm"))
    if not htmls:
        return
    sec_report = outdir / "SECURITY-REPORT.md"
    try:
        r = subprocess.run(
            [sys.executable, str(WORK / "sandbox-analyze.py"),
             str(srcdir), "--time", "20", "--out", str(sec_report)],
            capture_output=True, text=True, timeout=180)
        report["notes"].append(f"sandbox ran (exit {r.returncode})")
        if sec_report.exists():
            txt = sec_report.read_text()
            m = re.search(r"Verdict: \*\*(.+?)\*\*", txt)
            if m:
                report["sandbox_verdict"] = m.group(1)
            for line in txt.splitlines():
                if line.startswith("- **FLAG") or line.startswith("- **"):
                    kind = line.split("**")[1]
                    if kind in ("CREDENTIAL_THEFT", "SESSION_THEFT",
                                "KEYLOGGER", "EXFILTRATION", "MINER", "ERROR"):
                        report["red_flags"].append(f"sandbox {kind}: {line}")
    except Exception as e:  # noqa: BLE001
        report["notes"].append(f"sandbox failed: {e}")


def main():
    if not CONFIG.exists():
        print(f"no config at {CONFIG} — create screener-config.json first")
        sys.exit(1)
    cfg = json.loads(CONFIG.read_text())
    QUEUE.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(cfg["sheet_csv_url"], timeout=30) as r:
        rows = list(csv.DictReader(r.read().decode("utf-8").splitlines()))
    print(f"{len(rows)} submissions in sheet")
    for row in rows:
        title = (row.get("Game title") or row.get("game title") or "untitled").strip()
        url = (row.get("Game URL") or row.get("game url") or "").strip()
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "game"
        outdir = QUEUE / slug
        if (outdir / "REPORT.md").exists():
            continue  # already screened
        print(f"screening: {title}")
        rep = screen_submission(title, url, outdir)
        verdict = "FLAG" if (rep["red_flags"] or rep["brand_flags"]
                             or any("OVER 250KB" in n or "DOWNLOAD FAILED" in n
                                    for n in rep["notes"])) else "PASS (auto)"
        md = [f"# {title}", f"URL: {url}", f"Verdict: **{verdict}**", ""]
        if rep.get("bytes") is not None:
            md.append(f"Size: {rep['bytes']} bytes")
        for section, items in [("Red flags", rep["red_flags"]),
                               ("Brand flags", rep["brand_flags"]),
                               ("External URLs", rep["external_urls"]),
                               ("Notes", rep["notes"])]:
            md.append(f"## {section}")
            md += [f"- {i}" for i in items] or ["- none"]
            md.append("")
        md += ["---",
               "Next: Bobby human review (brand/quality/playability), then batch",
               "approval message to Jeff. Nothing publishes without Jeff's yes."]
        (outdir / "REPORT.md").write_text("\n".join(md))
        print(f"  -> {verdict}")


if __name__ == "__main__":
    main()
