/**
 * POST /api/programs/register
 * Free programs: enroll immediately (requires consents + student safety profile).
 * Paid programs: returns { requiresPayment, fee }. client then uses PortalCardCheckout.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getEffectiveParentEmail } from '@/lib/staff/session'
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

    const effective = await getEffectiveParentEmail(req)
    const parentEmail = effective?.parentEmail ?? session.email
    const accountEmails = [
      effective?.actorEmail ?? session.email,
      ...session.emails,
    ]

    const { canViewProgramsCatalogNow } = await import('@/lib/programs/public-access')
    const catalogAccess = await canViewProgramsCatalogNow()
    if (!catalogAccess.allowed) {
      return NextResponse.json(
        { error: 'Registration is not open yet. Check back after the announcement.' },
        { status: 403 },
      )
    }

    const program = await getProgramById(programId)
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    const stagingCheckout =
      process.env.VERCEL_ENV === 'preview' || process.env.PROGRAMS_STAGING_CHECKOUT === 'true'
    if (!program.registrationOpen && !stagingCheckout) {
      return NextResponse.json({ error: 'Registration is closed' }, { status: 400 })
    }

    const { assertCanRegisterForProgram } = await import('@/lib/programs/registration-access')
    const access = await assertCanRegisterForProgram(
      stagingCheckout ? { ...program, registrationOpen: true } : program,
      parentEmail,
    )
    if (!access.ok) {
      return NextResponse.json(
        {
          error: access.error || 'Registration not available',
          phase: access.phase,
          memberPriorityUntil: access.memberPriorityUntil,
        },
        { status: access.phase === 'member_priority' ? 403 : 400 },
      )
    }

    const student = await getOwnedStudent(parentEmail, studentId)
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
      const { applyCheckoutDiscount } = await import('@/lib/checkout-discounts')
      const couponCode = String(body.couponCode ?? '').trim() || null
      const tier = normalizeMembershipTier(String(student.membershipTier ?? 'free'))
      const percent = enrichmentDiscountPercent(tier)
      const applied = await applyCheckoutDiscount({
        scope: 'program',
        listAmount: fee,
        couponCode,
        parentEmail,
        accountEmails,
        tierPercent: percent,
      })
      if (applied.error) {
        return NextResponse.json({ error: applied.error }, { status: 400 })
      }
      const discount = applied.discount
      return NextResponse.json({
        requiresPayment: true,
        fee: applied.amount,
        listFee: fee,
        memberDiscountPercent: discount?.percent ?? 0,
        memberDiscountDollars: discount?.dollars ?? 0,
        discountCode: discount?.code || '',
        programName: program.name,
        programId,
        studentId,
      })
    }

    const result = await enrollInProgram({
      parentEmail,
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
