# SHMS PTO — Full Build QA Review (July 2026)

Consolidated QA for **everything built**: backend (API routes + gates), frontend (public + portal + staff),
scripts, and the Cove family store-card system (register, products, variants, photos, inventory).

Organized by the four audiences: **visitor · free member · paid member · staff (per role)**.

- **Pre-DNS base:** https://shmspto.vercel.app
- **Production (post-DNS):** https://www.shmspto.org
- Mark **Result**: `[x]` pass · `[ ]` not run · `[F]` fail · `[!]` blocked · `[~]` N/A

> Companion docs: `QA-TEST-PLAN.md` (original phased plan), `STAFF-PORTAL-TEST-PLANS.md` (role gaps),
> `SITE-CAPABILITY-AUDIT.md` (capability matrix). This doc supersedes them for the current build.

---

## 0. Environment & preconditions

| # | Check | Notes | Result |
|---|-------|-------|--------|
| 0.1 | Target URL agreed | live Vercel vs local `next dev` | `[ ]` |
| 0.2 | `tsc --noEmit` clean | ran 2026-07-21 → clean | `[x]` |
| 0.3 | Smoke suite green | `npm run test:smoke` → 22/22 (2026-07-21) | `[x]` |
| 0.4 | Payments mode decided | **No sandbox configured today**: prod uses `SQUARE_ENVIRONMENT=production`, `PAYPAL_ENVIRONMENT=live`; Wix checkout has no sandbox at all | `[ ]` |
| 0.5 | Login method for role testing | Wix Members OAuth needs a human login (Google SSO flaky in embedded browser) | `[ ]` |
| 0.6 | Test `@shmspto.org` staff account + StaffRoles row | required to exercise each staff role | `[ ]` |
| 0.7 | Lint tooling | repo `lint` script pulls ESLint 10 w/o flat config → **broken tooling** (not app code); track separately | `[F]` |

---

## 1. Backend — API gate matrix (auth/authz)

Verify each returns the documented code. Anonymous = no member cookie; Free/Paid = member cookie, non-`@shmspto.org`.
Automated (`smoke-production.mjs`) already covers the ★ rows.

### 1a. Auth & public
| # | Request | Expected | Result |
|---|---------|----------|--------|
| 1a.1 ★ | `GET /api/auth/me` anon | 401 | `[x]` |
| 1a.2 | `GET /api/auth/me` member | 200 + `{accountType, students, membership, actingAs}` | `[ ]` |
| 1a.3 ★ | `POST /api/webhooks/wix-orders` no token | 401 | `[x]` |
| 1a.4 ★ | `POST /api/webhooks/cheddarup` no token | 401 | `[x]` |
| 1a.5 ★ | `POST /api/webhooks/square` bad/no signature | 401 | `[x]` |
| 1a.6 ★ | `GET /api/cron/sync-membership-orders` no bearer | 401 | `[x]` |

### 1b. Staff route → role matrix (each should 401 anon / 403 wrong-role / 200 right-role)
| Route | Allowed roles | Result |
|-------|---------------|--------|
| `/api/staff/me` | any active `@shmspto.org` staff (else 403 `registered`) | `[ ]` |
| `/api/staff/act-as` POST | `admin` | `[ ]` |
| `/api/staff/roles` GET/POST | `admin` | `[ ]` |
| `/api/staff/students/[id]` | `admin` | `[ ]` |
| `/api/staff/members` | list: `membership,secretary,admin`; search: `admin` | `[ ]` |
| `/api/staff/membership/outreach` | `membership,secretary,marketing,admin` | `[ ]` |
| `/api/staff/discounts` | `retail,membership,admin` | `[ ]` |
| `/api/staff/payments` | `treasurer,admin` | `[ ]` |
| `/api/staff/programs` | `programs,instructor,admin` | `[ ]` |
| `/api/staff/minutes` | `secretary,admin` | `[ ]` |
| `/api/staff/events` | `events,admin,secretary,marketing` | `[ ]` |
| `/api/staff/surveys` | `marketing,secretary,admin` | `[ ]` |
| `/api/staff/social` + `/social/media` | `marketing,admin` | `[ ]` |
| `/api/staff/page-content` | `marketing,secretary,admin` | `[ ]` |
| `/api/staff/messages` | `programs,instructor,secretary,membership,admin` | `[ ]` |
| `/api/staff/cove/products` (+`/image`) | `retail,admin` | `[ ]` |
| `/api/staff/cove/checkout` | `retail,admin` | `[ ]` |
| `/api/staff/cove/lookup` | `retail,admin` | `[ ]` |
| `/api/staff/cms/[collection]` | per-collection roles (+admin) | `[ ]` |
| `/api/staff/site-settings` | read: any staff; **write: admin** | `[ ]` |
| `/api/staff/tasks` `/projects` `/workspace/*` | any active staff | `[ ]` |

