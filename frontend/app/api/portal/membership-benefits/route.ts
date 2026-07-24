import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { getMembershipEntitlements } from '@/lib/staff/membership-fulfillment'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const effective = await getEffectiveParentEmail(req)
    const email = effective?.parentEmail ?? session.email
    const data = await getMembershipEntitlements(email)
    if (!data) return NextResponse.json({ entitlements: [], discountCode: '', tier: '' })
    return NextResponse.json(data)
  } catch (err) {
    console.error('/api/portal/membership-benefits', err)
    return NextResponse.json({ error: 'Could not load benefits' }, { status: 500 })
  }
}
