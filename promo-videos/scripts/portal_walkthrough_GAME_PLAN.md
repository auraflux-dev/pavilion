# Member Portal walkthrough · production game plan

**Audience:** Parents who have **never** seen the portal (all grades).  
**Runtime:** ~3:30–4:00 · 16:9  
**Export:** `~/Downloads/SHMSPTO_WATCH_THIS_member_portal_16x9.mp4` (Gemini PASS only)  
**VO:** `portal_walkthrough_elevenlabs.txt` · BTM `Cw9uRGud1Qq3szlTqQXG`  
**Flyer:** VP Open House flyer is **out of band** — not in this cut.

---

## Editorial spine (never-seen-it-before)

Every beat answers **why → what → how**. On screen: slow scrolls, settle ~2s+, name the page before leaving it.

| Lens | Meaning in this video |
|------|------------------------|
| **Why** | Why this exists for your family (one place, snack window, safety, help) |
| **What** | What you are looking at (name the screen / tool) |
| **How** | How to do the next step (tap, fill, load, join) |
| **Who** | **Free** vs **Paid** — same tools; paid adds credit + perks (split visually) |

**Tease (near end, before Open House):** Next video = **membership deep dive** (Reef / Lagoon / Tide bullets). This video does **not** sell every tier line — only enough to understand free vs paid.

**Close:** Come see us at **Open House Thu 8/13** (cafeteria) to learn more in person.

---

## Dual login capture plan (visual truth)

Capture **two** signed-in sessions. Same scroll path. SEE = HEAR which lane is on screen.

| Lane | Account | Must-show differences |
|------|---------|------------------------|
| **A · Free** | Free parent demo | Banner **Free parent account** · upgrade prompt · Cove code **does not** end in 9 · no tier badge on students · shop without paid coupon bar (or note “coupons when offered”) |
| **B · Paid** | Paid demo (Lagoon preferred) | Banner **Paid PTO membership active** · tier badge on students · Cove code **ends in 9** · membership credit on card · optional coupon bar on `/cove` |

**Rule:** When VO says “free,” show Lane A. When VO says “paid,” hard-cut or wipe to Lane B (never hold free chrome while saying paid).

**Scroll recipe (both lanes):**  
1. Portal home → slow scroll past jump tiles  
2. My Account (status banner + WhatsApp)  
3. My Students → open Edit student → safety fields (phone, emergency, pick-up)  
4. Calendar & Messages (empty OK — say why)  
5. Member Help → open hub categories (Account, Students, Membership, Cove, Programs, Get help) → open one article briefly  
6. Store & Cove Digital Card → QR → backup code → reload UI  
7. Navigate to `/cove` Stingrays Pride (signed-in) → spirit wear grid  
8. (Paid only insert) code ends in 9 + enrichment discount callout graphic  
9. Open House end package (site `#open-house` + truck menu) — shared, not lane-specific

Skip white page-load frames. Blur emails / real names before WhatsApp.

---

## Act map (why / what / how / who)

### Act 1 — Orient (~25s)
| | Content |
|--|---------|
| **Why** | One Member Portal for the school year — not a mystery app |
| **What** | shmspto.org → Join / Log in → Member Portal |
| **How** | Free account first (email or Google) |
| **Visual** | Home → Join/Log in → portal landing (Lane A) |

### Act 2 — Who: free vs paid (~35s)
| | Content |
|--|---------|
| **Why** | So families know they are not locked out without paying |
| **What** | Same portal tools both ways; paid adds credit + year-long perks |
| **How** | Watch the account banner; upgrade from Membership when ready |
| **Who** | Side-by-side or A→B: Free banner ↔ Paid banner |
| **Tease** | Full Reef / Lagoon / Tide walkthrough = **next video** |

### Act 3 — Students + safety (~40s)
| | Content |
|--|---------|
| **Why** | Kids need a complete record before snack window / programs |
| **What** | My Students + safety profile |
| **How** | Add child → parent phone, emergency contact, pick-up list |
| **Critical** | Safety profile **unlocks** Cove Digital Card; incomplete = locked |
| **Who** | Both lanes; Paid shows tier badge on student card |

### Act 4 — Day-to-day tools (~40s)
| | Content |
|--|---------|
| **Why** | Stay connected without hunting emails |
| **What / How** | Calendar & Messages (fills after enrollments) · Grade WhatsApp on My Account · Surveys on site |
| **Visual** | Slow scroll Calendar → My Account WhatsApp buttons |

