/**
 * POST /api/portal/programs/enrollment-request
 * { enrollmentId, action: 'refund'|'transfer', toProgramId?, note? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { getWixClient } from '@/lib/wix-client'
import { getProgramById } from '@/lib/api/programs'
import {
  ACTIVE_ENROLL_STATUSES,
  updateLegacyEnrollmentStatus,
} from '@/lib/programs/enrollments'

export const dynamic = 'force-dynamic'

/** Open programs for transfer destination picker. */
export async function GET(_req: NextRequest) {
  const effective = await getEffectiveParentEmail(_req)
  if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { getAllPrograms } = await import('@/lib/api/programs')
    const programs = await getAllPrograms().catch(() => [])
    return NextResponse.json({
      programs: programs
        .filter((p) => p.registrationOpen !== false)
        .map((p) => ({
          id: p._id,
          name: p.name,
          fee: p.fee ?? 0,
        })),
    })
  } catch (err) {
    console.error('/api/portal/programs/enrollment-request GET', err)
    return NextResponse.json({ error: 'Could not load programs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const effective = await getEffectiveParentEmail(req)
  if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const enrollmentId = String(body.enrollmentId ?? '').trim()
    const action = String(body.action ?? '').trim()
    const note = String(body.note ?? '').trim()
    const toProgramId = String(body.toProgramId ?? '').trim()

    if (!enrollmentId || !['refund', 'transfer'].includes(action)) {
      return NextResponse.json({ error: 'enrollmentId and action required' }, { status: 400 })
    }

    const client = getWixClient()
    const existing = (await client.items.get('ProgramEnrollments', enrollmentId)) as Record<
      string,
      unknown
    >
    const parentEmail = String(existing.parentEmail ?? '').trim().toLowerCase()
    if (parentEmail !== effective.parentEmail.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const current = String(existing.status ?? '')
    if (!ACTIVE_ENROLL_STATUSES.has(current) && current !== 'Waitlisted') {
      return NextResponse.json({ error: 'Enrollment is not active' }, { status: 400 })
    }

    let nextStatus = ''
    let toProgramName = ''
    if (action === 'refund') {
      nextStatus = 'RefundRequested'
    } else {
      if (!toProgramId) {
        return NextResponse.json({ error: 'toProgramId required for transfer' }, { status: 400 })
      }
      const dest = await getProgramById(toProgramId)
      if (!dest) return NextResponse.json({ error: 'Destination program not found' }, { status: 404 })
      toProgramName = dest.name
      nextStatus = 'TransferRequested'
    }

    const requestNote = [
      note,
      action === 'transfer' && toProgramId ? `Transfer to: ${toProgramName} (${toProgramId})` : '',
    ]
      .filter(Boolean)
      .join(' · ')

    await client.items.update('ProgramEnrollments', {
      ...existing,
      _id: enrollmentId,
      status: nextStatus,
      requestNote: requestNote || existing.requestNote || '',
      requestedAt: new Date().toISOString(),
      requestedToProgramId: action === 'transfer' ? toProgramId : '',
      requestedToProgramName: action === 'transfer' ? toProgramName : '',
    } as never)

    await updateLegacyEnrollmentStatus({
      programId: String(existing.programId ?? ''),
      studentId: String(existing.studentId ?? ''),
      status: nextStatus,
    })

    try {
      await client.items.insert('ParentMessages', {
        parentEmail: effective.parentEmail,
        audience: 'program',
        grade: null,
        studentId: existing.studentId ?? null,
        studentName: existing.studentName ?? null,
        programName: existing.programName ?? '',
        fromName: 'Programs',
        subject:
          action === 'refund'
            ? 'Refund request received'
            : `Transfer request received${toProgramName ? ` → ${toProgramName}` : ''}`,
        body:
          action === 'refund'
            ? `We received your refund request for ${existing.programName ?? 'this program'}. Staff will review shortly.${note ? `\n\nYour note: ${note}` : ''}`
            : `We received your transfer request from ${existing.programName ?? 'this program'} to ${toProgramName}. Staff will review shortly.${note ? `\n\nYour note: ${note}` : ''}`,
        sentAt: new Date().toISOString(),
        active: true,
      })
    } catch (err) {
      console.warn('[enrollment-request] ParentMessages insert failed', err)
    }

    return NextResponse.json({ ok: true, status: nextStatus })
  } catch (err) {
    console.error('/api/portal/programs/enrollment-request POST', err)
    return NextResponse.json({ error: 'Could not submit request' }, { status: 500 })
  }
}
