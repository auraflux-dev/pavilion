import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  buildParentRoster,
  filterParentRoster,
  rosterEmails,
} from '@/lib/staff/members-roster'
import {
  buildMailtoBcc,
  sanitizeRecipients,
  sendMassEmail,
  validateMassEmailDraft,
} from '@/lib/staff/mass-email'
import { gmailSendReady } from '@/lib/staff/gmail-send-auth'
import {
  buildWhatsAppGroupPlan,
  type GradeWhatsAppLinks,
  type WhatsAppGrade,
} from '@/lib/staff/whatsapp-compose'

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

async function loadRoster() {
  const client = getWixClient()
  const items: Record<string, unknown>[] = []
  let skip = 0
  for (let i = 0; i < 20; i += 1) {
    const result = await client.items.query('Students').limit(100).skip(skip).find()
    const batch = (result.items ?? []) as Record<string, unknown>[]
    items.push(...batch)
    if (batch.length < 100) break
    skip += 100
  }
  return buildParentRoster(
    items.map((item) => ({
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
    return NextResponse.json({
      emailConfigured: gmail.ok,
      gmailSender: gmail.senderEmail,
      gmailHint: gmail.hint,
      whatsapp: links,
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
    const channel = String(body.channel ?? 'portal').trim() // portal | email | whatsapp
    const subject = String(body.subject ?? '').trim()
    const message = String(body.body ?? body.message ?? '').trim()
    const tier = String(body.tier ?? 'all').trim() || 'all'
    const grade = String(body.grade ?? '').trim()
    const dryRun = body.dryRun === true
    const alsoPortal = body.alsoPortal !== false
    const customEmails = Array.isArray(body.emails)
      ? body.emails.map((e: unknown) => String(e))
      : []

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

    const roster = await loadRoster()
    const filtered =
      customEmails.length > 0
        ? filterParentRoster(roster, { tier: 'all' }).filter((r) =>
            sanitizeRecipients(customEmails).includes(r.parentEmail),
          )
        : filterParentRoster(roster, { tier, grade })

    const recipients = sanitizeRecipients(
      customEmails.length ? customEmails : rosterEmails(filtered),
    )

    if (channel === 'email') {
      const draft = {
        subject,
        body: message,
        fromName: session.staff.name || session.staff.boardTitle || session.email,
        replyTo: session.email,
        recipients,
      }
      const validation = validateMassEmailDraft(draft)
      if (validation) {
        return NextResponse.json({ error: validation }, { status: 400 })
      }

      const mailto = buildMailtoBcc(draft)
      const sendResult = await sendMassEmail(draft, { dryRun })

      let portalInserted = false
      let newsletterArchived = false
      if (alsoPortal && !dryRun) {
        try {
          const client = getWixClient()
          if (tier !== 'all' || grade || customEmails.length) {
            for (const email of recipients) {
              await client.items.insert('ParentMessages', {
                parentEmail: email,
                audience: 'custom',
                grade: grade || null,
                studentId: null,
                studentName: null,
                programName: null,
                fromName: draft.fromName,
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
              fromName: draft.fromName,
              subject,
              body: message,
              sentAt: new Date().toISOString(),
              active: true,
            })
          }
          portalInserted = true
        } catch {
          // ParentMessages optional
        }
        newsletterArchived = await archiveNewsletter({
          title: subject,
          body: message,
          fromName: draft.fromName,
          tier,
          grade,
          customEmails,
        })
      }

      return NextResponse.json({
        ok: sendResult.ok || sendResult.mode === 'dry_run' || sendResult.mode === 'unavailable',
        channel: 'email',
        recipientCount: recipients.length,
        recipientsPreview: recipients.slice(0, 25),
        mailto,
        emailConfigured: sendResult.mode === 'gmail',
        send: sendResult,
        portalInserted,
        newsletterArchived,
      })
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