### 1c. Commerce endpoints (behavioral)
| # | Request | Expected | Result |
|---|---------|----------|--------|
| 1c.1 | `POST /api/checkout/quote` membership | tier price from CMS | `[ ]` |
| 1c.2 | `POST /api/checkout/start` `store-card` non-preset amount | rejected (not allowed amount) | `[ ]` |
| 1c.3 | `POST /api/checkout/start` `membership` `faculty`/`free` | rejected | `[ ]` |
| 1c.4 | `POST /api/checkout/pay` anon | 401 (member required) | `[ ]` |
| 1c.5 | `POST /api/checkout/pay` store-card < $1 or > max | rejected | `[ ]` |
| 1c.6 | `POST /api/staff/cove/checkout` insufficient balance | 402 + balance | `[ ]` |
| 1c.7 | `POST /api/staff/cove/checkout` out-of-stock line | 400 | `[ ]` |

---

## 2. Visitor (anonymous)

| # | Test | Result |
|---|------|--------|
| V.1 | Home `/` loads, hero + announcement render | `[x]` (off-season announcement bar + dismiss) |
| V.2 | All public routes 200 (smoke) | `[x]` (smoke) |
| V.3 | `/store` → 308 → `/cove` | `[x]` (smoke) |
| V.4 | Membership shows tiers Reef $79 / Lagoon $149 (Most Popular) / Tide $249; Faculty $15 CTA is **mailto "Email to Join"** | `[x]` |
| V.5 | Logged-out header CTA = **"Become a member"** → `/auth/login?returnTo=/membership`; **no Staff / My Account links** | `[x]` (single CTA covers login+signup) |
| V.6 | `/member-portal` & `/staff` → 307 → `/auth/login?returnTo=…` | `[x]` (smoke) |
| V.7 | `/cove` snack menu (one card per product, prices, photos); **no variant/family-code UI** exposed | `[x]` |
| V.8 | Contact `POST /api/contact` 200; Newsletter `POST /api/newsletter` 200 | `[ ]` |
| V.9 | Active survey slug `/survey/[slug]` loads + submits | `[ ]` |
| V.10 | No member-only data in anon HTML | `[x]` (**WhatsApp parent-group links + Staff link hidden when logged out**; visible only when authed) |
| V.11 | Footer address `23415 Evergreen Ridge Drive` | `[x]` (maps link present, not clicked) |
| V.12 | 404 page for unknown route; mobile: no horizontal overflow | `[ ]` |

---

## 3. Free member (parent, no paid tier)

Login → `accountType:'free'` (all students `free`, no active Memberships row).

