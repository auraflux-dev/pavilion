# Solution packaging — surfaces, capabilities, customers

**Audience: product**

## Why

Pavilion is one product. Customers do **not** need the whole thing. Lumi needs some of it; SHMS (VIP) keeps a full dedicated cut. We sell and deploy by **capability**, down to a feature or function, not only by “whole app.”

## Three surfaces (how people use it)

| Surface | Who | Primary routes | Shell |
|---------|-----|----------------|-------|
| **Website** | Public visitors | `/`, programs, events, cove, membership marketing, … | Visitor chrome |
| **Member portal** | Families (free / paid) | `/member-portal/*` | Member shell |
| **Staff** | Board / volunteers with roles | `/staff`, `/staff/in-person` | Staff shell |

They are **not** three repos. They are three audience shells inside one Next app that share libraries and talk through clear seams.

```text
                    ┌─────────────┐
                    │  Website    │  marketing, catalog, cart entry
                    └──────┬──────┘
                           │ same org, content, catalog, auth session
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   Member    │ │    Staff    │ │ Connectors  │
    │   portal    │ │   portal    │ │ Wix/Square/ │
    │  family UX  │ │  ops / CMS  │ │ Plaid/…     │
    └─────────────┘ └─────────────┘ └─────────────┘
```

### How they interact

| From → To | What flows |
|-----------|------------|
| Website → Member | Join / login; “Member Portal” CTA; membership purchase |
| Website → Staff | Forms, newsletter signup, volunteer, contact → staff queues / CMS |
| Member → Website | Browse programs/events while logged in; public chrome still visitor nav |
| Staff → Website | Page copy, nav, events, programs, fundraising — publish content visitors see |
| Staff → Member | Memberships, messages, portal posts, benefits |
| Any → Connectors | Payments (Square), CMS (Wix or CRM), bank (Plaid), mail (Gmail) — **per capability** |

Auth today: Wix members on VIP SHMS; Better Auth on shared platform trials. Same surface map either way.

## Capabilities (unit of reuse)

A **capability** is a feature or function we can turn on for a customer without shipping the whole product.

Examples (not exhaustive):

| ID | Surface(s) | Depends on | Notes |
|----|------------|------------|-------|
| `site.marketing` | Website | content | Home, board, contact, volunteer pages |
| `site.programs` | Website + Staff | content / CMS | Catalog + staff Programs |
| `site.events` | Website + Staff | content / CMS | Public events + staff Events |
| `site.retail` | Website + Staff | `pay.square` optional | Cove / cart / staff retail |
| `portal.family` | Member | auth | Hub, students, guardians |
| `portal.membership` | Member + Staff | auth, often `pay.*` | Tiers, benefits, renewals |
| `staff.cms` | Staff → Website | content store | Page copy, nav, site settings |
| `staff.comms` | Staff | mail connector | Newsletter, outreach |
| `staff.finance` | Staff | `pay.*` / Plaid | Payments, budget, expenses |
| `staff.pos` | Staff | `pay.square` | In-person / terminal |
| `connect.wix` | — | secrets | SHMS VIP CMS path |
| `connect.square` | — | secrets | Checkout + POS |
| `connect.plaid` | — | secrets | Bank sync |
| `platform.trial` | All (gated) | CRM DB | Host→tenant, trial lock — **not** for SHMS VIP |

**Rules**

1. Capability may span surfaces (e.g. programs = public list + staff edit + optional portal enroll).  
2. Dependencies are explicit (retail without Square = browse-only or hidden checkout).  
3. Customer **manifest** = enabled capability set (+ connectors + hosting SKU).  
4. Code stays one tree; manifests decide what is visible, routed, and promoted.

We already do a thin version of this: demo hides live money/POS workspaces; platform gates commerce until Square connects; staff roles gate workspaces. Packaging makes that **customer-selectable**, not only env-hardcoded.

## Customer SKUs (hosting) vs capability packs (product slice)

| Layer | Meaning | Examples |
|-------|---------|----------|
| **Hosting SKU** | Where it runs | VIP dedicated Vercel (SHMS), shared multi-tenant trial, Wix wall (Lumi today) |
| **Capability pack** | What product they get | “Marketing + staff CMS”, “Programs + portal”, “Full SHMS”, “Retail + POS” |

Lumi: **some capabilities, not all** — pick a pack; stay on Wix until/unless they take Pavilion hosting.

SHMS: **VIP dedicated hosting** + large capability set (near-full). Still not forced onto multi-tenant trial platform.

## Deploy / promote without “all or nothing”

| Move | What happens |
|------|----------------|
| Ship Pavilion demo | Product only — brand packs for prospects |
| Promote path allowlist | Copy only modules/paths for enabled capabilities into customer tree (future; today promote is broader) |
| Customer ship | VIP: `ship-stone-hill`; shared: demo/platform host; Wix wall: customer repo / CMS |
| Hotfix | Customer tree → port back to Pavilion so product stays ahead |

Near-term: document packs + gate UI/API with a capability registry.  
Later: tighten `promote-to-shms` / customer sync to path allowlists per pack.

## Lumi example packs (illustrative)

| Pack | Include | Exclude (for now) |
|------|---------|-------------------|
| **Lite site** | `site.marketing`, `staff.cms` | Portal, retail, POS, Plaid |
| **Programs** | Lite + `site.programs`, optional `portal.family` | Finance, POS |
| **Full ops** | Programs + `staff.comms` + `portal.membership` | POS until Square |

Exact Lumi pick is a sales/ops decision; the product must support **partial** enablement.

## Code homes (today → next)

| Today | Next |
|-------|------|
| `lib/audience.ts` staff workspaces | Map workspaces → capability IDs |
| `lib/demo/commons-surface.ts` demo hides | Customer manifest + demo as one preset |
| `lib/crm/commerce-gate.ts` | Capability `pay.square` / `site.retail` |
| Brand packs | Skin only — **not** the same as capability packs |
| Env `DEMO_*` / `PAVILION_*` | Hosting mode; manifests sit beside env |

Registry stub: `frontend/lib/crm/capabilities.ts` (declarative IDs + presets). Wiring flags into every route is backlog **P8**.

## Do not

- Split into three deployable Next apps until a customer SKU truly needs it (cost/complexity).  
- Put Lumi or SHMS on trial multi-tenant hosts just to “share code.”  
- Confuse brand pack (look) with capability pack (what works).

## Related

- [CUSTOMER-SHMS-VIP.md](./CUSTOMER-SHMS-VIP.md)  
- [CUSTOMER-LUMI.md](./CUSTOMER-LUMI.md)  
- [PRODUCT-VS-CUSTOMER.md](./PRODUCT-VS-CUSTOMER.md)  
- [SITE-CAPABILITY-AUDIT.md](./SITE-CAPABILITY-AUDIT.md) (SHMS-era matrix — still useful)
