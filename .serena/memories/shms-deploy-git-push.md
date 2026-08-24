# SHMS deploy (Stone Hill only)

Repo: **auraflux-dev/shmspto** (not `wix-shmspto` for school ships).

Vercel: team **treasurer-4353s-projects**, project **`frontend`**, domains **www.shmspto.org** / **shmspto.org**.

## Agent ship order

1. Serena QA (application code)
2. **Commit** task files only
3. **Push** `main` on `auraflux-dev/shmspto`
4. Treasurer Vercel **auto-deploys** production (Git-connected)
5. Confirm: `node scripts/check-prod-deploy.mjs` (run from **shmspto** repo)

## What agents cannot do

- `vercel deploy` / `vercel --prod` for SHMS without treasurer CLI login (banned team for Pavilion work anyway)
- Create or deploy to a `frontend` project on **robert-4220**

## Pavilion (this monorepo)

`auraflux-dev/wix-shmspto` → robert-4220: `commons-site`, `commons-pto-demo`, `commons-pto`, `hskrg-work`. Separate env wall. See `two-repo-extract.mdc`.
