# SHMS PTO — Full-Site QA Test Plan

**Site:** Stone Hill Middle School PTO  
**Pre-DNS base URL:** https://shmspto.vercel.app
**Production (post-DNS):** https://www.shmspto.org  

**DNS is last.** Do not cut over DNS until Phases 0–6 are green. See [`docs/DNS-CUTOVER.md`](./DNS-CUTOVER.md).

Mark each **Result** cell: `[x]` pass · `[ ]` fail / not run · `[!]` blocked · `[~]` N/A / waived  

---

## Phase 0 — Preconditions

Confirm environment and secrets before functional testing.

| # | Check | How | Result |
|---|-------|-----|--------|
| 0.1 | Vercel production deploy is healthy | Open base URL; no 5xx on home | `[x]` |
| 0.2 | `NEXT_PUBLIC_SITE_URL` points at Vercel URL (pre-DNS) | Vercel → Project → Environment Variables | `[x]` |
| 0.3 | Wix API env present (`WIX_API_KEY`, `WIX_SITE_ID`, OAuth client) | Vercel env / deploy logs | `[x]` |
| 0.4 | Contact + newsletter APIs wired (not mocks) | `POST /api/contact`, `POST /api/newsletter` | `[ ]` |
| 0.5 | Headless checkout route deployed | `POST /api/checkout/start` exists | `[x]` |
| 0.6 | Square production vars present | Credentials exist; signed-in payment E2E still required (see D5) | `[x]` |
| 0.7 | Cheddarup webhook secret + URL prep | Can point at Vercel URL pre-DNS (see D6) | `[ ]` |
| 0.8 | `CRON_SECRET` set in Vercel + GitHub Actions | Membership sync cron | `[x]` |
| 0.9 | `WIX_ORDERS_WEBHOOK_SECRET` set | Protects `/api/webhooks/wix-orders` | `[x]` |
| 0.10 | Test accounts available | Free member + paid Ruby/Supreme if needed | `[ ]` |

---

## Phase 1 — Global chrome (navbar / footer)

Test on desktop and mobile (hamburger). Base: `https://shmspto.vercel.app`

| # | Check | How | Result |
|---|-------|-----|--------|
| 1.1 | Logo / brand link → `/` | Click logo | `[ ]` |
| 1.2 | Nav: Programs → `/programs` | Click | `[ ]` |
| 1.3 | Nav: Events → `/events` | Click | `[ ]` |
| 1.4 | Nav: Fundraising → `/fundraising` | Click | `[ ]` |
| 1.5 | Nav: Store → `/store` | Click | `[ ]` |
| 1.6 | Nav: Spirit Wear → `/spirit-wear` | Click | `[ ]` |
| 1.7 | Nav: Volunteer → `/volunteer` | Click | `[ ]` |
| 1.8 | Nav: Membership → `/membership` | Click | `[ ]` |
| 1.9 | Nav: Board → `/board` | Click | `[ ]` |
| 1.10 | Logged-out: **Log in** / **Sign up** visible after hydrate | Wait for client auth | `[ ]` |
| 1.11 | Log in → `/auth/login` (returnTo portal when from portal CTA) | Click | `[ ]` |
| 1.12 | Member Portal entry visible / routes correctly | → `/member-portal` or login | `[ ]` |
| 1.13 | Mobile menu opens/closes; links work | Viewport &lt; md | `[ ]` |
| 1.14 | Footer address: `23415 Evergreen Ridge Drive` | Visual | `[ ]` |
| 1.15 | Footer maps link opens Google Maps for that address | Click | `[ ]` |
| 1.16 | Footer newsletter submit hits `POST /api/newsletter` | DevTools Network | `[ ]` |
| 1.17 | Footer social links open (when configured) | Click each | `[ ]` |
| 1.18 | Footer site links match public pages | Spot-check | `[ ]` |
| 1.19 | No console 5xx on chrome-only navigation | Console / Network | `[ ]` |

---

## Phase 2 — Public pages

For each route: load (HTTP 200), layout intact, primary CTAs work, no broken images.

### 2.1 Home `/`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.1.1 | Home loads 200 | `GET /` | `[ ]` |
| 2.1.2 | Hero Join CTA → `/membership` | Click | `[ ]` |
| 2.1.3 | Programs preview → `/programs` | Click | `[ ]` |
| 2.1.4 | Upcoming events: **View Details** → `/events` (not 404 product URLs) | Click | `[ ]` |
| 2.1.5 | Demo / test Wix events not shown (or filtered) | Visual + API | `[ ]` |
| 2.1.6 | Volunteer section CTA → `/volunteer` | Click | `[ ]` |

