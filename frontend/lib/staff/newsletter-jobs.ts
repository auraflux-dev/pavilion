/**
 * Scheduled / approval newsletter jobs (CMS NewsletterJobs).
 * Marketing drafts; secretary/admin/president approve; cron sends when due.
 */
import { getWixClient } from '@/lib/wix-client'
import { executeNewsletterEmail } from '@/lib/staff/newsletter-execute'
import {
  NEWSLETTER_JOB_STATUSES,
  canApproveNewsletter,
  jobIsDue,
  parseJobPayload,
  type NewsletterJob,
  type NewsletterJobPayload,
  type NewsletterJobStatus,
  type NewsletterSendAudience,
} from '@/lib/staff/newsletter-jobs-pure'

export {
  NEWSLETTER_JOB_STATUSES,
  canApproveNewsletter,
  jobIsDue,
  parseJobPayload,
  type NewsletterJob,
  type NewsletterJobPayload,
  type NewsletterJobStatus,
  type NewsletterSendAudience,
}

function mapJob(row: Record<string, unknown>): NewsletterJob {
  const statusRaw = String(row.status ?? 'pending_approval')
  const status = (NEWSLETTER_JOB_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as NewsletterJobStatus)
    : 'pending_approval'
  const audienceRaw = String(row.sendAudience ?? 'members')
  const sendAudience: NewsletterSendAudience =
    audienceRaw === 'subscribers' || audienceRaw === 'test' ? audienceRaw : 'members'
  return {
    id: String(row._id ?? row.id ?? ''),
    subject: String(row.subject ?? ''),
    sendAt: String(row.sendAt ?? ''),
    status,
    sendAudience,
    needsApproval: row.needsApproval !== false,
    createdByEmail: String(row.createdByEmail ?? ''),
    createdByName: String(row.createdByName ?? ''),
    approvedByEmail: String(row.approvedByEmail ?? '') || undefined,
    approvedAt: String(row.approvedAt ?? '') || undefined,
    sentAt: String(row.sentAt ?? '') || undefined,
    error: String(row.error ?? '') || undefined,
    payloadJson: String(row.payloadJson ?? '{}'),
  }
}

export async function listNewsletterJobs(): Promise<NewsletterJob[]> {
  const client = getWixClient()
  const result = await client.items.query('NewsletterJobs').limit(100).find()
  return (result.items ?? [])
    .map((row) => mapJob(row as Record<string, unknown>))
    .filter((j) => j.id)
    .sort((a, b) => b.sendAt.localeCompare(a.sendAt) || b.id.localeCompare(a.id))
}

export async function insertNewsletterJob(opts: {
  subject: string
  sendAt: string
  status: NewsletterJobStatus
  sendAudience: NewsletterSendAudience
  needsApproval: boolean
  createdByEmail: string
  createdByName: string
  payload: NewsletterJobPayload
}): Promise<string> {
  const client = getWixClient()
  const inserted = await client.items.insert('NewsletterJobs', {
    subject: opts.subject.trim(),
    sendAt: opts.sendAt,
    status: opts.status,
    sendAudience: opts.sendAudience,
    needsApproval: opts.needsApproval,
    createdByEmail: opts.createdByEmail.trim().toLowerCase(),
    createdByName: opts.createdByName,
    payloadJson: JSON.stringify(opts.payload),
    error: null,
    sentAt: null,
    approvedByEmail: null,
    approvedAt: null,
    active: true,
  })
  return String((inserted as { _id?: string })._id ?? '')
}

export async function updateNewsletterJob(
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const client = getWixClient()
  await client.items.update('NewsletterJobs', { _id: id, ...patch })
}

export async function runNewsletterJob(job: NewsletterJob): Promise<void> {
  await updateNewsletterJob(job.id, { status: 'sending' })
  const payload = parseJobPayload(job.payloadJson)
  if (!payload) throw new Error('Invalid job payload')
  const result = await executeNewsletterEmail({
    ...payload,
    actorEmail: job.createdByEmail,
    actorName: job.createdByName,
    dryRun: false,
    sendAudience: job.sendAudience === 'test' ? 'members' : job.sendAudience,
  })
  if (!result.ok || result.send?.mode === 'unavailable') {
    throw new Error(result.error || result.send?.errors?.[0] || 'Send failed')
  }
  await updateNewsletterJob(job.id, {
    status: 'sent',
    sentAt: new Date().toISOString(),
    error: null,
  })
}

export async function approveNewsletterJob(
  id: string,
  approverEmail: string,
  now = new Date(),
): Promise<{ status: NewsletterJobStatus; sentNow: boolean }> {
  const jobs = await listNewsletterJobs()
  const job = jobs.find((j) => j.id === id)
  if (!job) throw new Error('Job not found')
  if (job.status !== 'pending_approval' && job.status !== 'scheduled') {
    throw new Error(`Cannot approve a ${job.status} job`)
  }
  await updateNewsletterJob(id, {
    approvedByEmail: approverEmail.trim().toLowerCase(),
    approvedAt: now.toISOString(),
    status: 'scheduled',
  })
  const next: NewsletterJob = { ...job, status: 'scheduled' }
  if (jobIsDue(next, now)) {
    try {
      await runNewsletterJob(next)
      return { status: 'sent', sentNow: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed'
      await updateNewsletterJob(id, { status: 'failed', error: msg.slice(0, 400) }).catch(
        () => undefined,
      )
      throw err
    }
  }
  return { status: 'scheduled', sentNow: false }
}

export async function sendDueNewsletterJobs(now = new Date()): Promise<{
  scanned: number
  sent: number
  failed: number
  errors: string[]
}> {
  const jobs = await listNewsletterJobs()
  const due = jobs.filter((j) => jobIsDue(j, now))
  const errors: string[] = []
  let sent = 0
  let failed = 0
  for (const job of due) {
    try {
      await runNewsletterJob(job)
      sent += 1
    } catch (err) {
      failed += 1
      const msg = err instanceof Error ? err.message : 'Send failed'
      errors.push(`${job.id}: ${msg}`)
      await updateNewsletterJob(job.id, { status: 'failed', error: msg.slice(0, 400) }).catch(
        () => undefined,
      )
    }
  }
  return { scanned: due.length, sent, failed, errors: errors.slice(0, 10) }
}
