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
1. Commit process + creative (not `out/` / archives — see root `.gitignore`)
2. Serena activate `wix-shmspto` + post-commit scan (no hardcoded secrets; env-only keys)
3. `git push origin main` → Vercel production auto-deploy (shmspto.org)
