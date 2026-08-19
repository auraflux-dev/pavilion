# Commons Postgres backups

- Nightly cron `GET /api/cron/backup-commons-pg` (Vercel `30 7 * * *`) dumps public tables as gzip AES-GCM JSON to R2 `commons/yyyy-mm-dd/commons-pg.json.gz.enc` and `commons/latest/`.
- This is a logical dump (Vercel has no `pg_dump` binary). Prefix `commons/` — never mix with SHMS `shmspto/cms/`.
- Demo DB = **commons-crm**. Prod DB = **commons-prod**. Cron runs on the project whose `DATABASE_URL` it uses (demo today).
- Encrypt key: `CONNECTOR_KEK` or `BACKUP_ENCRYPTION_KEY` or SHA-256 of `BETTER_AUTH_SECRET`.
- Miss: `organization_sync_state.backup_error` + Staff red chip + `/api/health?deep=1` `syncSilence` after a failed run.

## Restore (prod)

1. Provision a scratch Render Postgres (not auraflux-pg, not the live writer).
2. Download the dated object from R2, gunzip, AES-GCM decrypt (`frontend/lib/crm/crypto.ts` format: iv12 + tag16 + ciphertext).
3. JSON `{ data: { tableName: rows[] } }`. Load `organizations` first, then `people`, `households`, then children. Skip Better Auth tables if you will re-login users, or load `user`/`session`/`account`/`verification` if present.
4. Point a preview `DATABASE_URL` at scratch and hit `/api/health?deep=1`.
5. Record the drill date here.

## First drill (2026-08-19)

- **commons-prod** created empty (`dpg-da2t0167bikc73bmb9og-a`, basic_1gb, Virginia). Schema is applied on first Commons request via `ensureCommonsReady`.
- No paying PII on prod yet. Drill proved: paid instance is `available`; restore path is documented; first encrypted dump happens when demo cron runs with R2 + `DATABASE_URL`.
- PITR: Hobby workspace = 3 days on paid Postgres. Upgrade Render workspace to Pro for 7 days.
