# In-person Cove sales — Staff register + Square Stand

**Audience:** Cove Coordinator (`cove@`), VP Digital & Retail Sales (`vp-sales@`), trained volunteers  
**Devices:** Laptop/tablet (Staff) + iPad with Square Stand  
**Live Staff:** https://www.shmspto.org/staff → **The Cove**  
**In-app Help:** Staff → Help → *Cove register* · *In-person Cove + Square Stand*

---

## Mental model (two lanes)

| Lane | Who | Device | Money path |
|------|-----|--------|------------|
| **A — Digital card** | Family already loaded Cove Digital Card online | Staff register **or** Square gift-card scan of Wallet QR | Debit prepaid Square gift card / Staff Charge |
| **B — Guest** | No portal, no balance, or wants card-present merch | **Square Stand only** | Card-present Square sale |

Do **not** double-charge. If Lane A covers the snack, do not also run a card on Stand for the same items.

---

## Before open

1. Sign into Staff as `cove@shmspto.org` (Chrome/Safari on laptop or tablet).
2. Open **The Cove** — confirm products and deals load.
3. Wake **Square Stand** — correct SHMS PTO location, Wi‑Fi up, reader paired.
4. Cash/drawer/printer ready if you use them.
5. Know today’s featured deals (gold badges on register tiles).

---

## Lane A — Prepaid Cove Digital Card

### On Staff register (recommended for snacks + inventory sync)

1. Student says what they want.
2. Collect ID:
   - Apple/Google **Wallet** QR or Photos QR, **or**
   - Spoken **6-digit Family Cove code**, **or**
   - Long Square **GAN** (gift card number).
3. Paste/type into **Scan QR / GAN or 6-digit backup** → Lookup.
4. Confirm **full student names** and **balance**.
5. Tap product tiles; adjust qty with + / −.
6. Tap **Charge**. Hand over snacks.

**Balance too low:** stop. Parent reloads in the portal, *or* switch that purchase to Lane B on Stand (tell the family clearly).

**Code not found:** recheck digits. Paid-member family codes end in **9**. Parent must have finished portal signup + at least one card load.

### On Square Stand (Wallet as Square gift card)

When the student presents a Wallet pass whose barcode is the Square GAN:

1. Use Stand’s **gift card** / scan flow (not a new credit-card charge).
2. Redeem the snack amount against that gift card.
3. If the scan fails, fall back to Staff register + 6-digit code.

---

## Lane B — Guest / card-present (Square Stand)

Use when there is no loaded Cove Digital Card, or for spirit/event merch sold at the table.

1. Ring items on Square Stand as a normal sale.
2. Take card (or other Stand tender).
3. Hand over the item.

Stand does **not** create a family Cove account. Reloads and new cards happen online at https://www.shmspto.org (member portal).

---

## Products & restock

Staff → **The Cove** → **Cove products**: add items, prices, photos, featured deals, restock qty.  
Advanced **Cove inventory** table is backup only.

---

## After the rush

- Spot-check **Reports → Cove** for today’s sales.
- Flag stuck “paid but card didn’t load” issues to **treasurer@** (Payments · Needs Reconciliation) — do not ask the parent to pay again.
- Note low stock in Cove products before the next day.

---

## Training video

**Style:** Same as parent tour — screen stills + BTM ElevenLabs VO + music bookends. **Not** HeyGen avatar.

| Status | Artifact |
|--------|----------|
| Script | `promo-videos/scripts/staff_cove_inperson_elevenlabs.txt` |
| VO gen | `NODE_PATH=~/cwn-c0/node_modules node promo-videos/scripts/generate_staff_cove_vo.js` |
| Assemble | `NODE_PATH=~/cwn-c0/node_modules node promo-videos/scripts/assemble_staff_cove_inperson.js` |
| Output | `promo-videos/out/SHMSPTO_staff_cove_inperson_16x9.mp4` |

Needs a valid `ELEVENLABS_API_KEY` starting with `sk_` (CWN env currently has an API key **ID**, which ElevenLabs rejects).

Staff Help article links the finished watch file once VO is generated.
