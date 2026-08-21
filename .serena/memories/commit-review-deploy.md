# Commit → staging → Rob OK → prod → push (critical)

Every agent on `wix-shmspto` must follow Staging-first. See `.cursor/rules/ship-after-serena.mdc`.

**Stone Hill staging (stable):** https://shmspto.vercel.app

After Serena QA on application code:

1. **Commit** task files only (local). Do **not** push yet.
2. **Staging** deploy from a clean worktree of that SHA (`node scripts/deploy-staging.mjs --cwd <worktree>`).
   That deploys Preview then aliases to `shmspto.vercel.app`.
   - Pavilion marketing → `commons-site`
   - Pavilion demo/trial → `commons-pto-demo` / `commons-pto`
3. **STOP.** Paste **https://shmspto.vercel.app**. “Done” means staging is up, not production.
4. Wait for Rob: `looks good` / `ship it` / `promote` / `go live` / `prod` / `push` / `OK`.
5. Then promote or `vercel --prod` from the **same SHA**, **then** `git push`.
6. After Stone Hill app ship: **ask** before also shipping Pavilion from that SHA.

## Staff-only exception

Staff dashboard, `/staff`, `components/staff`, `app/api/staff`, staff permissions/roles with **no** public visitor UI change:
Serena QA → commit → **production** from clean worktree → `git push`.
**Skip staging.** Do not wait for Rob OK.
If the commit also touches public pages, membership, checkout, or visitor copy, use full Staging-first.

Forbidden: commit → `--prod` → push without staging + Rob OK (except staff-only and rules/docs).
Forbidden: give Rob ephemeral `frontend-*.vercel.app` Preview links for Stone Hill.

Rules/docs/memories only: commit + push, skip staging/prod.

Never secrets, tmp, spirit-wear dumps, unrelated memories. Never mix Stone Hill and Pavilion env.
