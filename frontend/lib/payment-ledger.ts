/**
 * Normalize Payments CMS rows for parent-facing history.
 * Covers membership Cove credit (all tiers), store-card bonus loads, and Cove register spends.
 */

export type PaymentLedgerFields = {
  programName: string
  amount: number
  status: string
  paymentDate: string | null
  paymentMethod: string
  source?: string
  notes?: string
  /** Extra line under the title (bonus / register detail). */
  detail?: string
}

function createdDate(raw: Record<string, unknown>): string | null {
  if (typeof raw.paymentDate === 'string' && raw.paymentDate) return raw.paymentDate
  if (raw.paymentDate) return String(raw.paymentDate)
  if (typeof raw._createdDate === 'string' && raw._createdDate) return raw._createdDate
  if (raw._createdDate) return String(raw._createdDate)
  return null
}

function titleCaseTier(raw: string): string {
  const t = raw.trim()
  if (!t) return raw
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

export function normalizePaymentLedgerRow(
  raw: Record<string, unknown>,
): PaymentLedgerFields {
  const source = String(raw.source ?? '')
  const notes = String(raw.notes ?? '')
  let programName = String(raw.programName ?? '').trim()
  let amount = Number(raw.amount ?? 0)
  let status = String(raw.status ?? '')
  let paymentDate = createdDate(raw)
  let paymentMethod = String(raw.paymentMethod ?? '').trim()
  let detail: string | undefined

 // Membership gift-card credit (Reef / Lagoon / Tide). amount should be loaded $, not base.
  if (source === 'membership_gift_card') {
    const loaded = notes.match(/→\s*\$?\s*([\d.]+)/)
    if (loaded) {
      const n = Number(loaded[1])
      if (Number.isFinite(n) && n > 0) amount = n
    }
    if (!programName) {
      const tier = notes.match(/Membership\s+(\w+)/i)?.[1]
      programName = tier
        ? `Membership ${titleCaseTier(tier)} · Cove credit`
        : 'Membership · Cove credit'
    } else {
      programName = programName.replace(
        /Membership\s+(\w+)/i,
        (_, t: string) => `Membership ${titleCaseTier(t)}`,
      )
    }
    if (status === 'Paid') status = 'Loaded'
    if (!paymentMethod) paymentMethod = 'Membership credit'
    if (notes.includes('→')) detail = notes
  }

  // Family Cove Digital Card first load / reload with first-load bonus in notes.
  if (
    /store_card_reload/.test(source) &&
    !/_load_failed/.test(source)
  ) {
    const bonus = notes.match(
      /Paid\s+\$?\s*([\d.]+)\s*;\s*loaded\s+\$?\s*([\d.]+)\s*\(([^)]+)\)/i,
    )
    if (bonus) {
      const paid = Number(bonus[1])
      const loaded = Number(bonus[2])
      if (Number.isFinite(paid) && paid > 0) amount = paid
      if (Number.isFinite(loaded) && loaded > paid) {
        detail = `Loaded $${loaded.toFixed(2)} on the Cove Digital Card (${bonus[3]})`
        if (!/bonus|first load/i.test(programName)) {
          programName = programName || 'Family Cove Digital Card First Load'
        }
      }
    }
  }

  // Snack-window redeem against Cove digital balance.
  if (source === 'cove_register_redeem') {
    if (!programName) programName = 'The Cove · snack window'
    if (!paymentMethod) paymentMethod = 'Cove Family Card'
    if (notes) detail = notes
    if (status === 'Paid') status = 'Spent'
  }

  if (!programName) programName = 'Payment'

  return {
    programName,
    amount,
    status,
    paymentDate,
    paymentMethod,
    source,
    notes,
    detail,
  }
}
