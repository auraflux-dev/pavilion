/**
 * Pure fundraising classifiers (no CMS). Money in once, all channels.
 *
 * Count when cash first arrives (dues, parent load/reload, non-Cove sale).
 * Do not count: membership-bundled Cove credit, Cove card spends after any load,
 * Square/PayPal payouts into checking.
 *
 * BoA Counter Credit (cash_box_deposits): do not count the full deposit (would
 * double-count rung Cove cash). Count only the unexplained excess:
 * max(0, YTD Counter Credit − YTD cove_register_cash). That covers cash in the
 * bank that was never rung at POS.
 *
 * POS / cove_pos sales: exclude from fundraising only when tender is Cove card.
 * Cash, Stand, Zelle, and other tenders still count.
 */

export type FundraisingBucket =
  | 'membership'
  | 'store'
  | 'spiritWear'
  | 'danceNight'
  | 'novaMath'
  | 'other'

/**
 * Bank sync keys that stay on the budget/ledger and never map dollar-for-dollar
 * into public fundraising. cash_box_deposits still contribute via unexplained excess.
 */
export const FUNDRAISING_LEDGER_ONLY_BANK_KEYS = new Set([
  'cash_box_deposits',
  'card_payouts',
  // Legacy Counter Credit rows before cash_box_deposits. POS sales already counted.
  'cove_pos',
])

export function mapBankSyncKeyForFundraising(key: string): FundraisingBucket | null {
  if (FUNDRAISING_LEDGER_ONLY_BANK_KEYS.has(key)) return null
  if (key === 'memberships') return 'membership'
  if (key === 'cove_loads') return 'store'
  if (key === 'cove_shop') return 'spiritWear'
  if (key === 'dance_night') return 'danceNight'
  if (key === 'nova_math') return 'novaMath'
  if (
    key === 'events_other' ||
    key === 'enrichment_fees' ||
    key === 'gifts' ||
    key === 'run_for_charity' ||
    key === 'unclassified_income'
  ) {
    return 'other'
  }
  return null
}

/** True when this Payments row put physical cash in the Cove cash box. */
export function isCashBoxPosSale(source: string, paymentMethod = ''): boolean {
  const src = String(source ?? '').toLowerCase()
  if (src.includes('register_cash')) return true
  const method = String(paymentMethod ?? '').toLowerCase().trim()
  if (
    (method === 'cash' || method.startsWith('cash ')) &&
    src.includes('register') &&
    !src.includes('redeem')
  ) {
    return true
  }
  return false
}

/** Deposit dollars above rung Cove cash → count toward fundraising (usually Other). */
export function unexplainedCashBoxForFundraising(deposited: number, rungPosCash: number): number {
  const d = Math.round((Number(deposited) || 0) * 100) / 100
  const r = Math.round((Number(rungPosCash) || 0) * 100) / 100
  return Math.max(0, Math.round((d - r) * 100) / 100)
}

/**
 * Public tracker split from Staff Payments.
 * Cove Digital Card loads = family paid to load (cash in). Window spend is not new money.
 */
export function classifyFundraisingPayment(
  source: string,
  programName: string,
  status: string,
  paymentMethod: string,
): FundraisingBucket | null {
  const src = source.toLowerCase()
  const name = programName.toLowerCase()
  const st = status.toLowerCase()
  const method = paymentMethod.toLowerCase()
  if (src.includes('load_failed') || st.includes('fail') || st.includes('reconcil')) return null
  if (st.includes('refund')) return null
  // Bundled with membership dues. dues already count under membership.
  if (src === 'membership_gift_card') return null
  // Bag summary row. line items (:bag1, …) already count.
  if (src.endsWith('_cart') || src.includes('_cart')) return null
  // Cove card tender only. cash/stand/zelle POS still counts.
  if (src.includes('register_redeem') || method.includes('cove family')) return null
  if (src.includes('store_card') || src.includes('auto_topoff')) return 'store'

  if (src.includes('membership')) return 'membership'
  if (
    src.includes('cove_product') ||
    src.includes('pos_stand') ||
    src.includes('register_stand') ||
    src.includes('terminal') ||
    src.includes('register_cash') ||
    src.includes('register_zelle') ||
    src.includes('register_paypal') ||
    src.includes('register_phone') ||
    src.includes('register_other')
  ) {
    return 'spiritWear'
  }
  if (src.includes('event_ticket') || name.includes('ticket')) {
    if (name.includes('dance')) return 'danceNight'
    if (name.includes('nova')) return 'novaMath'
    return 'other'
  }
  if (src.includes('_program') || src.endsWith('program') || src.includes('enrichment')) {
    if (name.includes('nova')) return 'novaMath'
    if (name.includes('dance')) return 'danceNight'
    return 'other'
  }
  if (src.includes('donation') || src.includes('cheddarup') || name.includes('donation')) return 'other'
  if (name.includes('membership')) return 'membership'
  if (
    name.includes('spirit') ||
    name.includes('shop') ||
    name.includes('vintage') ||
    name.includes('hoodie') ||
    name.includes('candy') ||
    name.includes('snack') ||
    name.includes('in-person')
  ) {
    return 'spiritWear'
  }
  return null
}
