# DNS cutover + post-DNS checklist

Do this **only after** pre-DNS QA is green (see `docs/QA-TEST-PLAN.md`).

## 1. DNS records (point domain at Vercel)

In the DNS host that currently serves `shmspto.org` (today: Wix DNS):

| Type | Name | Value | Notes |
|------|------|-------|-------|
| **A** | `@` (apex) | `76.76.21.21` | Vercel apex |
| **CNAME** | `www` | `cname.vercel-dns.com` | Vercel www |

In Vercel → Project **frontend** → Settings → Domains:
1. Add `www.shmspto.org` and `shmspto.org`
2. Follow any verification TXT prompts Vercel shows
3. Prefer **www** as primary; keep apex → www redirect (already in `vercel.json`)

Wait until `dig www.shmspto.org` shows Vercel (not `*.wixdns.net`).

## 2. Post-DNS env + redeploy

Set/update in Vercel **Production**:

```
NEXT_PUBLIC_SITE_URL=https://www.shmspto.org
SQUARE_NOTIFICATION_URL=https://www.shmspto.org/api/webhooks/square
```

Optional once product routes exist on the custom domain:

```
NEXT_PUBLIC_STORE_BASE_URL=https://www.shmspto.org
```

Redeploy the frontend after env changes.

## 3. Update external webhook URLs

| Service | URL |
|---------|-----|
| Cheddarup | `https://www.shmspto.org/api/webhooks/cheddarup?token=<CHEDDARUP_WEBHOOK_SECRET>` |
| Square | `https://www.shmspto.org/api/webhooks/square` (signature key must match) |
| Wix SiteSettings `membershipOrdersWebhookUrl` | `https://www.shmspto.org/api/webhooks/wix-orders?token=<WIX_ORDERS_WEBHOOK_SECRET>` |
| GitHub Actions sync URL | Update workflow `SYNC_URL` to www host if still hard-coded to `frontend-six-rho-48…` |

Until DNS cuts over, Cheddarup can temporarily point at:

`https://frontend-six-rho-48.vercel.app/api/webhooks/cheddarup?token=<CHEDDARUP_WEBHOOK_SECRET>`

## 4. OAuth redirects

In Wix OAuth app **SHMS PTO Web**, ensure allowed redirects include:

- `https://www.shmspto.org/auth/callback`
- `https://shmspto.org/auth/callback`
- (keep Vercel URL until cutover is verified)

## 5. Post-DNS QA

Re-run `docs/QA-TEST-PLAN.md` Phases 1–5 against **https://www.shmspto.org**, including:

- Login / callback
- Membership / store-card / spirit checkout return URLs
- Contact + newsletter
- Member portal
- Webhook smoke tests on www URLs
