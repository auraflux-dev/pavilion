# Commit → Preview → Rob OK → prod → push (critical)

Every agent on `wix-shmspto` must follow Preview-first. See `.cursor/rules/ship-after-serena.mdc`.

After Serena QA on application code:

1. **Commit** task files only (local). Do **not** push yet.
2. **Preview** deploy from a clean worktree of that SHA (`vercel` without `--prod`).
   - Stone Hill → `frontend`
   - Pavilion marketing → `commons-site`
   - Pavilion demo/trial → `commons-pto-demo` / `commons-pto`
3. **STOP.** Paste the Preview URL. “Done” means Preview is up, not production.
4. Wait for Rob: `looks good` / `ship it` / `promote` / `go live` / `prod` / `push`.
5. Then promote or `vercel --prod` from the **same SHA**, **then** `git push`.
6. After Stone Hill app ship: **ask** before also shipping Pavilion from that SHA.

Forbidden: commit → `--prod` → push in one turn without Preview + Rob OK.

Rules/docs/memories only: commit + push, skip Preview/prod.

Never secrets, tmp, spirit-wear dumps, unrelated memories. Never mix Stone Hill and Pavilion env.
