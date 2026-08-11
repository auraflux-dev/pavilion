# SHMSPTO. Parent explainer (stitched · 3 chapters)

**Brand:** Stone Hill Middle School PTO · Go Stingrays!  
*(We are the **PTO**, not the school. Say “Stone Hill Middle School PTO” or “our PTO”. never “we are Stone Hill.”)* 
**Site:** https://www.shmspto.org  
**Tone:** Friendly, enthusiastic, modern, clear. zero jargon 
**VO voice:** BTM ElevenLabs `Cw9uRGud1Qq3szlTqQXG`  
**Format:** Visual (B-roll / screen) | Audio (VO) + on-screen notes  

## Canonical recipe. parent-share explainers (repeat this)

**Audience test:** If you were a parent with 2 minutes, could you follow what you hear *and* see without guessing?

### Editorial rules (non-negotiable)

1. **SEE = HEAR**. one idea on screen while that idea is spoken (non-negotiable until send-ready) 
2. **Named pages appear**. when VO names Programs / Events / Cove / etc., **show that page** settled (~2s+). Never freeze on homepage for a whole menu list; never sub-second flip-book 
3. **Chapter joins**. intro → menu pages → membership → portal → CTA 
4. **No fade-to-black** between sections (reads as flashing)  
5. **Skip white page-load** frames at the start of any capture  
6. **Mute-test** before sharing. picture alone should roughly tell the story 

### Pipeline (do in order)

| Step | What | Command / artifact |
|------|------|--------------------|
| 1. Script | Parent needs only (website → join → Cove card → CTA) | `scripts/*_elevenlabs.txt` |
| 2. VO | ElevenLabs BTM voice, one part per line | `vo/_parts/*.m4a` |
| 3. Capture | Settle into content; ~1s scrolls; mark chapters | `scripts/capture_script_master.js` + portal capture |
| 4. Assemble | Parent-share continuous stitch | `NODE_PATH=~/cwn-c0/node_modules node scripts/assemble_parent_tour_continuous.js` |
| 5. **Gemini full-pass QA** | Gemini watches the **entire** cut (SEE=HEAR + flashes + portal) | `NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_parent_tour_qa.js` → `out/gemini_parent_tour_qa.md` |
| 6. Deliver | Watch file **only after Gemini PASS** | `~/Downloads/SHMSPTO_WATCH_THIS_parent_tour_16x9.mp4` |

**Hard gate:** Do not ask Rob to watch / rewatch until Gemini verdict is **PASS**. Fix from `gemini_parent_tour_qa.md` timestamps, reassemble, re-run Gemini.

### Picture map (this tour)

| Chapter | VO | Picture |
|---------|----|---------|
| Intro | Welcome + URL | Homepage |
| Menu | Why+what per nav item | **Each page** with its own VO (~3 to 5s); tease deeper videos |
| Membership | Tiers (enough) → Join/Log in | Membership UI → Create Account; tease Membership video |
| Portal | Checklist why+what (brief) → card tease | Setup checklist still → Cove QR; full Portal video later |
| CTA | Series + shmspto.org | Homepage → outro |

### Do not

- Hold homepage while VO lists other pages  
- Soft-fade to black between pages  
- Ship portal frames with staff chrome / PII for public WhatsApp without a family capture  
- Call the watch file send-ready before mute-test + SEE=HEAR pass  

---

## Packaging. Bobby G-style production (no CapCut if sync holds)

**Philosophy (same as Bobby G line):** script scenes accurately → create timed visuals → stitch in assembly → finish (Whisper + loudnorm + logo). CapCut is a **fallback**, not the happy path.

| Bobby G | This PTO tour |
|---------|----------------|
| Gemini / Claude write scenes from material | Scene map: each VO beat → exact screenshot |
| HeyGen / avatar | **NEVER**. different production line. This tour is stills + VO only. |
| Manual clips where needed | Extra stills / crops (nav zooms, checkout, free vs paid portal) |
| Assembly stitches | ffmpeg stills timeline (durations from Whisper VO times) → concat/xfade |
| Postprocess | Whisper captions + loudnorm + **SHMS PTO** logo |

