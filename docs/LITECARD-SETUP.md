# Litecard setup. SHMS Cove Digital Card (Square GAN → Apple/Google Wallet)

Litecard issues native Wallet passes and holds Apple/Google signing for you.
Our app creates/updates passes with **barcode = Square gift card GAN** so Square
Stand / iPad at Cove and events can scan phones like plastic gift cards.

## 1. Open an account

Email **contact@litecard.com** (US) or **hello@litecard.com.au**:

> Subject: API access. Stone Hill Middle School PTO (SHMS) / Square gift cards
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

## 3. Sandbox (Jul 2026) vs Production

| | Demo / sandbox | Production |
| --- | --- | --- |
| Dashboard | https://demo.litecard.io/ | https://litecard.io/ |
| API | `https://bff-api.demo.litecard.io` | `https://bff-api.enterprise.litecard.io` |
| Welcome page | `https://main.demo.litecard.io/welcome?id=` | `https://litecard.io/welcome?id=` (or app.litecard.io) |
| Token TTL | 24h (`expires_in: 86400`) | same pattern |

**SHMS demo account (from Litecard):** `shms@demo-litecard.com` + password they emailed.
**Business id:** `-cr40RA4VkzBFN6GXuwcJ` → set as `LITECARD_BUSINESS_ID`.

### Cove template fields (sandbox)

Their sample payload used `templateId: roo5JkXsvf2Cx-0IsVFY1` / `XXXid`. That template is **not** on our business (403). Our active template is **The Cove Wallet Pass**.

| Pass field | API key | Notes |
| --- | --- | --- |
| QR barcode | `cardNumber` | Template `barcode.fieldMap` must be `cardNumber`. Stock template originally used `${CUSTOM}` **without** fieldMap → `FIELDMAP_MISSING`. **Danny (Aug 4):** updated **The Cove Wallet Pass** (`fpmJ2qvrsZRY6kOubNxA2`) so `barcode.fieldMap = cardNumber`. Working clone also remains: `rr1N2P6DZoXOVAHfnZkdq` (**The Cove Wallet Pass GAN**). |
| Balance | `pointsKey` | **Integer cents** (e.g. `$12.50` → `1250`), not `"$12.50"`. |
| Notifications | `notificationKey` | Optional string |

Working create body:

```json
{
  "templateId": "rr1N2P6DZoXOVAHfnZkdq",
  "externalId": "<Square GAN digits>",
  "cardPayload": {
    "firstName": "SHMS",
    "lastName": "CoveQA",
    "email": "parent@example.com",
    "cardNumber": "<Square GAN digits>",
    "pointsKey": 1250,
    "notificationKey": "Cove Digital Card"
  },
  "options": { "emailInvitationEnabled": false, "fastCreate": true }
}
```

Welcome URL: `https://main.demo.litecard.io/welcome?id=<downloadId>`.

Signup form (manual UX): https://demo.litecard.io/form/custom/MIB_fiLuoE0Ak9MlneLba

## 4. Vercel env

**Preview / sandbox test**

```
LITECARD_USERNAME=shms@demo-litecard.com
LITECARD_PASSWORD=...
LITECARD_TEMPLATE_ID=rr1N2P6DZoXOVAHfnZkdq
LITECARD_BASE_URL=https://bff-api.demo.litecard.io
LITECARD_WELCOME_BASE=https://main.demo.litecard.io/welcome?id=
LITECARD_BUSINESS_ID=-cr40RA4VkzBFN6GXuwcJ
LITECARD_FIELD_BARCODE=cardNumber
LITECARD_FIELD_CARD_NUMBER=cardNumber
LITECARD_FIELD_BALANCE=pointsKey
LITECARD_BALANCE_FORMAT=cents
```

**Production** (after Litecard live credentials + fixed template):

```
LITECARD_USERNAME=...
LITECARD_PASSWORD=...
LITECARD_TEMPLATE_ID=...
# Optional master/sub:
# LITECARD_BUSINESS_ID=...
```

Redeploy after setting. Portal → Cove Digital Card → **Wallet** opens Litecard’s
Add to Apple / Google page. Photos QR still works without Litecard.

## 5. CMS fields (Memberships)

Upserted automatically when a pass is created:

- `litecardCardId`
- `litecardDownloadId`
- `litecardGan`

Add these in Wix CMS → Memberships if upserts fail on first create.

## 6. Balance sync

Square webhook `/api/webhooks/square` already handles `gift_card.activity.created`.
When Litecard is configured it PATCHes the pass balance after every activity.

## 7. Smoke test

1. Parent with loaded Cove Digital Card → Member portal → Wallet.
2. Confirm Welcome URL opens Add to Apple / Google.
3. Scan Wallet QR on Square Stand gift-card flow → same GAN / balance.
4. Redeem $1 at Stand → pass balance updates (may take a push cycle).
