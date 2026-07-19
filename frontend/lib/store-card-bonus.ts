/**
 * Member store-card reload bonus.
 * Parents pay `payCents`; the gift card is loaded with pay + bonus.
 * e.g. 10% on $50 → charge $50, load $55.
 */
export function getStoreCardBonusPercent(raw: string | number | undefined | null, fallback = 10): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(50, Math.round(n * 100) / 100)
}

export function storeCardLoadCents(payCents: number, bonusPercent: number): number {
  if (!Number.isInteger(payCents) || payCents < 0) return 0
  if (bonusPercent <= 0) return payCents
  return Math.round(payCents * (1 + bonusPercent / 100))
}

export function formatStoreCardBonusExample(payDollars: number, bonusPercent: number): string {
  const load = payDollars * (1 + bonusPercent / 100)
  const loadLabel = Number.isInteger(load) ? `$${load}` : `$${load.toFixed(2)}`
  return `Pay $${payDollars} · get ${loadLabel} on the card (${bonusPercent}% member bonus)`
}
