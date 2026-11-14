# Fire Babys Arcade — Game Review Checklist

**Rule: NO game appears on the arcade page until it passes EVERY check below.**
Submissions sit in the review queue. A reviewer (Jeff or an approved mod) signs off
before anything goes public.

## 1. Safety & Brand (fail = reject)
- [ ] Fire Babys are never shown harmed, burning, or destroying homes
- [ ] Fire Babys are never the butt of the joke — treated with love
- [ ] No realistic humans anywhere in the game
- [ ] No birds, beaks, wings, or feathers — zero Angry Birds resemblance
- [ ] Kid-safe content throughout (ages 5–12): no violence, no scary content,
      no chat with strangers, no links out to unreviewed sites
- [ ] US children's gaming rules — ZERO tolerance, any one fails the entry:
  - [ ] No chat, messaging, DMs, or any player-to-player communication
  - [ ] No drugs, alcohol, tobacco, or vaping references
  - [ ] No sexual content, nudity, or suggestive material
  - [ ] No gambling, real-money loot boxes, or predatory monetization
  - [ ] No external links except approved ones (documented)
- [ ] Slapstick, not violence — characters bounce back, nobody gets hurt

## 2. The Six Pillars
- [ ] Follows the Six Pillars of Power (see creator kit):
      synthesized audio, toyetic flame silhouettes, slapstick tone,
      fire-safety matchup logic where applicable, under 250KB,
      real USFA/NFPA curriculum tie-in

## 3. Technical & Security (fail = reject)
- [ ] Code scanned — no malware, no obfuscated payloads, no exfiltration
- [ ] Runs in an isolated preview first — never executed directly on review machines
- [ ] No external network calls except approved ones (documented in review notes)
- [ ] No credential, cookie, or personal-data collection
- [ ] No crypto miners, no redirects, no popups
- [ ] Plays correctly on a phone-sized screen (mobile-first audience)

## 4. Originality
- [ ] Original work — not copied from another game or asset pack
- [ ] No copyrighted characters, music, or art
- [ ] If it resembles an existing game, it must be clearly transformative

## 5. Quality bar
- [ ] Actually playable start-to-finish, no broken states
- [ ] Has a thumbnail image and a short description (written by reviewer if needed)
- [ ] Loads in reasonable time on a mid-range phone

## 6. Competition compliance
- [ ] Creator agreed to the competition rules (checkbox on file)
- [ ] Creator understands: website/Discord/arcade features do NOT pay —
      only phone-app selection pays $10,000
- [ ] Creator understands Fire Babys holds a permanent royalty-free license

## Sign-off
- Reviewer name:
- Date:
- Notes:

Rejected games get a short, kind explanation and may resubmit after fixing issues.

## 7. On publish (voter eligibility — creator-only vote system)
- [ ] Call `POST /vote/admin` with action `add_creator` (email, gameId, name, title)
      so the creator can vote in the phone-app selection round. See VOTING-SYSTEM.md.
- [ ] Confirm the creator's game card is live on arcade.html before writing the record.
