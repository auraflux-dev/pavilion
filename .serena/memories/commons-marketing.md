Commons marketing site: Vercel project **commons-site**, root `commons-site/` in this repo (not git-connected).

- URL: https://commons-site.vercel.app (custom host later)
- List: $399/mo via **Auraflux Square** Subscriptions (Payment Link). Never Stone Hill / school Square.
- Env on commons-site only: `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT`, `SQUARE_COMMONS_PLAN_VARIATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_NOTIFICATION_URL`, `SQUARE_SELLER_LABEL=auraflux`, `COMMONS_PROD_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`
- Catalog setup: `node scripts/sales/square-commons-plan.mjs` (prints plan variation id)
- Leads table on commons-prod: `commons_subscriptions`
- Demo CTA: https://commons-pto-demo.vercel.app/review?code=riverside-board
- v1: sell + capture; Rob still provisions tenants manually
- Isolation: refuses SQUARE_SELLER_LABEL containing stone/shms; DB URL must look like commons-prod