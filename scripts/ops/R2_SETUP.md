# SHMS R2 (CMS backups + newsletter PNGs)

Stone Hill uses one Cloudflare R2 bucket for:

- Nightly CMS JSON backups (`cms/…`)
- Newsletter hero PNGs (`newsletter-heroes/…`)

Bucket name (production): **`shmspto`**

## Required Vercel env (`frontend` project)

| Variable | Purpose |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | R2 S3-compatible access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BACKUP_BUCKET` | `shmspto` |

Local ops copy: `~/.shmspto/prod.env` (never commit).

## Probe credentials

```bash
cd frontend && ../scripts/with-prod-env.sh node scripts/shms-r2-probe.mjs
```

Healthy output includes `"putNewsletterHero": "ok"`.

If you see **Access Denied** on put but head/list work, the API token is **read-only**.

## Fix read-only token

1. Cloudflare Dashboard → **R2** → **Manage R2 API Tokens**
2. **Create API token**
   - Permission: **Object Read & Write** (or Admin Read & Write)
   - Scope: bucket **`shmspto`** only
3. Copy **Access Key ID** and **Secret Access Key**
4. Update `~/.shmspto/prod.env`:
   - `R2_ACCESS_KEY_ID=…`
   - `R2_SECRET_ACCESS_KEY=…`
   - Confirm `R2_BACKUP_BUCKET=shmspto`
5. Re-probe (step above must pass)
6. Sync to Vercel and redeploy:

```bash
./scripts/with-prod-env.sh node scripts/ops/shms-r2-vercel-env.mjs --redeploy
```

## Newsletter smoke after fix

Staff → Newsletter → Templates → **Upload PNG** → **Send test email**.

Upload hits `POST /api/staff/newsletter/upload-png` and stores under `newsletter-heroes/` in the bucket.
