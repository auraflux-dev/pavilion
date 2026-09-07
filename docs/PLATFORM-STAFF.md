# Platform Staff (Pavilion enterprise)

**Audience: product**

## Why

Client Staff runs one school. Platform Staff (`@onpavilion.com`) runs the **fleet**: trials, connectors, brand gaps, support, and health.

Same `/staff` shell and workspace feel as school Staff. Different workspace catalog when the operator is in **platform mode**.

## Host

| Host | Who |
|------|-----|
| **`staff.onpavilion.com`** | Pavilion company Platform Staff (this product) |
| `www.onpavilion.com` | Marketing. Footer / mobile menu → Platform Staff |
| `demo.onpavilion.com` | Customer school demo. Client Staff tour only |

Sign in: https://staff.onpavilion.com/staff with `@onpavilion.com`.  
Platform owners who open `/staff` on the demo are redirected to the staff host.

## Surfaces

| Mode | Who | What they see |
|------|-----|----------------|
| **Platform mode** | Platform owners | Fleet Home, Tenants, Onboarding, Support, Health, Help |
| **Serving client** | Platform owners after Open client Staff | School Client Staff for the selected org, with Serving banner |
| **Client Staff** | Buyer board | Unchanged school ops |

VIP SHMS is dedicated (`docs/CUSTOMER-SHMS-VIP.md`). It is not a normal editable trial in the Tenants list.

## Mode model

```text
Platform Home (staff.onpavilion.com)
  → Tenants → {org}
      → Connectors / Brand / Notes
      → Open client Staff
      → banner: Serving {org} · Exit to Platform
```

Cookies:

- `pavilion_cms_org` — which customer CMS org writes target
- `pavilion_platform_mode` — `platform` (fleet) or `client` (school shell)

`staff.onpavilion.com` defaults to **fleet** mode. Public demo stays Client Staff for board tours. Platform owners on demo are sent to the staff host.

## Workspaces

| Id | Purpose |
|----|---------|
| `home` | Fleet needs-attention |
| `tenants` | Search orgs; open detail |
| `tenant` | Detail tabs (overview, connectors, brand, notes) |
| `onboarding` | Sales → trial ladder |
| `support` | Cross-tenant asks (no live school PII) |
| `health` | Deploy / connector summary |
| `help` | Platform KB |

## Code

```text
frontend/lib/crm/product-host.ts          # PAVILION_PLATFORM_STAFF_HOST, surface "platform"
frontend/lib/staff/platform-workspaces.ts
frontend/lib/crm/platform-mode.ts
frontend/components/staff/staff-platform-console.tsx
frontend/app/api/staff/platform/*
```

## Related

- [PAVILION-BUYER-VS-SCHOOL-SURFACES.md](./PAVILION-BUYER-VS-SCHOOL-SURFACES.md)
- [CLIENT-ONBOARDING.md](./CLIENT-ONBOARDING.md)
- Wiki: `HOME/product-platform-staff`
