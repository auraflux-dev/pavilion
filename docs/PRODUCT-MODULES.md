# Product modules (Pavilion + Business Rocket)

**Audience: product**

## Why

Customers do not get every site, portal, and staff feature by default.
Each build is a **checked module set**. Same idea for:

- **Pavilion** (`onpavilion.com`) and its school / PTO customers
- **Business Rocket** (`businessrocket.ai`) and its service-business customers

## How

1. **Catalog** — `frontend/lib/modules/catalog.ts`  
   One list of module IDs (`site.*`, `portal.*`, `staff.*`, `connect.*`, `platform.*`, `br.*`) with `products: ['pavilion' | 'businessrocket']`, group, surface, optional `requires`.
2. **Presets** — demo (full), trial (leaner), SHMS VIP, BR starter.
3. **Store** — `cms_org_modules.modules_json` per org (`lib/modules/store.ts`).
4. **Staff UI** — Client Staff **Modules** (admin) and Platform Staff **Modules**. Product toggle shows Pavilion vs BR catalog rows.
5. **Gates** — `requireOrgModule` / `orgHasModule`. Start wiring routes as features ship; community is gated first.

## Code

```text
frontend/lib/modules/catalog.ts
frontend/lib/modules/store.ts
frontend/lib/modules/gate.ts
frontend/app/api/staff/modules/route.ts
frontend/components/staff/staff-modules-panel.tsx
```

## Business Rocket

Pavilion defines the shared catalog. BR apps should:

- Filter `modulesForProduct('businessrocket')`
- Persist enabled IDs the same way (org-scoped JSON)
- Not fork naming (`br.scheduling`, etc. stay in this catalog)

## Related

- [SOLUTION-PACKAGING.md](./SOLUTION-PACKAGING.md)
- Live www is **`commons-site`** (`www.onpavilion.com`). Marketing tokens live in `commons-site/app/globals.css` and must match product (`frontend/app/globals.css`). `frontend/app/(pavilion-brand)/` is the in-app brand surface on the demo host after domain cutover.
