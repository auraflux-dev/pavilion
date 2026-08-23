/**
 * Shared member/subscriber/test newsletter email send (Gmail).
 * Used by Staff outreach and scheduled NewsletterJobs cron.
 */
import { getWixClient } from '@/lib/wix-client'
import {
  applyMembershipsToRoster,
  buildParentRoster,
  filterParentRoster,
  rosterEmails,
  type ParentRosterRow,
} from '@/lib/staff/members-roster'
import {
  buildMailtoBcc,
  sanitizeRecipients,
  sendMassEmail,
  validateMassEmailDraft,
  type EmailAttachment,
} from '@/lib/staff/mass-email'
import { defaultUtmCampaign } from '@/lib/staff/newsletter-utm'
import { prepareTrackedNewsletterSend } from '@/lib/staff/newsletter-tracking'
import { loadNewsletterBrandingFromKeys } from '@/lib/staff/newsletter-branding'
import { buildNewsletterHtml } from '@/lib/staff/newsletter-html'
import { parseBeatsJson } from '@/lib/staff/newsletter-sections'
import {
  applyMergeFields,
  mergeVarsFromParent,
} from '@/lib/staff/newsletter-merge'
import {
  appendNewsletterComplianceText,
  filterNewsletterOptOuts,
  isNewsletterOptedOut,
  loadNewsletterOptOutEmails,
  newsletterUnsubscribeApiUrl,
  newsletterUnsubscribePageUrl,
} from '@/lib/staff/newsletter-unsubscribe'
import { isSyntheticStagingMode } from '@/lib/fixtures/synthetic-mode'
import { getNewsletterAttachment } from '@/lib/staff/newsletter-assets'
import {
  buildNewsletterTestGroups,
  parseEmailList,
  resolveTestGroupRecipients,
  testSubject,
} from '@/lib/staff/newsletter-test-groups'

export type NewsletterSendAudience = 'members' | 'test' | 'subscribers' | 'paid' | 'scoop'

export type NewsletterExecuteInput = {
  actorEmail: string
  actorName: string
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
  extraImageUrls?: string[]
  beatsJson?: string
  canvaDesignId?: string
  sendAudience?: NewsletterSendAudience
  testGroup?: 'me' | 'board' | 'custom' | 'board_and_custom'
  testEmails?: string
  emails?: string[]
  includeSubscribers?: boolean
  dryRun?: boolean
  actorPersonalEmail?: string
  /** R2 keys from /api/staff/newsletter/upload-attachment */
  attachmentKeys?: Array<{ key: string; filename: string; mimeType: string }>
}

export type NewsletterExecuteResult = {
  ok: boolean
  error?: string
  recipientCount: number
  recipientsPreview: string[]
  mailto?: string
  send?: Awaited<ReturnType<typeof sendMassEmail>>
  portalInserted?: boolean
  newsletterArchived?: boolean
  utmCampaign?: string
  newsletterSendId?: string | null
  trackClicks?: boolean
  testSend?: boolean
  audience?: NewsletterSendAudience
}

async function loadAll(collectionId: string) {
  const client = getWixClient()
  const items: Record<string, unknown>[] = []
  let skip = 0
  for (let i = 0; i < 50; i += 1) {
    const result = await client.items.query(collectionId).limit(100).skip(skip).find()
    const batch = (result.items ?? []) as Record<string, unknown>[]
    items.push(...batch)
    if (batch.length < 100) break
    skip += 100
  }
  return items
}

async function loadSiteSetting(key: string): Promise<string> {
  try {
    const client = getWixClient()
    const found = await client.items.query('SiteSettings').eq('key', key).limit(1).find()
    const row = found.items?.[0] as { value?: string } | undefined
    return String(row?.value ?? '').trim()
  } catch {
    return ''
  }
}

async function loadRoster(): Promise<ParentRosterRow[]> {
  const [students, memberships] = await Promise.all([
    loadAll('Students'),
    loadAll('Memberships'),
  ])
  const fromStudents = buildParentRoster(
    students.map((item) => ({
      _id: String(item._id ?? ''),
      parentEmail: String(item.parentEmail ?? ''),
      parentFirstName: String(item.parentFirstName ?? ''),
      parentLastName: String(item.parentLastName ?? ''),
      parentPhone: String(item.parentPhone ?? ''),
      firstName: String(item.firstName ?? ''),
      lastName: String(item.lastName ?? ''),
      grade: String(item.grade ?? ''),
      membershipTier: String(item.membershipTier ?? 'free'),
      membershipStatus: String(item.membershipStatus ?? 'active'),
      archived: item.archived === true,
    })),
  )
  return applyMembershipsToRoster(
    fromStudents,
    memberships.map((item) => ({
      email: String(item.email ?? item.parentEmail ?? ''),
      tier: String(item.tier ?? item.membershipTier ?? 'free'),
      status: String(item.status ?? 'active'),
      parentFirstName: String(item.parentFirstName ?? item.firstName ?? ''),
      parentLastName: String(item.parentLastName ?? item.lastName ?? ''),
      parentPhone: String(item.parentPhone ?? item.phone ?? ''),
    })),
  )
}

