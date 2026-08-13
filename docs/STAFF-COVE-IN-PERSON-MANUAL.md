# 49 — Cove in-person transactions (Staff manual)

**Audience:** Cove window volunteers, Open House / event table staff, retail leads  
**Last updated:** August 13, 2026  
**Staff app:** https://www.shmspto.org/staff → **The Cove**  
**Printable table card:** https://www.shmspto.org/staff/in-person  
**Staff Help:** Help → The Cove & store → *Cove in-person transactions manual*

---

## 1. One-sentence rule

**Sell first. One payment lane per sale. Never charge the same items twice.**

Guests do **not** need a portal login or a Cove Digital Card to buy snacks or spirit.

---

## 2. How are they paying? (decision table)

| They want to pay with… | You do this | Device |
|------------------------|-------------|--------|
| **Cash** | Ring on **Square Stand** → Cash tender → stop | iPad Stand |
| **Card / Apple Pay / Google Pay** | Ring on **Square Stand** → take tap/swipe → stop | iPad Stand |
| **Cove Digital Card** (balance) | Staff → **Cove Digital Card** → lookup → Charge Cove | Staff browser (laptop or iPad) |
| **Member has Cove but prefers cash/card** | **Stand** — fine anytime | iPad Stand |
| **Already paid in portal / site checkout** | Staff → **Today’s store pickups** (or shirts/magnets) → hand item → **Handed out** | Staff browser |
| **Zelle / PayPal / phone Square** (Stand down) | Staff → **External (AM)** → log amount | Staff browser |
| **Paid-member free food perk** | Code ends in **9** → hand ticket · **no charge** | Staff lookup |
| **Reef / Lagoon / Tide membership** | Parent pays in **member portal only** — not Stand | Parent phone / portal |

---

## 3. Devices (what each one is for)

### A. Square Stand (iPad)

**Use for:** cash and card/wallet at the table or window.

1. Open Square → Library / Favorites (snacks + spirit).  
2. Ring the items.  
3. Take **cash** or **card / wallet**.  
4. Stop. Do **not** also ring that sale in Staff.  
5. Optional: add customer email on Stand so the Payment attaches to a person (syncs to Staff).

Stand sales sync into Staff **Payments** (inventory decrements when the SKU matches Wix).

### B. Staff → The Cove (browser on laptop **or** iPad)

**Use for:**

1. **Cove Digital Card** charges  
2. **External** logger (AM / no Stand)  
3. **Today’s store pickups** (portal candy/spirit already paid)  
4. **Magnet & shirt pickup** (membership perks — not candy)

Sign in: `@shmspto.org` Google → Staff → **The Cove**.

Same iPad can run Staff **or** Stand — not both for the same card sale. If the iPad is in Stand taking a tap, do not also Charge Cove / log External for those same items.

---

## 4. Event mode vs Window mode

On Staff → In-person sales, toggle **Event** / **Window** (remembered on the device).

| Mode | Expect |
|------|--------|
| **Event** (Open House, etc.) | Stand (cash + card) dominates. Cove when they want balance. Join QR optional after sale. |
| **Window** (school days ~8:25–8:50 AM ET) | Default cash/card on Stand. Cove only when they show a code and want balance. Portal checkouts in that window appear under **Today’s store pickups**. |

---

## 5. Walkthroughs

### 5A — Cash or card on Stand (guest or member)

1. Confirm item and price.  
2. Stand: ring → Cash **or** card/wallet.  
3. Optional soft-ask: free Join QR (after the sale).  
4. **Do not** open Staff cart for this sale.

### 5B — Cove Digital Card

1. Staff → How paying? → **Cove Digital Card**.  
2. Scan family QR **or** type passcode / 6-digit → **Look up**.  
3. Confirm student names and Cove balance.  
4. Tap products → **Charge Cove**.  
5. If balance is too low or they change their mind → switch to **Stand** (cash/card).  
6. Code ends in **9** (paid-member perk): refreshments free → hand ticket · **no charge**.

### 5C — They already paid online (portal / site)

