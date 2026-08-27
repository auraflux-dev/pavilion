# Enrichment season catalog (locked)

- Public `/programs` catalog is **Fall / Spring** season tabs. **No Full year catalog tab.**
- `SPRING_CATALOG_ENABLED` in `frontend/lib/programs/season.ts` gates Spring on **www** (default **false** until RFPs clear).
- Staging / Preview (`shmspto.vercel.app`, Vercel Preview) can list Spring earlier via `isProgramsReviewHost` → `isSpringCatalogListed({ reviewHost })`.
- Placeholder Spring nights: `frontend/lib/programs/spring-2027-ep.ts` + `/programs/spring-2027` (packet schedule). CMS Spring rows still TBD.
- Staff → Programs → Calendar includes **Planning calendar**: add ICS/webcal URL or paste ICS (`StaffCalendarSources`), month overlay vs EP nights, conflict chips. Parser: `frontend/lib/programs/ics.ts`.
- `FULL_YEAR_CATALOG_ENABLED` stays **false**; full-year buy can be built later, stay dark.
- CMS field `Programs.season`: `fall-2026` | `spring-2027` | `full-year` (infer from dates/tags/fallEpClassId if empty).
- Checkout for every enrichment class keeps **enrichment-waiver + enrichment-medical + photo-release**. Do not replace with site `/terms`. `requiresWaiver` CMS flag is separate from that consent stack.

## Wix = SHMS only

Wix CMS / Data / Stores live work commits to **`~/shmspto` only**. Pavilion product is not Wix for other tenants. Volunteer signup Staff queue + ContactSubmissions audit live on shmspto (`docs/STAFF-VS-WIX-CMS.md` there).
