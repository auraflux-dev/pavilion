# Commons demo instance (Riverside Elementary)

Separate Vercel project **`commons-pto-demo`**. URL: https://commons-pto-demo.vercel.app
Board join: https://commons-pto-demo.vercel.app/review?code=riverside-board

Do **not** use Clerk (too expensive). Prefer Better Auth later. Demo users are signed review cookies (`demo_review`). Sample CRM is `frontend/lib/crm/` (Nguyen paid Family, Patel paid Member, Brooks free). Review join can fill Jordan Lee (staff), Alex Nguyen (paid), or Riley Brooks (free). After join/switch, use a full page load so `useAuth` module cache does not keep the previous lane.

Env (demo project only, production): `DEMO_INSTANCE=true`, `NEXT_PUBLIC_DEMO_INSTANCE=true`, `DEMO_JOIN_CODE`, `DEMO_SIGNING_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL` (Render **commons-crm**, live). Better Auth path: `/api/id`. Do not set `DATABASE_URL` on Stone Hill `frontend`.
Demo is **not** git-connected. After every application ship, deploy `commons-pto-demo` from a **clean worktree of the same SHA** as Stone Hill `frontend`. Catch-up: `node scripts/commons-parity.mjs`. Plaid stays on Trial until paying clients.

## Tour lanes

Banner / review join:
- **Staff** — `lane=both`, paid parent household when they open Member
- **Paid parent** — `lane=parent`, `parentKind=paid` (Family/lagoon, Maya + Leo, grades 3 and 5)
- **Free parent** — `lane=parent`, `parentKind=free` (Casey, grade K)

CSRF must allow the request origin (demo host). Join was `Forbidden origin` until same-origin was added in `frontend/lib/security/csrf.ts`.

Identity: Riverside Elementary PTO, Fairhaven, Hawks, The Perch, Perch Card, `riversidepto.org`.
