/** Parse split-payment and store-card load details from Payments.notes. */
export function parsePaymentNotes(notes: string, amountDollars: number) {
  const text = String(notes ?? '')
  const coveMatch = text.match(/Cove\s+\$([\d.]+)/i)
  const cardMatch = text.match(/card\s+\$([\d.]+)/i)
  const loadedMatch = text.match(/loaded\s+\$([\d.]+)/i)

  const coveCents = coveMatch ? Math.round(parseFloat(coveMatch[1]) * 100) : 0
  const cardCents = cardMatch ? Math.round(parseFloat(cardMatch[1]) * 100) : 0
  const loadedCents = loadedMatch ? Math.round(parseFloat(loadedMatch[1]) * 100) : 0

  const totalCents = Math.round(amountDollars * 100)
  let processorCents = cardCents
  if (processorCents <= 0 && coveCents > 0 && coveCents < totalCents) {
    processorCents = totalCents - coveCents
  }
  if (processorCents <= 0 && coveCents <= 0) {
    processorCents = totalCents
  }

  return {
    coveCents,
    cardCents: processorCents,
    loadedCents,
  }
}