| # | Test | Result |
|---|------|--------|
| MF.1 | Portal loads; free banner + Upgrade CTA | `[ ]` |
| MF.2 | Add a student | `[ ]` |
| MF.3 | Edit student name/grade | `[ ]` |
| MF.4 | Cannot archive/remove student (admin-only) | `[ ]` |
| MF.5 | Store card: sees load options / clear empty state; **family code card** shows a 6-digit code (+ copy / optional QR) | `[ ]` |
| MF.6 | Load store card (see §6 payments) → balance + family code appear | `[ ]` |
| MF.7 | First family load applies **10% bonus**; a later reload is **1:1** | `[ ]` |
| MF.8 | Surveys + messages quadrants render | `[ ]` |
| MF.9 | Portal help includes tier FAQ | `[ ]` |
| MF.10 | Loading `/staff` shell → dashboard blocked (403 from `/api/staff/me`) | `[ ]` |

---

## 4. Paid member (Ruby=reef / Supreme=lagoon / Pearl=tide)

Login → `accountType:'paid'` (a student tier ≠ free, or active Memberships row).

| # | Test | Result |
|---|------|--------|
| MP.1 | Paid badge/copy; correct tier name shown | `[ ]` |
| MP.2 | Membership gift-card credit appears on card after sync (Reef $10 / Lagoon $25 / Tide $50 defaults) | `[ ]` |
| MP.3 | Membership credit counted as "prior credit" → subsequent parent load is 1:1 (no double bonus) | `[ ]` |
| MP.4 | Family code + balance shared across all siblings (one card per family) | `[ ]` |
| MP.5 | Spirit/checkout coupon bar when configured | `[ ]` |
| MP.6 | All free-member tests (MF.*) still pass | `[ ]` |
| MP.7 | Expiry: expired Memberships row → treated as not-paid | `[ ]` |

---

## 5. Staff — per role

Each staff tester logs in with `@shmspto.org` + an active `StaffRoles` row. Verify **sees** allowed workspaces and
**403** on others. `admin` is a super-role (all).

### 5a. RBAC isolation
| # | Role | Must see | Must NOT see | Result |
|---|------|----------|--------------|--------|
| R.1 | marketing | Social, Surveys, Events, Page copy, Site settings, Nav, FAQs, Fundraising | Payments, Staff access | `[ ]` |
| R.2 | treasurer | Payments, Fundraising | Social, Staff access | `[ ]` |
| R.3 | membership | Memberships, Messages, Discounts, Tiers, FAQs | Staff access, Payments | `[ ]` |
| R.4 | retail | Cove register, Cove products, Discounts, retail Site settings | Minutes, Payments | `[ ]` |
| R.5 | programs | Programs, Messages, Fundraising | Payments, Social | `[ ]` |
| R.6 | instructor | Programs (their enrollees), Messages | Social, Staff access, Payments | `[ ]` |
| R.7 | secretary | Minutes, Surveys, Messages, Memberships, Events, Page copy, Board, Nav, FAQs, Volunteers | Payments | `[ ]` |
| R.8 | events | Events, Volunteers, wellness settings | Payments, Social | `[ ]` |
| R.9 | wellness | Wellness workspace only | everything gated | `[ ]` |
| R.10 | admin | All + Members + Staff access + act-as | — | `[x]` (2026-07-21: all 27 panels shown) |
| R.11 | any (role-less new `@shmspto.org`) | auto-registered; dashboard 403 until role assigned | any workspace | `[ ]` |

### 5b. Admin powers
| # | Test | Result |
|---|------|--------|
| A.1 | Member search by email/name | `[ ]` |
| A.2 | Act-as parent → portal shows their students/messages; amber banner; Exit returns to own | `[ ]` |
| A.3 | Act-as is admin-only; stale cookie can't impersonate as non-admin | `[ ]` |
| A.4 | Assign roles to `@shmspto.org` email; reject personal email | `[ ]` |
| A.5 | Archive student → leaves parent portal, still searchable; disables auto top-off/reload | `[ ]` |
| A.6 | Restore student | `[ ]` |

