# 49 — Cove in-person transactions (Staff manual)

**Audience:** Cove window volunteers, Open House / event table staff, retail leads  
**Last updated:** August 13, 2026  
**Staff app:** https://www.shmspto.org/staff → **The Cove**  
**Printable table card:** https://www.shmspto.org/staff/in-person  
**Staff Help:** Help → The Cove & store → *Cove in-person transactions manual*

---

## 1. One-sentence rule

**Sell first. One payment lane per sale. Never charge the same items twice.**

Two worlds only:

| Lane | Meaning |
|------|---------|
| **Out (in person)** | **Square Stand** — cash, card/wallet, Cove Photos QR, and Cove 6-digit / word passcode |
| **In (portal / site)** | Parent pays themselves online → Staff **hands item only** (pickups). Preferring portal in person is fine — same experience. |

Guests do **not** need a portal login or a Cove Digital Card to buy snacks or spirit.

Cove balance **is** a Square gift card. Stand redeem updates Square → portal balance follows. Staff **Charge Cove** is backup only (lookup fails / no gift card on file yet).

---

## 2. How are they paying? (decision table)

| They want to pay with… | You do this | Device |
|------------------------|-------------|--------|
| **Cash** | Stand → **Cash** → stop | iPad Stand |
| **Card / Apple Pay / Google Pay** | Stand → **Card** → stop | iPad Stand |
| **Cove Photos QR** (portal → save QR to Photos) | Stand → **Gift card** → scan QR → stop | iPad Stand |
| **Cove 6-digit or word passcode** | Stand → search **Customer** by code → **Card on File** → gift card → stop | iPad Stand |
| **“Unable to load cards”** / no Cove balance loaded | Cash or card on Stand, **or** Staff Charge Cove if Staff shows balance | Stand or Staff |
| **Already paid in portal / site** | **Today’s store pickups** (or shirts/magnets) → **Handed out** — do not charge again | Staff browser |
| **Zelle / PayPal / phone Square** (Stand down) | Staff → **External (AM)** → log amount | Staff browser |
| **Paid-member free food** | Code ends in **9** → hand ticket · **no charge** | Staff lookup |
| **Reef / Lagoon / Tide membership** | **Portal only** — not Stand | Parent phone |

---

## 3. Devices

### A. Square Stand (iPad) — all in-person tenders

1. Library / Favorites → ring snacks or spirit.  
2. Pick the tender (see §2).  
3. Stop. Do **not** also Charge Cove / External for that sale.

**Cove by passcode / 6-digit (confirmed working):**

1. Ring items.  
2. Add / search **Customer** — type the **6-digit** or **word passcode**.  
3. **Charge → Card on File** → select their gift card.  
4. Confirm. Cove balance drops; portal follows.

They must have **loaded** the Cove Digital Card in the portal at least once. If Card on File says **Unable to load cards**, there is no gift card on file yet — take cash/card or use Staff backup.

**Cove by Photos QR:**

1. Ring items.  
2. **Charge → Gift card** → scan the Photos QR (Square GAN).  
3. Stop.

### B. Staff → The Cove (laptop or iPad browser)

1. **Backup Charge Cove** — when Stand customer search / Card on File fails  
2. **External** — AM / Stand down (Zelle, PayPal, phone)  
3. **Today’s store pickups** — portal already paid  
4. **Magnet & shirt pickup** — membership perks  
5. Code ends in **9** — free refreshment ticket  

Sign in: `@shmspto.org` → Staff → **The Cove**.

---

## 4. Event mode vs Window mode

| Mode | Expect |
|------|--------|
| **Event** | Stand for everything; Join QR optional after sale |
| **Window** (~8:25–8:50 AM ET M–Fri) | Same Stand default; portal window orders → **Today’s store pickups** |

---

## 5. Walkthroughs

### 5A — Cash or card
Stand → Cash or Card → stop. Optional Join QR after.

### 5B — Cove Photos QR
Stand → Gift card → scan → stop.

### 5C — Cove 6-digit or passcode
Stand → search Customer → Card on File → stop.  
If unable to load cards → cash/card or Staff Charge Cove backup.

### 5D — Already paid online (portal)
Pickup only. Never re-ring Stand / Charge Cove.

### 5E — External (Stand down)
Staff → External → log method + amount.

### 5F — Soft join
Optional after sale. Memberships are portal-only.

---

## 6. Double-charge rule

| Lane used | Also do this? |
|-----------|----------------|
| Stand cash, card, Gift card, or Card on File | **No** Staff Charge Cove / External |
| Staff Charge Cove (backup) | **No** Stand for same items |
| Portal → pickup | **No** Stand / Cove charge |
| External | **No** second tender |

---

## 7. Staff screen map

| Jump link | Purpose |
|-----------|---------|
| **In-person** | How paying? · Stand reminder · Cove backup · External |
| **Store pickups** | Morning-window portal orders · Handed out |
| **Shirts/magnets** | Membership perks |
| **Stock setup** | Admin — not during sales |

---

## 8. Stand inventory (SKU match)

Stand decrements Wix inventory when Square line **SKU** matches Cove/spirit catalog. New Staff products auto-get a SKU from the name. Refresh Library on the iPad after catalog changes.

---

## 9. Do not

- Sell memberships on Stand  
- Require login before a guest can buy  
- Re-enter a Stand sale in Staff “just in case”  
- Use House Account for Cove (not our prepaid model)  

---

## 10. Troubleshooting

| Problem | Fix |
|---------|-----|
| Unable to load cards | No Cove gift card on file — parent needs a portal **Load**, or take cash/card / Staff backup |
| Customer not found by passcode | Confirm they set passcode in portal; try 6-digit; Staff Charge Cove backup |
| Already paid on phone | Pickup only |
| Double charge | treasurer@ — reverse one side |
| Item missing on Stand | Refresh Favorites / Library |
| Stuck payment | **treasurer@shmspto.org** |
| Membership | **vp-membershipexperience@shmspto.org** |

---

## 11. Contacts

| Topic | Email |
|-------|--------|
| Payments / Stand / double charge | treasurer@shmspto.org |
| Membership | vp-membershipexperience@shmspto.org |
| Cove window | cove@shmspto.org · cove-staff@shmspto.org |

---

## 12. Related

- Printable: `/staff/in-person`  
- Quick: `docs/COVE-IN-PERSON.md`  
- Square Customer sync (PIN + passcode): portal open/set code; backfill `scripts/backfill-cove-square-customers.mjs`
