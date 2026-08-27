# Retire legacy commons-pto host (P6)

**Audience: product**

## Goal

One Pavilion stack: **`commons-pto-demo`** (rename later). Stop using **`commons-pto.vercel.app`** for new prospects.

## Already true in product rules

- Brand packs + trials on demo
- `commons-one-surface.mdc`: do not open new prospects on legacy host
- Ship default: `ship-pavilion.mjs --target commons-pto-demo`

## Cutover checklist (robert-4220 only)

1. Confirm all active trials use demo / temp_host DNS → demo project  
2. Point `COMMONS_TEMP_DOMAIN_SUFFIX` wildcard at demo project  
3. Set `COMMONS_PLATFORM` + `DEMO_INSTANCE` correctly on demo (platform trials vs public sample)  
4. Dual-read `PAVILION_PLATFORM` env (added as alias)  
5. Remove `commons-pto` from Better Auth `trustedOrigins` after no traffic  
6. Vercel: pause or delete `commons-pto` project  
7. Update AGENT-SHIP-MAP / ship targets  

## Do not

- Touch treasurer / www.shmspto.org  
- Force SHMS onto the shared stack  

## Status

Docs + env alias landed. Project deletion waits on Rob ops OK.
