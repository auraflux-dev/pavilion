After finishing website/member/staff code changes: have Serena review the diff (diagnostics + a pass over the changed files). If that review passes, commit without asking, push to GitHub (origin, current branch), and deploy production. Do not ask Rob whether to commit, push, or deploy.

Commit only the files for the current task. Never commit secrets, .DS_Store, tmp/, spirit-wear photo dumps, or unrelated .serena memories.

Deploy from repo root (`~/wix-shmspto`), not `frontend/`. Production is Vercel (www.shmspto.org) **and** Commons `commons-pto-demo` from the same SHA (Commons is not git-connected). Pushing `main` also triggers Vercel git deploy for Stone Hill — still run production deploy if git deploy is not already in flight. Catch-up: `node scripts/commons-parity.mjs`.
