/**
 * POST /api/programs/register
 * Free programs: enroll immediately (requires consents + student safety profile).
 * Paid programs: returns { requiresPayment, fee }. client then uses PortalCardCheckout.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getProgramById } from '@/lib/api/programs'
import {
  enrollInProgram,
  getOwnedStudent,
  studentSafetyComplete,
} from '@/lib/program-enroll'
import type { ConsentAck } from '@/lib/checkout-consent'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Log in to register' }, { status: 401 })

  try {
    const body = await req.json()
    const programId = String(body.programId ?? '').trim()
    const studentId = String(body.studentId ?? '').trim()
    const consents = body.consents as ConsentAck[] | undefined

    if (!programId || !studentId) {
      return NextResponse.json({ error: 'programId and studentId required' }, { status: 400 })
    }

    const program = await getProgramById(programId)
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    if (!program.registrationOpen) {
      return NextResponse.json({ error: 'Registration is closed' }, { status: 400 })
    }

    const student = await getOwnedStudent(session.email, studentId)
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const safety = studentSafetyComplete(student)
    if (!safety.ok) return NextResponse.json({ error: safety.error }, { status: 400 })

    const { validateConsentAcks } = await import('@/lib/checkout-consent')
    const consentCheck = validateConsentAcks('program', consents)
    if (!consentCheck.ok) {
      return NextResponse.json({ error: consentCheck.error }, { status: 400 })
    }

    const fee = Number(program.fee ?? 0)
    if (fee > 0) {
      const { enrichmentDiscountPercent } = await import('@/lib/membership-entitlements')
      const { normalizeMembershipTier } = await import('@/lib/staff/members-roster')
      const tier = normalizeMembershipTier(String(student.membershipTier ?? 'free'))
      const percent = enrichmentDiscountPercent(tier)
      const discountDollars =
        percent > 0 ? Math.round(fee * (percent / 100) * 100) / 100 : 0
      const amount = Math.max(0, Math.round((fee - discountDollars) * 100) / 100)
      return NextResponse.json({
        requiresPayment: true,
        fee: amount,
        listFee: fee,
        memberDiscountPercent: percent,
        memberDiscountDollars: discountDollars,
        programName: program.name,
        programId,
        studentId,
      })
    }

    const result = await enrollInProgram({
      parentEmail: session.email,
      programId,
      studentId,
      consents: consents ?? [],
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('programs/register', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Registration failed' },
      { status: 400 }
    )
  }
}
