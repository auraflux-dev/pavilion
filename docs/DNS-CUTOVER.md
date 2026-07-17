# DNS cutover + post-DNS checklist

**Canonical site after cutover:** `https://www.shmspto.org`  
**Pre-DNS / staging (now):** `https://shmspto.vercel.app`  
**QA plan:** `docs/QA-TEST-PLAN.md`

Do DNS last — after page-by-page visitor QA on staging.

---

## Before you change DNS (finish these)

- [ ] Page-by-page public visitor QA on `https://shmspto.vercel.app`
- [ ] Logged-in QA (portal, membership, store card, spirit wear)
- [ ] Square webhook already at staging (done if you just updated it):  
      `https://shmspto.vercel.app/api/webhooks/square`  
      Event: `gift_card.activity.created`  
      Signature key matches Vercel `SQUARE_WEBHOOK_SIGNATURE_KEY`
- [ ] CheddarUp webhook = **backlog** (skip until after DNS or point at staging temporarily)
- [ ] Instagram = **backlog**

---

## A. DNS change (you)

In the DNS host for `shmspto.org` (currently Wix DNS):

| Type | Name | Value |
|------|------|--------|
| **A** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

In **Vercel → Project `frontend` → Settings → Domains**:

1. Confirm `www.shmspto.org` and `shmspto.org` are attached.
2. Complete any TXT verification Vercel shows.
3. Keep `www` as primary (apex → www redirect is in `vercel.json`).

**Ready when:** `dig www.shmspto.org` no longer shows `*.wixdns.net` and the site loads from Vercel.

Tell the agent **“DNS is live”** so the post-DNS updates below can be applied in one pass.

---

## B. Post-DNS updates — full list

Everything that still points at staging / old hosts must move to `https://www.shmspto.org`.

### B1. Vercel Production env → then redeploy

| Variable | Change to |
|----------|-----------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.shmspto.org` |
| `SQUARE_NOTIFICATION_URL` | `https://www.shmspto.org/api/webhooks/square` |

Also update local `frontend/.env.local` the same way (not committed).

Redeploy **frontend** after saving so OAuth callbacks, checkout returns, and Square signature hashing use www.

**Owner:** agent (or you in Vercel dashboard)

---

### B2. Square Developer Dashboard (you)

| Item | Value |
|------|--------|
| Webhook subscription URL | `https://www.shmspto.org/api/webhooks/square` |
| Event | `gift_card.activity.created` |
| Signature key | Keep existing **or** rotate and update Vercel `SQUARE_WEBHOOK_SIGNATURE_KEY` |

Must match `SQUARE_NOTIFICATION_URL` character-for-character (signature = HMAC of URL + body).

---

### B3. CheddarUp / Zapier (you — currently backlog)

| Item | Value |
|------|--------|
| Webhook POST URL | `https://www.shmspto.org/api/webhooks/cheddarup?token=<CHEDDARUP_WEBHOOK_SECRET>` |

Secret already lives in Vercel as `CHEDDARUP_WEBHOOK_SECRET`.

---

### B4. Wix OAuth app (you)

**Wix Dashboard → OAuth / Headless app (SHMS PTO Web)** — Allowed redirect URIs must include:

- `https://www.shmspto.org/auth/callback`
- `https://shmspto.org/auth/callback` (apex, if anyone hits it)
- Keep `https://shmspto.vercel.app/auth/callback` until www is confirmed stable

Code uses the **request host** for `redirect_uri` when possible (`frontend/lib/wix-oauth-client.ts`), with fallback to `NEXT_PUBLIC_SITE_URL`, then `shmspto.vercel.app`. After DNS, set the env so fallbacks are correct.

---

### B5. Wix CMS SiteSettings (agent or you)

| Key | Change to |
|-----|-----------|
| `membershipOrdersWebhookUrl` | `https://www.shmspto.org/api/webhooks/wix-orders?token=<WIX_ORDERS_WEBHOOK_SECRET>` |
| `spiritWearBaseUrl` | `https://www.shmspto.org/store/product-page` (or the live product-page root you settle on) |

Footer / social URLs (`socialFacebook`, etc.) already use absolute Meta URLs — no DNS change needed.

---

### B6. GitHub Actions (agent — code change + push)

