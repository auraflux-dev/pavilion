# Demo instance (vanilla PTO)

- SHMS production (`www.shmspto.org`, Vercel project `frontend`) must never set `DEMO_INSTANCE` or `NEXT_PUBLIC_DEMO_INSTANCE`.
- Demo is a separate Vercel project with `DEMO_INSTANCE=true`, `NEXT_PUBLIC_DEMO_INSTANCE=true`, `DEMO_JOIN_CODE`, `DEMO_SIGNING_SECRET`.
- Public copy is vanillaized to Riverside Middle School PTO (Hawks, Campus Store, Campus Card, Member/Family/Patron).
- Board join: `/review` with the join code. Cookie `demo_review`. Staff sees all roles. Writes return preview-only JSON. Staff/portal PII routes return sample families, never Stone Hill roster/mail/money.
- Do not strip Stone Hill copy in SHMS CMS. Demo overlay is code-only.
