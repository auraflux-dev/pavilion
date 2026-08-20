# HSKRG LLC ownership and SHMS isolation (locked 20 Aug 2026)

## Hard wall: SHMS PTO
- **shmspto.org** is completely separate from HSKRG commercial products.
- **No shared cost** with Pavilion / Auraflux / BusinessRocket (hosting, Stripe, Square seller, SaaS seats billed to school vs HSKRG).
- Architecture: SHMS may improve the **Pavilion platform** (patterns, features proven live). Do **not** share prod env, DB, Stripe, school Square, or invoices across the wall.
- **Handoff target: June 2028** — site, ops, credentials, and docs must be transferable to a new SHMS operator without HSKRG commercial entanglement.
- **Canva:** Rob separates HSKRG site creative from SHMS creative (not agent-owned).

## HSKRG LLC owns (commercial)
| Asset | Role |
|-------|------|
| **onpavilion.com** | Pavilion marketing + SaaS; trials/demos (ex-Commons names: commons-site, commons-pto, commons-pto-demo) |
| **auraflux.co** | Auraflux production; CWN stack |
| **c0** | Localhost / dev for auraflux.co |
| **businessrocket.ai** | BusinessRocket product |
| **Lumi repo** | Friend’s dead site; **example use-case for BusinessRocket only**, not an active client |
| YouTube | ClipzWorldNews, BeyondTheMask, ~16 streamer channels (owned via HSKRG / Auraflux production) |

Repos for those products sit under HSKRG ownership.

## Shared cost / tools (HSKRG products only)
May share across Pavilion, Auraflux, BusinessRocket where it helps:
Jira, Confluence, GitHub, Render, and other software in play.
**Process:** inventory everything → pair down by focus (what each product actually needs).
Never put SHMS on that shared commercial bill without an explicit school-paid exception.

## Stripe (reminder)
- Separate Stripe **accounts** per product brand under legal HSKRG LLC where needed.
- Pavilion SaaS ≠ school Square ≠ Auraflux studio Checkout branding on Pavilion invoices.
- SHMS parent money stays on **school Square**.

## Repo reality today
`wix-shmspto` is still a **monorepo** (`frontend/` = SHMS, `commons-site/` = Pavilion marketing). Isolation is enforced by env/project walls now; a clean SHMS extract for 2028 handoff is a future deliverable, not soft coupling forever.

## Related
- `mem:commons-marketing` — Pavilion site / Stripe env
- `mem:commons-sales-onboarding` — trial-first funnel
- Canvas: `hskrg-ownership-map.canvas.tsx`
