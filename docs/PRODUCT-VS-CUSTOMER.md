# Product vs customer work (HSKRG / agents)

**Audience: product**

## Why

Pavilion is the product we sell. Stone Hill and Lumi are customers. Tickets and wiki pages must say which, so agents do not treat www.shmspto.org as the product home or blur customer ops with shared features.

## How

| Kind | Label | Edit home | Ship |
|------|-------|-----------|------|
| Product | `product` | `~/pavilion` | `ship-pavilion.mjs` → commons-pto-demo (and marketing when relevant) |
| Customer | `customer:…` | customer repo after promote | customer **staging** first, then **prod** |

Wiki Why line must be: `Audience: product` | `Audience: customer:…`

### Feature ship ladder (default)

1. **Pavilion** — build on `~/pavilion`, browser QA + e2e as needed, ship **commons-pto-demo**. Stay here until the feature is fully built and trusted.
2. **Customer staging** — promote/ship into that customer’s staging host. Browser/e2e again there.
3. **Customer prod** — only after staging is good. Never jump product → customer prod.

Do not mix “feature is done on Pavilion” with “live at a school.” Customer promote is a separate, intentional step after product QA.

Upsert to HSKRG Work when API key available:

- spaceKey: `HOME`
- slug: `product-vs-customer`
- title: `Product vs customer work`

## Code / commands

```bash
# Product (always first)
cd ~/pavilion && node scripts/ship-pavilion.mjs --target commons-pto-demo

# Customer promote / staging / prod — only when Rob asks for a named customer
# (each customer has its own staging and prod wall; see that customer’s ship map)
```

### Enrichment tuition ↔ ecommerce catalog

Product work in Pavilion: Programs Staff fee syncs to a Wix Stores catalog SKU (`Programs.productId`), same price home as memberships/Cove. Wiki: `HOME/product-ep-catalog-tuition`.
