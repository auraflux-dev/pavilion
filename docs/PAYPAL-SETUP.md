# PayPal setup. all SHMS PTO ecommerce

Use this when you want **PayPal (and optionally Venmo)** next to personal credit/debit card for:

- The Cove merchandise
- Paid membership (Reef / Lagoon / Tide)
- Student store-card reloads

Card payments already run **in-portal via Square**. Card + PayPal both run on the same in-portal checkout screens (membership, The Cove, store-card).

---

## 1. Create / confirm the PayPal Business app

1. Sign in at [https://developer.paypal.com/dashboard/](https://developer.paypal.com/dashboard/) with the PTO PayPal Business account.
2. Open **Apps & Credentials**.
3. Create an app (name e.g. `SHMS PTO Website`):
   - First create under **Sandbox** for testing.
   - Then create / copy credentials under **Live** for production.
4. Copy:
   - **Client ID**
 - **Secret** (Keep this private. only for server env, never in the browser.)

## 2. Enable products on the app

In the app settings, enable:

- **Checkout** (Orders v2 / PayPal buttons)
- Optional: **Venmo** if you want Venmo in the US wallet stack

Leave webhooks for later (order capture can be confirmed in the API response first).

## 3. Put credentials in Vercel (and local `.env.local`)

| Variable | Where | Notes |
|----------|--------|--------|
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Public | Sandbox Client ID locally; **Live** Client ID on Vercel Production |
| `PAYPAL_CLIENT_SECRET` | Server only | Matching secret for that Client ID |
| `PAYPAL_ENVIRONMENT` | Server | `sandbox` or `live` |

Never commit the secret. Paste them into Vercel → Project → Settings → Environment Variables (Production + Preview as needed), then redeploy.

Local:

```bash
# frontend/.env.local
NEXT_PUBLIC_PAYPAL_CLIENT_ID=sb_...   # sandbox first
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENVIRONMENT=sandbox
```

## 4. What to send me (the agent)

Once the sandbox app exists, paste **only**:

1. Sandbox **Client ID**
2. Sandbox **Secret** (or set them in Vercel/local yourself and say “PayPal env is set”)
3. Confirm: **all ecommerce** (Cove + membership + store-card). already the plan

I will wire PayPal Buttons on the same in-portal checkout modal as Square so free and paid parents can choose **Card** or **PayPal**.

## 5. Go-live checklist

1. Sandbox purchase test for Cove item, membership tier, and store-card reload.
2. Swap env to **Live** Client ID + Secret + `PAYPAL_ENVIRONMENT=live`.
3. Redeploy production.
4. One live $1-test or real small purchase, then refund in PayPal if needed.

## 6. Accounting note

Square and PayPal will both write to the site `Payments` CMS with a distinct `source` (`square_*` vs `paypal_*`) so staff/treasurer can reconcile.

---

**You do not need to change anything in Wix Payments for this path**. in-portal PayPal talks to PayPal’s API directly (same pattern as Square today).