File: `.github/workflows/sync-membership-orders.yml`

| Variable | Change to |
|----------|-----------|
| `SYNC_URL` | `https://www.shmspto.org/api/cron/sync-membership-orders` |

`CRON_SECRET` GitHub secret stays as-is.

---

### B7. Code fallbacks (agent — optional cleanup after env is set)

These hardcode staging as a **fallback** when env is missing. They keep working if `NEXT_PUBLIC_SITE_URL` is set correctly; update fallbacks later so a missing env doesn’t send people to staging:

| File | Fallback today |
|------|----------------|
| `frontend/lib/wix-oauth-client.ts` | `https://shmspto.vercel.app/auth/callback` |
| `frontend/lib/wix-ecom-checkout.ts` | checkout return URLs → `shmspto.vercel.app` |
| `frontend/lib/surveys/parse.ts` | survey share base → `shmspto.vercel.app` |
| `scripts/smoke-production.mjs` | default smoke base → `shmspto.vercel.app` |
| `frontend/.env.example` | documents staging URLs |

**No code change is required for cutover day** if Vercel env is updated and redeployed. Fallbacks are a follow-up cleanup.

---

### B8. Docs / board Drive docs (agent — after cutover)

- `docs/QA-TEST-PLAN.md` — switch base URL to www  
- `scripts/create-pto-docs.js` staging mentions → www (re-run Drive sync)  
- Keep `shmspto.vercel.app` listed as staging alias only

---

### B9. Optional cleanup

- Soft-land classic Wix site (no longer serving `www`)
- Confirm Vercel domain TLS is green for www + apex
- Keep `shmspto.vercel.app` as a staging alias for emergency / smoke tests

---

## C. Quick reference — final production URLs

| Service | Production URL |
|---------|----------------|
| Site | `https://www.shmspto.org` |
| OAuth callback | `https://www.shmspto.org/auth/callback` |
| Square webhook | `https://www.shmspto.org/api/webhooks/square` |
| CheddarUp webhook | `https://www.shmspto.org/api/webhooks/cheddarup?token=<CHEDDARUP_WEBHOOK_SECRET>` |
| Wix orders webhook | `https://www.shmspto.org/api/webhooks/wix-orders?token=<WIX_ORDERS_WEBHOOK_SECRET>` |
| Membership sync cron | `https://www.shmspto.org/api/cron/sync-membership-orders` |

---

## D. Who does what (cheat sheet)

| # | Task | Who |
|---|------|-----|
| 1 | Flip DNS A/CNAME | **You** |
| 2 | Vercel: `NEXT_PUBLIC_SITE_URL` + `SQUARE_NOTIFICATION_URL` + redeploy | Agent (or you) |
| 3 | Square webhook URL → www | **You** |
| 4 | Wix OAuth redirect URIs → www | **You** |
| 5 | CMS: `membershipOrdersWebhookUrl`, `spiritWearBaseUrl` | Agent (or you) |
| 6 | GHA `SYNC_URL` → www | Agent |
| 7 | CheddarUp webhook → www | **You** (backlog OK) |
| 8 | Code fallback cleanup | Agent (later) |
| 9 | Re-run QA on www | **You** + agent smoke |

---

## E. Post-DNS QA (required)

Re-run against **https://www.shmspto.org**:

- [ ] Home + all nav pages load
- [ ] Log in / Sign up → callback on www
- [ ] Member portal
- [ ] Membership Join → checkout → return to www
- [ ] Store card load / card-on-file
- [ ] Spirit wear Buy
- [ ] Contact + newsletter
- [ ] Square webhook still verifies (auto top-off path if testing)
- [ ] CheddarUp test payment (when not backlog)
- [ ] GHA membership sync still OK (`workflow_dispatch` once)

---

## F. Staging vs production (current)

| Item | Staging now | After DNS |
|------|-------------|-----------|
| Public site | `shmspto.vercel.app` | `www.shmspto.org` |
| Square webhook | `…/api/webhooks/square` on staging | same path on www |
| GHA sync | staging cron URL | www cron URL |
| OAuth | staging callback | www callback (+ keep staging temporarily) |
| CheddarUp | backlog | www when ready |
| Instagram | backlog | — |
