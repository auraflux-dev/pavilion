# Two-repo layout — Pavilion product, SHMS customer

| Repo | Role | Production |
|------|------|------------|
| [auraflux-dev/pavilion](https://github.com/auraflux-dev/pavilion) | **Product** (Pavilion) + marketing | demo, onpavilion.com, trials |
| [auraflux-dev/shmspto](https://github.com/auraflux-dev/shmspto) | **Customer #1** Stone Hill | www.shmspto.org |
| [auraflux-dev/lumi](https://github.com/auraflux-dev/lumi) | **Customer #2** Lumi | Wix for now |

Customer-facing name is **Pavilion**. Legacy Vercel/env slugs may still say `commons-*`.

## Vercel allowlist

| Project | Domain | Repo |
|---------|--------|------|
| `frontend` (treasurer) | shmspto.org | **only** `shmspto` — customer deploy |
| `commons-pto-demo` | commons-pto-demo.vercel.app | `pavilion` — product demo / trials (one stack) |
| `commons-site` | onpavilion.com | `pavilion` (`commons-site/`) |
| `commons-pto` | commons-pto.vercel.app | legacy private host |

**Product code** is authored in **`pavilion`**. Promote to SHMS when updating live school:

```bash
node scripts/promote-to-shms.mjs   # from ~/pavilion
node scripts/ship-stone-hill.mjs   # from ~/shmspto — production-sensitive
```

## SHMS repo (customer)

- Forbids `COMMONS_PLATFORM` / `DEMO_INSTANCE`
- No Pavilion Stripe / commons-prod DB on school
- Own Wix / secrets wall
- Hotfixes here → port back to pavilion same day

## Pavilion repo (product)

- Shared `frontend/` product + demo/CRM/brand packs
- `commons-site/` marketing
- Trials = tenant rows on one stack (not a new Vercel per trial)
- Demo ship does not update www

## Later (not this step)

- Public Pavilion GitHub org (off auraflux-dev)
- Rename `commons-*` slugs to Pavilion
- Lumi on Pavilion stack if/when they leave Wix-only
