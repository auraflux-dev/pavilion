Product brand: **Pavilion** (locked).
Colors: ink + sea glass.
Legal seller: **HSKRG LLC** (Pavilion Stripe account). Not Auraflux studio branding. Not SHMS.
Marketing domain: **https://onpavilion.com** (www → apex). Also commons-site.vercel.app.
`NEXT_PUBLIC_SITE_URL=https://onpavilion.com`.

Marketing site: Vercel **commons-site**, root `commons-site/`.
- SaaS: Stripe Checkout $399/mo + `/account` (magic link, Customer Portal, add-ons)
- Env (Pavilion Stripe only): `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `COMMONS_PROD_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`; optional add-on prices + `RESEND_API_KEY` / `ACCOUNT_*`
- Webhook: `https://onpavilion.com/api/webhooks/stripe`
- School Square stays for parent cards / in-person
- Demo: https://commons-pto-demo.vercel.app/review?code=riverside-board
- Surfaces: `/`, `/product`, `/pricing`, `/start`, `/thanks`, `/account`, `/help`, `/partners`, `/gallery`, `/watch`
- Partners data: `content/partners.json`
- Help: `lib/help-articles.ts` (+ `content/help/` notes)
- Price script: `scripts/sales/stripe-commons-price.mjs` (Pavilion product on HSKRG Stripe)
- Never put Stone Hill DATABASE_URL / Wix / school Square on commons-site
- Provisioning: `commons-sales-onboarding` (trial-first; no auto-provision on pay)