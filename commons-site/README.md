# Commons marketing site

Public marketing for the Commons PTO OS.

- List: **$399/mo** (Square subscription on the **Auraflux** seller)
- Demo CTA: https://commons-pto-demo.vercel.app/review?code=riverside-board
- Never use Stone Hill / school Square credentials here

## Local

```bash
cd commons-site
cp .env.example .env.local   # fill Square + commons-prod URL
npm run dev
```

## Square plan (one-time)

```bash
SQUARE_ACCESS_TOKEN=… SQUARE_ENVIRONMENT=production \
  node --experimental-vm-modules ../node_modules/square 2>/dev/null
# From repo root with commons-site deps:
cd commons-site && \
  SQUARE_ACCESS_TOKEN=… SQUARE_ENVIRONMENT=production \
  node ../scripts/sales/square-commons-plan.mjs
```

Set `SQUARE_COMMONS_PLAN_VARIATION_ID` from the script output on the Vercel project.

## Deploy

Vercel project **commons-site**, root directory `commons-site`, not git-connected.
Deploy from a clean worktree of the shipped SHA.