### Act 5 — Help / docs (focus) (~35s)
| | Content |
|--|---------|
| **Why** | You are not alone — answers live in the portal |
| **What** | **Member Help** knowledge base (we already wrote it) |
| **How** | Open Help → browse categories → open an article → **Ask the PTO** if stuck |
| **Show categories on screen** | Account & login · Students · Membership · Store & Cove Digital Card · Programs & surveys · Get help |
| **Visual** | Help hub settle → scroll article list → peek one Cove / free-vs-paid article |

### Act 6 — Cove Digital Card (~45s)
| | Content |
|--|---------|
| **Why** | Kids buy snacks without cash |
| **What** | Family balance · **QR** · **backup 6-digit code** · history |
| **How** | Show QR or say code at window · reload online (card/PayPal) |
| **Who** | Free = load your own money · Paid = membership credit first, then reloads; **paid codes end in 9** |

### Act 7 — Shop / spirit wear signed in (~25s)
| | Content |
|--|---------|
| **Why** | Merch without a separate mystery shop |
| **What** | The Cove → Stingrays Pride while signed in |
| **How** | Buy online · pick up at school |
| **Who** | Both can shop; paid may see coupons when offered |

### Act 8 — Paid-only callouts (~25s)
| | Content |
|--|---------|
| **What** | Event refreshments (Lagoon/Tide + Open House tickets) · enrichment discounts 10/15/30% · priority registration |
| **How** | Staff recognize **Family Cove code ending in 9** |
| **Visual** | Lane B code crop + simple discount graphic (not full tier sales pitch) |
| **Tease** | Details on every perk → **membership deep-dive video next** |

### Act 9 — Open House close (~45s)
| | Content |
|--|---------|
| **Why** | Meet the board in person this week |
| **What** | Thu **8/13** cafeteria · 6th 9–11 · 7th/8th 1–3 |
| **How** | Table: spirit wear, memberships, portal/website, Cove card, enrichment · truck tickets (1/family; paid free for whole family) |
| **CTA** | Try portal tonight on shmspto.org · **come see us at Open House to learn more** · Go Stingrays |

---

## Capture checklist (do in order)

**VO-synced continuous scrolls** (required — not frame-stitched stills):

```bash
# Public pages (headless, timed to VO)
SKIP_PORTAL=1 NODE_PATH=~/cwn-c0/node_modules \
  node scripts/capture_portal_walkthrough_vo_scrolls.js

# Free portal (Playwright window — log in as free parent)
SKIP_PUBLIC=1 PORTAL_LANE=free LOGIN_WAIT_MS=600000 NODE_PATH=~/cwn-c0/node_modules \
  node scripts/capture_portal_walkthrough_vo_scrolls.js

# Paid portal (log in as paid parent)
SKIP_PUBLIC=1 PORTAL_LANE=paid LOGIN_WAIT_MS=600000 NODE_PATH=~/cwn-c0/node_modules \
  node scripts/capture_portal_walkthrough_vo_scrolls.js
```

Reusable single-shot helper: `scripts/capture_vo_synced_scroll.js`
(`--out` `--url` `--seconds` — hold → slow scroll → hold, wall-clock = VO).

1. [ ] Public VO scrolls (home, cove, auth, memberships, spirit, open house)
2. [ ] Free portal VO scrolls (home, account, students, cove, help/calendar)
3. [ ] Paid portal VO scrolls (home + cove: Paid, tier, credit, code ends in 9)
4. [ ] Safety profile edit screen (no real PII) if students beat needs it
5. [ ] Title cards only if a beat has no scroll yet
6. [ ] Blur PII · mute-test · Gemini full-pass

## Assembly notes

- Prefer **VO-synced continuous scroll** clips (`capture_vo_synced_scroll.js`). Never ship frame-stitched PNG slideshows as “scrolls.”
- Assemble `continuousFit` should barely stretch; short clips hold last frame.
- Free↔Paid switches: hard cut or short wipe + on-screen `FREE` / `PAID` label for 0.5s.
- No fade-to-black between acts.
- Membership deep-dive tease: one lower-third `NEXT · MEMBERSHIP DEEP DIVE` while VO says it — do not open full tier cards.

## Docs / Help inventory to show (from `frontend/lib/kb/member.ts`)

Show the **hub**, not every article:

- Account & login (Am I free or paid?)
- Students
- Membership (tease → next video)
- Store & Cove Digital Card (family code / snack window)
- Programs & surveys
- Get help / Ask the PTO

---

## Success test

A brand-new parent can answer after one watch:

1. Why create a free account first?  
2. What unlocks the Cove Digital Card?  
3. How do kids pay at the window?  
4. Where do I get help without emailing randomly?  
5. What does paid add (without memorizing every tier)?  
6. Where / when is Open House, and why come?
