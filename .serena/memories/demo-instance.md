# Commons demo instance (Riverside Elementary)

Separate Vercel project **`commons-pto-demo`** (`prj_kEgcls4K0JjeAL3kBHWwobIhKEco`, team `team_RXhJ9wjn7h5OcGCE86ILmftT`).

- URL: https://commons-pto-demo.vercel.app
- Board join: https://commons-pto-demo.vercel.app/review?code=riverside-board
- Env (demo project only): `DEMO_INSTANCE=true`, `NEXT_PUBLIC_DEMO_INSTANCE=true`, `DEMO_JOIN_CODE`, `DEMO_SIGNING_SECRET`, plus Wix read keys
- Settings must match SHMS: `framework: nextjs`, **`rootDirectory: frontend`**, `buildCommand: next build`, `installCommand: npm install`
- Demo is **not** git-connected. Pushing `main` updates SHMS (`frontend` project), not the demo, unless you deploy `commons-pto-demo` from a clean worktree of the same SHA.

## Product locks

Stone Hill (`www.shmspto.org`, Vercel project **`frontend`**) stays as shipped. Do **not** set `DEMO_INSTANCE` on the SHMS Vercel project. Do **not** rebuild a second codebase.

Architecture: one Next.js app. Demo identity/theme is gated by `isDemoInstance()` + `html[data-pto='riverside']` CSS tokens. Keep staff, member portal, checkout, and CMS.

## Identity

`frontend/lib/demo/brand.ts`:
- School: **Riverside Elementary School**
- PTO: **Riverside Elementary PTO** / **Riverside PTO**
- Town: **Fairhaven**
- Mascot: Hawks / Go Hawks!
- Store: **The Perch**
- Card: **Perch Card**
- Host: `riversidepto.org`

Visual: navy `#163a5f`, coral `#e07a5f`, cool paper `#f3f5f8`, Nunito. Assets in `frontend/public/demo/`.

## Deploy

Ship SHA via clean worktrees:
1. `git worktree add /tmp/wix-shmspto-deploy <SHA>` + copy `.vercel` → `npx vercel --prod --yes` (SHMS)
2. `git worktree add /tmp/commons-pto-demo <SHA>` + `npx vercel link --yes --project commons-pto-demo --scope treasurer-4353s-projects` → `npx vercel --prod --yes`
3. `git push origin HEAD`

Last reskin SHA: `dc143b8` (Riverside Elementary, navy/coral). SHMS production still `data-pto=shms` / Go Stingrays.
