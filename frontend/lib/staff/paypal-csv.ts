/**
 * PayPal Transaction Search classifiers (live API).
 * Skip bank withdrawals / payouts so those dollars stay on Staff Payments or BoA, not twice.
 */

export function isSkippedPaypalType(type: string) {
  return /withdraw|payout|transfer to|bank deposit|hold|reserve|reversal|refund|fee|currency conversion|general authorization/i.test(
    type,
  )
}

export function classifyPaypal(type: string, name: string): string | null {
  const t = `${type} ${name}`.toLowerCase()
  if (isSkippedPaypalType(type)) return null
  if (/membership/.test(t)) return 'memberships'
  if (/store card|cove digital|gift card|auto.?top/.test(t)) return 'cove_loads'
  if (/spirit|hoodie|shirt|shop|vintage|drawstring/.test(t)) return 'cove_shop'
  if (/donation|gift/.test(t)) return 'gifts'
  if (/dance/.test(t)) return 'dance_night'
  if (/nova/.test(t)) return 'nova_math'
  if (/sponsor/.test(t)) return 'sponsorships'
  if (/ticket|event/.test(t)) return 'events_other'
  if (/express checkout|website payment|mobile payment|invoice|payment received|mass pay/.test(t)) {
    return 'unclassified_income'
  }
  return 'unclassified_income'
}
