# Lumi — Pavilion customer #2

**Audience: customer:lumi**

## Today

- Repo: [`auraflux-dev/lumi`](https://github.com/auraflux-dev/lumi) (private)
- Hosting: **Wix** — customer wall (same idea as SHMS VIP dedicated, different host)
- Board: HSKRG Work tickets labeled **`customer:lumi`**
- Needs **some Pavilion capabilities, not all** — see [SOLUTION-PACKAGING.md](./SOLUTION-PACKAGING.md)

## Capability stance

Default pack in code: `PACK_LUMI_PARTIAL` (`frontend/lib/crm/capabilities.ts`):

- **In:** marketing site, programs, events, staff CMS, Wix connector  
- **Out (until asked):** member portal, retail/POS, finance, Plaid, shared-stack trial  

They can grow capability-by-capability without taking the whole SHMS-shaped product.

## Later (optional Pavilion hosting)

Not required to be “customer #2”:

1. Keep Wix wall **or** move to shared trial / dedicated Vercel  
2. Enable more capabilities from the catalog (portal, Square, …)  
3. Brand / content migration as needed  
4. Keep `auraflux-dev/lumi` as ops notes or archive after cutover  

## Agent rules

- Lumi site/Wix work → `lumi` repo (or Wix), ticket `customer:lumi`  
- Shared features → `~/pavilion`, label `product`, then adopt via pack + promote/tenant  
- Never put Lumi secrets on SHMS treasurer env  
