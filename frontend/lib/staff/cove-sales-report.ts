/**
 * Cove merchandise reporting: store snacks + spirit wear (online + Stand/register).
 * Excludes Cove Digital Card loads and snack-window balance redeems.
 */

export type CovePaymentLike = {
  source?: string
  programName?: string
  notes?: string
  amount?: number
  status?: string
  paymentDate?: string
  parentEmail?: string
  paymentMethod?: string
  transactionId?: string
  _id?: string
}

export type CovePurchasedItem = {
  item: string
  qty: number
}

/** True for store snack / spirit wear sales (online or in-person POS). */
export function isCoveMerchandiseSale(row: CovePaymentLike): boolean {
  const src = String(row.source ?? '').toLowerCase()
  const name = String(row.programName ?? '').toLowerCase()

  if (src.includes('membership')) return false
  if (src.includes('store_card') || src.includes('auto_topoff')) return false
  if (src.includes('register_redeem') || src.includes('gift_card')) return false
  if (/digital card|store card reload|first load|snack window/i.test(name)) return false
  if (/^membership\b/i.test(name)) return false

  if (src.includes('cove_product')) return true
  if (
    src.includes('pos_stand') ||
    src.includes('register_stand') ||
    src.includes('register_cash') ||
    src.includes('register_terminal') ||
    src.includes('cove_register') ||
    src.includes('terminal')
  ) {
    return true
  }

  if (
    /^the cove[:.]\s+/i.test(String(row.programName ?? '')) &&
    !/digital card|reload|first load|snack window/i.test(name)
  ) {
    return true
  }

  if (/in-person sales/i.test(name)) return true
  if (/spirit|hoodie|stingrays|drawstring|magnet|long sleeve|t-shirt|tee\b/i.test(name)) {
    return true
  }

  return false
}

/**
 * Pull purchased item lines from a Payments row.
 * Online: programName "The Cove: Item".
 * Stand/register: notes contain "2× Item, 1× Other".
 */
export function parseCovePurchasedItems(row: CovePaymentLike): CovePurchasedItem[] {
  const programName = String(row.programName ?? '').trim()
  const notes = String(row.notes ?? '')

  const online = programName.match(/^The Cove[:.]\s+(.+)$/i)
  if (online) {
    const item = online[1].trim()
    if (item && !/digital card|reload|first load|snack window/i.test(item)) {
      return [{ item, qty: 1 }]
    }
  }

  const fromNotes: CovePurchasedItem[] = []
  const re = /(\d+)\s*[×xX]\s*([^,·]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(notes)) !== null) {
    const qty = Math.max(1, parseInt(m[1], 10) || 1)
    let item = m[2].trim().replace(/\s+/g, ' ')
    // Strip trailing "Contact …" / tender crumbs if a bad split happened
    item = item.replace(/\s+Contact\b.*$/i, '').trim()
    if (!item) continue
    if (/^unmatched skus/i.test(item)) continue
    fromNotes.push({ item, qty })
  }
  if (fromNotes.length) return fromNotes

  if (/in-person sales/i.test(programName)) {
    return [{ item: programName, qty: 1 }]
  }

  if (programName && isCoveMerchandiseSale(row)) {
    return [{ item: programName, qty: 1 }]
  }

  return []
}

export type CoveItemSalesRow = {
  id: string
  item: string
  qty: number
  sales: number
  amount: number
}

/** Roll up merchandise payments into an items-sold table. */
export function aggregateCoveItemSales(rows: CovePaymentLike[]): CoveItemSalesRow[] {
  const map = new Map<
    string,
    { item: string; qty: number; sales: number; amount: number }
  >()

  for (const row of rows) {
    if (!isCoveMerchandiseSale(row)) continue
    const st = String(row.status ?? '').toLowerCase()
    if (st.includes('refund') || st.includes('fail') || st === 'spent') continue

    const items = parseCovePurchasedItems(row)
    if (!items.length) continue

    const paymentAmount = Number(row.amount ?? 0) || 0
    const totalQty = items.reduce((s, i) => s + i.qty, 0) || 1

    for (const line of items) {
      const key = line.item.toLowerCase()
      const share = paymentAmount * (line.qty / totalQty)
      const prev = map.get(key)
      if (prev) {
        prev.qty += line.qty
        prev.sales += 1
        prev.amount += share
      } else {
        map.set(key, {
          item: line.item,
          qty: line.qty,
          sales: 1,
          amount: share,
        })
      }
    }
  }

  return [...map.values()]
    .map((r, i) => ({
      id: `item-${i}-${r.item.slice(0, 24)}`,
      item: r.item,
      qty: r.qty,
      sales: r.sales,
      amount: Math.round(r.amount * 100) / 100,
    }))
    .sort((a, b) => b.qty - a.qty || b.amount - a.amount || a.item.localeCompare(b.item))
}
