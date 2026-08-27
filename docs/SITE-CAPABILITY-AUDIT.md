# Site capability audit & test plans (July 2026)

**Status:** Complete (local audit after Gemini/Claude subagents hit API limits).  
**Live:** https://shmspto.vercel.app  
**Canvas:** `site-capability-audit.canvas.tsx` (open beside chat)

Audience shells: **visitor** · **free member** · **paid member** · **staff (by role)**.

---

## How to read gap types

| Type | Meaning |
|------|---------|
| **COVERED** | Staff role can manage via `/staff` UI |
| **PARTIAL** | View/list or subset edit; create/delete elsewhere (often Wix) |
| **CMS_ONLY** | Board edits in Wix CMS; no Staff UI yet |
| **WIX_ONLY** | Managed in a Wix app (Events, newsletter list) |
| **INTENTIONAL** | Out of scope for that audience |

---

## Gaps (P0 / P1 / P2)

### P0

| ID | Gap | Surface | Status |
|----|-----|---------|--------|
| G-P0-1 | **wellness** role had no gated Staff workspace | Staff | **COVERED**. Wellness workspace (SiteSettings wish list / notes) |

### P1

| ID | Gap | Surface | Status |
|----|-----|---------|--------|
| G-P1-1 | `/board` BoardMembers roster | Visitor | **COVERED**. Board roster |
| G-P1-2 | `/volunteer` VolunteerOpportunities | Visitor | **COVERED**. Volunteer ops |
| G-P1-3 | `/fundraising` goals/CTAs | Visitor | **COVERED**. Fundraising workspace |
| G-P1-4 | SiteSettings (announcement, contact, WhatsApp, …) | Visitor | **COVERED**. Site settings (role-scoped) |
| G-P1-5 | Membership tier map / Catalog link | Visitor | **COVERED**. Membership tiers (paid display still Catalog) |
| G-P1-6 | Events create/edit | Visitor | **COVERED**. Staff Events create/edit/cancel (Wix Events API) |
| G-P1-7 | Marketing newsletter list/send | Visitor | **COVERED**. Newsletter workspace (Gmail + WhatsApp + portal; free/paid members) |
| G-P1-8 | Member / school / board comms + content calendar | Staff | **COVERED**. Comms & content workspace (month grid + agenda; CMS `CommsCalendarItems`) |
| G-P1-8b | Canva design browse from Staff | Staff | **BUILT**. Staff → Canva (OAuth Connect; CMS `StaffCanvaTokens`). Needs Canva Portal redirect URIs + deploy. |

### P2

| ID | Gap | Surface | Status |
|----|-----|---------|--------|
| G-P2-1 | NavLinks | Visitor | **COVERED**. Nav & footer |
| G-P2-2 | Parents cannot archive/remove students (admin Staff only) | Portal | INTENTIONAL / policy |
| G-P2-3 | Membership FAQItems | Visitor | **COVERED**. FAQs |
| G-P2-4 | Legal PageContent rows may be missing from Page copy defaults | Visitor | PARTIAL |

---

## Role → Staff tools (code)

**Everyone:** Home, Inbox, Calendar, Docs, Projects, Help.  
**Marketing / secretary / membership / events:** Comms & content (month calendar).  
**Inbox/Calendar/Docs:** all staff after Connect Google (not role-gated).

| Role | Extra workspaces |
|------|------------------|
| admin | Members, Staff access, + all gated |
| marketing | Social, Surveys, Events, Page copy, Site settings, Nav & footer, FAQs, Fundraising, **Canva**, Comms |
| secretary | Surveys, Messages, Minutes, Memberships, Tiers, Events, Page copy, Site settings, Board, Nav, FAQs, Volunteers |
| treasurer | Payments, Fundraising |
| events | Events, Volunteers, Wellness |
| programs | Messages, Programs, Fundraising |
| instructor | Messages, Programs |
| retail | Store & spirit, Discounts, Site settings (retail keys) |
| membership | Messages, Memberships, Tiers, Discounts, Site settings, FAQs |
| wellness | Wellness |

---

## Visitor pages → manage path

| Page | Sources | Staff manage? |
|------|---------|---------------|
| `/` | PageContent, announcement, Nav, Programs, Events | Page copy + Site settings + Nav COVERED; Events PARTIAL |
| `/membership` | Tiers, PageContent, FAQ | Page copy + Tiers + FAQs COVERED |
| `/events` | Wix Events | PARTIAL → Wix CRUD |
| `/programs` | Programs | COVERED |
| `/store` `/spirit-wear` | Allowlists, coupons | Retail + Discounts COVERED |
| `/meetings` | Minutes | COVERED |
| `/board` | BoardMembers | COVERED |
| `/volunteer` | Opportunities | COVERED |
| `/fundraising` | Goals/CTAs | COVERED |
| `/survey/[slug]` | Surveys | COVERED |
| Legal pages | PageContent | Page copy COVERED |
| Nav/footer | NavLinks | COVERED |

