# Two-repo layout (extract complete)

| Repo | Role | Production |
|------|------|------------|
| [auraflux-dev/shmspto](https://github.com/auraflux-dev/shmspto) | Stone Hill school site only | www.shmspto.org (`frontend` Vercel project) |
| [auraflux-dev/wix-shmspto](https://github.com/auraflux-dev/wix-shmspto) | Pavilion platform + marketing | onpavilion.com, demo, trials |

## Vercel allowlist (HSKRG team)

Only these projects should exist for this product map:

| Project | Domain / URL | Repo to deploy from |
|---------|--------------|---------------------|
| `frontend` | shmspto.org | **only** `auraflux-dev/shmspto` — push `main`, treasurer Git auto-deploy |

Git push on `shmspto` `main` triggers treasurer Vercel Production. Agents verify with `node scripts/check-prod-deploy.mjs` (see `~/shmspto/scripts/DEPLOY.md`). Do not deploy Stone Hill via `vercel deploy` from agent shells.
| `commons-site` | onpavilion.com | `wix-shmspto` (`commons-site/`) |
| `commons-pto-demo` | commons-pto-demo.vercel.app | `wix-shmspto` (`frontend/` + demo env) |
| `commons-pto` | commons-pto.vercel.app | `wix-shmspto` (`frontend/` + trial env) |

Unrelated keep (not Pavilion/SHMS): `gig-finder` if still in use.

**Never** create one-off `wix-shmspto-*` / ship scratch projects. Deploy with CLI into the allowlisted project id, from a clean worktree, no dirty tree.

**SHMS:** Git on treasurer `frontend` is the deploy path (`push main` → auto-deploy → `node scripts/check-prod-deploy.mjs`). Agents do not `vercel deploy` SHMS without treasurer login.

**Pavilion:** deploy from `wix-shmspto` to robert-4220 projects (`commons-site`, `commons-pto-demo`, `commons-pto`). Never deploy monorepo `frontend/` to treasurer or to a robert-4220 project named `frontend`.

## SHMS repo rules
- Forbids `COMMONS_PLATFORM` / `DEMO_INSTANCE`
- No Pavilion Stripe / commons-prod DB
- Never set `COMMONS_VERCEL_PROJECT_ID` (domain attach is Pavilion-only)
- See `HANDOFF.md` and `COST-WALL.md` in that repo
- **Edit home:** Stone Hill visitor, member portal, and staff code is edited and committed in **`shmspto`**, not in this monorepo's `frontend/`. Port both ways only when Pavilion needs the same product (vanilla).
- **Drift check:** `node scripts/shms-frontend-parity.mjs` (compares sibling `~/wix-shmspto` and `~/shmspto` trees). Fail means school-facing files exist only in the monorepo and will not ship to www.

## This (Pavilion) repo
- Multi-tenant `frontend/` for demo/trials
- `commons-site/` marketing
- After an SHMS deploy elsewhere: ask before deploying Pavilion from a related change
- Set `COMMONS_VERCEL_TEAM_ID` + `COMMONS_VERCEL_PROJECT_ID` explicitly on trial/demo when using custom domains
- Do not treat this `frontend/` as the live Stone Hill tree. www ships from `shmspto`.

## Names
Vercel still says `commons-*`. Product is Pavilion. Rename later if you want; domains matter more than project slugs.
