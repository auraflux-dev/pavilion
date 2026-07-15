# DNS cutover + post-DNS checklist

**Canonical site after cutover:** `https://www.shmspto.org`  
**Pre-DNS site (now):** `https://frontend-six-rho-48.vercel.app`  
**QA plan:** `docs/QA-TEST-PLAN.md`

Do DNS last — after pre-DNS QA and remaining ops below.

---

## Before you change DNS (finish these)

- [ ] Logged-in QA on Vercel URL (portal, Join membership, Load store card, Buy spirit, claim payment)
- [ ] Cheddarup webhook pointed at Vercel (temporary):  
      `https://frontend-six-rho-48.vercel.app/api/webhooks/cheddarup?token=<CHEDDARUP_WEBHOOK_SECRET>`
- [ ] Square webhook subscription URL matches current notification URL:  
      `https://frontend-six-rho-48.vercel.app/api/webhooks/square`  
      Event: `gift_card.activity.created`
- [ ] Confirm Square is **Production** (`SQUARE_ENVIRONMENT=production` already set)

---

## A. DNS change (you)

In the DNS host for `shmspto.org` (currently Wix DNS):

| Type | Name | Value |
|------|------|--------|
| **A** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

In **Vercel → Project `frontend` → Settings → Domains**:

1. Add `www.shmspto.org` and `shmspto.org`
2. Complete any TXT verification Vercel shows
3. Prefer `www` as primary (apex → www redirect already in `vercel.json`)

**Ready when:** `dig www.shmspto.org` no longer shows `*.wixdns.net` and the site loads from Vercel.

Tell the agent “DNS is live” so post-DNS updates can be applied.

---

## B. Post-DNS updates (agent or you)

### B1. Vercel Production env — then redeploy

```
NEXT_PUBLIC_SITE_URL=https://www.shmspto.org
SQUARE_NOTIFICATION_URL=https://www.shmspto.org/api/webhooks/square
```

Redeploy **frontend** after saving.

### B2. Square Developer Console

- Edit webhook subscription notification URL →  
  `https://www.shmspto.org/api/webhooks/square`  
- Keep the same signature key (or set a new one in Vercel if you rotate it)  
- Event still: `gift_card.activity.created`

### B3. Cheddarup

- Webhook URL →  
  `https://www.shmspto.org/api/webhooks/cheddarup?token=<CHEDDARUP_WEBHOOK_SECRET>`  
  (secret already in Vercel as `CHEDDARUP_WEBHOOK_SECRET`)

### B4. Wix

**OAuth app (SHMS PTO Web)** — ensure redirects include:

- `https://www.shmspto.org/auth/callback`
- `https://shmspto.org/auth/callback`
- (keep Vercel callback until www is confirmed)

**CMS SiteSettings** — update `membershipOrdersWebhookUrl` to:

```
https://www.shmspto.org/api/webhooks/wix-orders?token=<WIX_ORDERS_WEBHOOK_SECRET>
```

### B5. GitHub Actions

Update `.github/workflows/sync-membership-orders.yml` `SYNC_URL` to:

```
https://www.shmspto.org/api/cron/sync-membership-orders
```

(`CRON_SECRET` GitHub secret already set.)

### B6. Optional cleanup

- Soft-land old classic Wix site (no longer serving `www`)
- Delete demo Wix Events in Wix Dashboard (API already filters them)
- After DNS stable, drop temporary Vercel URL from mental “primary” docs

---

## C. Post-DNS QA (required)

Re-run `docs/QA-TEST-PLAN.md` against **https://www.shmspto.org**:

- [ ] Home + all nav pages load
- [ ] Log in / Sign up → callback on www
- [ ] Member portal
- [ ] Membership Join → checkout → return to www
- [ ] Store card load → checkout return
- [ ] Spirit wear Buy
- [ ] Contact + newsletter
- [ ] Square webhook signature still valid (load/redeem path if possible)
- [ ] Cheddarup test payment creates Payments row (if testing)
- [ ] Cron / GH Actions sync still OK

---

## Quick reference — final webhook URLs

| Service | Production URL |
|---------|----------------|
| Site | `https://www.shmspto.org` |
| Square | `https://www.shmspto.org/api/webhooks/square` |
| Cheddarup | `https://www.shmspto.org/api/webhooks/cheddarup?token=<CHEDDARUP_WEBHOOK_SECRET>` |
| Wix order sync | `https://www.shmspto.org/api/webhooks/wix-orders?token=<WIX_ORDERS_WEBHOOK_SECRET>` |
| Membership order poll | `https://www.shmspto.org/api/cron/sync-membership-orders` |