### 5c. Retail role — Cove register & products (NEW build focus)
| # | Test | Result |
|---|------|--------|
| C.1 | Register loads product menu (in-stock only), each variant its own tappable line (`Takis · Fuego`) | `[ ]` |
| C.2 | Enter family code → shows family name + balance | `[ ]` |
| C.3 | Bad/short code → clear error; unloaded family → guidance | `[ ]` |
| C.4 | Camera barcode scan adds correct product/variant; SKU index resolves variant | `[ ]` |
| C.5 | Balance / remaining-after shown; charge redeems Square gift card | `[ ]` |
| C.6 | Inventory decrements per variant on sale; blocks when would go negative | `[ ]` |
| C.7 | Payments row `cove_register_redeem` written; balance re-synced to siblings | `[ ]` |
| C.8 | Products: add simple product (name/price/qty/barcode) → appears on `/cove` after revalidate | `[ ]` |
| C.9 | Products: add multi-variant (Flavor/Size) with per-variant price/qty/barcode | `[ ]` |
| C.10 | Products: upload photo → Wix Media → shows as product image (no Wix Dashboard) | `[ ]` |
| C.11 | Products: toggle "On Cove" on/off → allowlist add/remove; `/cove` reflects | `[ ]` |
| C.12 | Products: edit price/qty on single-SKU product preserves sibling variants | `[ ]` |
| C.13 | `CoveInventory` CMS has `variantId` field; multi-flavor stock persists per variant | `[x]` (field created 2026-07-20) |

### 5d. Other role workflows (spot-check, mutating)
| # | Action | Role | Expected | Result |
|---|--------|------|----------|--------|
| SM.1 | Edit hero via Page copy | marketing | live after cache | `[ ]` |
| SM.2 | Publish minutes | secretary | `/meetings` updates | `[ ]` |
| SM.3 | Create/share survey | marketing | public + portal | `[ ]` |
| SM.4 | Send parent message | programs/instructor | portal inbox | `[ ]` |
| SM.5 | Membership email preview (dry) | membership | count + samples | `[ ]` |
| SM.6 | Create discount code | retail/membership | checkout accepts | `[ ]` |
| SM.7 | Reconcile payment | treasurer | queue clears | `[ ]` |
| SM.8 | Create event | events | Wix Events | `[ ]` |
| SM.9 | Connect Google; Inbox/Calendar/Docs load | any | threads load | `[ ]` |

---

## 6. Payments — sandbox vs real matrix

> **Decision required (0.4).** Today there is **no sandbox** wired. Options:
> **(a)** configure Square + PayPal **sandbox** creds → full load/redeem/membership loop with fake money;
> **(b)** accept small **real** charges on production;
> **(c)** test everything **up to the charge** (quote, checkout URL, gates, read-only balances) — no charge.
> Wix hosted checkout (`/api/checkout/start`) has **no sandbox** either way — real money only.

| # | Flow | Sandbox-able? | Result |
|---|------|---------------|--------|
| P.1 | In-portal Square card charge (`/api/checkout/pay`) membership/product/store-card | Yes (sandbox test card `4111 1111 1111 1111`) | `[ ]` |
| P.2 | Save / delete card-on-file (`/api/gift-card/payment-method`) | Yes | `[ ]` |
| P.3 | Gift-card create/load/redeem/balance/activities | Yes (sandbox gift cards) | `[ ]` |
| P.4 | 10% first-load bonus vs 1:1 reload logic | Yes | `[ ]` |
| P.5 | Auto top-off webhook (`/api/webhooks/square`) end-to-end | Yes (needs `SQUARE_WEBHOOK_SIGNATURE_KEY`) | `[ ]` |
| P.6 | Membership gift-card credit provisioning | Yes | `[ ]` |
| P.7 | PayPal membership/product/store-card | Yes (needs `PAYPAL_ENVIRONMENT=sandbox`) | `[ ]` |
| P.8 | Cove product CRUD + photo + inventory | No money, but mutates **live** Wix catalog → use throwaway products | `[ ]` |
| P.9 | Wix hosted checkout redirect (`/api/checkout/start`) | **No sandbox — real card** | `[ ]` |
| P.10 | membership claim / wix-orders webhook / cron sync | No money (needs tokens/`CRON_SECRET`) | `[ ]` |

