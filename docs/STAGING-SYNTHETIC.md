# Synthetic staging (no real PII / financial data)

Stone Hill **staging** is https://shmspto.vercel.app. It must not read live Wix roster, payments, or parent mail.

## How it works

When `STAGING_SYNTHETIC_DATA=true` **or** `VERCEL_ENV=preview` (and not production www):

- Middleware returns **fixture** JSON for staff roster, payments, budget, portal family, newsletter outreach counts, etc.
- **Writes blocked**: charges, emails, CMS saves, Plaid, newsletter sends
- **Checkout quote** returns sample amounts; **pay** returns 403
- `getWixClient()` throws — no live CMS queries

Fixtures live in `frontend/lib/fixtures/` (cart, checkout, Riverside-shaped roster).

Production **www.shmspto.org** (`VERCEL_ENV=production`) is unchanged.

## Vercel Preview env (do once)

On Vercel project `frontend` → Settings → Environment Variables → **Preview** only:

| Variable | Value |
|----------|--------|
| `STAGING_SYNTHETIC_DATA` | `true` |
| `WIX_API_KEY` | *(remove or leave empty on Preview)* |
| `WIX_SITE_ID` | *(remove or leave empty on Preview)* |

Keep full Wix keys on **Production** only.

Redeploy staging after changing Preview env.

## Local dev

```bash
cp frontend/.env.development.example frontend/.env.development
```

Do not put prod `WIX_API_KEY` in `.env.development`. Prod secrets: `~/.shmspto/prod.env` via `./scripts/with-prod-env.sh`.

## Agents

Import fixtures from `@/lib/fixtures` for cart/checkout work. Never query live Students/Memberships/Payments in agent sessions.
