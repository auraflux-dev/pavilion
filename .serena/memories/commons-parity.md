# Commons follows Stone Hill ships

Same git repo. Two Vercel projects. Commons **`commons-pto-demo` is not git-connected**.

Every application ship: commit → clean-worktree deploy **frontend** (www.shmspto.org) **and** **commons-pto-demo** → push GitHub.

Catch-up: `node scripts/commons-parity.mjs` (exit 2 if Commons SHA differs). Session start hook `.cursor/hooks/commons-parity-session.py` injects the latest check. Rule: `.cursor/rules/commons-parity.mdc`.

Do not copy env between projects. Plaid stays Trial until paying clients (`mem:commons-plaid`).
