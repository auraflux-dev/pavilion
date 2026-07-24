# Commands
- Frontend dev: `npm run dev --prefix frontend`
- Frontend typecheck: `cd frontend && npx tsc --noEmit`
- Frontend lint: `npm run lint --prefix frontend`
- Production build: `npm run build --prefix frontend`
- Seed/update Wix CMS: `node --env-file=frontend/.env.local scripts/seed-cms-content.mjs`
- Generate/update PTO Drive docs: scripts under `scripts/` using local Google OAuth credentials.
- Root Wix CLI dev: `npm run dev`; avoid root install postinstall in CI (interactive `wix sync-types` is skipped there).