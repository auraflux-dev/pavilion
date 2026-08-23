import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  applyMembershipsToRoster,
  buildParentRoster,
  filterParentRoster,
  rosterEmails,
} from '@/lib/staff/members-roster'
import { sanitizeRecipients } from '@/lib/staff/mass-email'
import { gmailSendReady } from '@/lib/staff/gmail-send-auth'
import {
  buildWhatsAppGroupPlan,
  type GradeWhatsAppLinks,
  type WhatsAppGrade,
} from '@/lib/staff/whatsapp-compose'
import {
  buildNewsletterTestGroups,
  resolveTestGroupRecipients,
  parseEmailList,
} from '@/lib/staff/newsletter-test-groups'
import {
  countNewsletterSubscribers,
  executeNewsletterEmail,
  publishScoopToPortal,
} from '@/lib/staff/newsletter-execute'
import { canApproveNewsletter } from '@/lib/staff/newsletter-jobs'
import { isSyntheticStagingMode } from '@/lib/fixtures/synthetic-mode'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) return { status: 401 as const, session: null }
  if (
    !requireStaffRole(session.staff, ['membership', 'secretary', 'marketing', 'admin'])
  ) {
    return { status: 403 as const, session: null }
  }
  return { status: 200 as const, session }
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

async function loadRoster() {
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

/** Archive outreach into Newsletters CMS so it appears under portal Messages. */
async function archiveNewsletter(opts: {
  title: string
  body: string
  fromName: string
  tier: string
  grade: string
  customEmails: string[]
}) {
  // Custom email lists are ParentMessages-only (not a reusable newsletter audience).
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

async function loadWhatsAppLinks(): Promise<GradeWhatsAppLinks> {
  const client = getWixClient()
  const result = await client.items.query('SiteSettings').limit(200).find()
  const map = new Map<string, string>()
  for (const item of result.items ?? []) {
    const row = item as { key?: string; value?: string }
    if (row.key) map.set(row.key, String(row.value ?? ''))
  }
  return {
    grade6: map.get('announcement6thLink') ?? '',
    grade7: map.get('announcement7thLink') ?? '',
    grade8: map.get('announcement8thLink') ?? '',
  }
}

export async function GET(req: NextRequest) {
  const gated = await gate(req)
  if (gated.status !== 200) {
    return NextResponse.json(
      { error: gated.status === 401 ? 'Sign in to continue.' : 'Forbidden' },
      { status: gated.status },
    )
  }
  try {
    const links = await loadWhatsAppLinks()
    const gmail = await gmailSendReady()
    const staffRows = await loadAll('StaffRoles')
    const siteTestEmails = await loadSiteSetting('newsletterTestEmails')
    const testGroups = buildNewsletterTestGroups({
      sessionEmail: gated.session!.email,
      sessionPersonalEmail: gated.session!.staff.personalEmail,
      staffRows: staffRows.map((row) => ({
        email: String(row.email ?? ''),
        personalEmail: String(row.personalEmail ?? ''),
        name: String(row.name ?? ''),
        boardTitle: String(row.boardTitle ?? ''),
        active: row.active !== false,
      })),
      siteTestEmails,
    })
    let subscriberCount = 0
    try {
      subscriberCount = await countNewsletterSubscribers()
    } catch {
      subscriberCount = 0
    }
    return NextResponse.json({
      emailConfigured: gmail.ok,
      gmailSender: gmail.senderEmail,
      gmailHint: gmail.hint,
      whatsapp: links,
      testGroups,
      subscriberCount,
      canApproveNewsletter: canApproveNewsletter(gated.session!.staff, gated.session!.email),
    })
  } catch (err) {
    console.error('/api/staff/membership/outreach GET', err)
    return NextResponse.json({ error: 'Could not load outreach channels' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const gated = await gate(req)
  if (gated.status !== 200 || !gated.session) {
    return NextResponse.json(
      { error: gated.status === 401 ? 'Sign in to continue.' : 'Forbidden' },
      { status: gated.status },
    )
  }
  const session = gated.session

  try {
    const body = await req.json()
    const dryRun = body.dryRun === true
    if (isSyntheticStagingMode()) {
      if (dryRun) {
        return NextResponse.json({
          ok: true,
          synthetic: true,
          recipientCount: 3,
          recipientsPreview: ['reviewer@example.com', 'board@example.com', 'member@example.com'],
          audience: String(body.sendAudience ?? 'paid'),
          testSend: body.sendAudience === 'test' || body.testSend === true,
        })
      }
      return NextResponse.json(
        {
          error:
            'Synthetic staging. Live outreach and newsletter sends are blocked. Use www.shmspto.org.',
          synthetic: true,
        },
        { status: 403 },
      )
    }

    const channel = String(body.channel ?? 'portal').trim() // portal | email | whatsapp
    const subject = String(body.subject ?? '').trim()
    const message = String(body.body ?? body.message ?? '').trim()
    const tier = String(body.tier ?? 'all').trim() || 'all'
    const grade = String(body.grade ?? '').trim()
    const alsoPortal = body.alsoPortal !== false
    const customEmails = Array.isArray(body.emails)
      ? body.emails.map((e: unknown) => String(e))
      : []
    const trackClicks = body.trackClicks !== false
    const trackOpens = body.trackOpens === true
    const templateId = String(body.templateId ?? '').trim()
    const canvaViewUrl = String(body.canvaViewUrl ?? '').trim()
    const canvaThumbnailUrl = String(body.canvaThumbnailUrl ?? '').trim()
    const canvaTitle = String(body.canvaTitle ?? '').trim()
    const heroImageUrl = String(body.heroImageUrl ?? '').trim()
    const sendAudienceRaw = String(body.sendAudience ?? 'members').trim()
    const testGroup = String(body.testGroup ?? 'me').trim() as
      | 'me'
      | 'board'
      | 'custom'
      | 'board_and_custom'
    const testEmailsRaw = String(body.testEmails ?? '').trim()
    const isTestSend = sendAudienceRaw === 'test' || body.testSend === true
    const sendAudience =
      sendAudienceRaw === 'subscribers'
        ? ('subscribers' as const)
        : sendAudienceRaw === 'paid'
          ? ('paid' as const)
          : sendAudienceRaw === 'scoop'
            ? ('scoop' as const)
            : isTestSend
              ? ('test' as const)
              : ('members' as const)

    if (channel === 'whatsapp') {
      const links = await loadWhatsAppLinks()
      const rawGrade = String(body.whatsappGrade ?? (grade || 'all')).trim() || 'all'
      const waGrade = (
        ['6', '7', '8', 'all'].includes(rawGrade) ? rawGrade : 'all'
      ) as WhatsAppGrade
      const plan = buildWhatsAppGroupPlan(links, waGrade, message)
      if (!message) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 })
      }
      return NextResponse.json({ ok: true, channel: 'whatsapp', plan })
    }

    if (channel === 'scoop-portal') {
      const fromName = session.staff.name || session.staff.boardTitle || session.email
      const title = subject || 'SHMS Weekly Scoop'
      if (!message && !title) {
        return NextResponse.json({ error: 'Subject or body is required' }, { status: 400 })
      }
      const newsletterArchived = await publishScoopToPortal({
        title,
        body: message || title,
        fromName,
      })
      return NextResponse.json({
        ok: newsletterArchived,
        channel: 'scoop-portal',
        newsletterArchived,
        error: newsletterArchived ? undefined : 'Could not save to portal Messages (Newsletters CMS).',
      })
    }

    if (channel === 'email') {
      const result = await executeNewsletterEmail({
        actorEmail: session.email,
        actorName: session.staff.name || session.staff.boardTitle || session.email,
        actorPersonalEmail: session.staff.personalEmail,
        subject,
        message,
        tier,
        grade,
        alsoPortal:
          sendAudience === 'subscribers'
            ? false
            : sendAudience === 'scoop'
              ? alsoPortal
              : alsoPortal,
        includeSubscribers: body.includeSubscribers === true,
        utmCampaign: String(body.utmCampaign ?? '').trim(),
        trackClicks,
        trackOpens,
        templateId: templateId || undefined,
        canvaViewUrl: canvaViewUrl || undefined,
        canvaThumbnailUrl: canvaThumbnailUrl || undefined,
        canvaTitle: canvaTitle || undefined,
        heroImageUrl: heroImageUrl || undefined,
        extraImageUrls: Array.isArray(body.extraImageUrls)
          ? body.extraImageUrls.map((u: unknown) => String(u)).filter(Boolean)
          : undefined,
        beatsJson: String(body.beatsJson ?? '').trim() || undefined,
        canvaDesignId: String(body.canvaDesignId ?? '').trim() || undefined,
        sendAudience,
        testGroup,
        testEmails: testEmailsRaw,
        emails: customEmails,
        dryRun,
      })
      if (result.error && !result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({
        ...result,
        channel: 'email',
        emailConfigured: result.send?.mode === 'gmail',
      })
    }

    const roster = await loadRoster()
    let recipients: string[] = []

    if (isTestSend) {
      const staffRows = await loadAll('StaffRoles')
      const siteTestEmails = await loadSiteSetting('newsletterTestEmails')
      const testGroups = buildNewsletterTestGroups({
        sessionEmail: session.email,
        sessionPersonalEmail: session.staff.personalEmail,
        staffRows: staffRows.map((row) => ({
          email: String(row.email ?? ''),
          personalEmail: String(row.personalEmail ?? ''),
          name: String(row.name ?? ''),
          boardTitle: String(row.boardTitle ?? ''),
          active: row.active !== false,
        })),
        siteTestEmails,
      })
      const group =
        testGroup === 'board' ||
        testGroup === 'custom' ||
        testGroup === 'board_and_custom'
          ? testGroup
          : 'me'
      const extra = [
        ...customEmails,
        ...parseEmailList(testEmailsRaw),
      ]
      recipients = resolveTestGroupRecipients(group, testGroups, extra)
    } else {
      const filtered =
        customEmails.length > 0
          ? filterParentRoster(roster, { tier: 'all' }).filter((r) =>
              sanitizeRecipients(customEmails).includes(r.parentEmail),
            )
          : filterParentRoster(roster, { tier, grade })

      recipients = sanitizeRecipients(
        customEmails.length ? customEmails : rosterEmails(filtered),
      )
    }

    // Default: portal inbox broadcast
    if (!subject || !message) {
      return NextResponse.json({ error: 'subject and body are required' }, { status: 400 })
    }
    if (!recipients.length && tier !== 'all' && !grade) {
      return NextResponse.json({ error: 'No matching parents for this audience' }, { status: 400 })
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        channel: 'portal',
        dryRun: true,
        recipientCount: recipients.length,
        recipientsPreview: recipients.slice(0, 25),
      })
    }

    const client = getWixClient()
    const fromName = session.staff.name || session.staff.boardTitle || session.email
    // When filtered to a subset, insert one message per parent so others don't see it.
    if (tier !== 'all' || grade || customEmails.length) {
      for (const email of recipients) {
        await client.items.insert('ParentMessages', {
          parentEmail: email,
          audience: 'custom',
          grade: grade || null,
          studentId: null,
          studentName: null,
          programName: null,
          fromName,
          subject,
          body: message,
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
        subject,
        body: message,
        sentAt: new Date().toISOString(),
        active: true,
      })
    }

    const newsletterArchived = await archiveNewsletter({
      title: subject,
      body: message,
      fromName,
      tier,
      grade,
      customEmails,
    })

    return NextResponse.json({
      ok: true,
      channel: 'portal',
      recipientCount: recipients.length || roster.length,
      newsletterArchived,
    })
  } catch (err) {
    console.error('/api/staff/membership/outreach POST', err)
    return NextResponse.json({ error: 'Outreach failed' }, { status: 500 })
  }
}
