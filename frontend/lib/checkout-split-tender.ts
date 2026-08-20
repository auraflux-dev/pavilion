/**
 * Split a cart total across Cove Digital Card balance, then a card (Square/PayPal).
 * Square card charges must be $0 or at least $1.
 */
export const SQUARE_CARD_MIN_CENTS = 100

export type SplitTender = {
  coveCents: number
  cardCents: number
}

export function splitCoveAndCard(opts: {
  totalCents: number
  coveBalanceCents: number
  useCove: boolean
}): SplitTender {
  const total = Math.max(0, Math.round(opts.totalCents))
  if (total <= 0) return { coveCents: 0, cardCents: 0 }
  if (!opts.useCove) return { coveCents: 0, cardCents: total }

  const available = Math.max(0, Math.round(opts.coveBalanceCents))
  if (available <= 0) return { coveCents: 0, cardCents: total }

  let coveCents = Math.min(available, total)
  let cardCents = total - coveCents

  if (cardCents > 0 && cardCents < SQUARE_CARD_MIN_CENTS) {
    coveCents = Math.max(0, total - SQUARE_CARD_MIN_CENTS)
    if (coveCents > available) coveCents = available
    cardCents = total - coveCents
    if (cardCents > 0 && cardCents < SQUARE_CARD_MIN_CENTS) {
      if (available >= total) return { coveCents: total, cardCents: 0 }
      return { coveCents: 0, cardCents: total }
    }
  }

  return { coveCents, cardCents }
}

export function dollarsFromCents(cents: number): number {
  return Math.round(cents) / 100
}
