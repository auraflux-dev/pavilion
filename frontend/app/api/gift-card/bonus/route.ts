import { NextRequest, NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/api/site-settings'
import {
  getStoreCardBonusPercent,
  resolveParentLoadBonusPercent,
} from '@/lib/store-card-bonus'
import { resolvePrimaryParentEmail } from '@/lib/family-guardians'
import { getEffectiveParentEmail } from '@/lib/staff/session'

/**
 * GET /api/gift-card/bonus
 * Whether this family still qualifies for the first-load bonus.
 */
export async function GET(req: NextRequest) {
  const effective = await getEffectiveParentEmail(req)
  if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const householdEmail = await resolvePrimaryParentEmail(effective.parentEmail)
    const settings = await getSiteSettings()
    const configured = getStoreCardBonusPercent(settings.get('storeCardBonusPercent', '10'))
    const bonusPercent = await resolveParentLoadBonusPercent(householdEmail, configured)

    return NextResponse.json({
      configuredBonusPercent: configured,
      bonusPercent,
      firstLoadEligible: bonusPercent > 0,
    })
  } catch (err) {
    console.error('/api/gift-card/bonus GET error:', err)
    return NextResponse.json({ error: 'Could not resolve bonus' }, { status: 500 })
  }
}
