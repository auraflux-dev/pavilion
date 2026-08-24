export function dollarsToCents(d: number) {
  return Math.round(d * 100)
}

export function parseRefundAmountDollars(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(String(raw).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export function remainingRefundableDollars(amount: number, refundedAmountDollars: number) {
  return Math.max(0, Math.round((amount - (refundedAmountDollars || 0)) * 100) / 100)
}

export function resolveRefundAmountDollars(opts: {
  paymentAmount: number
  refundedAmountDollars: number
  requestedAmountDollars?: number | null
  mode: 'full' | 'partial'
}) {
  const remaining = remainingRefundableDollars(opts.paymentAmount, opts.refundedAmountDollars)
  if (remaining <= 0) throw new Error('Nothing left to refund on this payment')
  if (opts.mode === 'full') return remaining
  const requested = opts.requestedAmountDollars
  if (requested == null || requested <= 0) throw new Error('Enter a refund amount')
  if (requested > remaining + 0.001) {
    throw new Error(`Maximum refundable is $${remaining.toFixed(2)}`)
  }
  return requested
}

/** Scale Cove / card / reload legs for a partial refund. */
export function scaleRefundSplit(opts: {
  totalAmountDollars: number
  refundAmountDollars: number
  coveCents: number
  cardCents: number
  loadedCents: number
}) {
  const totalCents = dollarsToCents(opts.totalAmountDollars)
  const refundCents = dollarsToCents(opts.refundAmountDollars)
  if (refundCents >= totalCents) {
    return {
      coveCents: opts.coveCents,
      cardCents: opts.cardCents,
      loadedCents: opts.loadedCents,
    }
  }
  const ratio = refundCents / totalCents
  const scaled = {
    coveCents: Math.round(opts.coveCents * ratio),
    cardCents: Math.round(opts.cardCents * ratio),
    loadedCents: Math.round(opts.loadedCents * ratio),
  }
  const sum = scaled.coveCents + scaled.cardCents
  if (sum > 0 && sum !== refundCents && scaled.cardCents > 0) {
    scaled.cardCents = Math.max(0, refundCents - scaled.coveCents)
  }
  return scaled
}
