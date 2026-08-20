Commons marketing site: Vercel **commons-site**, root `commons-site/`.

- URL: https://commons-site.vercel.app
- **Seller:** HSKRG LLC Stripe (not Auraflux branding on Checkout/invoices). Payouts to HSKRG Stripe.
- SaaS: Stripe Checkout $399/mo + `/account` (magic link, Customer Portal, add-ons).
- Env: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, add-on price IDs, `STRIPE_WEBHOOK_SECRET`, `COMMONS_PROD_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`; optional `RESEND_API_KEY`, `ACCOUNT_*`
- Webhook: `/api/webhooks/stripe` → commons-prod `commons_subscriptions` + `commons_account_tokens`
- School Square stays for parent cards / in-person.
- Demo CTA: https://commons-pto-demo.vercel.app/review?code=riverside-board
- **Brand (working):** `lib/brand.ts` `PRODUCT_NAME` (still Commons) + ink/sea tokens in `globals.css`. Name/color lock via brand strategy canvas. Legal always HSKRG LLC.
- **Surfaces:** `/`, `/product`, `/pricing`, `/start`, `/thanks`, `/account`, `/help`, `/partners`, `/gallery`, `/watch`
- Provisioning: see memory `commons-sales-onboarding` (trial-first; no auto-provision on pay).