---

## 7. Scripts review

| Script | Class | Safe to run? |
|--------|-------|--------------|
| `smoke-production.mjs` | A: read-only smoke | ✅ (`npm run test:smoke`) — now 22/22 |
| `test-membership-outreach.mjs` | A: unit + dry-run | ✅ (`npm run test:membership`, needs `tsx`) |
| `seed-cms-content.mjs` | B: writes Wix CMS | ⚠️ explicit permission |
| `seed-discount-codes.mjs` | B: writes Wix CMS | ⚠️ |
| `seed-pearl-membership.mjs` | B: writes Wix CMS | ⚠️ |
| `nav-fundraising-reset.js` | B: writes Wix CMS | ⚠️ |
| `off-season-cove-cms.js` | B: writes Wix CMS | ⚠️ |
| `gmail-oauth-setup.mjs` | B: mints Gmail token | ⚠️ |
| `set-google-sa-env.mjs` / `set-google-oauth-env.mjs` | B: overwrite Vercel prod env | ⚠️ |
| `auth.js`, `create-pto-docs.js`, `close-help-gaps.js`, `update-image-guide.js`, `insert-doc-screenshots.js`, `insert-wix-help-images.js`, `scrape-wix-help.js`, `wix-login.js`, `wix-screenshots.js`, `insert-screenshots.js` | C: Google Docs/Drive + Playwright | ✅ to site, but write to Google Drive — run only to regenerate docs |

---

## 8. Defects / follow-ups found during this review

| ID | Sev | Summary | Status |
|----|-----|---------|--------|
| N1 | Low | `smoke-production.mjs` expected `/store` 200 but app 308-redirects to `/cove` | **Fixed** 2026-07-21 (now checks 308→/cove) |
| N2 | Low | `lint` script uses ESLint 10 with no flat config → fails to run | **Open** (tooling) |
| N3 | Med | No sandbox configured for payments (prod Square/live PayPal) | **Configured 2026-07-21** — Square + PayPal sandbox keys in `frontend/.env.local` (prod values backed up as comments; restore before deploy). Both authenticate (Square location `L38G61EQQM7ZV`, PayPal OAuth OK) |
| N4 | Info | Wix hosted checkout has no sandbox; real money only | **By design** (Wix) |
| N5 | Pass | Member-only chrome (Staff link, My Account, WhatsApp parent-group links) correctly hidden for anonymous; shown only when authed | **Verified** 2026-07-21 |
| N6 | ~~Med~~ | `/membership` advertised **$20/$40/$75** but CMS + code provisioned only **$10/$25/$50** (paid members under-credited on every tier) | **Fixed 2026-07-21** — CMS SiteSettings + MembershipTiers set to 20/40/75; code defaults + preset amounts (`20,40,75`) + `storeCardMinAmount=1` updated. Live via CMS immediately; code on next deploy |
| N6b | Policy | Membership credit gets +10% first-load bonus on top → base 20/40/75 loads **$22/$44/$82.50** (decision: **keep the +10%** as a limited-time perk) | **Done** — `/membership` tiers now show a "Limited-time bonus · first 30 days" callout with boosted amount, driven by `storeCardBonusPercent` (set to 0 to end promo). Code → next deploy |
| N8 | Med | "First 30 days" bonus copy is **not enforced by date logic** — membership provisioning applies the bonus to every paid membership regardless of date (until `storeCardBonusPercent` is set to 0) | **Open** — decide: manual on/off via `storeCardBonusPercent`, or add real 30-day enforcement |
| N7 | Low | Logged-out header has only "Become a member" (→ login); no distinct "Log in" label for returning members (functional, minor UX) | **Open** (cosmetic) |
| N9 | **Critical** | `lib/square.ts` `createOrLoadStudentGiftCard` + `loadGiftCard` sent `amount_money` only on `ACTIVATE`/`LOAD`. Square's custom-processing path (this app charges via Payments API / PayPal, not Orders-API `GIFT_CARD` line items) **requires** `buyer_payment_instrument_ids` → every call returns `BAD_REQUEST`. **All membership gift-card provisioning + all store-card loads/reloads/auto-top-offs were broken** (never worked against real Square; site pre-launch). | **Fixed 2026-07-21** — added `buyerPaymentInstrumentIds` to both helpers (default `['gift-card-provision']`/`['store-card-load']`); threaded the real Square `payment.id` from `checkout/pay`, `gift-card/reload`, `webhooks/square`, and labels from `membership-sync`/`checkout-fulfill`. Verified in sandbox: provision $20+10%→$22, redeem $5→$17, refill $40→$57. Code → next deploy |
| N10 | High | `lib/square.ts` `getGiftCardActivities` read `result.giftCardActivities`, but the Square SDK returns a paginated Page with items under `.data` → **always returned `[]`; members saw an empty store-card transaction history** | **Fixed 2026-07-21** — reads `.data` (fallback to old key). Sandbox ledger now returns ACTIVATE/REDEEM/LOAD entries. Code → next deploy |
| N11 | Low | `lib/square.ts` `getGiftCardById` called `giftCards.get({ giftCardId })` → 404; correct SDK param is `{ id }` (helper imported by balance route but currently unused, so no live impact) | **Fixed 2026-07-21** — param corrected to `{ id }`. Code → next deploy |