export async function countNewsletterSubscribers(): Promise<number> {
  const emails = await loadSubscriberEmails()
  return emails.length
}

export async function loadSubscriberEmails(): Promise<string[]> {
  const rows = await loadAll('NewsletterSubscribers')
  return sanitizeRecipients(
    rows
      .filter((item) => !isNewsletterOptedOut(item))
      .map((item) => String(item.email ?? item.parentEmail ?? '')),
  )
}

async function archiveNewsletter(opts: {
  title: string
  body: string
  fromName: string
  tier: string
  grade: string
  customEmails: string[]
}) {
  if (opts.customEmails.length) return false
  const audience =
    opts.grade ? 'grade' : opts.tier === 'free' ? 'free' : opts.tier === 'paid' ? 'paid' : 'all'
  try {
    const client = getWixClient()
    await client.items.insert('Newsletters', {
      title: opts.title,
      body: opts.body,
      fromName: opts.fromName,
      audience,
      grade: opts.grade || null,
      publishedAt: new Date().toISOString(),
      active: true,
    })
    return true
  } catch {
    return false
  }
}

/** Portal Messages for free parents (Weekly Scoop). Paid parents do not see audience=free. */
export async function publishScoopToPortal(opts: {
  title: string
  body: string
  fromName: string
}): Promise<boolean> {
  return archiveNewsletter({
    title: opts.title,
    body: opts.body,
    fromName: opts.fromName,
    tier: 'free',
    grade: '',
    customEmails: [],
  })
}