### 2.2 Programs `/programs`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.2.1 | Page loads 200 | `GET /programs` | `[ ]` |
| 2.2.2 | Program cards render (live or empty state OK) | Visual | `[ ]` |
| 2.2.3 | Registration / contact CTAs valid (mailto or Cheddarup) | Click | `[ ]` |

### 2.3 Events `/events`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.3.1 | Page loads 200 | `GET /events` | `[ ]` |
| 2.3.2 | Event list from Wix; demo events filtered | Visual | `[ ]` |
| 2.3.3 | Event detail links do not 404 | Click each visible event | `[ ]` |
| 2.3.4 | Newsletter CTA → `/newsletter` | Click | `[ ]` |

### 2.4 Fundraising `/fundraising`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.4.1 | Page loads 200 | `GET /fundraising` | `[ ]` |
| 2.4.2 | Goal / progress content renders | Visual | `[ ]` |
| 2.4.3 | Donate / campaign CTAs open expected targets | Click | `[ ]` |

### 2.5 Volunteer `/volunteer`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.5.1 | Page loads 200 | `GET /volunteer` | `[ ]` |
| 2.5.2 | Volunteer form / sign-up path works | Submit or CTA | `[ ]` |

### 2.6 Board `/board`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.6.1 | Page loads 200 | `GET /board` | `[ ]` |
| 2.6.2 | Board members listed; mailto links valid | Click email | `[ ]` |
| 2.6.3 | Volunteer CTA → `/volunteer` | Click | `[ ]` |

### 2.7 Meetings `/meetings`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.7.1 | Page loads 200 | `GET /meetings` | `[ ]` |
| 2.7.2 | Meeting schedule / materials render | Visual | `[ ]` |
| 2.7.3 | Membership CTA → `/membership` when present | Click | `[ ]` |

### 2.8 Contact `/contact`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.8.1 | Page loads 200 | `GET /contact` | `[ ]` |
| 2.8.2 | Address matches footer: `23415 Evergreen Ridge Drive, Ashburn, VA 20148` | Visual | `[ ]` |
| 2.8.3 | Contact form `POST /api/contact` → 200 | Submit test message | `[ ]` |
| 2.8.4 | Email / maps links work | Click | `[ ]` |

### 2.9 Newsletter `/newsletter`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.9.1 | Page loads 200 | `GET /newsletter` | `[ ]` |
| 2.9.2 | Signup `POST /api/newsletter` → 200 | Submit test email | `[ ]` |

### 2.10 Store `/store`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.10.1 | Page loads 200 | `GET /store` | `[ ]` |
| 2.10.2 | Store card amounts shown: **$10 / $20 / $25** | Visual | `[ ]` |
| 2.10.3 | Load CTAs use headless checkout (not dead product URLs) | Click → `/api/checkout/start` | `[ ]` |
| 2.10.4 | Logged-out users see login gate before load | Click amount | `[ ]` |

### 2.11 Spirit Wear `/spirit-wear`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.11.1 | Page loads 200 | `GET /spirit-wear` | `[ ]` |
| 2.11.2 | Products / buy buttons render | Visual | `[ ]` |
| 2.11.3 | Buy uses `POST /api/checkout/start` → Wix checkout URL | Network + redirect | `[ ]` |

### 2.12 Membership `/membership`

| # | Check | How | Result |
|---|-------|-----|--------|
| 2.12.1 | Page loads 200 | `GET /membership` | `[ ]` |
| 2.12.2 | Ruby / Supreme tiers visible with Join | Visual | `[ ]` |
| 2.12.3 | Faculty CTA is **mailto** (not broken checkout) | Click | `[ ]` |
| 2.12.4 | Join starts headless checkout (`kind: membership`) | Network | `[ ]` |

---

## Phase 3 — Auth flows

