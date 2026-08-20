# Commons marketing site

Public marketing for the Commons PTO OS.

- List: **$399/mo** via **HSKRG LLC Stripe** Checkout (subscription)
- School parent payments and in-person stay on **each school’s Square**
- `/account` magic-link + Stripe Customer Portal; `/help`, `/partners`, `/gallery`, `/watch`
- Demo CTA: https://commons-pto-demo.vercel.app/review?code=riverside-board
- Brand shell: `lib/brand.ts` (`PRODUCT_NAME`). Colors in `app/globals.css`. Strategy canvas for name/color lock.

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

Set on Vercel project `commons-site`:
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `COMMONS_PROD_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`.
Optional: `STRIPE_PRICE_STORE_ID`, `STRIPE_PRICE_CREATIVE_ID`, `RESEND_API_KEY`, `ACCOUNT_FROM_EMAIL`, `ACCOUNT_SESSION_SECRET`, `ACCOUNT_DEV_LINKS=1`.

Enable Stripe Customer Portal in the HSKRG Stripe Dashboard (Settings → Billing → Customer portal).

Webhook endpoint: `https://commons-site.vercel.app/api/webhooks/stripe`
Events: `checkout.session.completed`, `customer.subscription.*`


## Deploy

Vercel project **commons-site**, root directory `commons-site`, not git-connected.
Deploy from a clean worktree of the shipped SHA.
