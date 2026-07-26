/** Flexible PTO donation amounts (Square / PayPal). */

export const DONATION_MIN_DOLLARS = 1
export const DONATION_MAX_DOLLARS = 10_000
export const DONATION_PRESETS = [5, 15, 25] as const

/** Whole dollars or cents (max 2 decimal places), $1 to $10,000. */
export function isAllowedDonationAmount(dollars: number): boolean {
  if (!Number.isFinite(dollars)) return false
  const cents = Math.round(dollars * 100)
  if (Math.abs(dollars * 100 - cents) > 0.001) return false
  return cents >= DONATION_MIN_DOLLARS * 100 && cents <= DONATION_MAX_DOLLARS * 100
}

export function donationAmountCents(dollars: number): number {
  return Math.round(dollars * 100)
}
