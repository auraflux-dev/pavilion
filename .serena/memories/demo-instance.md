# Demo instance (vanilla PTO)

- SHMS production (`www.shmspto.org`, Vercel project `frontend`) must never set `DEMO_INSTANCE` or `NEXT_PUBLIC_DEMO_INSTANCE`.
- Demo is a separate Vercel project `commons-pto-demo` with `DEMO_INSTANCE=true`, `NEXT_PUBLIC_DEMO_INSTANCE=true`, `DEMO_JOIN_CODE`, `DEMO_SIGNING_SECRET`.
- Demo seed is original copy for **Riverside Middle School PTO** in Fairhaven (Hawks, The Perch, Perch Card, Member/Family/Patron). `vanillaizeIfDemo` is a safety net for leftover SHMS strings, not the primary content path.
- Board join: `/review` with the join code. Cookie `demo_review`. Staff sees all roles. Writes return preview-only JSON. Staff/portal PII routes return sample families, never Stone Hill roster/mail/money.
- Do not strip Stone Hill copy in SHMS CMS. Demo overlay and seed are code-only.
