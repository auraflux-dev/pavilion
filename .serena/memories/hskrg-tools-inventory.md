# Tools inventory (evidence-based, pair-down)

## SHMS only (school cost wall)
| Tool | Action |
|------|--------|
| Wix CMS / Members / Stores | Stay school account |
| School Square | Stay |
| Google Workspace @shmspto.org | Stay |
| MoneyMinder / PayPal / Cheddar Up / Litecard | Stay |
| UptimeRobot (president@shmspto.org) | Stay |
| GA4 / Vercel Analytics on frontend | Stay on SHMS project |

## Pavilion / HSKRG only (never on SHMS Vercel)
| Tool | Action |
|------|--------|
| Pavilion Stripe (onpavilion.com) | Rob owns keys |
| Render commons-prod / commons-crm | Pavilion |
| Better Auth / Resend | Pavilion |
| commons-site / commons-pto / commons-pto-demo | HSKRG |

## Entanglements to break in extract
| Tool | Fix |
|------|-----|
| GitHub auraflux-dev hosting SHMS app | New repo `shmspto` (this extract) |
| R2 auraflux-backups for SHMS CMS | Move to school-billed R2 prefix/bucket (document; Rob/ops) |
| ElevenLabs / Gemini via cwn-c0 for SHMS promos | Stop using CWN env for SHMS; school/HSKRG-separated keys |
| Canva | Rob owns |
| Same Vercel team for SHMS + Pavilion | Prefer separate teams later; projects stay env-isolated now |

## Shared HSKRG commercial only (pair down by focus)
Jira, Confluence, GitHub (Auraflux/HSKRG), Render, Vercel (Pavilion projects), Cursor/Serena, Cloudflare (non-SHMS), YouTube (CWN/BTM/streamers).

Rule: if unused this quarter for the active product, freeze or drop the seat.

No in-repo evidence for Telnyx, Apify, RunPod, Neon-in-use, Sentry. Do not buy for extract.
