import { NextRequest, NextResponse } from 'next/server'
import { lookupFamilyByCoveCode } from '@/lib/cove-family-code'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/staff/cove/lookup?code=123456
 * Also accepts Square gift-card GAN (raw digits from Wallet / Photos QR / Stand).
 */
export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const code = String(req.nextUrl.searchParams.get('code') ?? '').trim()
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }

  try {
    const family = await lookupFamilyByCoveCode(code)
    if (!family) {
      return NextResponse.json({ error: 'No family found for that code' }, { status: 404 })
    }
    if (!family.gan) {
      return NextResponse.json(
        {
          error: 'Family has a code but no Cove Digital Card balance yet. Parent must load the Cove Digital Card online first.',
          family: {
            parentEmail: family.parentEmail,
            coveFamilyCode: family.coveFamilyCode,
            students: family.students,
            balance: 0,
            hasCard: false,
            paidMember: family.paidMember,
            membershipTier: family.membershipTier,
            paidMemberCode: (await import('@/lib/cove-family-code')).isPaidMemberFamilyCode(family.coveFamilyCode),
          },
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      parentEmail: family.parentEmail,
      coveFamilyCode: family.coveFamilyCode,
      balance: family.balance,
      hasCard: true,
      students: family.students,
      paidMember: family.paidMember,
      membershipTier: family.membershipTier,
      paidMemberCode: (await import('@/lib/cove-family-code')).isPaidMemberFamilyCode(family.coveFamilyCode),
      // full GAN only for staff redeem. never show to parents in UI lists
      gan: family.gan,
    })
  } catch (err) {
    console.error('cove lookup', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lookup failed' },
      { status: 500 }
    )
  }
}