| # | Check | How | Result |
|---|-------|-----|--------|
| 3.1 | `/auth/login` loads | Open | `[ ]` |
| 3.2 | Login redirects to Wix Members OAuth | Click Log in | `[ ]` |
| 3.3 | Callback `/auth/callback` sets session cookies | Complete login | `[ ]` |
| 3.4 | After login, returnTo honored (e.g. portal) | Login from portal CTA | `[ ]` |
| 3.5 | `GET /api/auth/me` anon → **401** | curl / browser | `[ ]` |
| 3.6 | `GET /api/auth/me` logged-in → **200** + member payload | After login | `[ ]` |
| 3.7 | Log out clears session; chrome shows Log in again | Logout | `[ ]` |
| 3.8 | Sign up / create account path works | New test email | `[ ]` |
| 3.9 | Protected portal redirects unauthenticated users to login | See 4.1 | `[ ]` |

---

## Phase 4 — Member portal & paid paths

> **Checkout note:** Purchases use headless **`POST /api/checkout/start`** (not Wix product-page URLs). Store card catalog amounts are **$10 / $20 / $25**.

| # | Check | How | Result |
|---|-------|-----|--------|
| 4.1 | Anon `/member-portal` → **307** to login | curl `-I` or browser | `[ ]` |
| 4.2 | Logged-in portal dashboard loads | After auth | `[ ]` |
| 4.3 | Free parent account: can add student | Portal UI | `[ ]` |
| 4.4 | Membership Join → checkout URL from `/api/checkout/start` | Join Ruby/Supreme | `[ ]` |
| 4.5 | Complete test membership purchase (sandbox/prod as agreed) | Checkout + return | `[ ]` |
| 4.6 | Post-purchase membership claim / portal badge updates | Return to membership/portal | `[ ]` |
| 4.7 | Store card Load $10 → checkout URL | `/store` or portal | `[ ]` |
| 4.8 | Store card Load $20 → checkout URL | same | `[ ]` |
| 4.9 | Store card Load $25 → checkout URL | same | `[ ]` |
| 4.10 | Spirit wear buy → checkout URL | `/spirit-wear` | `[ ]` |
| 4.11 | Checkout `postFlowUrl` returns to origin store/spirit/membership | After cancel or success | `[ ]` |
| 4.12 | Linked store card balance visible when Square tokens present | Portal student card | `[ ]` |
| 4.13 | Unlinked student shows “load / link” guidance → `/store` | Visual | `[ ]` |

---

## Phase 5 — Webhooks & cron

| # | Check | How | Result |
|---|-------|-----|--------|
| 5.1 | `POST /api/webhooks/wix-orders` without token → **401** | curl | `[ ]` |
| 5.2 | Wix membership order webhook with valid token → accepted | Manual or sync path | `[ ]` |
| 5.3 | `GET /api/cron/sync-membership-orders` without auth fails | curl | `[ ]` |
| 5.4 | Cron with `Authorization: Bearer $CRON_SECRET` → `ok: true` | curl or GHA | `[ ]` |
| 5.5 | GitHub Action `sync-membership-orders` (every 15m) succeeds | Actions tab | `[ ]` |
| 5.6 | Cheddarup webhook URL points at Vercel (pre-DNS) | Ops: `…/api/webhooks/cheddarup?token=…` | `[ ]` |
| 5.7 | Cheddarup test ping received / logged | Provider UI + Vercel logs | `[ ]` |
| 5.8 | Square webhook configured when production tokens ready | `/api/webhooks/square` | `[ ]` |

---

## Phase 6 — Cross-cutting

| # | Check | How | Result |
|---|-------|-----|--------|
| 6.1 | All primary nav routes return **200** | curl / browser | `[ ]` |
| 6.2 | Mobile viewport: no horizontal overflow on key pages | Home, store, membership, portal | `[ ]` |
| 6.3 | Images / logo load (no broken assets) | Visual | `[ ]` |
| 6.4 | Brand colors / typography consistent with site design | Spot-check | `[ ]` |
| 6.5 | Forms show validation errors for empty required fields | Contact, newsletter | `[ ]` |
| 6.6 | No sensitive secrets in client bundles | Spot-check Network | `[ ]` |
| 6.7 | 404 page for unknown routes | Open `/this-does-not-exist` | `[ ]` |
| 6.8 | SEO basics: title / meta on main pages | View source | `[ ]` |
| 6.9 | External redirects (maps, social) use HTTPS | Click | `[ ]` |
| 6.10 | Accessibility smoke: focus visible on interactive chrome | Keyboard tab | `[ ]` |

---

## Phase 7 — Go-live (DNS LAST)

**Do not start this phase until Phases 0–6 are green (or explicitly waived).**

