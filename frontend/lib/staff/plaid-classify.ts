/**
 * Map a Bank of America (Plaid) transaction onto a budget syncKey.
 * Plaid amounts: positive = money left the account, negative = money came in.
 */
export type ClassifiedBankTxn = {
  syncKey: string
  amount: number
  kind: 'income' | 'expense'
}

const INTERNAL_TRANSFER =
  /online banking transfer|keep the change|transfer to (chk|checking|sav|savings)|xfer to |internal transfer|account transfer|transfer from (chk|checking|sav|savings)|funds transfer/i

const PROCESSOR = /\b(square|paypal|stripe)\b|sq \*/i

function blob(input: { name: string; merchantName?: string; pfcPrimary?: string; pfcDetailed?: string }) {
  return `${input.name} ${input.merchantName ?? ''} ${input.pfcPrimary ?? ''} ${input.pfcDetailed ?? ''}`
}

/**
 * Square / PayPal / Stripe **settlements into checking**.
 * Those dollars already exist as Staff Payment sales (memberships, Cove, tickets…).
 * Skip the bank deposit so actuals are not counted twice. Processor **fees** (money out) still post.
 */
export function isProcessorPayout(input: {
  name: string
  merchantName?: string
  amount: number
  pfcPrimary?: string
  pfcDetailed?: string
}): boolean {
  const amount = Number(input.amount) || 0
  if (!(amount < 0)) return false
  const t = blob(input)
  if (!PROCESSOR.test(t)) return false
  if (/fee|chargeback/i.test(t)) return false
  return true
}

export function classifyBankTransaction(input: {
  name: string
  merchantName?: string
  amount: number
  pending?: boolean
  pfcPrimary?: string
  pfcDetailed?: string
}): ClassifiedBankTxn | null {
  if (input.pending) return null
  const amount = Math.round((Number(input.amount) || 0) * 100) / 100
  if (!amount) return null
  const t = blob(input)
  if (INTERNAL_TRANSFER.test(t)) return null
  if (isProcessorPayout({ ...input, amount })) return null
  // PTO debit card rung on our own Square Stand — already a Staff sale.
  if (/sq \*shmspto/i.test(t)) return null

  const abs = Math.abs(amount)
  const inflow = amount < 0

  if (inflow) {
    if (/zelle payment from/i.test(t)) {
      if (/event fee|ticket|dance/i.test(t)) return { syncKey: 'events_other', amount: abs, kind: 'income' }
      return { syncKey: 'cove_shop', amount: abs, kind: 'income' }
    }
    if (/counter credit|mobile.*deposit|bkofamerica mobile/i.test(t)) {
      return { syncKey: 'cove_pos', amount: abs, kind: 'income' }
    }
    if (/cheddar/i.test(t)) return { syncKey: 'gifts', amount: abs, kind: 'income' }
    if (/best runner|run for charity/i.test(t)) {
      return { syncKey: 'run_for_charity', amount: abs, kind: 'income' }
    }
    if (/sponsor/i.test(t)) return { syncKey: 'sponsorships', amount: abs, kind: 'income' }
    if (/spirit night|chick-fil-a|chick fil a|panera|mod pizza|chipotle|panda express/i.test(t)) {
      return { syncKey: 'gifts', amount: abs, kind: 'income' }
    }
    return { syncKey: 'unclassified_income', amount: abs, kind: 'income' }
  }

  if (/square.*fee|paypal fee|card processing/i.test(t)) {
    return { syncKey: 'processing', amount: abs, kind: 'expense' }
  }
  if (/tax1099|zenwork|irs |usataxpymt|\b990\b|tax filing|bank fee|monthly service|account fee/i.test(t)) {
    return { syncKey: 'tax_bank', amount: abs, kind: 'expense' }
  }
  if (
    /beautification|meadows farms|sherwin williams|quail creek|as we grow|community project|planters from amazon|community p\b/i.test(
      t,
    )
  ) {
    return { syncKey: 'beautification', amount: abs, kind: 'expense' }
  }
  if (/instructor|timesheet|contractor|w-?9|virtual loudoun|\bvlo\b|ep coach/i.test(t)) {
    return { syncKey: 'instructor_pay', amount: abs, kind: 'expense' }
  }
  if (/lego|math olympiad|moems|nova math/i.test(t)) {
    return { syncKey: 'enrichment_supplies', amount: abs, kind: 'expense' }
  }
  if (/dance|nico pilarski/i.test(t)) return { syncKey: 'dance_costs', amount: abs, kind: 'expense' }
  if (/wellness|teacher|appreciation|classroom|morale/i.test(t)) {
    return { syncKey: 'wellness', amount: abs, kind: 'expense' }
  }
  if (/jumbula|qr-code-generator|wix\.com|apple\.com|google \*|square hardware|adobe/i.test(t)) {
    return { syncKey: 'website_tools', amount: abs, kind: 'expense' }
  }
  if (/paypal des:purchase|paypal des:inst xfer/i.test(t)) {
    return { syncKey: 'website_tools', amount: abs, kind: 'expense' }
  }
  if (/sams club|sam's club|sam s club|new sams|sams\.com mem|costco/i.test(t)) {
    return { syncKey: 'cove_restock', amount: abs, kind: 'expense' }
  }
  if (/reston shirt|spirit wear|spiritwear/i.test(t)) {
    return { syncKey: 'merch_restock', amount: abs, kind: 'expense' }
  }
  if (/amazon |amzn\.com/i.test(t)) {
    return { syncKey: 'merch_restock', amount: abs, kind: 'expense' }
  }
  if (/magnet|membership shirt|perk/i.test(t)) {
    return { syncKey: 'membership_perks', amount: abs, kind: 'expense' }
  }
  if (/insurance|liability|policy/i.test(t)) return { syncKey: 'insurance', amount: abs, kind: 'expense' }
  if (/wix|vercel|moneyminder|website/i.test(t)) {
    return { syncKey: 'website_tools', amount: abs, kind: 'expense' }
  }
  if (/fastsigns|4imprint|canva|newsletter|flyer|\bprint\b/i.test(t)) {
    return { syncKey: 'comms', amount: abs, kind: 'expense' }
  }
  if (
    /raffle|steam day|annual night|sweet treat|jump around|snack cart|rais rendezvous|scotto|domino|wegmans|nova mobile|crown trophy|gift cards for steam|dunkin/i.test(
      t,
    )
  ) {
    return { syncKey: 'events', amount: abs, kind: 'expense' }
  }
  if (/zelle payment to/i.test(t)) {
    if (/store|sam|amazon|costco/i.test(t)) {
      return { syncKey: 'cove_restock', amount: abs, kind: 'expense' }
    }
    if (/coach|instructor|python|coordinator|nova math/i.test(t)) {
      return { syncKey: 'instructor_pay', amount: abs, kind: 'expense' }
    }
  }
  if (/enrichment|supplies|scholarship/i.test(t)) {
    return { syncKey: 'enrichment_supplies', amount: abs, kind: 'expense' }
  }
  if (/event|celebration/i.test(t)) return { syncKey: 'events', amount: abs, kind: 'expense' }
  return { syncKey: 'unclassified_expense', amount: abs, kind: 'expense' }
}
