/**
 * Public membership deep links.
 * #choose scrolls to "Choose Your Membership" + tier checkout cards.
 * #tiers is kept as a legacy alias on the same section.
 */
export const MEMBERSHIP_PATH = '/membership'
export const MEMBERSHIP_CHOOSE_HASH = 'choose'
export const MEMBERSHIP_CHOOSE_PATH = `${MEMBERSHIP_PATH}#${MEMBERSHIP_CHOOSE_HASH}`

/** Portal / CTA link to paid tiers (Reef · Lagoon · Tide) for join or upgrade. */
export function membershipChooseHref(opts?: { checkoutTier?: string }): string {
  const tier = String(opts?.checkoutTier ?? '')
    .trim()
    .toLowerCase()
  if (tier && ['reef', 'lagoon', 'tide', 'faculty'].includes(tier)) {
    return `${MEMBERSHIP_PATH}?checkout=${tier}#${MEMBERSHIP_CHOOSE_HASH}`
  }
  return MEMBERSHIP_CHOOSE_PATH
}
