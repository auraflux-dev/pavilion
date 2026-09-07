# Buyer Staff vs school surfaces

**Audience: product**

## Why

Pavilion sells to **org boards** (PTO/PTA staff). Those buyers must not need a separate Pavilion “member portal.”

Anything we would have built for a Pavilion-customer member experience (account setup, connectors, day-to-day ops) lives in **their Staff portal**.

**School parents** still get a **family login** on the school brand. That is part of the product sold *to* schools. Parents are end users of the school, not Pavilion SaaS customers.

Marketing `/account` is Stripe billing only (HSKRG LLC). It is not a member portal.

## Surfaces

| Surface | Who | Purpose |
|---------|-----|---------|
| **Platform Staff** | `@onpavilion.com` | Serve client orgs (org switcher, CMS, support) |
| **Client Staff** | Buyer board | Onboarding, connectors, roles, school ops |
| **Public site** | Visitors / parents | School-branded membership, events, programs |
| **Family login** | Parent households | Students, membership, store card on school brand |
| **Marketing /account** | Invoice email | Stripe invoices / cancel only |

## Diagram

```text
Pavilion company          Client PTO org
─────────────────         ─────────────────────────────
Platform Staff  ──serve──► Client Staff (buyer home)
                              │
                              ├── Public school site
                              └── Family login (parents)
```

## Rules

- Do **not** build a Pavilion SaaS member portal for buyers.
- Do **not** remove school family login from the product.
- Lead marketing with Staff as where the board lives; family login is for parents.
- VIP SHMS stays dedicated (`docs/CUSTOMER-SHMS-VIP.md`).

## Related

- [CLIENT-ONBOARDING.md](./CLIENT-ONBOARDING.md)
- [INTEGRATIONS-STAFF.md](./INTEGRATIONS-STAFF.md)
- [SOLUTION-PACKAGING.md](./SOLUTION-PACKAGING.md)
- Wiki: `HOME/product-buyer-staff-not-member`
