# Pavilion demo and trial hosts

**Audience: product**

## Why

Prospects need two clear entry points:

1. **Demo** — always-on public sample (Riverside). Anyone can browse. Optional review code for staff/member portal depth.
2. **Trial** — private branded workspace for a named school. Login required. Sales-provisioned only.

Pavilion company marketing and Platform Staff share the brand site (`www.onpavilion.com`). Staff is a **path** (`/staff`), not a subdomain.

One Next.js deploy (`commons-pto-demo`). Host header selects mode.

## Host map

| Host | Mode | Auth | Data |
|------|------|------|------|
| `www.onpavilion.com` / `onpavilion.com` | Brand | Marketing public. `/staff` = Platform Staff (`@onpavilion.com`) | Marketing + fleet |
| `demo.onpavilion.com` | Demo | Public browse. `/review` + code for staff/parent lanes | Shared Riverside sample |
| `commons-pto-demo.vercel.app` | Demo (legacy) | Same | Same |
| `{slug}.onpavilion.com` | Trial | Better Auth login | Org-scoped CRM + CMS |
| `*.commons-pto.org` | Trial (legacy) | Same | Same |

Reserved labels (`staff`, `demo`, `www`, …) are never trial vanity slugs. `staff.*` redirects to `www.onpavilion.com/staff`.

## Code

- Host routing: `frontend/lib/crm/product-host.ts`
- Per-request surface: `frontend/lib/crm/product-surface-server.ts`
- Middleware injects `x-pavilion-surface: brand|demo|trial|…`
- Marketing routes: `frontend/app/(pavilion-brand)/`
- Sales URLs: `frontend/lib/demo/review-links.ts`

## Vercel env (commons-pto-demo production)

When wildcard trial DNS is live on the same project:

```text
DEMO_INSTANCE=true
NEXT_PUBLIC_DEMO_INSTANCE=true
PAVILION_PLATFORM=true
NEXT_PUBLIC_PAVILION_PLATFORM=true
PAVILION_TRIAL_DOMAIN_SUFFIX=onpavilion.com
PAVILION_DEMO_HOST=demo.onpavilion.com
PAVILION_BRAND_HOST=www.onpavilion.com
NEXT_PUBLIC_PAVILION_BRAND_HOST=www.onpavilion.com
NEXT_PUBLIC_PAVILION_DEMO_ORIGIN=https://demo.onpavilion.com
NEXT_PUBLIC_SITE_URL=https://demo.onpavilion.com
DEMO_JOIN_CODE=<one canonical code>
DEMO_JOIN_CODE_ALIASES=riverside-board,66988432952500a7587ff938
```

## DNS (ops)

| Record | Target | Project |
|--------|--------|---------|
| `www.onpavilion.com` | Vercel `commons-pto-demo` | Brand (marketing + /staff) |
| `onpavilion.com` | Same (redirect/alias to www) | Brand apex |
| `demo.onpavilion.com` | Same Vercel project | Product demo |
| `*.onpavilion.com` | Same Vercel project | Trial vanity hosts |

Detach www/apex from `commons-site` after cutover. Run: `node scripts/setup-pavilion-domains.mjs --dry-run` then `--apply`.

Legacy `*.commons-pto.org` can stay until trials are migrated.

## Middleware behavior

- `www` / apex → surface `brand`; marketing + `/staff`; school paths redirect to demo
- `demo.*` → demo guards (stub writes, review cookie for `/staff` and `/member-portal`)
- `{slug}.onpavilion.com` → login gate, host → org row, trial lock after 30 days
- Same ship target: `node scripts/ship-pavilion.mjs --target commons-pto-demo`
