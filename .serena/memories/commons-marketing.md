Product brand: **Pavilion** (locked 20 Aug 2026).
Colors: ink + sea glass (`commons-site/app/globals.css`).
Legal seller: HSKRG LLC Stripe.
Target domain: **pavilionpto.com** (available ~$11.25/yr on Vercel; not purchased yet).

Marketing site: Vercel **commons-site**, root `commons-site/`.
- Live: https://commons-site.vercel.app (PRODUCT_NAME = Pavilion)
- SaaS: Stripe Checkout $399/mo + `/account`
- Env: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, add-on price IDs, `STRIPE_WEBHOOK_SECRET`, `COMMONS_PROD_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`; optional `RESEND_API_KEY`, `ACCOUNT_*`
- School Square stays for parent cards / in-person.
- Demo CTA: https://commons-pto-demo.vercel.app/review?code=riverside-board
- Brand constants: `commons-site/lib/brand.ts` (`PRODUCT_NAME`, `PRODUCT_DOMAIN`)
- Surfaces: `/`, `/product`, `/pricing`, `/start`, `/thanks`, `/account`, `/help`, `/partners`, `/gallery`, `/watch`
- Provisioning: `commons-sales-onboarding` (trial-first; no auto-provision on pay).
- Infra nicknames (commons-site, commons-prod, commons-pto) stay until a deliberate rename.