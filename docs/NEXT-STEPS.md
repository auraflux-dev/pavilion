# Pavilion architecture — next steps

Safe progress without updating www.shmspto.org until you explicitly promote + ship SHMS.

## Done (this phase)

- [x] Pavilion-first authoring rules  
- [x] Promote script (dry-run default): `node scripts/promote-to-shms.mjs`  
- [x] Soft parity (does not block SHMS ships)  
- [x] Board labels: `product` / `customer:shms` / `customer:lumi`  
- [x] Ship map + PRODUCT-VS-CUSTOMER docs  

## Safe anytime

- [ ] Upsert HSKRG wiki `HOME/product-vs-customer` (needs `HSKRG_AGENT_API_KEY`)  
- [ ] Finish [PUBLIC-REPO-PREP.md](./PUBLIC-REPO-PREP.md) scrub  
- [ ] Ship Pavilion demo/marketing only (`ship-pavilion.mjs`)  
- [ ] Dry-run promote reports (no `--apply`)  

## Off-peak / Rob OK (touches live school)

- [ ] `promote-to-shms.mjs --apply` → review diff in `~/shmspto`  
- [ ] Commit + `ship-stone-hill.mjs` (www production)  

## Later phases

1. **Public GitHub org** for Pavilion (off `auraflux-dev`) — see PUBLIC-REPO-PREP  
2. **Rename** customer-facing `commons-*` → Pavilion (robert-4220 first; never treasurer)  
3. **Lumi** as customer #2 on board (`customer:lumi`); Wix OK until they join Pavilion stack  
4. Host→tenant routing / pack seed (product SaaS depth) — separate plan  

## Customers

| # | Customer | Repo / surface | Stack |
|---|----------|----------------|-------|
| 1 | Stone Hill | `auraflux-dev/shmspto` | treasurer Vercel |
| 2 | Lumi | `auraflux-dev/lumi` | Wix (for now) |
