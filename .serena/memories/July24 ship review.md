# July 24 2026 — Ship review

## Git
- Pushed `efd3a75` to `origin/main` (GitHub: auraflux-dev/wix-shmspto).
- Gap before: CLI `vercel deploy --prod` updated Production while GitHub lagged, so changes looked missing after Git rebuilds. Rule: commit + push main so Vercel Git and CLI stay aligned.

## Live branding verified
- Home hero: **Ashburn, Virginia** (no LCPS).
- Donate: **Support SHMS PTO**.
- Volunteer bullet: **Connect with other SHMS PTO families**.
- `page-content.ts` strips LCPS and rewrites bare `SHMS` → `SHMS PTO` for CMS PageContent.

## Also in commit
Cove GAN QR + Litecard hooks, enrichment codes, shirt/magnet fulfillment queue, donation presets / PTO copy.

## Follow-up
Set Vercel `LITECARD_*` after Litecard signup; optional CMS seed to match sanitized copy.
