# Litecard setup — SHMS Cove Digital Card (Square GAN → Apple/Google Wallet)

Litecard issues native Wallet passes and holds Apple/Google signing for you.
Our app creates/updates passes with **barcode = Square gift card GAN** so Square
Stand / iPad at Cove and events can scan phones like plastic gift cards.

## 1. Open an account

Email **contact@litecard.com** (US) or **hello@litecard.com.au**:

> Subject: API access — Stone Hill Middle School PTO (SHMS) / Square gift cards
>
> We run Cove snack + school store on Square Gift Cards (GANs already issued).
> We need Litecard API access to issue Apple/Google Wallet passes whose QR
> barcode is the raw Square GAN digits (no URL prefix), plus a Balance field
> we update via API when Square `gift_card.activity.created` fires.
>
> Org: Stone Hill Middle School PTO (501c3) · Ashburn, VA · shmspto.org
> Contact: treasurer@shmspto.org
>
> Please send: API username/password, business/template IDs, and a gift-card
> style template (QR barcode + Balance + Card number). Happy to invite
> hello@litecard.com.au to our Square Developer app if you prefer managed setup.

Also book: https://litecard.com/contact/

## 2. Template fields (match our env keys)

In Litecard Template Builder, create a **Gift Card / Generic** pass:

| Pass UI | Suggested data field label | Our env / payload key |
| --- | --- | --- |
| QR barcode value | Barcode Value | `LITECARD_FIELD_BARCODE=barcodevalue` → Square GAN |
| Balance | Balance | `LITECARD_FIELD_BALANCE=balance` → `$12.34` |
| Card number | Card Number | `LITECARD_FIELD_CARD_NUMBER=cardnumber` → `•••• 2345` |

Barcode type: **QR**. Message must be **digits only** (the GAN).

Colors: green `#085508`, gold accents; logo text “SHMS Cove”.

## 3. Vercel env (Production)

```
LITECARD_USERNAME=...
LITECARD_PASSWORD=...
LITECARD_TEMPLATE_ID=...
# Optional master/sub:
# LITECARD_BUSINESS_ID=...
```

Redeploy after setting. Portal → Cove Digital Card → **Wallet** opens Litecard’s
Add to Apple / Google page. Photos QR still works without Litecard.

## 4. CMS fields (Memberships)

Upserted automatically when a pass is created:

- `litecardCardId`
- `litecardDownloadId`
- `litecardGan`

Add these in Wix CMS → Memberships if upserts fail on first create.

## 5. Balance sync

Square webhook `/api/webhooks/square` already handles `gift_card.activity.created`.
When Litecard is configured it PATCHes the pass balance after every activity.

## 6. Smoke test

1. Parent with loaded Cove Digital Card → Member portal → Wallet.
2. Confirm Welcome URL opens Add to Apple / Google.
3. Scan Wallet QR on Square Stand gift-card flow → same GAN / balance.
4. Redeem $1 at Stand → pass balance updates (may take a push cycle).
