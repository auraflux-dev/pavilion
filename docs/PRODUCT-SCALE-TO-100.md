# Scale to ~100 customers

**Audience: product**

Snapshot for agents. Goal: shared Pavilion SKU for many schools, with SHMS remaining VIP dedicated until cutover is optional.

## What already scales

| Piece | Notes |
|-------|--------|
| Host → tenant | `{slug}.onpavilion.com`, trial lock |
| Org-scoped CRM / CMS | Postgres + RLS via `app.org_id` |
| Brand packs | Trial skins (expand toward CMS brand) |
| Platform owner org switcher | `@onpavilion.com` serves clients |
| Commerce gate | Live parent money needs Square on org |
| Weekly VIP intake | `scripts/shms-weekly-intake.mjs` (accept/deny) |

## Redundancy / debt

| Debt | Impact |
|------|--------|
| Commons vs Pavilion naming | Dual env, `/api/commons/*`, agent confusion |
| Dual CMS (Wix + Postgres) | Shared SKU cannot stay Wix-shaped forever |
| Dual auth (Wix members vs Better Auth) | Portable identity missing for shared customers |
| Dual connector stores | Org vault vs Wix `Staff*Tokens` on VIP |
| Broad promote | Does not scale to many dedicated customers |
| Capability packs not wired (P8) | Hard to sell Lite vs Full without forks |

## Blockers for ~100 shared customers

1. Wire capability packs into UI/API (P8).
2. One connector vault (Square, Plaid, Google, Canva) for shared SKUs.
3. Pavilion CMS breadth beyond page/nav (forms, rosters, ops data).
4. Portable member/staff identity for shared SKUs.
5. Selective promote allowlists for VIP only (not 100 dedicated trees).

## Buyer model (do not regress)

- SaaS buyers → **Staff** (no Pavilion-customer member portal).
- School parents → **family login** on school brand.
- See `docs/PAVILION-BUYER-VS-SCHOOL-SURFACES.md`.

## Near-term path

Finish CMS breadth → wire packs → single connector vault → keep SHMS VIP → retire commons naming when DNS/env settle.