Follow the full procedure in [`docs/DNS-CUTOVER.md`](./DNS-CUTOVER.md). Summary:

| # | Check | How | Result |
|---|-------|-----|--------|
| 7.1 | Pre-DNS QA signed off | Phases 0–6 | `[ ]` |
| 7.2 | Add `www.shmspto.org` + apex in Vercel Domains | Vercel UI | `[ ]` |
| 7.3 | DNS A `@` → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com` | DNS host | `[ ]` |
| 7.4 | `dig www.shmspto.org` shows Vercel (not Wix DNS) | CLI | `[ ]` |
| 7.5 | Set `NEXT_PUBLIC_SITE_URL=https://www.shmspto.org` + Square notification URL | Vercel env | `[ ]` |
| 7.6 | Redeploy frontend after env change | Vercel | `[ ]` |
| 7.7 | Point Cheddarup / Square / Wix Orders webhooks at www | Ops | `[ ]` |
| 7.8 | Update GHA `SYNC_URL` to www host | GitHub workflow | `[ ]` |
| 7.9 | Wix OAuth redirects include www (+ apex) callback | Wix app | `[ ]` |
| 7.10 | Re-run Phases 1–5 against **https://www.shmspto.org** | Full smoke | `[ ]` |

---

## Smoke results (2026-07-15 / 2026-07-16 staging `https://shmspto.vercel.app`)

Automated command: `node scripts/smoke-production.mjs` (or `npm run test:smoke` from `frontend/`).

| Check | Result |
|-------|--------|
| All nav routes HTTP 200 | `[x]` |
| `/member-portal` → login 307 | `[x]` |
| `/api/auth/me` anon 401 | `[x]` |
| `/api/webhooks/wix-orders` no token 401 | `[x]` |
| `POST /api/contact` + `/api/newsletter` 200 | `[x]` |
| Navbar Log in / Sign up visible (after hydrate) | `[x]` |
| Home Join → `/membership` | `[x]` |
| Footer address `23415 Evergreen Ridge…` | `[x]` |
| Contact address vs footer | `[x]` fixed |
| Home event View Details | `[x]` → `/events` |
| Demo Wix events filtered from API | `[x]` (still delete in Wix UI) |
| Headless checkout `/api/checkout/start` returns URLs (membership / store / spirit) | `[x]` |
| Store-card checkout `$10/$20/$25` (`kind: store-card`) | `[x]` (2026-07-16) |
| WhatsApp invite URLs absent from anon HTML (SSR) | `[x]` (2026-07-16; gate via `isMemberRequest`) |
| PageContent `portal` / `portal-hub` / `member-portal` rows present | `[x]` |
| ProgramSessions + ParentMessages collections have data | `[x]` |
| Automated anonymous/public smoke suite (16 checks) | `[x]` (2026-07-16) |
| Square production env names present | `[x]` (credential validity still requires signed-in E2E) |
| Cheddarup webhook pointed at Vercel | `[ ]` ops |
| Logged-in portal / purchase QA | `[~]` portal grid verified earlier for treasurer; Google SSO still flaky in Cursor browser |

---

## Defects

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| D1 | Med | Contact address ≠ footer | **Fixed** |
| D2 | Med | Event detail 404 links | **Fixed** |
| D3 | Low | Footer newsletter mock API | **Fixed** |
| D4 | Med | Faculty CTA broken / non-mailto | **Fixed** (mailto) |
| D5 | High | Square production path unverified | **Open** — credentials exist; signed-in payment/reload E2E remains |
| D6 | Med | Cheddarup webhook host | **Open** — ops (use Vercel URL pre-DNS) |
| D7 | Critical | Product-page 404s on buy/load | **Mitigated** via headless `/api/checkout/start` |
| D8 | Med | Demo events in Wix | **Filtered** in API; still delete in Wix Events UI |

**Logged-in portal / paid-path QA:** still pending (see smoke table).

---

## Remaining before DNS

1. Confirm Square webhook configuration and complete one signed-in payment/reload E2E (D5).
2. Point Cheddarup webhook at the Vercel URL and confirm secret (`CHEDDARUP_WEBHOOK_SECRET`) (D6).  
3. Complete logged-in QA: Join / Load ($10/$20/$25) / Buy spirit / member portal.  
4. Follow [`docs/DNS-CUTOVER.md`](./DNS-CUTOVER.md), then re-run this plan on **https://www.shmspto.org**.
