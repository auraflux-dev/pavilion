/**
 * Auraflux cost envelope for Commons ($399/mo list).
 * Plaid Transactions is billed per Item. Stay on Trial until paying Commons clients.
 * Set PLAID_TRANSACTIONS_ITEM_USD_MONTH from Billing when leaving Trial.
 */
export const COMMONS_LIST_PRICE_USD = 399

export const PLATFORM_FIXED_USD = {
  renderProWorkspace: 25,
  renderPostgresBasic1gb: 19,
  renderStorageHeadroom: 6,
  vercelComputeBand: 35,
  r2: 5,
  healthProbe: 10,
  resend: 10,
} as const

export function platformSubtotalUsd(): number {
  return Object.values(PLATFORM_FIXED_USD).reduce((a, b) => a + b, 0)
}

const PLAID_BAND_LOW = 15
const PLAID_BAND_HIGH = 40

export function plaidItemUsdMonth(): { usd: number; source: 'dashboard' | 'band-mid' } {
  const raw = Number(process.env.PLAID_TRANSACTIONS_ITEM_USD_MONTH)
  if (Number.isFinite(raw) && raw > 0) return { usd: raw, source: 'dashboard' }
  return { usd: (PLAID_BAND_LOW + PLAID_BAND_HIGH) / 2, source: 'band-mid' }
}

export function envelope(schools: number) {
  const plaid = plaidItemUsdMonth()
  const platform = platformSubtotalUsd()
  const plaidTotal = plaid.usd * schools
  const infra = platform + plaidTotal
  const revenue = COMMONS_LIST_PRICE_USD * schools
  return {
    schools,
    platformUsd: platform,
    plaidUsdPerSchool: plaid.usd,
    plaidSource: plaid.source,
    plaidBand: { low: PLAID_BAND_LOW, high: PLAID_BAND_HIGH },
    infraUsd: infra,
    revenueUsd: revenue,
    infraShare: revenue > 0 ? infra / revenue : 0,
  }
}

export const COST_ENVELOPES = {
  one: envelope(1),
  ten: envelope(10),
  hundred: envelope(100),
} as const
