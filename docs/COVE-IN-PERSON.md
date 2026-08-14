# In-person Cove sales — quick card

**Full Staff manual:** [STAFF-COVE-IN-PERSON-MANUAL.md](./STAFF-COVE-IN-PERSON-MANUAL.md)  
**In Staff Help:** `/staff?view=help&article=cove-in-person-manual`  
**Printable table card:** https://www.shmspto.org/staff/in-person  

---

**Sell first. One lane per sale. Never charge twice.**

Two worlds: **Out** = Square Stand · **In** = portal/site (pickup only).

| Paying with… | Do this |
|--------------|---------|
| Cash or card / wallet | **Square Stand** |
| Cove Digital Card (Wallet / Photos QR) | **Square Stand** → Gift card tender → scan |
| Cove **6-digit or word passcode** | Stand → search customer → **Card on File** (gift card) |
| Cove lookup fails / no Square customer yet | Staff → **Charge Cove** (backup) |

Portal → Square Customer sync (instant on open/set code; backfill: `scripts/backfill-cove-square-customers.mjs`). Nickname = PIN; reference_id = `PIN passcode`. No reverse sync (portal is source of truth).
| Portal / site (already paid) | **Today’s store pickups** → Handed out |
| Zelle / PayPal / phone (no Stand) | Staff → **External** |
| Membership | Portal only |

Cove balance is a Square gift card — Stand redeem ties back to the portal. Do not also Charge Cove after a Stand gift-card sale.
