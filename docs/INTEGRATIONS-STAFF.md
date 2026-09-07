# Integrations in Staff

**Audience: product**

Connectors are configured by **client Staff** for their org. **Platform Staff** supports without putting VIP school secrets on the Pavilion (robert-4220) wall.

## Shared platform (demo / trial / multi-tenant)

| Connector | Who connects | Where tokens live today | Notes |
|-----------|--------------|-------------------------|--------|
| **Square** | Client Staff | `organization_connectors` + `/api/commons/square/oauth/*` | Primary payments path today |
| **Other card processors** | — | — | Only if a school cannot use Square |
| **Google / Gmail** | Client Staff | Better Auth / workspace OAuth paths | Ready now for Inbox / Calendar / Docs |
| **Microsoft 365** | — | — | **Roadmap** for Outlook / Teams schools |
| **Plaid** | Client Staff | `/api/commons/plaid/*` → `organization_connectors` | Bank sync for budget |
| **Canva** | Client Staff | OAuth + staff Canva routes | Optional |
| **Upload / no Canva** | Client Staff | CMS media upload | PNG/JPG in newsletter and creative flows |
| **Figma / Adobe Express** | — | — | Later if boards ask |
| **Brand from URL** | Client Staff | Suggest API → `cms_site_brand` | Light public https scan (SSRF-hardened). Boards can also Inspect logo/colors and paste/upload |
| **Stripe (SaaS)** | Buyer via marketing `/start` | HSKRG Stripe (commons-site) | Software invoice only. Not parent fees |

## VIP SHMS (dedicated)

| Connector | Who connects | Where tokens live today | Notes |
|-----------|--------------|-------------------------|--------|
| **Square / Wix / Plaid / Google / Canva** | School Staff | Treasurer env + Wix CMS collections | Never on robert-4220 |
| Promote | Platform → school tree | `promote-to-shms.mjs` | Does not copy secrets |

## Rules

- Client Staff is the home for onboarding connectors.
- Platform Staff can switch org and help; do not pull live SHMS Wix/Plaid/Square into pavilion env.
- Capability IDs (`connect.square`, etc. in `lib/crm/capabilities.ts`) are the future gate. Runtime still uses env / commerce gate / role checks today (P8).

## Related

- [CLIENT-ONBOARDING.md](./CLIENT-ONBOARDING.md)
- [PAVILION-BUYER-VS-SCHOOL-SURFACES.md](./PAVILION-BUYER-VS-SCHOOL-SURFACES.md)
- [CUSTOMER-SHMS-VIP.md](./CUSTOMER-SHMS-VIP.md)
- [SOLUTION-PACKAGING.md](./SOLUTION-PACKAGING.md)
