Commons CRM Postgres + Better Auth (no Clerk).

- Demo Render Postgres **commons-crm** (`dpg-da2fomm417fc73eq5jng-a`, virginia, free, expires 2026-09-18). Dashboard: https://dashboard.render.com/d/dpg-da2fomm417fc73eq5jng-a
- Production Render Postgres **commons-prod** (`dpg-da2t0167bikc73bmb9og-a`, virginia, **basic_1gb** paid, 15 GB). Dashboard: https://dashboard.render.com/d/dpg-da2t0167bikc73bmb9og-a. Empty on purpose — do not seed Riverside demo data here. Workspace is still **My Workspace** (Hobby): paid Postgres PITR window is **3 days** until the workspace is upgraded to **Pro ($25/mo)** for **7-day** PITR. IP allow-list was not settable via MCP (`ipAllowList` null); set CIDRs in the dashboard (avoid leaving production on `0.0.0.0/0` once Vercel static egress exists).
- Do **not** use **auraflux-pg** (`dpg-d7ojt8l8nd3s739hcli0-a`). Separate product. Idle Auraflux is not a reason to share databases.
- Demo allow-list is still `0.0.0.0/0`. Production **commons-prod** must get a dashboard CIDR list; do not copy demo’s everywhere-open list onto paying PII.
- `DATABASE_URL` is on Vercel **commons-pto-demo** production only (never Stone Hill `frontend`). Runtime also requires `DEMO_INSTANCE=true` or `COMMONS_PLATFORM=true`. Demo URL stays on **commons-crm**. Point a future paying Commons project at **commons-prod** only. Optional `CONNECTOR_KEK` (32-byte base64) encrypts tenant Square/Plaid tokens; otherwise derived from `BETTER_AUTH_SECRET`.
- Better Auth is at `/api/id` (not `/api/auth`). `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` are on the demo project.
- Join (`/api/demo/join`) upserts `people`, runs schema + Better Auth migrations + Riverside seed on first request, and sets a Better Auth session cookie.
- Neon Marketplace is unused; stay on this Render instance.
