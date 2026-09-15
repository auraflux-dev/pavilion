# Brand Staff SEO + Brand Strategy (Pavilion port)

Audience: product

Ported from `auraflux-co/businessrocket` into `auraflux-dev/pavilion`. Staff shell is `/staff?view=…` (Brand / Platform Staff). Dedicated URLs redirect into that shell.

## Paths

| URL | View |
|-----|------|
| `/staff/seo` | `/staff?view=seo` |
| `/staff/brand` | `/staff?view=strategy` (not Client Staff visual brand) |
| `/staff/diagnostics` | `/staff?view=diagnostics` |
| `/seo-connect?token=` | Invite GSC OAuth (no staff cookie) |

Social and Ads nav items are **Coming soon**.

## What was adapted from BR vs new

### Adapted (trimmed)

- `web/lib/seo/site-audit.ts` → `frontend/lib/staff/seo/site-audit.ts` (same crawler, Pavilion UA)
- Google-direct OAuth + GSC pull (`google-direct.ts`, oauth start/callback, invite HMAC)
- Neon JSON stores → `pavilion_seo_*` / `pavilion_brand_*`
- Brand generate / approve / active / export APIs
- Diagnostics env probes
- Invite connect landing (`/seo-connect`)

### New (Pavilion shell)

- Brand Staff views in `platform-workspaces.ts`, BR/AF fleet groups, `staff-platform-console.tsx`
- `requireBrandStaff` on existing `getStaffSession` + `isPlatformOwnerEmail` (did not replace staff auth)
- Content seeds → unpublished marketing blog drafts (`content-bridge.ts`)
- Panels: `staff-seo-panel.tsx`, `staff-brand-strategy-panel.tsx`

### Omitted

- Composio (`integrations/composio.ts`)
- DataForSEO / paid-poll / cron `paid-serp-pull`
- Full 9 SEO subpages (collapsed into one SEO panel)
- Public brand-strategy lead magnet / `brand_leads`
- Writing `brand-guidelines.md` to ephemeral disk. Export is `GET /api/staff/brand/{kitId}/export`

## Auth

Existing Pavilion staff session. APIs require admin + platform owner (demo admins allowed, same as fleet health).

## Env

| Var | Why |
|-----|-----|
| `DATABASE_URL` | Neon tables (already on commons-pto-demo) |
| `SEO_GOOGLE_CLIENT_ID` / `SEO_GOOGLE_CLIENT_SECRET` | GSC OAuth. Falls back to `GOOGLE_CLIENT_*` / `GOOGLE_OAUTH_CLIENT_*` / `GMAIL_CLIENT_*` |
| `SEO_GOOGLE_REDIRECT_URI` | Optional. Default `{origin}/api/staff/seo/oauth/google/callback` |
| `ACCOUNT_SESSION_SECRET` | Token encrypt + invite HMAC |
| `OPENAI_API_KEY` | Brand generator. Placeholder kits save without it. |
| `PAGESPEED_API_KEY` | Optional. Not wired in v1 UI. |
| `CRON_SECRET` | Reserved. No SEO cron in this phase. |

Google Cloud OAuth client must allow the callback on demo and onpavilion.com.

## Phase 2 Social

BR Social uses direct Meta Graph (Composio off). Port later into `/staff?view=social-growth`. PTO Facebook groups need board approval. Do not copy Composio.

## Client Staff visual brand

`/staff?view=brand` remains logo/colors (`StaffSiteBrandPanel`). Strategy kits live at `/staff?view=strategy`.
