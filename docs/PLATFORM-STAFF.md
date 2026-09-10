# Platform Staff (Pavilion enterprise)

**Audience: product**

## Why

Client Staff runs one school. Platform Staff (`@onpavilion.com`) runs the **fleet**: trials, connectors, brand gaps, support, and health.

Same `/staff` shell and workspace feel as school Staff. Different workspace catalog when the operator is in **platform mode**.

Staff is always a **path** on the brand site (like `www.shmspto.org/staff`). No `staff.` subdomain.

## Host

| Host | Who |
|------|-----|
| **`www.onpavilion.com/staff`** | Pavilion company Platform Staff |
| `www.onpavilion.com` | Marketing + `/staff` (same product deploy) |
| `demo.onpavilion.com` | Customer school demo. Client Staff tour only |

Sign in: https://www.onpavilion.com/staff with `@onpavilion.com`.  
Platform owners who open `/staff` on the demo are sent to the brand site `/staff`.

## Surfaces

| Mode | Who | What they see |
|------|-----|----------------|
| **Platform mode (Pavilion)** | `@onpavilion.com` | Pavilion fleet only (unless shared demo dual-tour toggle) |
| **Brand Staff (Business Rocket)** | `@businessrocket.ai` | BR fleet only (`product=businessrocket`). No Pavilion tenants. No fleet toggle. |
| **Serving client** | Either, after Open client Staff | Client Staff for one org under that product |
| **Client Staff** | Buyer board | Unchanged school ops |

Email domain locks the brand. Host locks on `www.businessrocket.ai` / `www.onpavilion.com`.
Customer orgs are stored with `organizations.product` so sold sites stay under that brand.

VIP SHMS is dedicated (`docs/CUSTOMER-SHMS-VIP.md`). It is not a normal editable trial in the Tenants list.

## Mode model

```text
Platform Home (www.onpavilion.com/staff)
  → Tenants → {org}
      → Connectors / Brand / Notes
      → Open client Staff
      → banner: Serving {org} · Exit to Platform
```

Cookies:

- `pavilion_cms_org` — which customer CMS org writes target
- `pavilion_platform_mode` — `platform` (fleet) or `client` (school shell)

Brand host defaults to **fleet** mode. Public demo stays Client Staff for board tours.

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
frontend/lib/crm/product-host.ts          # isPavilionBrandHost, surface "brand"
frontend/lib/staff/platform-workspaces.ts
frontend/lib/crm/platform-mode.ts
frontend/components/staff/staff-platform-console.tsx
frontend/app/api/staff/platform/*
frontend/app/(pavilion-brand)/            # marketing pages on brand host
```

## Related

- [PAVILION-BUYER-VS-SCHOOL-SURFACES.md](./PAVILION-BUYER-VS-SCHOOL-SURFACES.md)
- [CLIENT-ONBOARDING.md](./CLIENT-ONBOARDING.md)
- Wiki: `HOME/product-platform-staff`
