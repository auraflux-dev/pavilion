# Suggested commands (wix-shmspto)

## Promo videos (parent tour pipeline)
Committed under `promo-videos/` (process + creative). Docs/HOW can live in Google Drive.

```bash
# VO
NODE_PATH=~/cwn-c0/node_modules node scripts/generate_parent_vo.js
# Assemble
NODE_PATH=~/cwn-c0/node_modules node scripts/assemble_parent_tour_continuous.js
# Gemini hard gate before Rob watches
NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_parent_tour_qa.js
```

Watch file: `~/Downloads/SHMSPTO_WATCH_THIS_parent_tour_16x9.mp4`

## Ship loop (required)

### Stone Hill (www.shmspto.org)
1. Port `frontend/` changes to **`~/shmspto`** (or work in that repo directly).
2. Serena QA → commit on **`auraflux-dev/shmspto`**
3. `git push origin main` on **shmspto** → treasurer Vercel auto-deploys
4. `node scripts/check-prod-deploy.mjs` from the **shmspto** repo

Do **not** treat `wix-shmspto` `git push` as Stone Hill production. See `.cursor/rules/shms-deploy-git.mdc` and `~/shmspto/scripts/DEPLOY.md`.

### Pavilion (this monorepo)
Commit and push `wix-shmspto` for `commons-site` / demo / trial only.
