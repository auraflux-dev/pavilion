# Pavilion marketing ops (onpavilion.com)

**Audience: product**

## Contact

| Channel | Value |
|---------|--------|
| Email | `hello@onpavilion.com` |
| Call / SMS | `+1 (571) 600-2835` (`tel:+15716002835`). Same number as AuraFlux. |

## GA4

Set on Vercel project **commons-site** (Production):

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

Loaded by `commons-site/components/google-analytics.tsx`. Skips localhost, `*.vercel.app`, and `?ga_opt_out=1`.

## Security

- App headers in `commons-site/next.config.ts` (frame deny, nosniff, referrer, permissions, CSP)
- Vercel HSTS on the domain
- Public `/.well-known/security.txt`

## Backups

| Layer | Role |
|-------|------|
| Neon PITR (`commons-prod`) | Primary for subscription / account-token tables |
| Stripe | Billing source of record |
| Nightly cron `GET /api/ops/db-heartbeat` | Heartbeat + row counts (Bearer `CRON_SECRET`) |

Set `CRON_SECRET` on commons-site Production so Vercel Cron can call the route (`commons-site/vercel.json`).

## Uptime

```bash
UPTIMEROBOT_API_KEY=xxx node scripts/setup-uptimerobot-pavilion.mjs
```

Monitors: Home, `/api/health`, Pricing, Contact, `security.txt`.
