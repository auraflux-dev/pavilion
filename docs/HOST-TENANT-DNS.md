# Trial hosts → tenant (P1)

**Audience: product**

## Why

Trials get `temp_host` like `{slug}.onpavilion.com` (suffix from `PAVILION_TRIAL_DOMAIN_SUFFIX` or legacy `COMMONS_TEMP_DOMAIN_SUFFIX`). The shared Pavilion app must resolve **Host → organization** so one Vercel project serves demo and many trial tenants.

## How (code)

1. Session (logged-in staff/member) still wins.
2. Else `organizationIdFromHostHeader` matches `organizations.temp_host` or `custom_domain`.
3. Shared app hosts (`demo.onpavilion.com`, `*.vercel.app`, localhost, SHMS www) are **not** tenants.

Files: `frontend/lib/crm/tenant.ts`, `frontend/lib/crm/product-host.ts`

## DNS (ops)

| Record | Points to | Notes |
|--------|-----------|--------|
| `demo.onpavilion.com` | Pavilion demo Vercel project (`commons-pto-demo`) | Public always-on demo |
| `*.onpavilion.com` | Same Vercel project | Trial vanity `temp_host` |
| `*.commons-pto.org` (legacy) | Same project until migrated | Old trial suffix |
| Customer custom domain | Same Vercel project + `custom_domain` on org row | Attach via `/api/commons/domain` |

Do **not** put trial DNS on treasurer / www.shmspto.org.

Setup script: `node scripts/setup-pavilion-domains.mjs`

See also: `docs/PAVILION-DEMO-TRIAL-HOSTS.md`, `docs/SALES-LINK-PLAYBOOK.md`

## Follow-ups

- [x] Middleware hard gate when Host maps to locked trial (`/trial-locked` + `/api/commons/host-status`)
- [x] Host-based demo vs trial on one deploy (`x-pavilion-surface` header)