> **Deploy note:** N6/N6b/N9/N10/N11 are **code fixes** — they take effect only on the next Vercel deploy. Until then, live gift-card provisioning/loads remain broken (N9). Verification harness: `frontend/scripts/sandbox-payment-loop.mjs` (sandbox-guarded).

---

## 9. Execution log

| Date | Who | Scope | Result |
|------|-----|-------|--------|
| 2026-07-21 | agent | tsc, smoke (22/22), env audit, smoke `/store` fix | green |
| 2026-07-21 | agent | Anonymous gates via smoke (curl, no cookies): all public 200, `/store`→308→`/cove`, `/member-portal`→307 login, all `/api` gates 401/403 | `[x]` |
| 2026-07-21 | agent | Admin dashboard verified (all 27 panels) as `treasurer@shmspto.org` = admin/"President" | `[x]` |
| 2026-07-21 | agent | **Signed out → true visitor pass**: `/api/auth/me` 401; home + `/cove` + `/membership` render correctly; member-only chrome hidden (N5); tiers Reef/Lagoon/Tide + Faculty mailto | `[x]` |
| 2026-07-21 | agent | **N6 fix**: tier card credit + store-card presets 10/25/50→20/40/75, min→$1 (CMS + code). Refills already support any-amount custom field. Verified in CMS + tsc clean | `[x]` |
| 2026-07-21 | agent | **Sandbox configured** (N3): Square + PayPal sandbox keys wired into `.env.local`, both authenticate | `[x]` |
| 2026-07-21 | agent | **Square payment loop (sandbox)**: create → membership provision $20+10%→$22 → register redeem $5→$17 → parent refill $40→$57 → ledger 3 entries. **PASS** | `[x]` |
| 2026-07-21 | agent | **N9 (critical) + N10 + N11 fixes**: gift-card `buyer_payment_instrument_ids`, activities `.data`, `getGiftCardById({id})`. tsc clean | `[x]` |

### Open items for next session
- **Re-login as admin** (Wix OAuth) to continue: staff RBAC per role, admin act-as, member-portal (free/paid), Cove retail (product+variant+photo throwaway).
- **Sandbox keys** → add Square+PayPal sandbox vars to `frontend/.env.local`, then run payment loop on local dev.
- **N6**: verify advertised card credit ($20/$40/$75) vs code default ($10/$25/$50).
- Remaining visitor items: V.8 (contact/newsletter submit), V.9 (survey), V.12 (404/mobile).