**Accuracy rule:** what viewers **see** must match what they **hear**. Mute-test the timeline. stills alone should tell the story; sound-on. no wrong page while VO names another.

```
ElevenLabs VO (BTM voice)
  → Whisper timestamps + PTO name bias
  → scene_map.json (voCue → asset + overlay)
  → ffmpeg still→clip per beat → chapter stitch (16:9)
  → assembly_postprocess (captions + loudnorm) + PTO logo
  → SHMSPTO_parent_tour_16x9.mp4
```

### Distribution (same VO · 16:9 everywhere)

**Aspect lock: 16:9 only**. site, Member Portal, Facebook, Instagram, WhatsApp. No 9:16 / Reels crop unless we add it later.

| Channel | What to post | Notes |
|---------|--------------|--------|
| **Site pages** | Full stitch | Home / Membership / The Cove / Help |
| **Member Portal** | Full stitch + Ch3 near Store & Cove Digital Card | Highest relevance for Ch3 |
| **Facebook** | Full stitch | Caption + link `shmspto.org` |
| **Instagram** | Full stitch (feed / IGTV-style) | Burned-in Whisper captions help sound-off |
| **WhatsApp** (grade groups) | Full stitch **or** chapter clips | All **16:9**; chapters ~45s if chat prefers shorter |

**Exports (CapCut → assembly finish)**

| File | Content | Aspect |
|------|---------|--------|
| `SHMSPTO_parent_tour_16x9.mp4` | Ch1→Ch2→Ch3 full · **master delivery** | **16:9** |
| `SHMSPTO_ch1_website_16x9.mp4` | Chapter 1 only (optional WA push) | **16:9** |
| `SHMSPTO_ch2_membership_16x9.mp4` | Chapter 2 only | **16:9** |
| `SHMSPTO_ch3_cove_card_16x9.mp4` | Chapter 3 only | **16:9** |

**Chapter-only WhatsApp:** keep VO as-is for stitch continuity. Add a **½-second title card** at the start of Ch2/Ch3 when posted alone (`MEMBERSHIP` / `COVE DIGITAL CARD`) so they don’t feel unfinished. no need to re-record cold opens unless engagement tanks.

**Chapter end rules (inside the stitch)**
- Ch1 end → soft handoff into membership (no “Go Stingrays”)
- Ch2 end → soft handoff into Cove Digital Card (CTA URL OK; no “Go Stingrays”)
- Ch3 end → final CTA + **Go Stingrays**

### Suggested site / portal placement

| Page | Embed |
|------|--------|
| **Home** | Full stitch (`parent_tour_16x9`). “New this year” |
| **Membership** | Full stitch or Ch2. above tiers |
| **The Cove** | Ch3. near “how to pay / digital card” |
| **Member Portal** (dashboard) | Full stitch once for new parents; Ch3 near Store & Cove Digital Card |
| **Member Help** | Full stitch or deep-dive from `VO_AND_SCENES.md` later |

**Privacy:** Blur/crop parent email on all portal frames before FB / IG / WhatsApp / public site.

### Finish through our assembly (yes)

| Step | Tool | What |
|------|------|------|
| 1. Scene map | `scene_map.json` | Every VO beat → screenshot + overlay (SEE = HEAR) |
| 2. VO | ElevenLabs · BTM voice | Chapters or one stitch |
| 3. Stills timeline | ffmpeg (Whisper-timed) | Still duration from VO cues · soft xfade |
| 4. Finish | C0 `assembly_postprocess` | **Whisper captions** + **loudnorm** |
| 5. Logo | ffmpeg overlay | **SHMS PTO logo** corner bug |

**Do use:** timed stills + VO stitch, Whisper burn-in, EBU loudnorm. Stay **16:9**.  
**Do not use:** CapCut happy path, HeyGen / avatar (different production), ClipzWorld bookends/chrome, Gates, CWN/BTM logos.  
**CapCut:** only if mute-test fails twice.

