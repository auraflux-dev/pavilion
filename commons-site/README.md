# Pavilion marketing site (Vercel project: commons-site)

Public marketing for **Pavilion**, the PTO OS. Legal seller: **HSKRG LLC**.
Domain: **https://onpavilion.com** (also commons-site.vercel.app). Colors: ink + sea glass.

- List: **$399/mo** via **Pavilion Stripe account (HSKRG LLC)** Checkout
- School parent payments and in-person stay on **each school’s Square**
- Never put Stone Hill / SHMS Wix, Square, or `DATABASE_URL` on this project
- `/account` magic-link + Stripe Customer Portal; `/help`, `/partners`, `/gallery`, `/watch`
- Demo CTA: https://demo.onpavilion.com (public browse; `/review` for staff/member tour)
- Brand: `lib/brand.ts` (`PRODUCT_NAME`, `PRODUCT_DOMAIN`)

## Local

```bash
cd commons-site
cp .env.example .env.local
npm run dev
```

## Stripe price (one-time)

```bash
cd commons-site
STRIPE_SECRET_KEY=… node ../scripts/sales/stripe-commons-price.mjs
```

Use the **Pavilion** Stripe secret (HSKRG LLC), not Auraflux studio and not SHMS.

Set on Vercel project `commons-site`:
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `COMMONS_PROD_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL=https://onpavilion.com`.
Optional: `STRIPE_PRICE_STORE_ID`, `STRIPE_PRICE_CREATIVE_ID`, `RESEND_API_KEY`, `ACCOUNT_FROM_EMAIL`, `ACCOUNT_SESSION_SECRET`, `ACCOUNT_DEV_LINKS=1`.

Enable Stripe Customer Portal in the Pavilion Stripe Dashboard.

Webhook endpoint: `https://onpavilion.com/api/webhooks/stripe`
Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`.

### Tax (Stripe Tax)
1. Dashboard → Tax → set head office address (settings must leave `pending`).
2. Add registrations where you must collect (US states, etc.).
3. Product uses tax code `txcd_10103001` (SaaS business use). Confirm with your tax advisor.
4. Only then set `STRIPE_AUTOMATIC_TAX=1` on Vercel.

Until step 4, Checkout still collects billing address + tax IDs but does not auto-calculate tax.

## Deploy

Vercel project **commons-site**, root directory `commons-site`, not git-connected.
Deploy from a clean worktree of the shipped SHA.
