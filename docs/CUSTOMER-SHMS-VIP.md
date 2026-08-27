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
