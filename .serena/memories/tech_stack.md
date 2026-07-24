# Tech stack
- Frontend: Next.js 16.2, React 19.2, TypeScript 5.7, Tailwind CSS 4, App Router.
- Backend services: Wix SDK/CMS/eCommerce/Members, Square SDK gift cards, Wix checkout. **Not SQLite** — Wix CMS is the system of record.
- Observability: ErrorEvents CMS (`ERROR_REPORTING_ENABLED`), `/api/health` + UptimeRobot (`president@shmspto.org`), nightly `/api/cron/backup-cms` → Cloudflare R2 (`auraflux-backups/shmspto/cms/`). No Sentry, no Drive backups.
- Package manager: npm with root package for Wix CLI and `frontend/package.json` for Next app.
- Deployment target: Vercel frontend; Render constraints apply only if a Render service is introduced.
- Legal: `/data-security` Data Security Practices (footer + Privacy cross-link). See `docs/SECURITY-OPS.md`.