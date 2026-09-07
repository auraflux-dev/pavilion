# Stone Hill = VIP dedicated customer

**Audience: product** (also `customer:shms`)

## Decision

Treat Stone Hill as **VIP / enterprise-dedicated**, not as a multi-tenant trial on the shared Pavilion stack.

Keep how it sits today:

| Surface | Stays |
|---------|--------|
| Repo | `auraflux-dev/shmspto` |
| Hosting | treasurer Vercel `frontend` → www.shmspto.org |
| CMS / school secrets | Wix + treasurer env (never robert-4220 / pavilion public) |
| Auth | Existing Wix / member flow — not Better Auth trial tenants |
| Brand | Stone Hill, not a `temp_host` pack |

Do **not** move www onto `commons-pto-demo`, vanity `*.commons-pto.org`, or `COMMONS_PLATFORM` / `PAVILION_PLATFORM` multi-tenant mode.

## How we still ship product into SHMS

Same three steps — intentional, reviewable, school-hours aware:

```bash
# 1. Author in product
cd ~/pavilion   # ship demo anytime

# 2. Promote tree only (dry-run default)
node scripts/promote-to-shms.mjs
node scripts/promote-to-shms.mjs --apply   # when ready to write ~/shmspto

# 3. Customer ship (LIVE www)
cd ~/shmspto && node scripts/ship-stone-hill.mjs
```

Promote is the VIP “adoption” path. Demo ship ≠ www. Soft parity may lag; that is expected during Pavilion-first.

## Why this is VIP-friendly

- **Isolation** — school outage blast radius ≠ trial stack  
- **Secrets stay put** — Wix / Square / Google SA on treasurer  
- **Cadence control** — promote+ship only when Rob OKs / off-peak  
- **Hotfixes** — still allowed in `~/shmspto`, then port back to pavilion (`--from-shms`) so product stays ahead  
- **Sell motion** — shared stack for new prospects; dedicated Vercel = paid/VIP SKU (SHMS is the reference customer)
- **No Pavilion-customer member portal** — SaaS buyers (boards) live in **Staff**. School **family login** stays for parents on the school brand. See [PAVILION-BUYER-VS-SCHOOL-SURFACES.md](./PAVILION-BUYER-VS-SCHOOL-SURFACES.md).

## Two lanes (keep both until product is fast enough)

| Lane | When | Flow |
|------|------|------|
| **A. Product → VIP** (future default) | Shared features every customer should get | Author pavilion → ship demo → promote → ship www |
| **B. VIP → Product** (current survival) | School needs that cannot wait on demo QA | Ship on `shmspto` → **weekly intake** into pavilion with accept/deny |

www may lead. Pavilion catches up on a schedule. That is VIP dedicated, not a broken promote model.

### Weekly intake (accept / deny)

```bash
cd ~/pavilion
node scripts/shms-weekly-intake.mjs --fetch          # ff-only pull ~/shmspto
node scripts/shms-weekly-intake.mjs --board          # open/update HSKRG ticket
node scripts/shms-weekly-intake.mjs --apply-accept   # copy ACCEPT only
# review git diff → commit → ship-pavilion (NOT www)
```

| Bucket | Meaning |
|--------|---------|
| **Accept** | Shared portal/staff/api/lib SHMS is ahead on. Port into pavilion. |
| **Deny** | SHMS marketing wrappers (school skin) or pavilion-ahead surfaces (`app/layout.tsx`, brand-pack/CMS markers). |
| **Later** | Leave empty in the script; move rows in the board ticket when you want to defer productizing. |

Do **not** auto-promote after intake. Lane A still requires an intentional promote + off-peak www ship.

## What we change carefully (later)

| Do | Don’t |
|----|--------|
| Selective promote / allowlist of paths when product and SHMS diverge | Force SHMS onto host→tenant / locked-trial middleware |
| Clear promote changelog in board ticket before www ship | Bare `npx vercel` or robert-4220 deploy to www |
| Off-peak S1/S2 when adopting a big product slice | Casual promote during school hours |

## Related

- [CUSTOMERS.md](./CUSTOMERS.md)  
- [PRODUCT-VS-CUSTOMER.md](./PRODUCT-VS-CUSTOMER.md)  
- [CUSTOMER-LUMI.md](./CUSTOMER-LUMI.md) (Wix wall — same idea, different host)  
- S1/S2 in [PRODUCT-BACKLOG.md](./PRODUCT-BACKLOG.md)  
- Board wiki: `HOME/product-shms-weekly-intake`  
- Scripts: `scripts/shms-weekly-intake.mjs`, `scripts/sync-product-between-repos.mjs`, `scripts/shms-frontend-parity.mjs`
- Buyer surfaces: [PAVILION-BUYER-VS-SCHOOL-SURFACES.md](./PAVILION-BUYER-VS-SCHOOL-SURFACES.md)
- Onboarding: [CLIENT-ONBOARDING.md](./CLIENT-ONBOARDING.md)
- Integrations: [INTEGRATIONS-STAFF.md](./INTEGRATIONS-STAFF.md)
- Scale: [PRODUCT-SCALE-TO-100.md](./PRODUCT-SCALE-TO-100.md)
