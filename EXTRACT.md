# Two-repo layout (extract complete)

| Repo | Role | Production |
|------|------|------------|
| [auraflux-dev/shmspto](https://github.com/auraflux-dev/shmspto) | Stone Hill school site only | www.shmspto.org (`frontend` Vercel project) |
| [auraflux-dev/wix-shmspto](https://github.com/auraflux-dev/wix-shmspto) | Pavilion platform + marketing | onpavilion.com, demo, trials |

## Vercel allowlist (HSKRG team)

Only these projects should exist for this product map:

| Project | Domain / URL | Repo to deploy from |
|---------|--------------|---------------------|
| `frontend` | shmspto.org | **only** `auraflux-dev/shmspto` |
| `commons-site` | onpavilion.com | `wix-shmspto` (`commons-site/`) |
| `commons-pto-demo` | commons-pto-demo.vercel.app | `wix-shmspto` (`frontend/` + demo env) |
| `commons-pto` | commons-pto.vercel.app | `wix-shmspto` (`frontend/` + trial env) |

Unrelated keep (not Pavilion/SHMS): `gig-finder` if still in use.

**Never** create one-off `wix-shmspto-*` / ship scratch projects. Deploy with CLI into the allowlisted project id, from a clean worktree, no dirty tree.

Git auto-connect is optional. Prefer CLI so a push cannot land on the wrong product.

## SHMS repo rules
- Forbids `COMMONS_PLATFORM` / `DEMO_INSTANCE`
- No Pavilion Stripe / commons-prod DB
- Never set `COMMONS_VERCEL_PROJECT_ID` (domain attach is Pavilion-only)
- See `HANDOFF.md` and `COST-WALL.md` in that repo

## This (Pavilion) repo
- Multi-tenant `frontend/` for demo/trials
- `commons-site/` marketing
- After an SHMS deploy elsewhere: ask before deploying Pavilion from a related change
- Set `COMMONS_VERCEL_TEAM_ID` + `COMMONS_VERCEL_PROJECT_ID` explicitly on trial/demo when using custom domains

## Names
Vercel still says `commons-*`. Product is Pavilion. Rename later if you want; domains matter more than project slugs.
