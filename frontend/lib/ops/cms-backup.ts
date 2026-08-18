/**
 * CMS backup. Wix Data is the source of truth (not SQLite).
 * Nightly cron exports JSON.gz to Cloudflare R2.
 */

import { gzipSync } from 'node:zlib'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getWixClient } from '@/lib/wix-client'
import { reportError } from '@/lib/observability/error-reporting'

/** Collections that hold operational / PII-adjacent data we must retain copies of. */
export const BACKUP_COLLECTIONS = [
  'Students',
  'Memberships',
  'Payments',
  'Enrollments',
  'ProgramEnrollments',
  'ProgramAttendance',
  'EventTicketOffers',
  'EventTicketOrders',
  'Programs',
  'ProgramSessions',
  'ContractorTimesheets',
  'ExpenseReimbursements',
  'PtoBudgetLines',
  'PtoBudgetEntries',
  'StaffPlaidItems',
  'ContactSubmissions',
  'Surveys',
  'SurveyResponses',
  'ParentMessages',
  'FamilyGuardians',
  'SiteTrafficDaily',
  'Newsletters',
  'PortalCalendarEvents',
  'StaffRoles',
  'StaffTasks',
  'StaffProjects',
  'StaffGoogleTokens',
  'MeetingMinutes',
  'DiscountCodes',
  'CoveInventory',
  'SiteSettings',
  'PageContent',
  'BoardMembers',
  'NavLinks',
  'FAQItems',
  'KbArticles',
  'VolunteerOpportunities',
  'FundraisingCTAs',
  'MembershipTiers',
  'ConsentAcknowledgments',
  'StaffAuditLog',
  'Sponsors',
  'ErrorEvents',
  'BackupRuns',
] as const

export type BackupCollectionResult = {
  collection: string
  count: number
  ok: boolean
  error?: string
}

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

async function fetchAllItems(collection: string): Promise<Record<string, unknown>[]> {
  const client = getWixClient()
  const items: Record<string, unknown>[] = []
  let skip = 0
  const pageSize = 100
  for (;;) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await client.items.query(collection).limit(pageSize).skip(skip).find()
    const batch = (result.items ?? []) as Record<string, unknown>[]
    items.push(...batch)
    if (batch.length < pageSize) break
    skip += pageSize
    if (skip > 20000) break
  }
  return items
}

async function uploadR2JsonGz(opts: {
  key: string
  json: string
}): Promise<{ bucket: string; key: string }> {
  const bucket = process.env.R2_BACKUP_BUCKET!.trim()
  const body = gzipSync(Buffer.from(opts.json, 'utf8'), { level: 6 })
  const client = makeR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: body,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      Metadata: {
        site: 'shmspto',
        engine: 'wix-cms',
      },
    }),
  )
  return { bucket, key: opts.key }
}

export async function runCmsBackup(): Promise<{
  ok: boolean
  createdAt: string
  r2Bucket?: string
  r2Key?: string
  r2LatestKey?: string
  collections: BackupCollectionResult[]
  note: string
}> {
  const createdAt = new Date().toISOString()
  const collections: BackupCollectionResult[] = []
  const dump: Record<string, unknown> = {
    meta: {
      createdAt,
      site: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org',
      engine: 'wix-cms',
      notSqlite: true,
    },
    data: {} as Record<string, unknown[]>,
  }

  for (const collection of BACKUP_COLLECTIONS) {
    try {
      const items = await fetchAllItems(collection)
      ;(dump.data as Record<string, unknown[]>)[collection] = items
      collections.push({ collection, count: items.length, ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      collections.push({ collection, count: 0, ok: false, error: message })
      if (!/not found|does not exist|404/i.test(message)) {
        await reportError(err, { route: 'cms-backup', tags: { collection } })
      }
    }
  }

  const json = JSON.stringify(dump)
  const day = createdAt.slice(0, 10)
  let r2Bucket: string | undefined
  let r2Key: string | undefined
  let r2LatestKey: string | undefined
  let note = 'Export built in memory'
  let uploadOk = false

  if (!r2Configured()) {
    note =
 'R2 not configured. set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BACKUP_BUCKET'
  } else {
    try {
      const datedKey = `shmspto/cms/shmspto-cms-backup-${day}.json.gz`
      const latestKey = 'shmspto/cms/latest.json.gz'
      const dated = await uploadR2JsonGz({ key: datedKey, json })
      await uploadR2JsonGz({ key: latestKey, json })
      r2Bucket = dated.bucket
      r2Key = dated.key
      r2LatestKey = latestKey
      uploadOk = true
      note = `Uploaded to R2 s3://${dated.bucket}/${dated.key}`
    } catch (err) {
      await reportError(err, { route: 'cms-backup-r2' })
      note = err instanceof Error ? err.message : 'R2 upload failed'
    }
  }

  try {
    const client = getWixClient()
    await client.items.insert('BackupRuns', {
      createdAt,
      ok: uploadOk,
      driveFileId: r2Key || '',
      driveLink: r2Bucket && r2Key ? `r2://${r2Bucket}/${r2Key}` : '',
      collectionCount: collections.filter((c) => c.ok).length,
      itemCount: collections.reduce((n, c) => n + c.count, 0),
      note,
      summaryJson: JSON.stringify(
        collections.map((c) => ({
          collection: c.collection,
          count: c.count,
          ok: c.ok,
          error: c.error,
        })),
      ),
    })
  } catch {
    // BackupRuns collection may not exist yet
  }

  return {
    ok: uploadOk,
    createdAt,
    r2Bucket,
    r2Key,
    r2LatestKey,
    collections,
    note,
  }
}
