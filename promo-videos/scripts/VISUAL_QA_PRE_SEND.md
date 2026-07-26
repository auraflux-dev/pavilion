# Pre-send visual QA. SHMSPTO parent tour

**Rule:** Do **not** ask Rob to watch a cut until **Gemini full-pass QA is PASS**. Agent watches via Gemini; Rob only opens the watch file after that gate.

## Required: Gemini full-pass (blocks Rob)

```bash
cd ~/wix-shmspto/promo-videos
NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_parent_tour_qa.js
# report → out/gemini_parent_tour_qa.md + .json
# exit 0 = PASS · exit 2 = FAIL (fix from timestamps, do not ping Rob)
```

Gemini must watch the **entire** video and enforce SEE=HEAR (menu pages appear when named, membership on membership, portal = Cove QR / no Staff chrome, no white/black flashes).

## Cold open / outro cards (STAPLE. every video)

**Required on every SHMSPTO promo:** ~5s cold open + ~4s outro from `scripts/staple_brand_bookends.js`.
Seal + lime **SHMS PTO** under seal on both. Music bed; no VO on bookends.

- [ ] Cold open ~5s, **no captions / no VO**
- [ ] Outro ~4s thank-you / Go Stingrays, **no VO**
- [ ] Parent tour cold open copy: NEW PTO WEBSITE + What parents need to know  
- [ ] Board recruit cold open copy: OPEN BOARD SEATS + Join the SHMS PTO  
- [ ] **SHMS PTO** label under the seal on **both** intro and outro (not overlapping MIDDLE SCHOOL)  
- [ ] Same seal treatment for cold open **and** outro

- [ ] Exactly **one** logo: official Stone Hill seal only
- [ ] No AI seal, no PTO ribbon peeking, no second emblem
- [ ] No rectangular “plate” / mismatched green box behind logo
- [ ] Logo sits on continuous `#085508` (site primary). circular pad OK; square panel **fail**
- [ ] Headline fully readable (not clipped by logo)
- [ ] Banner lime ≈ `#98C818`; not purple / cream / lavender “NEW”
- [ ] Outro copy: THANK YOU / Stingray families / Go Stingrays!

## Full cut (Gemini + agent checklist)

- [ ] Cold open ~4 to 5s, **no captions**
- [ ] Captions = small regular bottom SRT (not Whisper center blocks)
- [ ] No busy callout bars fighting captions
- [ ] Menu VO shows each named page (not homepage hold for the list)
- [ ] Portal = family member Cove card (not Staff/Treasurer)
- [ ] Mute-test: picture alone roughly matches VO beats

## Process

1. Agent assembles cut → `out/SHMSPTO_parent_tour_16x9.mp4`
2. Agent runs **Gemini full-pass QA**
3. **Only if PASS** → copy/open Downloads watch file for Rob
4. If FAIL → fix from Gemini timestamps → reassemble → Gemini again. **no Rob rewatch loop**