**Whisper bias:**  
`Stone Hill Middle School PTO, SHMSPTO, Stingrays, Reef, Lagoon, Tide, The Cove, Member Portal, MATHCOUNTS`
**Top nav (Chapter 1):**  
Home · Programs · Events · Membership · The Cove · Volunteer · Fundraising · Board · Meetings  

**Truth locks:**
- **No HeyGen / no avatar**. ever on this PTO tour (different production line)
- Membership URL → **`shmspto.org/membership`**
- Free account → **`shmspto.org/auth/join`**
- Cove Digital Card (Member Portal) → **QR is primary** (Square gift-card scan for Stand/iPad); **word passcode** (name-based) is the easy spoken path; **6-digit code** remains backup (paid ends in 9)  
  - Save QR to **Photos** for easy open at The Cove · **Apple/Google Wallet coming soon** (same digital card; native Wallet not required today)  
  - **Paid** (Reef / Lagoon / Tide) → membership **preloads** card credit  
  - **Free** parent account → same portal card; **load your own** funds anytime
- Membership funds **the whole PTO** for **SHMS PTO families** (everything in that nav)
- First-30-days promo → **+10% on card credit only** (e.g. $20→$22, $40→$44, $75→$82.50); bonus loads with membership credit in that marketing window; reloads after that are dollar-for-dollar
- This video’s Cove = **snack window only** (even if The Cove online store exists elsewhere)

---

## Chapter 1. The new website 
**Target:** ~45 to 50s · **Role:** Cold open + nav tour 

| Time | Visual | Audio (voiceover) |
|------|--------|-------------------|
| 0:00 to 0:07 | Home hero. **Overlay:** `STONE HILL MIDDLE SCHOOL PTO` · `SHMSPTO.ORG` | Hi Stingray families. The Stone Hill Middle School PTO just launched a brand-new website: shmspto.org. |
| 0:07 to 0:12 | Cursor to top nav. **Overlay:** `OPEN TO EVERY FAMILY` | You do not need a membership to explore. This site is for every SHMS family. |
| 0:12 to 0:18 | **Cursor:** Programs. **Callout:** `PROGRAMS` | Programs. evening enrichment and student opportunities. |
| 0:18 to 0:22 | **Cursor:** Events. **Callout:** `EVENTS` | Events. what’s happening at school with the PTO. |
| 0:22 to 0:27 | **Cursor:** The Cove. **Callout:** `THE COVE` | The Cove. our snack window online. |
| 0:27 to 0:32 | Volunteer → Fundraising. **Callouts:** `VOLUNTEER` · `FUNDRAISING` | Volunteer and Fundraising. ways to help when you can. |
| 0:32 to 0:38 | Board → Meetings. **Callouts:** `BOARD` · `MEETINGS` | Meet the Board, and find PTO Meetings. all in the top menu. |
| 0:38 to 0:48 | **Cursor:** Membership. **Overlay:** `NEXT · MEMBERSHIP` | When you’re ready to support the PTO, Membership is right there in the nav. that’s how you become a member. Here’s what that looks like. |

**ElevenLabs:** `scripts/short01_website_elevenlabs.txt`

---

## Chapter 2. Membership & why it matters 
**Target:** ~40 to 45s · **Role:** Bridge from Ch1 (no cold open) 

