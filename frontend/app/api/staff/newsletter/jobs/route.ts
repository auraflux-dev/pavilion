import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { defaultUtmCampaign } from '@/lib/staff/newsletter-utm'
import type { NewsletterJobPayload } from '@/lib/staff/newsletter-jobs'
import {
  approveNewsletterJob,
  canApproveNewsletter,
  insertNewsletterJob,
  listNewsletterJobs,
  runNewsletterJob,
  updateNewsletterJob,
} from '@/lib/staff/newsletter-jobs'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) return { status: 401 as const, session: null }
  if (!requireStaffRole(session.staff, ['membership', 'secretary', 'marketing', 'admin'])) {
    return { status: 403 as const, session: null }
  }
  return { status: 200 as const, session }
}

function parseSendAudience(raw: string): 'members' | 'subscribers' | 'paid' | 'scoop' {
  if (raw === 'subscribers' || raw === 'paid' || raw === 'scoop') return raw
  return 'members'
}

function payloadFromBody(
  body: Record<string, unknown>,
  sendAudience: 'members' | 'subscribers' | 'paid' | 'scoop',
): NewsletterJobPayload {
  const subject = String(body.subject ?? '').trim()
  const message = String(body.body ?? body.message ?? '').trim()
  return {
    subject,
    message,
    tier: sendAudience === 'paid' ? 'paid' : sendAudience === 'scoop' ? 'free' : String(body.tier ?? 'all').trim() || 'all',
    grade: String(body.grade ?? '').trim(),
    alsoPortal: sendAudience === 'subscribers' ? false : body.alsoPortal !== false,
    utmCampaign: defaultUtmCampaign(subject, String(body.utmCampaign ?? '').trim()),
    trackClicks: body.trackClicks !== false,
    trackOpens: body.trackOpens === true,
    templateId: String(body.templateId ?? '').trim() || undefined,
    canvaViewUrl: String(body.canvaViewUrl ?? '').trim() || undefined,
    canvaThumbnailUrl: String(body.canvaThumbnailUrl ?? '').trim() || undefined,
    canvaTitle: String(body.canvaTitle ?? '').trim() || undefined,
    heroImageUrl: String(body.heroImageUrl ?? '').trim() || undefined,
    extraImageUrls: Array.isArray(body.extraImageUrls)
      ? body.extraImageUrls.map((u) => String(u)).filter(Boolean)
      : undefined,
    beatsJson: String(body.beatsJson ?? '').trim() || undefined,
    canvaDesignId: String(body.canvaDesignId ?? '').trim() || undefined,
    sendAudience,
    includeSubscribers: body.includeSubscribers === true,
  }
}

export async function GET(req: NextRequest) {
  const gated = await gate(req)
  if (gated.status !== 200 || !gated.session) {
    return NextResponse.json(
      { error: gated.status === 401 ? 'Sign in to continue.' : 'Forbidden' },
      { status: gated.status },
    )
  }
  try {
    const jobs = await listNewsletterJobs()
    return NextResponse.json({
      jobs,
      canApprove: canApproveNewsletter(gated.session.staff, gated.session.email),
    })
  } catch (err) {
    console.error('/api/staff/newsletter/jobs GET', err)
    return NextResponse.json({ error: 'Could not load newsletter jobs' }, { status: 500 })
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
    const body = (await req.json()) as Record<string, unknown>
    const action = String(body.action ?? 'create').trim()

    if (action === 'cancel') {
      const id = String(body.id ?? '').trim()
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
      const jobs = await listNewsletterJobs()
      const job = jobs.find((j) => j.id === id)
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      if (job.status === 'sent' || job.status === 'sending') {
        return NextResponse.json({ error: 'Cannot cancel a sent job' }, { status: 400 })
      }
      const owner = job.createdByEmail === session.email.trim().toLowerCase()
      if (!owner && !canApproveNewsletter(session.staff, session.email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      await updateNewsletterJob(id, { status: 'cancelled' })
      return NextResponse.json({ ok: true, id, status: 'cancelled' })
    }

    if (action === 'approve') {
      if (!canApproveNewsletter(session.staff, session.email)) {
        return NextResponse.json(
          { error: 'Secretary, admin, or president@ can approve newsletter jobs.' },
          { status: 403 },
        )
      }
      const id = String(body.id ?? '').trim()
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
      const result = await approveNewsletterJob(id, session.email)
      return NextResponse.json({ ok: true, id, ...result })
    }

    const subject = String(body.subject ?? '').trim()
    const message = String(body.body ?? body.message ?? '').trim()
    if (!subject || !message) {
      return NextResponse.json({ error: 'subject and body are required' }, { status: 400 })
    }
    const sendAudience = parseSendAudience(String(body.sendAudience ?? 'members').trim())
    const sendAtRaw = String(body.sendAt ?? '').trim()
    const sendAtMs = Date.parse(sendAtRaw)
    if (!sendAtRaw || !Number.isFinite(sendAtMs)) {
      return NextResponse.json(
        { error: 'Choose a send date and time (sendAt ISO).' },
        { status: 400 },
      )
    }
    const approver = canApproveNewsletter(session.staff, session.email)
    const requestApproval = body.requestApproval !== false && !approver
    const status = requestApproval ? 'pending_approval' : 'scheduled'
    const id = await insertNewsletterJob({
      subject,
      sendAt: new Date(sendAtMs).toISOString(),
      status,
      sendAudience,
      needsApproval: requestApproval,
      createdByEmail: session.email,
      createdByName: session.staff.name || session.staff.boardTitle || session.email,
      payload: payloadFromBody(body, sendAudience),
    })
    if (status === 'scheduled' && sendAtMs <= Date.now()) {
      const jobs = await listNewsletterJobs()
      const job = jobs.find((j) => j.id === id)
      if (job) {
        try {
          await runNewsletterJob(job)
          return NextResponse.json({
            ok: true,
            id,
            status: 'sent',
            sendAt: new Date(sendAtMs).toISOString(),
            needsApproval: false,
            sentNow: true,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Send failed'
          await updateNewsletterJob(id, { status: 'failed', error: msg.slice(0, 400) }).catch(
            () => undefined,
          )
          return NextResponse.json({ error: msg, id, status: 'failed' }, { status: 500 })
        }
      }
    }
    return NextResponse.json({
      ok: true,
      id,
      status,
      sendAt: new Date(sendAtMs).toISOString(),
      needsApproval: requestApproval,
    })
  } catch (err) {
    console.error('/api/staff/newsletter/jobs POST', err)
    const msg = err instanceof Error ? err.message : 'Job failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
