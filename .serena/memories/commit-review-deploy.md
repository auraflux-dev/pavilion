After finishing website/member/staff code changes: Serena review (diagnostics + pass over changed files). If that passes, commit without asking, deploy the **target product** for the task from a clean worktree of that SHA, then push GitHub.

- Stone Hill task → `frontend`
- Pavilion marketing → `commons-site`
- Pavilion demo/trial → `commons-pto-demo` / `commons-pto`

After a Stone Hill application ship: **ask Rob** if the same SHA should also go to Pavilion when it makes sense. Do not auto-deploy both every time.

Commit only task files. Never secrets, .DS_Store, tmp/, spirit-wear dumps, or unrelated .serena memories.

Never mix Stone Hill and Pavilion env.
