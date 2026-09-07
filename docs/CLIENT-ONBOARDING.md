# Client onboarding ladder

**Audience: product**

How a new Pavilion client org goes from sales to live. Buyers work in **Staff**. There is no Pavilion-customer member portal.

## Ladder

```text
1. Sales / start form → trial org + host ({slug}.onpavilion.com)
2. Platform Staff creates or claims org (org switcher)
3. Client Staff invite (board roles)
4. Connectors in Client Staff: Square, Google, Canva, Plaid as needed
5. Brand + CMS content (school skin; prune surfaces you do not offer)
6. Unlock live commerce when Square is connected (commerce gate)
7. Go-live checklist
   VIP SHMS: dedicated promote path only when intentional (not this ladder)
```

## Who does what

| Step | Client Staff | Platform Staff (`@onpavilion.com`) |
|------|--------------|--------------------------------------|
| Trial / brand pack | Review and prune | Seed trial, host, pack |
| Board invites | Accept roles | Help if stuck |
| Square / Google / Canva / Plaid | Connect in Staff | Guide; never store VIP school secrets on robert-4220 |
| CMS / pages | Edit school content | Can switch org and assist |
| Pay (HSKRG Stripe) | Pay via /start or sales | Confirm subscription |
| Billing day-to-day | `/account` magic link | Support |

## Pay vs go-live

Pay locks look and feel and starts the SaaS invoice.
Go-live (parent money on school Square) waits on Staff connectors and content.

We do not auto-provision a live tenant the moment Stripe checkout completes.

## Commands / code

- Trial / host: `frontend/lib/crm/tenant.ts`, `/api/commons/trial/*`
- Platform owners: `frontend/lib/crm/platform-owners.ts`
- Connectors UI: `frontend/components/staff/staff-commons-connectors-panel.tsx`
- **Client onboarding checklist (platform Staff home):** `frontend/components/staff/staff-client-onboarding-panel.tsx`
- Commerce gate: `frontend/lib/demo/commerce-gate.ts`
- Marketing start: `commons-site/app/start`

## Related

- [PAVILION-BUYER-VS-SCHOOL-SURFACES.md](./PAVILION-BUYER-VS-SCHOOL-SURFACES.md)
- [INTEGRATIONS-STAFF.md](./INTEGRATIONS-STAFF.md)
- Wiki: `HOME/product-client-onboarding`
