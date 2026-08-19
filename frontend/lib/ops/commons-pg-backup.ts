/**
 * Encrypted Commons Postgres dump → R2 prefix commons/yyyy-mm-dd/.
 * Vercel does not ship pg_dump; this is a gzip JSON logical dump of public tables.
 * Restore: decrypt, gunzip, INSERT in FK order (see .serena/memories/commons-backups.md).
 */
import { gzipSync } from 'node:zlib'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { encryptJson } from '@/lib/crm/crypto'
import { listOrganizationIds } from '@/lib/crm/tenant'
import { markSyncError, markSyncOk } from '@/lib/crm/sync-state'
import { reportError } from '@/lib/observability/error-reporting'

function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BACKUP_BUCKET?.trim(),
  )
}

function makeR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID!.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
  })
}

const SKIP = new Set(['pg_stat_statements'])

export async function runCommonsPgBackup(): Promise<{
  ok: boolean
  createdAt: string
  r2Key?: string
  tableCount: number
  note: string
}> {
  const createdAt = new Date().toISOString()
  if (!commonsDbEnabled()) {
    return { ok: false, createdAt, tableCount: 0, note: 'Commons database is not configured' }
  }
  if (!r2Configured()) {
    const note = 'R2 not configured for Commons dumps'
    await reportError(new Error(note), { route: 'commons-pg-backup' })
    for (const orgId of await listOrganizationIds()) {
      await markSyncError(orgId, 'backup', note)
    }
    return { ok: false, createdAt, tableCount: 0, note }
  }

  try {
    const tables = await sql<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' order by tablename`,
    )
    const data: Record<string, unknown[]> = {}
    for (const { tablename } of tables.rows) {
      if (SKIP.has(tablename)) continue
      const quoted = tablename.replace(/"/g, '""')
      const rows = await sql(`select * from "${quoted}"`)
      data[tablename] = rows.rows
    }

    const payload = encryptJson({
      meta: {
        createdAt,
        engine: 'commons-postgres-logical',
        site: 'commons',
        notShmsWix: true,
      },
      data,
    })
    const body = gzipSync(Buffer.from(payload, 'utf8'), { level: 6 })
    const day = createdAt.slice(0, 10)
    const key = `commons/${day}/commons-pg.json.gz.enc`
    const latest = 'commons/latest/commons-pg.json.gz.enc'
    const bucket = process.env.R2_BACKUP_BUCKET!.trim()
    const client = makeR2Client()
    for (const k of [key, latest]) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: k,
          Body: body,
          ContentType: 'application/octet-stream',
          Metadata: { site: 'commons', engine: 'postgres-logical' },
        }),
      )
    }

    for (const orgId of await listOrganizationIds()) {
      await markSyncOk(orgId, 'backup')
    }

    return {
      ok: true,
      createdAt,
      r2Key: key,
      tableCount: Object.keys(data).length,
      note: `Uploaded s3://${bucket}/${key}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await reportError(err, { route: 'commons-pg-backup' })
    for (const orgId of await listOrganizationIds()) {
      await markSyncError(orgId, 'backup', message)
    }
    return { ok: false, createdAt, tableCount: 0, note: message }
  }
}
