/**
 * POST /api/cron/transfer-enrollment
 * Auth: Bearer $CRON_SECRET or $PURCHASE_RESEND_SECRET
 * Body: {
 *   parentEmail, studentName?, fromProgramNameContains, toProgramNameContains,
 *   season?: 'fall-2026' | 'spring-2027',
 *   notify?: boolean
 * }
 * Moves a Paid enrollment to another program, keeping feePaid / discount.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import {
  ACTIVE_ENROLL_STATUSES,
  WAITLIST_STATUS,
  countSeatsTaken,
  promoteFirstWaitlisted,
  updateLegacyEnrollmentStatus,
} from '@/lib/programs/enrollments'
import { sendPurchaseConfirmation } from '@/lib/purchase-confirmation'
import { reportError } from '@/lib/observability/error-reporting'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  const secrets = [process.env.CRON_SECRET, process.env.PURCHASE_RESEND_SECRET]
    .map((s) => s?.trim())
    .filter(Boolean) as string[]
  return secrets.some((secret) => auth === `Bearer ${secret}`)
}

function nameMatch(hay: string, needle: string) {
  const h = hay.toLowerCase()
  const n = needle.toLowerCase().trim()
  if (!n) return false
  return n.split(/\s+/).every((w) => h.includes(w))
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      parentEmail?: string
      studentName?: string
      fromProgramNameContains?: string
      toProgramNameContains?: string
      season?: string
      notify?: boolean
      dryRun?: boolean
    }
    const parentEmail = String(body.parentEmail || '')
      .trim()
      .toLowerCase()
    const studentName = String(body.studentName || '').trim()
    const fromNeedle = String(body.fromProgramNameContains || '').trim()
    const toNeedle = String(body.toProgramNameContains || '').trim()
    const season = String(body.season || '').trim()
    const notify = body.notify !== false
    const dryRun = Boolean(body.dryRun)

    if (!parentEmail.includes('@') || !fromNeedle || !toNeedle) {
      return NextResponse.json(
        {
          error:
            'parentEmail, fromProgramNameContains, and toProgramNameContains required',
        },
        { status: 400 },
      )
    }

    const client = getWixClient()
    const enrollments = await client.items
      .query('ProgramEnrollments')
      .eq('parentEmail', parentEmail)
      .limit(50)
      .find()

    const candidates = (enrollments.items ?? []).filter((row) => {
      const status = String((row as { status?: string }).status ?? '')
      if (!ACTIVE_ENROLL_STATUSES.has(status) && status !== WAITLIST_STATUS) return false
      const programName = String(
        (row as { programName?: string }).programName ?? '',
      )
      if (!nameMatch(programName, fromNeedle)) return false
      if (studentName) {
        const sn = String((row as { studentName?: string }).studentName ?? '')
        if (!nameMatch(sn, studentName)) return false
      }
      return true
    })

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No matching active enrollment found', parentEmail, fromNeedle },
        { status: 404 },
      )
    }
    if (candidates.length > 1) {
      return NextResponse.json(
        {
          error: 'Multiple matching enrollments — narrow studentName / fromProgram',
          matches: candidates.map((r) => ({
            id: r._id,
            programName: (r as { programName?: string }).programName,
            studentName: (r as { studentName?: string }).studentName,
            status: (r as { status?: string }).status,
            feePaid: (r as { feePaid?: number }).feePaid,
          })),
        },
        { status: 409 },
      )
    }

    const existing = candidates[0] as Record<string, unknown>
    const fromProgramId = String(existing.programId ?? '')

    const programs = await client.items.query('Programs').limit(200).find()
    const dest = (programs.items ?? []).find((p) => {
      const name = String((p as { name?: string; title?: string }).name ?? (p as { title?: string }).title ?? '')
      if (!nameMatch(name, toNeedle)) return false
      if (season) {
        const s = String((p as { season?: string }).season ?? '')
        if (s !== season) return false
      }
      return true
    }) as Record<string, unknown> | undefined

    if (!dest?._id) {
      return NextResponse.json(
        { error: 'Destination program not found', toNeedle, season },
        { status: 404 },
      )
    }

    const toProgramId = String(dest._id)
    const toProgramName = String(dest.name ?? dest.title ?? toNeedle)
    const capacity = Number(dest.capacity ?? 0) || 0
    if (capacity > 0) {
      const seats = await countSeatsTaken(toProgramId)
      if (seats >= capacity) {
        return NextResponse.json(
          { error: 'Destination class is full', toProgramName, seats, capacity },
          { status: 409 },
        )
      }
    }

    const previousStatus = String(existing.status ?? '')
    const keepSeatStatus = ACTIVE_ENROLL_STATUSES.has(previousStatus)
      ? previousStatus === 'Paid' || Number(existing.feePaid ?? 0) > 0
        ? 'Paid'
        : 'Enrolled'
      : previousStatus === WAITLIST_STATUS
        ? WAITLIST_STATUS
        : Number(existing.feePaid ?? 0) > 0
          ? 'Paid'
          : 'Enrolled'

    const preview = {
      enrollmentId: existing._id,
      parentEmail,
      studentName: existing.studentName,
      from: { id: fromProgramId, name: existing.programName },
      to: { id: toProgramId, name: toProgramName },
      feePaid: existing.feePaid,
      status: keepSeatStatus,
      transactionId: existing.transactionId,
    }

    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, preview })
    }

    await client.items.update('ProgramEnrollments', {
      ...existing,
      _id: existing._id,
      programId: toProgramId,
      programName: toProgramName,
      status: keepSeatStatus,
      waitlistPosition: keepSeatStatus === WAITLIST_STATUS ? existing.waitlistPosition : null,
      requestNote: '',
      requestedToProgramId: '',
      requestedToProgramName: '',
      transferredAt: new Date().toISOString(),
      transferredFromProgramId: fromProgramId,
    } as never)

    await updateLegacyEnrollmentStatus({
      programId: fromProgramId,
      studentId: String(existing.studentId ?? ''),
      status: keepSeatStatus,
      programName: toProgramName,
      programIdNext: toProgramId,
    })

    const promoted =
      ACTIVE_ENROLL_STATUSES.has(previousStatus) && fromProgramId !== toProgramId
        ? await promoteFirstWaitlisted(fromProgramId)
        : null

    let emailed = false
    if (notify && parentEmail.includes('@')) {
      try {
        const confirmation = await sendPurchaseConfirmation({
          kind: 'program',
          parentEmail,
          parentName: String(existing.studentName ?? 'family'),
          amount: Number(existing.feePaid ?? 0) || 0,
          description: `Transferred to ${toProgramName} (from ${String(existing.programName ?? 'prior class')})`,
          transactionId: String(existing.transactionId || existing._id || 'transfer'),
          meta: {
            programName: toProgramName,
            studentId: String(existing.studentId ?? ''),
          },
          extras: {
            status: keepSeatStatus,
            transferred: true,
          },
        })
        emailed = confirmation.emailed
      } catch (err) {
        console.warn('transfer notify failed', err)
      }
    }

    return NextResponse.json({
      ok: true,
      preview,
      promoted,
      emailed,
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/transfer-enrollment' })
    return NextResponse.json({ error: 'Transfer failed', eventId }, { status: 500 })
  }
}
