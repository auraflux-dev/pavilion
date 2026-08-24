import { createBudgetLine, listBudgetLines } from '@/lib/staff/budget'

export const BANK_BUDGET_LINES: Array<{
  kind: 'income' | 'expense'
  category: string
  name: string
  sortOrder: number
  syncKey: string
  notes: string
}> = [
  {
    kind: 'income',
    category: 'Bank',
    name: 'Cash box deposits (Counter Credit)',
    sortOrder: 52,
    syncKey: 'cash_box_deposits',
    notes:
      'BoA Counter Credit / mobile cash deposits. On the ledger for visibility. Not in planning totals or public fundraising. Cash already counted when rung at POS.',
  },
  {
    kind: 'income',
    category: 'Bank',
    name: 'Card processor deposits (Square / PayPal → BoA)',
    sortOrder: 55,
    syncKey: 'card_payouts',
    notes: 'Not filled from the bank CSV. Square/PayPal payouts are skipped so Staff Payments keep the sale split.',
  },
  {
    kind: 'income',
    category: 'Bank',
    name: 'Unclassified BoA deposits',
    sortOrder: 130,
    syncKey: 'unclassified_income',
    notes: 'Bank feed could not map these inflows.',
  },
  {
    kind: 'expense',
    category: 'Bank',
    name: 'Unclassified BoA withdrawals',
    sortOrder: 340,
    syncKey: 'unclassified_expense',
    notes: 'Bank feed could not map these outflows.',
  },
]

export async function ensureBankBudgetLines(fiscalYear: string) {
  const lines = await listBudgetLines(fiscalYear)
  const have = new Set(lines.map((l) => l.syncKey))
  for (const spec of BANK_BUDGET_LINES) {
    if (have.has(spec.syncKey)) continue
    await createBudgetLine({
      fiscalYear,
      kind: spec.kind,
      category: spec.category,
      name: spec.name,
      budgeted: 0,
      actual: 0,
      owner: 'Treasurer',
      notes: spec.notes,
      sortOrder: spec.sortOrder,
      syncKey: spec.syncKey,
    })
  }
}

export function isBankOrigin(origin: string) {
  return origin === 'auto-plaid' || origin === 'auto-bofa' || origin === 'auto-paypal'
}
