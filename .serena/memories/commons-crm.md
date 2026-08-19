Commons CRM Postgres + Better Auth (no Clerk).

- Render Postgres **commons-crm** (`dpg-da2fomm417fc73eq5jng-a`, virginia, free, expires 2026-09-18). Dashboard: https://dashboard.render.com/d/dpg-da2fomm417fc73eq5jng-a
- App uses `DATABASE_URL` only when `DEMO_INSTANCE=true`. Better Auth is at `/api/id` (not `/api/auth`).
- `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` are on the commons-pto-demo Vercel project.
- Join (`/api/demo/join`) upserts `people` and creates a Better Auth session when `DATABASE_URL` is set. First request runs schema + Better Auth migrations + Riverside seed.
- Neon Marketplace install is blocked until treasurer accepts https://vercel.com/treasurer-4353s-projects/~/integrations/accept-terms/neon?source=cli (`-m auth=false --plan free_v3`).
