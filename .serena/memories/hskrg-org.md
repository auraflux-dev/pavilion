# HSKRG LLC ownership and SHMS isolation

## Operating model
- **Build Pavilion as if SHMS never existed.**
- **SHMS extract:** separate GitHub repo `shmspto` for www.shmspto.org (school-only). Pavilion platform stays in `wix-shmspto` (frontend multi-tenant + commons-site).
- After SHMS deploys: **ask** before also deploying Pavilion when it helps.
- Rob owns: Canva split, Pavilion Stripe keys.

## Cost wall
No shared Stripe/Square/DB/Vercel env between SHMS and Pavilion.

## Tools
See `mem:hskrg-tools-inventory`.

## HSKRG owns
onpavilion.com, auraflux.co, c0, businessrocket.ai, CWN/BTM/streamers YouTube, Lumi (BR example only).

## Related
`mem:commons-marketing`, `mem:commons-parity`, `mem:commit-review-deploy`