| Time | Visual | Audio (voiceover) |
|------|--------|-------------------|
|. | Membership tiers. **Overlay:** `MEMBERSHIP` · chapter title card optional | *(continues from Ch1. no “Hi Stingray families”)* |
| 0:00 to 0:08 | Reef / Lagoon / Tide. **Overlay:** `SHMSPTO.ORG/MEMBERSHIP` | Membership is online at shmspto.org slash membership. Pick Reef, Lagoon, or Tide. |
| 0:08 to 0:18 | Nav montage. **Overlay:** `MEMBERSHIP FUNDS ALL OF THIS` | Your membership funds **all of this**. Programs, Events, The Cove, Volunteer efforts, Fundraising, the Board, Meetings. everything our PTO runs for SHMS PTO families. |
| 0:18 to 0:28 | Checkout. **Overlay:** `ABOUT 2 MINUTES` | Joining takes about two minutes. Check out online, and you’re in. |
| 0:28 to 0:36 | **Overlay:** `NO MANDATORY VOLUNTEER HOURS` | Membership does **not** mean mandatory volunteer hours. Help when you can. joining already supports the whole PTO. |
| 0:36 to 0:42 | Soft hold on portal / Cove Digital Card tease. **Overlay:** `NEXT · COVE DIGITAL CARD` | Once you’re signed in, you’ll also see your Cove Digital Card in the Member Portal. |

**ElevenLabs:** `scripts/short02_membership_elevenlabs.txt`

---

## Chapter 3. Cove Digital Card 
**Target:** ~35 to 40s · **Role:** Bridge from Ch2 · **only full outro** 

| Time | Visual | Audio (voiceover) |
|------|--------|-------------------|
| 0:00 to 0:08 | Portal Store & Cove Digital Card. QR + backup. **Overlay:** `COVE DIGITAL CARD` · `QR PRIMARY` | Every signed-in family gets a Cove Digital Card. a QR to show at the snack window, plus a six-digit code as backup. |
| 0:08 to 0:16 | QR / Photos / Wallet tease. **Overlay:** `SHOW QR` · `SAVE TO PHOTOS` · `WALLET COMING SOON` | Show the QR at the snack window, or say the six-digit backup. You can also save the QR to Photos. Apple and Google Wallet are coming soon. same digital card, even easier on a phone. |
| 0:16 to 0:22 | Paid balance. **Callout:** `PAID · PRELOADED` | Paid Reef, Lagoon, or Tide: card credit is preloaded. |
| 0:22 to 0:30 | Free + Load card. **Callout:** `FREE · LOAD ANYTIME` | Free parent account: load money anytime. same QR and backup code either way. |
| 0:30 to 0:36 | Snack window / QR scan. **Overlay:** `SHOW QR OR SAY CODE` | Kids show the QR or say the code; staff charges the family balance. |
| 0:36 to 0:45 | End card: logo + URLs. **Overlay:** `SHMSPTO.ORG` · `MEMBERSHIP` · `MEMBER PORTAL` | Bookmark shmspto.org, join Membership when ready, open Member Portal for your Cove Digital Card. Go Stingrays! |

**ElevenLabs:** `scripts/short03_cove_card_elevenlabs.txt`

---

## CapCut stitch notes

1. **One project**. three chapter markers; optional title cards `1 · WEBSITE` / `2 · MEMBERSHIP` / `3 · COVE CARD`. 
2. Cut Ch1 → Ch2 on “Here’s what that looks like.” → Membership page.  
3. Cut Ch2 → Ch3 on “Cove Digital Card in the Member Portal” → portal Store & Cove Digital Card.  
4. Music bed continuous; duck under VO.  
5. Export **16:9 only** (master + optional chapter cuts). No 9:16 pass.  
6. Export chapter-only 16:9 for WhatsApp pushes; add ½s title card on Ch2/Ch3 when posted alone.  
7. Whisper captions in assembly finish (not CapCut auto-captions).  
8. Long deep-dive portal walkthrough remains in `VO_AND_SCENES.md` (separate video).

---

## Full VO (source of truth)

Edit these files (one line = one ElevenLabs part), then:

`NODE_PATH=~/cwn-c0/node_modules node scripts/generate_parent_vo.js`

- `scripts/short01_website_elevenlabs.txt`. welcome + why/what nav + membership bridge 
- `scripts/short02_membership_elevenlabs.txt`. tiers enough + login path + Membership-video tease 
- `scripts/short03_cove_card_elevenlabs.txt`. portal card tease + Portal/Programs/Membership series CTA 
