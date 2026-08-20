import { gzipSync } from 'node:zlib'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { encryptJson } from '@/lib/crm/crypto'
import { holdEndsAt, listOrgsForLifecycle } from '@/lib/crm/org-plan'
import { reportError } from '@/lib/observability/error-reporting'

function r2Client(): S3Client | null {
  if (
    !process.env.R2_ACCOUNT_ID?.trim() ||
    !process.env.R2_ACCESS_KEY_ID?.trim() ||
    !process.env.R2_SECRET_ACCESS_KEY?.trim() ||
    !process.env.R2_BACKUP_BUCKET?.trim()
  ) {
    return null
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
    },
  })
}

async function dumpOrg(orgId: string): Promise<Record<string, unknown[]>> {
  const tables = await sql<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`,
  )
  const data: Record<string, unknown[]> = {}
  for (const { tablename } of tables.rows) {
    const quoted = tablename.replace(/"/g, '""')
    const cols = await sql<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = $1`,
      [tablename],
    )
    const names = cols.rows.map((c) => c.column_name)
    if (names.includes('organization_id')) {
      const rows = await sql(`select * from "${quoted}" where organization_id = $1`, [orgId])
      data[tablename] = rows.rows
    } else if (tablename === 'organizations') {
      const rows = await sql(`select * from organizations where id = $1`, [orgId])
      data[tablename] = rows.rows
    }
  }
  return data
}

export async function runTrialLifecycle(now = new Date()): Promise<{
  locked: string[]
  offboarded: string[]
  notes: string[]
}> {
  const locked: string[] = []
  const offboarded: string[] = []
  const notes: string[] = []
  if (!commonsDbEnabled()) {
    return { locked, offboarded, notes: ['no database'] }
  }

  const orgs = await listOrgsForLifecycle()
  for (const org of orgs) {
    if (org.plan !== 'trial' && org.plan !== 'locked') continue
    const trialEnded = org.trialEndsAt && now.getTime() >= Date.parse(org.trialEndsAt)
    if (org.plan === 'trial' && trialEnded) {
      await sql(`update organizations set plan = 'locked' where id = $1`, [org.id])
      locked.push(org.id)
      notes.push(`Locked ${org.slug}: trial ended. Reads stay 30 more days.`)
    }

    const hold = holdEndsAt(org.trialEndsAt)
    const planNow = org.plan === 'trial' && trialEnded ? 'locked' : org.plan
    if (planNow === 'locked' && hold && now.getTime() >= hold.getTime()) {
      try {
        const payload = encryptJson({
          meta: {
            createdAt: now.toISOString(),
            orgId: org.id,
            slug: org.slug,
            engine: 'commons-offboard',
          },
          data: await dumpOrg(org.id),
        })
        const body = gzipSync(Buffer.from(payload, 'utf8'), { level: 6 })
        const client = r2Client()
        const key = `commons/offboard/${org.id}/${now.toISOString().slice(0, 10)}.json.gz.enc`
        if (client) {
          await client.send(
            new PutObjectCommand({
              Bucket: process.env.R2_BACKUP_BUCKET!.trim(),
              Key: key,
              Body: body,
              ContentType: 'application/octet-stream',
            }),
          )
          notes.push(`Exported ${org.slug} to ${key}`)
        } else {
          notes.push(`R2 missing; skipped export for ${org.slug} and did not delete`)
          await reportError(new Error(`offboard skipped, no R2: ${org.slug}`), {
            route: 'commons-trial-lifecycle',
          })
          continue
        }
        await sql(`delete from organizations where id = $1`, [org.id])
        offboarded.push(org.id)
      } catch (err) {
        await reportError(err, { route: 'commons-trial-lifecycle', organizationId: org.id })
        notes.push(`Offboard failed for ${org.slug}`)
      }
    }
  }

  return { locked, offboarded, notes }
}
