# Neon setup (Pavilion + HSKRG Work)

**Goal:** Move side-project Postgres off Render (~$44/mo) → Neon (~$0–15/mo).  
**Keep** `auraflux-pg` on Render (production pipeline).

## 1. Create Neon account

1. Sign up at [console.neon.tech](https://console.neon.tech) with **robert@auraflux.co**
2. Create org **HSKRG** (or use personal org on that email)

## 2. Create two projects

| Project name | Plan | Region | Used by |
|---|---|---|---|
| **pavilion** | **Launch** (pay-as-you-go) | **AWS US East (N. Virginia)** | commons-pto, commons-pto-demo, commons-site |
| **hskrg-work** | **Free** | same region | hskrg-work Vercel app |

For each project:

1. Dashboard → project → **Connect**
2. Copy **pooled** connection string (for serverless/Vercel)
3. Ensure `?sslmode=require` is present

Save locally (chmod 600):

```bash
umask 077
# paste pooled URL from Neon "pavilion" project:
printf '%s' 'postgresql://...' > /tmp/neon-pavilion.url
# paste pooled URL from Neon "hskrg-work" project:
printf '%s' 'postgresql://...' > /tmp/neon-hskrg.url
```

## 3. Save Render source URLs (for migration)

```bash
# From Render dashboard → each DB → External connection string
printf '%s' 'postgresql://...' > /tmp/render-commons-prod.url
printf '%s' 'postgresql://...' > /tmp/render-commons-crm.url
```

Agent also pulls these via Render API when `RENDER_API_KEY` is available.

## 4. Run migration (agent)

```bash
cd wix-shmspto/frontend && npm install pg  # if needed for migrate script
cd wix-shmspto

node scripts/ops/neon-migrate.mjs --phase=prod       # dump commons-prod → Neon
node scripts/ops/neon-migrate.mjs --phase=crm-merge  # merge demo CRM rows
node scripts/ops/neon-migrate.mjs --phase=hskrg      # drizzle + seed hskrg-work
node scripts/ops/neon-migrate.mjs --phase=smoke      # verify both Neon DBs

node scripts/ops/neon-vercel-env.mjs                 # swap Vercel env URLs
# redeploy commons-pto, commons-pto-demo, commons-site, hskrg-work on robert-4220
```

## 5. Smoke (human)

- https://commons-pto-demo.vercel.app/review?code=66988432952500a7587ff938
- https://commons-pto.vercel.app (trial)
- https://onpavilion.com/start (Stripe sandbox checkout)
- hskrg-work Vercel URL — login, create issue + wiki page

## 6. Delete Render DBs (after smoke)

Only after Neon cutover is green:

- `commons-prod` (dpg-da2t0167bikc73bmb9og-a)
- `commons-crm` (dpg-da2fomm417fc73eq5jng-a)
- `hskrg-work` (dpg-da4j45rtqb8s73824njg-a)

**Do not delete** `auraflux-pg`.

## Expected savings

| | Render PG (side projects) | Neon |
|---|---|---|
| Today | ~$33/mo | ~$0–15/mo |
| After Sept 18 (crm paid) | ~$57/mo | ~$0–15/mo |