export async function executeNewsletterEmail(
  input: NewsletterExecuteInput,
): Promise<NewsletterExecuteResult> {
  if (isSyntheticStagingMode() && input.dryRun !== true) {
    return {
      ok: false,
      error: 'Synthetic staging. Newsletter sends are blocked. Use www.shmspto.org for live email.',
      recipientCount: 0,
      recipientsPreview: [],
      audience: input.sendAudience ?? 'members',
      testSend: input.sendAudience === 'test',
    }
  }

  const subject = String(input.subject ?? '').trim()
  const message = String(input.message ?? '').trim()
  const tier = String(input.tier ?? 'all').trim() || 'all'
  const grade = String(input.grade ?? '').trim()
  const dryRun = input.dryRun === true
  const alsoPortal = input.alsoPortal !== false
  const customEmails = Array.isArray(input.emails) ? input.emails.map(String) : []
  const utmCampaign = defaultUtmCampaign(subject, String(input.utmCampaign ?? '').trim())
  const trackClicks = input.trackClicks !== false
  const trackOpens = input.trackOpens === true
  const sendAudience: NewsletterSendAudience =
    input.sendAudience === 'test' ||
    input.sendAudience === 'subscribers' ||
    input.sendAudience === 'paid' ||
    input.sendAudience === 'scoop'
      ? input.sendAudience
      : 'members'
  const isTestAudience = sendAudience === 'test'
  const isSubscribers = sendAudience === 'subscribers'
  const isPaidAudience = sendAudience === 'paid'
  const isScoop = sendAudience === 'scoop'
  const rosterTier = isPaidAudience ? 'paid' : isScoop ? 'free' : tier

  const roster = await loadRoster()
  let recipients: string[] = []
  let effectiveSubject = subject
  let effectiveAlsoPortal = alsoPortal && !isTestAudience && !isSubscribers
  let effectiveUtmCampaign = utmCampaign
  let filteredRoster = roster

  if (isTestAudience) {
    const staffRows = await loadAll('StaffRoles')
    const siteTestEmails = await loadSiteSetting('newsletterTestEmails')
    const testGroups = buildNewsletterTestGroups({
      sessionEmail: input.actorEmail,
      sessionPersonalEmail: input.actorPersonalEmail,
      staffRows: staffRows.map((row) => ({
        email: String(row.email ?? ''),
        personalEmail: String(row.personalEmail ?? ''),
        name: String(row.name ?? ''),
        boardTitle: String(row.boardTitle ?? ''),
        active: row.active !== false,
      })),
      siteTestEmails,
    })
    const rawGroup = String(input.testGroup ?? 'me')
    const group =
      rawGroup === 'board' || rawGroup === 'custom' || rawGroup === 'board_and_custom'
        ? rawGroup
        : 'me'
    recipients = resolveTestGroupRecipients(group, testGroups, [
      ...customEmails,
      ...parseEmailList(input.testEmails ?? ''),
    ])
    effectiveSubject = testSubject(subject)
    effectiveUtmCampaign = `${utmCampaign}-test`.replace(/-test-test$/, '-test')
  } else if (isSubscribers) {
    recipients = await loadSubscriberEmails()
    filteredRoster = []
    effectiveUtmCampaign = `${utmCampaign}-signup`.replace(/-signup-signup$/, '-signup')
  } else if (isScoop) {
    const filtered = filterParentRoster(roster, { tier: 'free', grade })
    filteredRoster = filtered
    recipients = sanitizeRecipients(rosterEmails(filtered))
    if (input.includeSubscribers) {
      const extra = await loadSubscriberEmails()
      recipients = sanitizeRecipients([...recipients, ...extra])
    }
    effectiveUtmCampaign = `${utmCampaign}-scoop`.replace(/-scoop-scoop$/, '-scoop')
  } else {
    const filterTier = isPaidAudience ? (tier === 'all' || tier === 'free' ? 'paid' : tier) : rosterTier
    const filtered =
      customEmails.length > 0
        ? filterParentRoster(roster, { tier: 'all' }).filter((r) =>
            sanitizeRecipients(customEmails).includes(r.parentEmail),
          )
        : filterParentRoster(roster, { tier: filterTier, grade })
    filteredRoster = filtered
    recipients = sanitizeRecipients(
      customEmails.length ? customEmails : rosterEmails(filtered),
    )
    if (isPaidAudience) {
      effectiveUtmCampaign = `${utmCampaign}-paid`.replace(/-paid-paid$/, '-paid')
    }
  }

  const optOuts = await loadNewsletterOptOutEmails()
  recipients = filterNewsletterOptOuts(recipients, optOuts)
  const physicalAddress =
    (await loadSiteSetting('contactAddress')) ||
    '23415 Evergreen Ridge Drive, Ashburn, VA 20148'

  let outboundBody = message
  let archiveBody = message
  let newsletterSendId: string | null = null
  const staffEmail = input.actorEmail.trim().toLowerCase()
  const fromName = input.actorName || staffEmail

  const emailAttachments: EmailAttachment[] = []
  for (const meta of input.attachmentKeys ?? []) {
    const buf = await getNewsletterAttachment(meta.key)
    if (!buf) continue
    emailAttachments.push({
      filename: meta.filename || 'attachment',
      mimeType: meta.mimeType || 'application/octet-stream',
      contentBase64: buf.toString('base64'),
    })
  }

  const draftBase = {
    subject: effectiveSubject,
    fromName,
    fromEmail: staffEmail,
    replyTo: staffEmail,
    recipients,
    attachments: emailAttachments.length ? emailAttachments : undefined,
  }

  if (!dryRun && !isTestAudience) {
    try {
      const prepared = await prepareTrackedNewsletterSend({
        body: message,
        utm: {
          campaign: effectiveUtmCampaign,
          source: 'newsletter',
          medium: isSubscribers
            ? 'email-signup'
            : isScoop
              ? 'email-scoop'
              : isPaidAudience
                ? 'email-paid'
                : 'email',
        },
        trackClicks,
        sentByEmail: input.actorEmail,
        subject: effectiveSubject,
        tier: isSubscribers ? 'subscribers' : isScoop ? 'free' : isPaidAudience ? 'paid' : tier,
        grade: isSubscribers ? '' : grade,
        templateId: input.templateId,
        recipientCount: recipients.length,
      })
      outboundBody = prepared.bodyForSend
      archiveBody = prepared.bodyForArchive
      newsletterSendId = prepared.sendId
    } catch (err) {
      console.warn('[newsletter-execute] tracking setup failed', err)
    }
  } else if (!dryRun && isTestAudience && trackClicks) {
    try {
      const prepared = await prepareTrackedNewsletterSend({
        body: message,
        utm: {
          campaign: effectiveUtmCampaign,
          source: 'newsletter',
          medium: 'email-test',
        },
        trackClicks: true,
        sentByEmail: input.actorEmail,
        subject: effectiveSubject,
        tier: 'test',
        grade: '',
        templateId: input.templateId,
        recipientCount: recipients.length,
      })
      outboundBody = prepared.bodyForSend
      archiveBody = prepared.bodyForArchive
      newsletterSendId = prepared.sendId
    } catch (err) {
      console.warn('[newsletter-execute] test tracking failed', err)
    }
  }

  const branding = await loadNewsletterBrandingFromKeys(loadSiteSetting)
  const sections = input.beatsJson ? parseBeatsJson(input.beatsJson) : null
  const byEmail = new Map(filteredRoster.map((r) => [r.parentEmail.toLowerCase(), r]))
  const htmlOptsBase = {
    sections,
    branding,
    sendId: trackOpens ? newsletterSendId || undefined : undefined,
    heroImageUrl: input.heroImageUrl || undefined,
    extraImageUrls: input.extraImageUrls,
    canvaViewUrl: input.canvaViewUrl || undefined,
    canvaThumbnailUrl: input.canvaThumbnailUrl || undefined,
    canvaTitle: input.canvaTitle || undefined,
    physicalAddress,
  }

  function personalizeForRecipient(to: string) {
    const row = byEmail.get(to.toLowerCase())
    const vars = row
      ? mergeVarsFromParent(row)
      : {
          firstName: fromName.split(/\s+/)[0] || 'there',
          lastName: '',
          email: to,
          tier: isTestAudience ? 'board' : isSubscribers ? 'signup' : 'member',
          grade: '',
        }
    const unsubPage = newsletterUnsubscribePageUrl(to)
    const subj = applyMergeFields(effectiveSubject, vars)
    const coreText = applyMergeFields(outboundBody, vars)
    const text = appendNewsletterComplianceText(coreText, {
      physicalAddress,
      unsubscribeUrl: unsubPage,
    })
    return {
      subject: subj,
      body: text,
      html: buildNewsletterHtml({
        ...htmlOptsBase,
        textBody: coreText,
        merge: vars,
        unsubscribeUrl: unsubPage,
      }),
      listUnsubscribeUrl: newsletterUnsubscribeApiUrl(to),
    }
  }

  const draft = {
    ...draftBase,
    body: dryRun ? message : outboundBody,
    html: !dryRun
      ? buildNewsletterHtml({
          ...htmlOptsBase,
          textBody: outboundBody,
          unsubscribeUrl: newsletterUnsubscribePageUrl(recipients[0] || input.actorEmail),
        })
      : undefined,
  }
  const validation = validateMassEmailDraft(draft, { testSend: isTestAudience })
  if (validation) {
    return {
      ok: false,
      error: validation,
      recipientCount: recipients.length,
      recipientsPreview: recipients.slice(0, 25),
      audience: sendAudience,
      testSend: isTestAudience,
    }
  }

  const mailto = buildMailtoBcc(draft, { testSend: isTestAudience })
  const sendResult = await sendMassEmail(draft, {
    dryRun,
    testSend: isTestAudience,
    personalize: !dryRun ? personalizeForRecipient : undefined,
  })

  if (!dryRun && newsletterSendId) {
    try {
      const client = getWixClient()
      await client.items.update('NewsletterSends', {
        _id: newsletterSendId,
        deliveredCount: sendResult.sent,
        failedCount: sendResult.failed,
      })
    } catch (err) {
      console.warn('[newsletter-execute] delivered counts', err)
    }
  }

  let portalInserted = false
  let newsletterArchived = false
  const shouldPostSend = !dryRun && !isTestAudience && !isSubscribers

  if (shouldPostSend && effectiveAlsoPortal) {
    if (!isScoop) {
      try {
        const client = getWixClient()
        if (tier !== 'all' || grade || customEmails.length || isPaidAudience) {
          for (const email of recipients) {
            await client.items.insert('ParentMessages', {
              parentEmail: email,
              audience: 'custom',
              grade: grade || null,
              studentId: null,
              studentName: null,
              programName: null,
              fromName,
              subject: effectiveSubject,
              body: archiveBody,
              sentAt: new Date().toISOString(),
              active: true,
            })
          }
        } else {
          await client.items.insert('ParentMessages', {
            parentEmail: null,
            audience: 'all',
            grade: null,
            studentId: null,
            studentName: null,
            programName: null,
            fromName,
            subject: effectiveSubject,
            body: archiveBody,
            sentAt: new Date().toISOString(),
            active: true,
          })
        }
        portalInserted = true
      } catch {
        // ParentMessages optional
      }
    }
  }

  if (shouldPostSend) {
    newsletterArchived = await archiveNewsletter({
      title: effectiveSubject,
      body: archiveBody,
      fromName,
      tier: isScoop ? 'free' : isPaidAudience ? 'paid' : tier,
      grade: isScoop || isPaidAudience ? '' : grade,
      customEmails: isTestAudience ? recipients : customEmails,
    })
    if (isScoop && newsletterArchived) portalInserted = true
  }

  return {
    ok: sendResult.ok || sendResult.mode === 'dry_run' || sendResult.mode === 'unavailable',
    recipientCount: recipients.length,
    recipientsPreview: recipients.slice(0, 25),
    mailto,
    send: sendResult,
    portalInserted,
    newsletterArchived,
    utmCampaign: effectiveUtmCampaign,
    newsletterSendId,
    trackClicks: !dryRun && trackClicks,
    testSend: isTestAudience,
    audience: sendAudience,
  }
}
