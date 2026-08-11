# Membership tiers — game plan

**Export:** `SHMSPTO_WATCH_THIS_membership_tiers_16x9.mp4`  
**VO:** `scripts/membership_tiers_elevenlabs.txt`  
**Audience:** parent who has **never** seen these memberships — explain every perk + rough dollar value  
**Depends on:** Member Portal walkthrough (don't re-teach setup)

## Value anchors (VO + on-screen)

| Perk | How we talk about it | Rough $ |
|------|----------------------|---------|
| Cove Digital Card starter | Family PTO wallet: in person (Cove) **or** online (enrichment, events, donations, spirit, other PTO checkout). Membership credit loads onto the **same** card. | Reef $20→$22 · Lagoon $40→$44 · Tide $75→$82.50 (first-30-day 10% bonus on **credit only**) |
| Enrichment discount | After-school / seasonal PTO programs; fall + spring | ~$350/season **TBD** → 10% ≈ $35 · 15% ≈ $52 · 30% ≈ $105 per season; ×2 if both seasons |
| Free refreshments | Lagoon/Tide don't pay for PTO event snacks/food-truck refreshments | ~$30 / event for family of 3–4 |
| Spirit T-shirt | Show **live** spirit wear on site | ~$18 |
| Car magnet | Shipment on the way — **PDF design proof only** until sellable | Will sell ~$10 |
| Local partner discounts | Tide only | **TBD** — say so on VO, no fake $ |

## SEE = HEAR beats

| Part | VO job | Visual |
|------|--------|--------|
| p01_who | Never seen this before — we'll translate value | Cold open → `/membership` hero |
| p02_frame | Free portal vs optional paid | Auth / free vs paid frame |
| p03_cove_card | What Cove Digital Card is + why membership loads it | `/cove` or portal Cove card |
| p04_enrichment | What enrichment is · ~$350/season TBD | `/programs` or enrichment catalog tease |
| p05_refreshments | What free food means · ~$30/event | Event / Open House food context still |
| p06_swag | Shirt on site · magnet PDF proof (~$10 coming) | Spirit wear PDP + `Stone Hill car magnet.pdf` still |
| p07_reef | Reef $79 full value walk | Slow Reef card crop |
| p08_lagoon | Lagoon $149 full value walk | Slow Lagoon card (Most Popular) |
| p09_tide | Tide $249 full value walk · partners TBD | Slow Tide card crop |
| p10_season | Bonus window · Aug–June · faculty · no mandatory hours | Bonus strip + faculty $15 |
| p11_paid_proof | Paid portal chrome | Paid account / badge / card / code ends in 9 |
| p12_join | Join in ~2 minutes · shirt size | Join CTA / size picker |
| p13_close | Fund PTO · enrichment next · SHMSPTO dot org | Outro bookend |

## Product / QA note (do not oversell until verified)

**Free → paid upgrade stack:** Parent creates free account, loads their own card balance, later buys Reef/Lagoon/Tide — membership credit should **add on top** of current balance (same Square card). Tier-to-tier upgrades already load a **credit delta** in `membership-sync.ts`; free→paid first purchase should grant full tier credit. Treat as an explicit use case to QA before Open House messaging hardens.

## Capture rule

- Public pages (`/membership`, spirit wear, programs) → Playwright VO-synced scrolls.
- Paid portal proof → Cursor tab on **paid** (`rgreggs78@gmail.com`).
- Magnet: import PDF page → PNG still under `assets/membership-tiers/` (no fake store listing).

## Asset to drop in

Place user PDF at:

`promo-videos/assets/membership-tiers/stone-hill-car-magnet.pdf`

Chat attachment did **not** land on disk — re-drop or save into that folder. Then we composite the artwork onto a car-magnet mockup (flat proof alone won’t read as a magnet). Spirit wear uses live `/cove` shop.

## Commands (once VO approved)

```bash
cd promo-videos
NODE_PATH=~/cwn-c0/node_modules node scripts/generate_membership_tiers_vo.js
```