---

## Member portal. free vs paid

| Area | Free | Paid |
|------|------|------|
| Banner | Upgrade CTA | Paid status |
| Students | Add + edit; upgrade nudge | Add + edit; tier badge |
| Store card | Load / balance | Same + membership credit after sync |
| Coupons | Usually none | Spirit/checkout when configured |
| Surveys / messages / help | Same | Same |
| Archive student | **No** (admin) | **No** (admin) |

Parent student management: **add** + **edit** yes; **archive/remove** staff-admin only (G-P2-2. confirm policy).

---

## Test plans for execution

### TP-V. Visitor

| # | Test | Pass |
|---|------|------|
| V.1 | Unauthenticated homepage + nav + announcement | |
| V.2 | Public routes 200 (membership, events, programs, store, spirit-wear, fundraising, board, volunteer, meetings, newsletter, contact, legal) | |
| V.3 | Membership UI shows Reef / Lagoon / Tide | |
| V.4 | Join/login CTAs work | |
| V.5 | Footer legal links | |
| V.6 | Active survey slug loads | |

### TP-MF. Free portal

| # | Test | Pass |
|---|------|------|
| MF.1 | Free banner + Upgrade CTA | |
| MF.2 | Add student | |
| MF.3 | Edit student name/grade | |
| MF.4 | Portal help includes tier FAQ | |
| MF.5 | Surveys + messages when present | |
| MF.6 | Store card load reachable or clear empty state | |

### TP-MP. Paid portal

| # | Test | Pass |
|---|------|------|
| MP.1 | Paid badge/copy after sync | |
| MP.2 | Tier store-card credit appears (or documented delay) | |
| MP.3 | Spirit coupon bar when configured | |
| MP.4 | All MF.* still pass | |

### TP-RBAC. Role isolation

| # | Role | Must see | Must NOT see | Pass |
|---|------|----------|--------------|------|
| R.1 | marketing | Social, Surveys, Events, Page copy | Payments, Staff access | |
| R.2 | treasurer | Payments | Social | |
| R.3 | membership | Memberships, Messages, Discounts | Staff access | |
| R.4 | retail | Store & spirit, Discounts | Minutes | |
| R.5 | programs | Programs, Messages | Payments | |
| R.6 | instructor | Programs, Messages | Social, Staff access | |
| R.7 | secretary | Minutes, Surveys, Messages, Memberships, Events, Page copy | Payments* | |
| R.8 | events | Events | Payments | |
| R.9 | wellness | Base only | Document G-P0-1 | |
| R.10 | admin | All |. | |
| R.11 | any | Inbox after Connect Google |. | |

### TP-STAFF-MANAGE

| # | Action | Role | Expected | Pass |
|---|--------|------|----------|------|
| SM.1 | Edit hero via Page copy | marketing | Live after cache | |
| SM.2 | Toggle program registration | programs | Public programs updates | |
| SM.3 | Publish minutes | secretary | Meetings updates | |
| SM.4 | Create/share survey | marketing | Public + portal | |
| SM.5 | Send parent message | programs/instructor | Portal inbox | |
| SM.6 | Membership email preview | membership | Count + samples | |
| SM.7 | Discount code | retail/membership | Checkout accepts | |
| SM.8 | Reconcile payment | treasurer | Queue clears | |
| SM.9 | Act-as parent | admin | Portal shows their kids | |
| SM.10 | Create event | events | **Wix Events** (not Staff form) | |

### TP-WS. Workspace hub

| # | Test | Pass |
|---|------|------|
| WS.1 | Connect Google; threads load | |
| WS.2 | Folder sidebar + unread badges | |
| WS.3 | Reply stays in Gmail thread | |
| WS.4 | Sapling Check grammar | |
| WS.5 | Calendar + Docs | |

---

## Recommended build order

1. Wellness workspace MVP **or** retarget ROLE_HOME_COPY expectations  
2. Staff SiteSettings editor (announcement + WhatsApp grade links)  
3. Membership tiers editor in Memberships panel (or deep-link checklist)  
4. Board / Volunteer / Fundraising Staff CRUD **or** document CMS_ONLY in Help  
5. Parent self-archive policy → implement or mark INTENTIONAL  

---

## Related

- Repo: `docs/STAFF-HELP.md`, `docs/STAFF-PORTAL-TEST-PLANS.md`  
- Drive: 30 to 36 how-tos; this audit also as Google Doc **37** 
- Staff Help tab lists role-relevant docs; Member Portal → Portal help for parents
