/**
 * Public "Where the Funds Go". actual spending from the treasurer budget.
 * Sums PtoBudgetEntries on expense lines for the current school year (Aug to Jul).
 */
import { isDemoInstance } from '@/lib/demo/instance'
import { listBudgetLines, money, schoolYearWindowForFiscalYear } from '@/lib/staff/budget'
import { listBudgetEntries } from '@/lib/staff/budget-sync'

export type FundAllocationBucket =
  | 'studentEnrichment'
  | 'schoolEvents'
  | 'teacherSupport'
  | 'coveOps'
  | 'ptoAdmin'

export const FUND_ALLOCATION_ORDER: FundAllocationBucket[] = [
  'studentEnrichment',
  'schoolEvents',
  'teacherSupport',
  'coveOps',
  'ptoAdmin',
]

export const FUND_ALLOCATION_LABELS: Record<FundAllocationBucket, string> = {
  studentEnrichment: 'Student Enrichment Programs',
  schoolEvents: 'School Events & Celebrations',
  teacherSupport: 'Teacher & Classroom Support',
  coveOps: 'The Cove Operations',
  ptoAdmin: 'PTO Admin & Communications',
}

/** Treasurer expense syncKeys → public allocation buckets. */
export const EXPENSE_SYNC_KEY_TO_ALLOCATION: Record<string, FundAllocationBucket> = {
  instructor_pay: 'studentEnrichment',
  enrichment_supplies: 'studentEnrichment',
  events: 'schoolEvents',
  beautification: 'schoolEvents',
  dance_costs: 'schoolEvents',
  wellness: 'teacherSupport',
  cove_restock: 'coveOps',
  merch_restock: 'coveOps',
  membership_perks: 'coveOps',
  processing: 'ptoAdmin',
  insurance: 'ptoAdmin',
  tax_bank: 'ptoAdmin',
  website_tools: 'ptoAdmin',
  comms: 'ptoAdmin',
  contingency: 'ptoAdmin',
  unclassified_expense: 'ptoAdmin',
}

export interface FundAllocationRow {
  id: FundAllocationBucket
  label: string
  spent: number
  /** Share of total spending this school year (0-100). */
  pct: number
}

export interface FundAllocationData {
  rows: FundAllocationRow[]
  totalSpent: number
  schoolYearLabel: string
}

function currentSchoolYearLabel(now = new Date()) {
  const year = now.getUTCFullYear()
  const startYear = now.getUTCMonth() >= 7 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

function schoolYearFiscalKey(now = new Date()) {
  const year = now.getUTCFullYear()
  const startYear = now.getUTCMonth() >= 7 ? year : year - 1
  return `${startYear}-${String(startYear + 1).slice(-2)}`
}

function inSchoolYear(isoDate: string, fromMs: number, toMs: number) {
  if (!isoDate) return false
  const t = new Date(`${isoDate.slice(0, 10)}T12:00:00.000Z`).getTime()
  return Number.isFinite(t) && t >= fromMs && t <= toMs
}

export async function getFundAllocationActuals(): Promise<FundAllocationData> {
  const schoolYearLabel = currentSchoolYearLabel()

  if (isDemoInstance()) {
    const demoSpent: Record<FundAllocationBucket, number> = {
      studentEnrichment: 1840,
      schoolEvents: 920,
      teacherSupport: 640,
      coveOps: 1180,
      ptoAdmin: 420,
    }
    const totalSpent = Object.values(demoSpent).reduce((n, v) => n + v, 0)
    return {
      totalSpent,
      schoolYearLabel,
      rows: FUND_ALLOCATION_ORDER.map((id) => ({
        id,
        label: FUND_ALLOCATION_LABELS[id],
        spent: demoSpent[id],
        pct: totalSpent > 0 ? Math.round((demoSpent[id] / totalSpent) * 100) : 0,
      })),
    }
  }

  const fiscalYear = schoolYearFiscalKey()
  const { from, to } = schoolYearWindowForFiscalYear(fiscalYear)
  const fromMs = from.getTime()
  const toMs = to.getTime()

  const [lines, entries] = await Promise.all([
    listBudgetLines(fiscalYear).catch(() => []),
    listBudgetEntries(fiscalYear).catch(() => []),
  ])

  const expenseKeys = new Set(lines.filter((l) => l.kind === 'expense').map((l) => l.syncKey))
  const spent: Record<FundAllocationBucket, number> = {
    studentEnrichment: 0,
    schoolEvents: 0,
    teacherSupport: 0,
    coveOps: 0,
    ptoAdmin: 0,
  }

  for (const entry of entries) {
    if (!expenseKeys.has(entry.lineSyncKey)) continue
    if (!inSchoolYear(entry.occurredAt, fromMs, toMs)) continue
    const amount = money(entry.amount)
    if (!(amount > 0)) continue
    const bucket = EXPENSE_SYNC_KEY_TO_ALLOCATION[entry.lineSyncKey]
    if (!bucket) continue
    spent[bucket] += amount
  }

  const totalSpent = money(Object.values(spent).reduce((n, v) => n + v, 0))
  const rows = FUND_ALLOCATION_ORDER.map((id) => {
    const rowSpent = money(spent[id])
    return {
      id,
      label: FUND_ALLOCATION_LABELS[id],
      spent: rowSpent,
      pct: totalSpent > 0 ? Math.round((rowSpent / totalSpent) * 100) : 0,
    }
  })

  return { rows, totalSpent, schoolYearLabel }
}
