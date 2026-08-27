# Enrichment season catalog (locked)

- Public `/programs` catalog is **Fall / Spring** season tabs. **No Full year catalog tab.**
- `SPRING_CATALOG_ENABLED` in `frontend/lib/programs/season.ts` gates Spring on **www** (default **false** until RFPs clear).
- Staging / Preview (`shmspto.vercel.app`, Vercel Preview) can list Spring earlier via `isProgramsReviewHost` → `isSpringCatalogListed({ reviewHost })`.
- Placeholder Spring nights: `frontend/lib/programs/spring-2027-ep.ts` + `/programs/spring-2027` (packet schedule). CMS Spring rows still TBD.
- Staff → Programs → Calendar includes **Planning calendar**: add ICS/webcal URL or paste ICS (`StaffCalendarSources`), month overlay vs EP nights, conflict chips. Parser: `frontend/lib/programs/ics.ts`.
- `FULL_YEAR_CATALOG_ENABLED` stays **false**; full-year buy can be built later, stay dark.
- CMS field `Programs.season`: `fall-2026` | `spring-2027` | `full-year` (infer from dates/tags/fallEpClassId if empty).
- Checkout for every enrichment class keeps **enrichment-waiver + enrichment-medical + photo-release**. Do not replace with site `/terms`. `requiresWaiver` CMS flag is separate from that consent stack.

## Ecommerce catalog tuition (product)

- List tuition lives in **Wix Stores** like memberships/Cove. Programs CMS field `productId` links the SKU; `fee` is edited in Staff and mirrored to the catalog on save.
- Lib: `frontend/lib/staff/program-catalog-product.ts` · checkout reads via `resolveProgramListFee`.
- Not on Cove/Spirit allowlists; still charged as `kind: program` (roster + discounts).
- **SHMS promote:** wait until Fall EP sales cycle completes before promoting this to `shmspto` / www.

## Volunteer signups in Staff

- `/volunteer` writes `Volunteers` CMS; Staff → Volunteers lists them (status workflow).
- Audit of remaining Wix-only form queues: `docs/STAFF-VS-WIX-CMS.md` (ContactSubmissions next).