# Client onboarding ladder

**Audience: product**

How a new Pavilion client org goes from sales to live. Buyers work in **Staff**. There is no Pavilion-customer member portal.

## Ladder

```text
1. Sales / start form → trial org + host ({slug}.onpavilion.com)
2. Platform Staff creates or claims org (org switcher)
3. Client Staff invite (board roles)
4. Connectors in Client Staff (pick what this school uses)
5. Brand + CMS content (URL suggest, upload, or manual)
6. Unlock live commerce when payments connector is ready
7. Go-live checklist
   VIP SHMS: dedicated promote path only when intentional (not this ladder)
```

## Connector choices (not one-size)

| Need | Ready now | Alternatives / later |
|------|-----------|----------------------|
| **Payments** | Square OAuth | Other processors only if a school requires them |
| **Board mail / calendar** | Google Workspace | **Microsoft 365 / Outlook** (roadmap) |
| **Creative** | Canva OAuth (optional) | Upload PNG/JPG in Staff; Figma / Adobe Express later if asked |
| **Brand** | Staff Brand editor | Paste URL for a light suggest; or Inspect logo/colors on the current site and paste/upload in Brand |

Onboarding is **not** “Square only.” Progress wants payments + board mail + brand. Creative stays optional.

## Who does what

| Step | Client Staff | Platform Staff (`@onpavilion.com`) |
|------|--------------|--------------------------------------|
| Trial / brand pack | Review and prune | Seed trial, host, pack |
| Board invites | Accept roles | Help if stuck |
| Connectors | Connect in Staff | Guide; never store VIP school secrets on robert-4220 |
| Brand from URL | Paste site URL or upload | Assist if scan finds nothing |
| CMS / pages | Edit school content | Can switch org and assist |
| Pay (HSKRG Stripe) | Pay via /start or sales | Confirm subscription |
| Billing day-to-day | `/account` magic link | Support |

## Pay vs go-live

Pay locks look and feel and starts the SaaS invoice.
Go-live (parent money) waits on Staff payments connector and content.

We do not auto-provision a live tenant the moment Stripe checkout completes.

## Commands / code

- Trial / host: `frontend/lib/crm/tenant.ts`, `/api/commons/trial/*`
- Platform owners: `frontend/lib/crm/platform-owners.ts`
- Connectors UI: `frontend/components/staff/staff-commons-connectors-panel.tsx`
- **Client onboarding checklist:** `frontend/components/staff/staff-client-onboarding-panel.tsx`
- **Brand from URL:** `frontend/lib/staff/suggest-brand-from-url.ts`, `/api/staff/site-brand/suggest-from-url`
- Commerce gate: `frontend/lib/demo/commerce-gate.ts`
- Marketing start: `commons-site/app/start`

## Related

- [PAVILION-BUYER-VS-SCHOOL-SURFACES.md](./PAVILION-BUYER-VS-SCHOOL-SURFACES.md)
- [INTEGRATIONS-STAFF.md](./INTEGRATIONS-STAFF.md)
- Wiki: `HOME/product-client-onboarding`
