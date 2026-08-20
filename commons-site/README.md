# Commons marketing site

Public marketing for the Commons PTO OS.

- List: **$399/mo** via **Auraflux Stripe** Checkout (subscription)
- School parent payments and in-person stay on **each school’s Square**
- Demo CTA: https://commons-pto-demo.vercel.app/review?code=riverside-board

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

Set `STRIPE_PRICE_ID` from the script on the Vercel project `commons-site`, plus:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `COMMONS_PROD_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`.

Webhook endpoint: `https://commons-site.vercel.app/api/webhooks/stripe`
Events: `checkout.session.completed`, `customer.subscription.*`

## Deploy

Vercel project **commons-site**, root directory `commons-site`, not git-connected.
Deploy from a clean worktree of the shipped SHA.
