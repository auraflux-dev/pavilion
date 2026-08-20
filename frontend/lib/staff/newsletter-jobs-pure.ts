/**
 * Pure helpers for newsletter jobs (no CMS / Wix). Safe for tsx tests.
 */

export const NEWSLETTER_JOB_STATUSES = [
  'pending_approval',
  'scheduled',
  'sending',
  'sent',
  'cancelled',
  'failed',
] as const
export type NewsletterJobStatus = (typeof NEWSLETTER_JOB_STATUSES)[number]

export type NewsletterSendAudience = 'members' | 'test' | 'subscribers' | 'paid' | 'scoop'

export type NewsletterJobPayload = {
  subject: string
  message: string
  tier?: string
  grade?: string
  alsoPortal?: boolean
  utmCampaign?: string
  trackClicks?: boolean
  trackOpens?: boolean
  templateId?: string
  canvaViewUrl?: string
  canvaThumbnailUrl?: string
  canvaTitle?: string
  heroImageUrl?: string
  sendAudience?: NewsletterSendAudience
  includeSubscribers?: boolean
  testGroup?: 'me' | 'board' | 'custom' | 'board_and_custom'
  testEmails?: string
  emails?: string[]
}

export type NewsletterJob = {
  id: string
  subject: string
  sendAt: string
  status: NewsletterJobStatus
  sendAudience: NewsletterSendAudience
  needsApproval: boolean
  createdByEmail: string
  createdByName: string
  approvedByEmail?: string
  approvedAt?: string
  sentAt?: string
  error?: string
  payloadJson: string
}

export function canApproveNewsletter(
  staff: { roles?: string[] } | null,
  email: string,
): boolean {
  const roles = staff?.roles ?? []
  if (roles.includes('admin') || roles.includes('secretary')) return true
  return String(email ?? '').trim().toLowerCase() === 'president@shmspto.org'
}

export function parseJobPayload(raw: string): NewsletterJobPayload | null {
  try {
    const p = JSON.parse(raw) as NewsletterJobPayload
    if (!p || typeof p !== 'object') return null
    return p
  } catch {
    return null
  }
}

export function jobIsDue(job: Pick<NewsletterJob, 'status' | 'sendAt'>, now = new Date()): boolean {
  if (job.status !== 'scheduled') return false
  const t = Date.parse(job.sendAt)
  return Number.isFinite(t) && t <= now.getTime()
}
