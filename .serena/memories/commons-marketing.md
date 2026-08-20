Commons marketing site: Vercel **commons-site**, root `commons-site/`.

- URL: https://commons-site.vercel.app
- **SaaS billing: Auraflux Stripe** Checkout subscription ($399/mo). Script: `scripts/sales/stripe-commons-price.mjs` → `STRIPE_PRICE_ID`.
- Env: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `COMMONS_PROD_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`
- Webhook: `/api/webhooks/stripe`
- Table: commons-prod `commons_subscriptions` (stripe_* columns)
- **School Square stays for parent cards / in-person.** Never put Stone Hill Square on this project.
- Demo CTA: https://commons-pto-demo.vercel.app/review?code=riverside-board
- v1: sell + capture; Rob provisions tenants manually