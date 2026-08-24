/** Staff refund / exchange adjustment kinds stored on Payments.adjustmentType */

export const ADJUSTMENT_TYPES = [
  'refund_full',
  'refund_partial',
  'exchange_equal',
  'exchange_upgrade',
  'exchange_downgrade',
  'store_credit',
] as const

export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number]

export const REFUND_DESTINATIONS = ['payment_method', 'cove_balance'] as const
export type RefundDestination = (typeof REFUND_DESTINATIONS)[number]

export const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  refund_full: 'Full refund',
  refund_partial: 'Partial refund',
  exchange_equal: 'Exchange (same value)',
  exchange_upgrade: 'Exchange (upgrade, refund + rebill)',
  exchange_downgrade: 'Exchange (downgrade, partial refund)',
  store_credit: 'Store credit on Cove card',
}

export function isAdjustmentType(v: string): v is AdjustmentType {
  return (ADJUSTMENT_TYPES as readonly string[]).includes(v)
}

export function defaultAmountMode(type: AdjustmentType): 'full' | 'partial' {
  if (type === 'refund_partial' || type === 'exchange_downgrade') return 'partial'
  return 'full'
}

export function defaultDestination(type: AdjustmentType): RefundDestination {
  if (type === 'store_credit') return 'cove_balance'
  return 'payment_method'
}

export function canRequestRefund(refundStatus: string, amount: number, refundedAmountDollars: number) {
  const status = refundStatus.trim().toLowerCase()
  if (status === 'pending' || status === 'refunded') return false
  const remaining = Math.max(0, amount - (refundedAmountDollars || 0))
  return remaining > 0.009
}
