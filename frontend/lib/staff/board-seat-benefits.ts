/**
 * Board seat package: complimentary Reef + 75% off one enrichment program per season.
 * No SHMSREEF10 (that is for paying Reef families).
 * Applied to the board member's personal (parent portal) email. not @shmspto.org.
 */
import { applyPaidMembership } from '@/lib/membership-sync'
import { issueBoardEnrichmentDiscounts } from '@/lib/staff/board-enrichment-discounts'

export type BoardSeatBenefitsResult = {
  parentEmail: string
  tier: 'reef'
  fallCode: string
  springCode: string
  membershipUpserted: boolean
  enrichmentCode: string | null
}

/** Grant free Reef + Fall/Spring board 75% EP codes on a personal email. */
export async function grantBoardSeatBenefits(opts: {
  parentEmail: string
  displayName?: string
  staffEmail?: string
}): Promise<BoardSeatBenefitsResult> {
  const parentEmail = opts.parentEmail.trim().toLowerCase()
  if (!parentEmail || !parentEmail.includes('@') || parentEmail.endsWith('@shmspto.org')) {
    throw new Error('Board seat perks require a personal parent email (not @shmspto.org).')
  }

  const displayName = String(opts.displayName ?? parentEmail.split('@')[0]).trim()
  const staffTag = String(opts.staffEmail ?? 'board').trim().toLowerCase() || 'board'
  const year = new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear()
  const orderId = `board-seat-reef-${staffTag}-${year}`

  const membership = await applyPaidMembership({
    parentEmail,
    tier: 'reef',
    parentName: displayName,
    orderId,
    skipEnrichmentCode: true,
  })

  // Board seat: complimentary Reef for portal access/perks, but not SHMSREEF10.
  // Season 75% codes are the enrichment benefit.
  try {
    const { clearEnrichmentCodeFromFamily } = await import('@/lib/staff/enrichment-codes')
    await clearEnrichmentCodeFromFamily(parentEmail)
    const client = (await import('@/lib/wix-client')).getWixClient()
    const res = await client.items.query('Memberships').eq('email', parentEmail).limit(1).find()
    const row = res.items?.[0] as Record<string, unknown> | undefined
    if (row?._id) {
      const { parseEntitlementsJson } = await import('@/lib/membership-entitlements')
      const ents = parseEntitlementsJson(row.entitlementsJson).filter(
        (e) => e.kind !== 'enrichment_discount',
      )
      await client.items.update('Memberships', {
        ...row,
        _id: String(row._id),
        enrichmentCode: '',
        entitlementsJson: JSON.stringify(ents),
      })
    }
  } catch {
    // best-effort
  }

  const codes = await issueBoardEnrichmentDiscounts({
    parentEmail,
    displayName,
  })

  return {
    parentEmail,
    tier: 'reef',
    fallCode: codes.fallCode,
    springCode: codes.springCode,
    membershipUpserted: membership.membershipUpserted,
    enrichmentCode: null,
  }
}
