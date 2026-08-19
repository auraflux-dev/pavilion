/**
 * Pull PayPal account activity (Transaction Search) into PtoBudgetEntries.
 * Skips bank withdrawals and anything already in Staff Payments (site checkout).
 */
import { isPayPalConfigured, listPayPalAccountPayments } from '@/lib/paypal'
import {
  DEFAULT_FISCAL_YEAR,
  ensureMissingPlaceholderLines,
  schoolYearWindowForFiscalYear,
} from '@/lib/staff/budget'
import { ensureBankBudgetLines } from '@/lib/staff/budget-bank'
import {
  listBudgetEntries,
  persistLineActuals,
  upsertBudgetEntryByRefId,
} from '@/lib/staff/budget-sync'
import { classifyPaypal, isSkippedPaypalType } from '@/lib/staff/paypal-csv'
import { getWixClient } from '@/lib/wix-client'

function isPayoutCode(type: string) {
  return /^(T02|T04|T11|T15)/.test(type) || isSkippedPaypalType(type)
}

async function existingPaymentIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  try {
    const client = getWixClient()
    for (let skip = 0; skip < 1500; skip += 100) {
      const res = await client.items.query('Payments').skip(skip).limit(100).find().catch(() => ({ items: [] }))
      const items = (res.items ?? []) as Record<string, unknown>[]
      for (const row of items) {
        const id = String(row.transactionId ?? '').trim()
        if (id) ids.add(id)
      }
      if (items.length < 100) break
    }
  } catch {
    return ids
  }
  return ids
}

export async function refreshPaypalIntoBudget(opts: {
  fiscalYear?: string
  actorEmail: string
}): Promise<{ added: number; updated: number; skipped: number; rows: number; error?: string }> {
  const fiscalYear = opts.fiscalYear || DEFAULT_FISCAL_YEAR
  if (!isPayPalConfigured()) {
    return { added: 0, updated: 0, skipped: 0, rows: 0, error: 'PayPal Client ID and Secret are not set on Vercel.' }
  }
  const { from, to } = schoolYearWindowForFiscalYear(fiscalYear)
  const listed = await listPayPalAccountPayments({ from, to })
  if (listed.error && !listed.payments.length) {
    return { added: 0, updated: 0, skipped: 0, rows: 0, error: listed.error }
  }
  await ensureBankBudgetLines(fiscalYear)
  await ensureMissingPlaceholderLines(fiscalYear)
  const known = await existingPaymentIds()
  let added = 0
  let updated = 0
  let skipped = 0
  for (const row of listed.payments) {
    if (!row.id || known.has(row.id)) {
      skipped += 1
      continue
    }
    if (isPayoutCode(row.type)) {
      skipped += 1
      continue
    }
    const key = classifyPaypal(row.type, row.name)
    if (!key) {
      skipped += 1
      continue
    }
    const result = await upsertBudgetEntryByRefId({
      fiscalYear,
      lineSyncKey: key,
      occurredAt: row.date,
      amount: row.amount,
      memo: `${row.type}: ${row.name}`.slice(0, 180),
      origin: 'auto-paypal',
      refId: `paypalapi:${row.id}`,
      createdByEmail: opts.actorEmail,
    })
    if (result === 'inserted') added += 1
    else if (result === 'updated') updated += 1
    else skipped += 1
  }
  const entries = await listBudgetEntries(fiscalYear)
  await persistLineActuals(fiscalYear, entries)
  return { added, updated, skipped, rows: listed.payments.length, error: listed.error }
}
