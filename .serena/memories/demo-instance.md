# Demo instance (vanilla PTO)

- SHMS production (`www.shmspto.org`, Vercel project `frontend`) must never set `DEMO_INSTANCE` or `NEXT_PUBLIC_DEMO_INSTANCE`.
- Demo is a separate Vercel project `commons-pto-demo` with `DEMO_INSTANCE=true`, `NEXT_PUBLIC_DEMO_INSTANCE=true`, `DEMO_JOIN_CODE`, `DEMO_SIGNING_SECRET`.
- Demo school: **Riverside Elementary School** in Fairhaven (Hawks, The Perch, Perch Card). Visual theme is navy/coral (`html[data-pto=riverside]`), not SHMS forest green/cream. Photos live in `/demo/`. SHMS videos, flyers, Cove mark, and social URLs are off.
- Board join: `/review` with the join code. Cookie `demo_review`. Staff sees all roles. Writes return preview-only JSON.
- Do not strip Stone Hill copy in SHMS CMS. Demo overlay and seed are code-only.
