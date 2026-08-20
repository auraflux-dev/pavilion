# HSKRG LLC ownership and SHMS isolation (locked 20 Aug 2026; deploy model updated same day)

## Operating model (current)
- **Build Pavilion as if SHMS never existed:** product brand, tenants, marketing (`onpavilion.com`), demo/trials. No Stone Hill PII, Cove/Stingrays bleed, or school cost on Pavilion bills.
- **SHMS keeps running** on its own deploy path (`www.shmspto.org`). No deadline urgency for a full repo extract; June 2028 handoff remains a long-range goal, not a ship blocker.
- **When SHMS deploys:** stop and **decide** whether that change should also deploy to Pavilion (demo/trial/platform) **when it makes sense**. Default is not automatic Commons parity from every SHMS SHA. Prefer: SHMS-only fix stays SHMS; platform improvement ports or same-SHA deploys to Pavilion projects after an explicit yes.

## Hard wall: cost and prod
- **No shared cost** SHMS ↔ Pavilion / Auraflux / BusinessRocket (Stripe, school Square, DB, Vercel env).
- Do **not** share prod env, DB, Stripe, school Square, or invoices across the wall.
- Canva: Rob separates HSKRG site creative from SHMS creative.

## HSKRG LLC owns (commercial)
| Asset | Role |
|-------|------|
| **onpavilion.com** | Pavilion marketing + SaaS; trials/demos (ex-Commons project names) |
| **auraflux.co** | Auraflux production; CWN stack |
| **c0** | Localhost / dev for auraflux.co |
| **businessrocket.ai** | BusinessRocket product |
| **Lumi repo** | Dead friend site; BR use-case only |
| YouTube | ClipzWorldNews, BeyondTheMask, ~16 streamer channels |

## Shared tools (HSKRG products only)
Jira, Confluence, GitHub, Render, etc. Inventory → pair down by focus. Never bill SHMS onto commercial shared seats without an explicit school-paid exception.

## Stripe
- Pavilion SaaS on HSKRG/Pavilion Stripe. School Square stays on the school. No Auraflux branding on Pavilion invoices.

## Repo reality
Still one monorepo (`frontend/` + `commons-site/`) with env/project walls. Extract SHMS to a school-only repo remains optional future work for handoff cleanliness, not required to build Pavilion.

## Related
- `mem:commons-marketing`, `mem:commons-sales-onboarding`, `mem:commons-parity` (parity is opt-in after SHMS ship, not automatic)