1. Do **not** ring Stand. Do **not** Charge Cove.  
2. **Snack / spirit bought during the morning window** → Staff → **Today’s store pickups** → find the line → hand item → **Handed out**.  
3. **Membership shirt / magnet** → Staff → Magnet & shirt pickup → Set aside / Handed out.  
4. If you cannot find the order, check Staff **Payments** or ask treasurer@.

### 5D — External pay (morning / Stand not up)

1. Staff → How paying? → **External (AM)**.  
2. Pick Zelle / PayPal / Phone Square / Other.  
3. Enter amount + optional note / email.  
4. **Log** — creates a Staff Payment so AM money is not lost.  
5. Do not also take Stand cash for the same sale.

### 5E — Soft join (optional)

- Purchases ≫ joins — normal.  
- Offer Join QR **after** (or while they wait).  
- Memberships (Reef / Lagoon / Tide) are **portal only**.

---

## 6. Double-charge rule (memorize)

| Lane used | Also do this? |
|-----------|----------------|
| Stand cash or card | **No** Staff Charge Cove / External for same items |
| Staff Charge Cove | **No** Stand for same items |
| Portal checkout → pickup | **No** Stand / Cove charge |
| External log | **No** second tender for same sale |

If unsure whether Stand already synced: check Staff **Payments** before logging anything again.

---

## 7. Staff screen map (The Cove)

| Jump link | Purpose |
|-----------|---------|
| **In-person** | How paying? · Event/Window · Cove charge · External |
| **Store pickups** | Today’s paid portal snack/spirit in the morning window · Handed out |
| **Shirts/magnets** | Membership physical perks · not candy |
| **Stock setup** | Admin only — do not open while ringing sales |

---

## 8. Stand inventory (SKU match)

Stand sales **decrement Wix inventory only when the Square item SKU matches** a Cove/spirit product.

- Ring items from the synced catalog (**Stingrays Spirit T-Shirt**, snacks with SKUs, etc.).
- Do **not** recreate loose “T Shirt / Hats / Vintage” items without SKUs — those used to log as Paid · review inventory with no stock change.
- Tee / hoodie sizes on Stand often share one SKU → one stock pool (not per size).
- **New Cove products added in Staff** (with a SKU, shown on Cove) auto-push to Square Stand. Refresh Library / Favorites on the iPad after adding.
- Audit anytime: `node --env-file=frontend/.env.local scripts/audit-square-wix-skus.mjs`

## 9. What Staff does **not** handle at the table

- Selling **memberships** on Stand or Staff cart (portal only)  
- Rebuilding Cove catalog inside Square Dashboard as source of truth (site/Staff owns catalog; Square is payment + Stand POS)  
- Requiring login before a guest can buy  
- Recording Stand card sales again in Staff “just in case”

---

## 10. Troubleshooting

| Problem | Fix |
|---------|-----|
| Parent already paid on phone | Pickup only — store pickups or shirt/magnet queue |
| Stand took card; Staff also charged | Contact treasurer@ — reverse one side |
| Cove lookup fails | Confirm QR is family code, not product barcode; retry passcode |
| No Cove balance | Use Stand (cash/card) |
| AM money (Zelle) with no Stand | External logger |
| Item not in Stand Library | Refresh Favorites / Library; retail lead syncs Cove → Square catalog |
| Inventory “review” on Stand sale | SKU mismatch — note for retail lead; sale still in Payments |
| Stuck payment / double charge | **treasurer@shmspto.org** |
| Membership / join questions | **vp-membershipexperience@shmspto.org** |

---

## 11. Contacts

| Topic | Email |
|-------|--------|
| Payments, double charge, Stand sync | treasurer@shmspto.org |
| Membership, join, perks | vp-membershipexperience@shmspto.org |
| Cove window ops | cove@shmspto.org · cove-staff@shmspto.org |

Sale alerts (when configured) also notify president@, secretary@, vp-sales@.

---

## 12. Quick checklist (tape next to the iPad)

- [ ] Stand up for cash + card  
- [ ] Staff open on laptop/iPad for Cove + pickups  
- [ ] One lane per sale  
- [ ] Portal paid → Handed out (not re-rung)  
- [ ] Join QR optional after sale  
- [ ] Code ends in 9 → free food ticket  

Printable one-pager: `/staff/in-person`
