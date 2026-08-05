# August 5 2026 — Comms & Content Calendar ship review

Serena QA of Comms calendar + month grid + Projects calendar view.

## Tests run
- Helper smoke: `frontend/scripts/test-comms-calendar.mjs` (incl. YYYY-MM-DD timezone fix)
- Wix CMS CRUD on `CommsCalendarItems` (insert/query/update/soft-delete)
- API unauth GET/POST → 403
- Browser: `/staff?workspace=comms` redirects to Staff Sign In (Google sign-in off; no authenticated UI click-through)

## Critical (fixed before ship)
- Query `.limit(200)` raised to `.limit(1000)` with comment for future pagination

## Medium (follow-ups)
- `clearPublished` PATCH flag unused by client
- Auto tab-switch when channel changes during edit may surprise

## Docs
- Repo: STAFF-HELP, SITE-CAPABILITY-AUDIT, STAFF-PORTAL-TEST-PLANS, KB article
- Drive: **46 - Comms & Content Calendar** + appends to 30, 32
- Script: `scripts/update-comms-calendar-docs.js`

## Security
No secrets; role-gated admin/marketing/secretary/membership/events; CMS ADMIN-only.

## Verdict
SHIP after limit fix.