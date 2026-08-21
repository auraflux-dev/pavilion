# Two-repo layout (extract complete)

| Repo | Role | Production |
|------|------|------------|
| [auraflux-dev/shmspto](https://github.com/auraflux-dev/shmspto) | Stone Hill school site only | www.shmspto.org (`frontend` Vercel project) |
| [auraflux-dev/wix-shmspto](https://github.com/auraflux-dev/wix-shmspto) | Pavilion platform + marketing | onpavilion.com, commons-pto-demo, commons-pto |

## SHMS repo rules
- Forbids `COMMONS_PLATFORM` / `DEMO_INSTANCE`
- No Pavilion Stripe / commons-prod DB
- See `HANDOFF.md` and `COST-WALL.md` in that repo

## This (Pavilion) repo
- Multi-tenant `frontend/` for demo/trials
- `commons-site/` marketing
- After an SHMS deploy elsewhere: ask before deploying Pavilion from a related change

## Vercel git connect (manual if CLI failed)
Grant the Vercel GitHub App access to `auraflux-dev/shmspto`, then in project **frontend** → Settings → Git → connect that repository (root directory `frontend`).
