# Member Portal walkthrough · still map (SEE = HEAR)

**VO:** `portal_walkthrough_elevenlabs.txt`  
**Target:** ~2:00–2:30 · 16:9  
**Watch file (after Gemini PASS):** `~/Downloads/SHMSPTO_WATCH_THIS_member_portal_16x9.mp4`

Blur emails / PII before public post. Prefer family demo account over staff chrome.

| # | VO beat (cue) | Still / screen | On-screen text |
|---|----------------|----------------|----------------|
| 1 | Open House this week | Home `#open-house` section or cafeteria title card | `OPEN HOUSE · THU 8/13` |
| 2 | Sessions + cafeteria | Sessions list crop from open-house promo | `CAFETERIA` |
| 3 | Food truck tickets | Sips & Sweets menu still | `1 TICKET / FAMILY` |
| 4 | Paid free refreshments | Paid / Family Cove code ending in 9 callout | `PAID · CODE ENDS IN 9` |
| 5 | Portal walk intro | Homepage or Join/Log in | `SHMSPTO.ORG` |
| 6 | Free account unlocks portal | Create account / free banner | `FREE FIRST` |
| 7 | Paid Reef Lagoon Tide | Membership tiers | `REEF · LAGOON · TIDE` |
| 8 | Member Portal home | Portal hero / checklist | `MEMBER PORTAL` |
| 9 | Jump links | Jump-to tiles | `4 AREAS` |
| 10 | My Account | My Account (free or paid) | `MY ACCOUNT` |
| 11 | My Students | My Students cards | `MY STUDENTS` |
| 12 | Calendar · Messages | Calendar / inbox empty or filled | `CALENDAR · INBOX` |
| 13 | Cove Digital Card | Store & Cove card (balance · code · QR) | `COVE DIGITAL CARD` |
| 14 | Code ends in 9 / Open House tickets | Cove code crop (blur if needed) | `ENDS IN 9` |
| 15 | Surveys · Help | Surveys / Help | `SURVEYS · HELP` |
| 16 | CTA | Open House + site | `SEE YOU THURSDAY` |

## Asset reuse

- Open House: live site `#open-house` capture + `frontend/public/events/sips-and-sweets-menu.png`
- Portal: `promo-videos/assets/v1-membership-portal/*` and `parent-tour/ch3/*` (blur PII)
- Tiers: `v1-01-membership-tiers.png` / parent-tour ch2

## Pipeline

1. ElevenLabs parts from `portal_walkthrough_elevenlabs.txt`
2. Capture missing stills (open-house section + any fresh portal)
3. Assemble (same parent-tour / staff-cove still→clip pattern)
4. Gemini full-pass QA → watch file only on PASS
