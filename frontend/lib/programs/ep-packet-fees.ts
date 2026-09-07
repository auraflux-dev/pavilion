/**
 * Locked EP list prices from the vendor/board packet.
 * Standard classes $375; Robotics $425 every season (Fall + Spring).
 */

/** Parent-facing footnote on cards / register (auto-applied at checkout by tier). */
export const EP_MEMBER_DISCOUNT_NOTE =
  'Paid members: Reef 10% · Lagoon 15% · Tide 30% off at checkout'

export const FALL_2026_EP_FEES = {
  ye: 375,
  essay: 375,
  mathcounts: 375,
  robotics: 425,
} as const

export const SPRING_2027_EP_FEES = {
  ye: 375,
  essay: 375,
  mathcounts: 375,
  robotics: 425,
} as const

export function fall2026EpFee(classId: string): number {
  const id = classId.trim().toLowerCase()
  return FALL_2026_EP_FEES[id as keyof typeof FALL_2026_EP_FEES] ?? 375
}

export function spring2027EpFee(classId: string): number {
  const id = classId.trim().toLowerCase()
  return SPRING_2027_EP_FEES[id as keyof typeof SPRING_2027_EP_FEES] ?? 375
}
