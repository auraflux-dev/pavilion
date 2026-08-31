# Pavilion demo and trial hosts

**Audience: product**

## Why

Prospects need two clear entry points:

1. **Demo** — always-on public sample (Riverside). Anyone can browse. Optional review code for staff/member portal depth.
2. **Trial** — private branded workspace for a named school. Login required. Sales-provisioned only.

One Next.js deploy (`commons-pto-demo` today, `demo.onpavilion.com` after DNS). Host header selects mode.

## Host map

| Host | Mode | Auth | Data |
|------|------|------|------|
| `demo.onpavilion.com` | Demo | Public browse. `/review` + code for staff/parent lanes | Shared Riverside sample |
| `commons-pto-demo.vercel.app` | Demo (legacy) | Same | Same |
| `{slug}.onpavilion.com` | Trial | Better Auth login | Org-scoped CRM + CMS |
| `*.commons-pto.org` | Trial (legacy) | Same | Same |
| `onpavilion.com` | Marketing | N/A | `commons-site` project |

## Code

- Host routing: `frontend/lib/crm/product-host.ts`
- Per-request surface: `frontend/lib/crm/product-surface-server.ts`
- Middleware injects `x-pavilion-surface: demo|trial|other`
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
NEXT_PUBLIC_PAVILION_DEMO_ORIGIN=https://demo.onpavilion.com
NEXT_PUBLIC_SITE_URL=https://demo.onpavilion.com
DEMO_JOIN_CODE=<one canonical code>
DEMO_JOIN_CODE_ALIASES=riverside-board,66988432952500a7587ff938
```

## DNS (ops)

| Record | Target | Project |
|--------|--------|---------|
| `demo.onpavilion.com` | Vercel `commons-pto-demo` | Product demo |
| `*.onpavilion.com` | Same Vercel project | Trial vanity hosts |
| `onpavilion.com` | `commons-site` | Marketing |

Run: `node scripts/setup-pavilion-domains.mjs --dry-run` then `--apply`.

Legacy `*.commons-pto.org` can stay until trials are migrated.

## Middleware behavior

- `demo.*` → demo guards (stub writes, review cookie for `/staff` and `/member-portal`)
- `{slug}.onpavilion.com` → login gate, host → org row, trial lock after 30 days
- Same ship target: `node scripts/ship-pavilion.mjs --target commons-pto-demo`
