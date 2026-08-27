# Product vs customer work (HSKRG / agents)

**Audience: product**

## Why

Pavilion is the product we sell. Stone Hill and Lumi are customers. Tickets and wiki pages must say which, so agents do not treat www.shmspto.org as the product home or blur customer ops with shared features.

## How

| Kind | Label | Edit home | Ship |
|------|-------|-----------|------|
| Product | `product` | `~/pavilion` | `ship-pavilion.mjs` (demo ≠ www) |
| Customer SHMS | `customer:shms` | promote → `~/shmspto` or SHMS-only ops | `ship-stone-hill.mjs` (live www — careful school hours) |
| Customer Lumi | `customer:lumi` | `auraflux-dev/lumi` / Wix | customer surface |

Wiki Why line must be: `Audience: product` | `Audience: customer:shms` | `Audience: customer:lumi`

Upsert to HSKRG Work when API key available:

- spaceKey: `HOME`
- slug: `product-vs-customer`
- title: `Product vs customer work`

## Code / commands

```bash
# Product
cd ~/pavilion && node scripts/ship-pavilion.mjs --target commons-pto-demo

# Promote to SHMS (dry-run default — safe)
cd ~/pavilion && node scripts/promote-to-shms.mjs
cd ~/pavilion && node scripts/promote-to-shms.mjs --apply   # writes tree only
cd ~/shmspto && node scripts/ship-stone-hill.mjs            # LIVE www
```
