# Trial hosts → tenant (P1)

**Audience: product**

## Why

Trials get `temp_host` like `{slug}.commons-pto.org` (suffix from `COMMONS_TEMP_DOMAIN_SUFFIX`). The shared Pavilion app must resolve **Host → organization** so one Vercel project serves many tenants.

## How (code)

1. Session (logged-in staff/member) still wins.
2. Else `organizationIdFromHostHeader` matches `organizations.temp_host` or `custom_domain`.
3. Shared app hosts (`*.vercel.app`, localhost, SHMS www) are **not** tenants.

File: `frontend/lib/crm/tenant.ts`

## DNS (ops)

| Record | Points to | Notes |
|--------|-----------|--------|
| `*.commons-pto.org` (or future `*.onpavilion.com`) | Pavilion demo / platform Vercel project | Wildcard for temp_host |
| Customer custom domain | Same Vercel project + `custom_domain` on org row | Attach via `/api/commons/domain` |

Do **not** put trial DNS on treasurer / www.shmspto.org.

## Follow-ups

- [x] Middleware hard gate when Host maps to locked trial (`/trial-locked` + `/api/commons/host-status`)
- Rename suffix env to Pavilion domain when P4 lands
