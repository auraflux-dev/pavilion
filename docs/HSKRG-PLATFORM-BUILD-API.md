# HSKRG platform build API

Audience: product

## Why

Brand and customer hosts pull the shared build configuration via API — modules, brand pack, channel — instead of forking Staff apps.

## How

`GET /api/platform/build`

Optional query: `?organizationId=`

Response includes `product`, `surface` (`brand` | `customer`), `channel` (`HSKRG_BUILD_CHANNEL`, default `stable`), `buildId`, `modules`, `catalog`, and org brand pack when known.

Host resolution: `companyBrandFromHost` / `isCompanyBrandHost` in `lib/crm/product-host.ts`.

Client Staff on customer domain: `GET /api/staff/platform/handoff?organizationId=&view=home` (sets cookies on that host).

## Code

```text
frontend/app/api/platform/build/route.ts
frontend/app/api/staff/platform/handoff/route.ts
frontend/lib/crm/client-staff-url.ts
```
