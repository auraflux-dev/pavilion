/**
 * Shared membership list/upgrade pricing helpers (Reef / Lagoon / Tide).
 * Household truth is Memberships.accountNumber (A#####), not login email alone.
 */
import {
  normalizeMembershipTier,
  pickHighestTier,
  tierRank,
} from '@/lib/staff/members-roster'

export type PricedTier = { tierId: string; price: number; name?: string; active?: boolean }

/** When CMS/catalog omits a paid tier price, still credit upgrades correctly. */
export const MEMBERSHIP_LIST_PRICE_FALLBACK: Record<string, number> = {
  reef: 49,
  lagoon: 149,
  tide: 249,
  faculty: 20,
}

export function listPriceForTier(tiers: PricedTier[], tierId: string): number {
  const id = normalizeMembershipTier(tierId)
  const match = tiers.find((t) => normalizeMembershipTier(t.tierId) === id)
  if (match && match.price > 0) return match.price
  return MEMBERSHIP_LIST_PRICE_FALLBACK[id] ?? 0
}

/** Dollars to charge: full list price for new paid, or list(target) − list(current) on upgrade. */
export function membershipChargeDollars(opts: {
  targetTier: string
  currentTier: string
  tiers: PricedTier[]
}): {
  amount: number
  listPrice: number
  currentListPrice: number
  isUpgrade: boolean
  currentTier: string
  targetTier: string
} {
  const targetTier = normalizeMembershipTier(opts.targetTier)
  const currentTier = normalizeMembershipTier(opts.currentTier)
  const listPrice = listPriceForTier(opts.tiers, targetTier)
  const currentListPrice =
    tierRank(currentTier) > 0 ? listPriceForTier(opts.tiers, currentTier) : 0
  const isUpgrade = tierRank(currentTier) > 0 && tierRank(targetTier) > tierRank(currentTier)
  const amount = isUpgrade
    ? Math.max(0, Math.round((listPrice - currentListPrice) * 100) / 100)
    : listPrice
  return { amount, listPrice, currentListPrice, isUpgrade, currentTier, targetTier }
}

/**
 * Highest paid tier for the household account number linked to this login.
 * Email is only used to find A#####; tiers come from all Memberships + Students on that account.
 */
export async function getParentHighestTier(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return 'free'

  try {
    const { resolveHouseholdMembershipContext } = await import(
      '@/lib/staff/membership-account-number'
    )
    const ctx = await resolveHouseholdMembershipContext(normalized)
    if (ctx.tierCandidates.length) return pickHighestTier(ctx.tierCandidates)
  } catch (err) {
    console.warn('getParentHighestTier account-number path failed; email fallback', err)
  }

  // Fallback if account numbers are not ready yet.
  const { getWixClient } = await import('@/lib/wix-client')
  const client = getWixClient()
  const [studentsRes, membershipsRes] = await Promise.all([
    client.items.query('Students').eq('parentEmail', normalized).limit(50).find(),
    client.items.query('Memberships').eq('email', normalized).limit(5).find(),
  ])
  const studentTiers = (studentsRes.items ?? []).map((s) =>
    String((s as { membershipTier?: string }).membershipTier ?? 'free'),
  )
  const membershipTiers = (membershipsRes.items ?? []).map((m) =>
    String((m as { tier?: string }).tier ?? 'free'),
  )
  return pickHighestTier([...studentTiers, ...membershipTiers])
}

export function formatTierLabel(tier: string): string {
  const n = normalizeMembershipTier(tier)
  if (!n || n === 'free') return 'Free'
  return n.charAt(0).toUpperCase() + n.slice(1)
}
