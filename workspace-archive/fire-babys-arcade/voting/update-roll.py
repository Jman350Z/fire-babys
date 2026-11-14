#!/usr/bin/env python3
"""
Build the creator voter roll from the submission Google Sheet.

The roll is the server-side list of who may vote: creators whose games
passed review and are live on the arcade. Each entry maps a verified
Google email -> their own game (for the no-self-vote rule).

Usage:
  # Interactive: lists submissions, you pick approved ones by number
  python3 update-roll.py

  # Non-interactive: approve by game title (exact match on "Game title")
  python3 update-roll.py --approved "Ember Dash" --approved "Frost Fray"

  # Merge with an existing roll.json (keeps prior approvals)
  python3 update-roll.py --merge roll.json --approved "Ember Dash"

Output: roll.json  ->  {"voters": [{"email":..., "gameId":..., "title":...}]}
Upload it with:  curl -X POST $VOTE_WORKER/admin/roll \
                   -H 'content-type: application/json' \
                   -d "{\"key\":\"$ADMIN_KEY\",\"roll\":$(cat roll.json | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin)["voters"]))')}"

Email column: the form collects emails (verified collection). We match the
submission's email to the Google account the creator signs in with.
If a creator submits with a different email than their Google sign-in,
fix their entry in approved-overrides.json: {"Game Title": "real@gmail.com"}.
"""

import argparse, csv, json, re, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
CONFIG = HERE.parent / "screener-config.json"
OVERRIDES = HERE / "approved-overrides.json"


def slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug[:64] or "game"


def load_rows():
    cfg = json.loads((HERE.parent / "screener-config.json").read_text())
    with urllib.request.urlopen(cfg["sheet_csv_url"], timeout=30) as r:
        return list(csv.DictReader(r.read().decode("utf-8").splitlines()))


def find_email(row: dict) -> str:
    for k, v in row.items():
        kl = (k or "").lower()
        if "email" in kl and v and "@" in v and "creator" not in kl:
            # Prefer the verified collected email over the typed one.
            return v.strip().lower()
    for k, v in row.items():
        if v and "@" in str(v) and "." in str(v):
            return str(v).strip().lower()
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--approved", action="append", default=[],
                    help="Game title to approve (repeatable)")
    ap.add_argument("--merge", default="",
                    help="Existing roll.json to keep prior approvals from")
    ap.add_argument("--out", default=str(HERE / "roll.json"))
    args = ap.parse_args()

    rows = load_rows()
    print(f"{len(rows)} submissions in sheet")
    titles = [(i, (r.get("Game title") or r.get("game title") or "untitled").strip())
              for i, r in enumerate(rows)]

    approved_titles = set(args.approved)
    if not approved_titles:
        print("\nSubmissions:")
        for i, t in titles:
            print(f"  [{i}] {t}")
        picks = input("\nEnter approved numbers, comma-separated: ").strip()
        for p in picks.split(","):
            p = p.strip()
            if p.isdigit() and int(p) < len(titles):
                approved_titles.add(titles[int(p)][1])

    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}

    voters = []
    if args.merge:
        old = json.loads(Path(args.merge).read_text())
        voters = old.get("voters", [])
        print(f"kept {len(voters)} prior approvals from {args.merge}")
    have = {v["email"] for v in voters}

    for i, t in titles:
        if t not in approved_titles:
            continue
        row = rows[i]
        email = overrides.get(t, "") or find_email(row)
        if not email:
            print(f"  !! no email found for '{t}' — add to approved-overrides.json")
            continue
        if email in have:
            print(f"  -- {t} ({email}) already on roll")
            continue
        voters.append({"email": email, "gameId": slugify(t), "title": t[:80]})
        have.add(email)
        print(f"  ++ {t} -> {email} [{slugify(t)}]")

    Path(args.out).write_text(json.dumps({"voters": voters}, indent=2))
    print(f"\nwrote {args.out} with {len(voters)} voters")
    print("Next: POST it to /admin/roll (see docstring), then add "
          "data-game-id=\"<slug>\" to each live card in arcade.html.")


if __name__ == "__main__":
    main()
