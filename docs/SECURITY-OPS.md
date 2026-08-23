# Security, backups, monitoring & error reporting

SHMS PTO (`www.shmspto.org`) stores family and program data in **Wix CMS**, not SQLite. The Next.js app on Vercel is the application layer; Wix Data is the system of record.

Public legal statement: [/data-security](https://www.shmspto.org/data-security) (also linked from the site footer, Privacy Policy, and portal/staff footers).

## Env signals (Vercel → Project → Environment Variables)

| Variable | Purpose |
|---|---|
| `ERROR_REPORTING_ENABLED=true` | **Master switch**. ErrorEvents CMS + optional webhook + `/api/errors/report` |
| `ERROR_WEBHOOK_URL` | Optional POST sink (Slack/Discord/Make) when reporting is on |
| `CRON_SECRET` | Protects `/api/cron/*` (Vercel Cron sends `Authorization: Bearer …`) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BACKUP_BUCKET` | Cloudflare R2 nightly CMS backups (no Google Drive) |
| `ALLOWED_ORIGINS` | Extra origins allowed for mutating browser API calls |
| `UPTIMEROBOT_API_KEY` | SHMS UptimeRobot account (`president@shmspto.org`). MCP create/list monitors |

**No Sentry. No Drive backups.** Errors use Vercel logs + Wix `ErrorEvents` with pasteable `evt_…` ids. Backups go to R2 only.

Without `ERROR_REPORTING_ENABLED=true`, errors still write structured `console.error` lines (visible in Vercel Runtime Logs) and UI shows a digest/reference, but nothing is stored in ErrorEvents.

## How parents / staff should report errors

1. Copy the **error reference** shown on the red error screen (digest or `evt_…` id).
2. Paste it in chat with the coding agent, or email `president@shmspto.org`.
3. With reporting enabled, look up the event in Wix CMS `ErrorEvents` or Vercel Runtime Logs.

## UptimeRobot (full coverage)

Account: `president@shmspto.org` (API key in Vercel `UPTIMEROBOT_API_KEY`).

Monitors (5-minute HTTP):

| Monitor | URL |
|---|---|
| Home | `https://www.shmspto.org/` |
| Health | `https://www.shmspto.org/api/health` |
| Login | `https://www.shmspto.org/auth/login` |
| Data security | `https://www.shmspto.org/data-security` |
| Cove | `https://www.shmspto.org/cove` |
| Membership | `https://www.shmspto.org/membership` |
| Fundraising | `https://www.shmspto.org/fundraising` |

Re-run / idempotent create:

```bash
UPTIMEROBOT_API_KEY=xxx node scripts/setup-uptimerobot.mjs
```

## Backups (full CMS export)

Primary: **Cloudflare R2** bucket **`shmspto`** (SHMS-dedicated; school PTO-owned).

Layout:

```
shmspto/cms/shmspto-cms-backup-YYYY-MM-DD.json.gz
shmspto/cms/latest.json.gz
shmspto/newsletter-heroes/*.png
```

Required Vercel env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET`.

Vercel Cron hits `GET /api/cron/backup-cms` daily at 07:00 UTC (`frontend/vercel.json`).

Manual run:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://www.shmspto.org/api/cron/backup-cms
```

Each run also writes a `BackupRuns` CMS row.

Wix’s own commercial backups remain the vendor safety net; R2 is the PTO-controlled secondary copy.

## Security controls shipped

- HTTPS + HSTS, `X-Frame-Options: DENY`, nosniff, referrer / permissions policies, CSP
- Same-origin checks on mutating `/api/*` (webhooks/cron/auth-proxy exempt; use secrets)
- Rate limits on contact, volunteer, newsletter, surveys, client error reports
- Staff **act-as** writes to `StaffAuditLog`
- Dependabot for `/frontend`
- GitHub Action smoke + `/api/health` every 12 hours

## Error reporting checklist

1. Set `ERROR_REPORTING_ENABLED=true` on Vercel (already on for production).
2. Optional: set `ERROR_WEBHOOK_URL` for Slack/Discord.
3. When a parent/staff hits an error, they paste the on-screen `evt_…` / digest here. look up Wix CMS `ErrorEvents` or Vercel Runtime Logs.

## Not SQLite

There is **no** application SQLite file. Do not look for `.sqlite` backups. Restore paths are: Wix CMS restore, R2 JSON.gz re-import (manual), and Vercel redeploy of the app.
