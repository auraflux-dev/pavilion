import ExcelJS from 'exceljs'
import {
  DEFAULT_FISCAL_YEAR,
  FISCAL_YEAR_LABEL,
  summarizeBudget,
  type BudgetLine,
} from '@/lib/staff/budget'
import { applyEntryTotals, trackingFor, type BudgetEntry } from '@/lib/staff/budget-sync'

function originLabel(origin: string) {
  if (origin === 'auto-plaid' || origin === 'auto-bofa') return 'Bank · BoA'
  if (origin === 'auto-paypal') return 'PayPal activity'
  if (origin === 'auto-payment') return 'Staff · sale'
  if (origin === 'auto-expense') return 'Staff · reimbursement'
  if (origin === 'reclass') return 'Moved'
  if (origin === 'opening') return 'Opening'
  return 'Keyed'
}

function moneyCol(cell: ExcelJS.Cell) {
  cell.numFmt = '$#,##0.00'
}

function headerRow(row: ExcelJS.Row, values: string[]) {
  values.forEach((value, i) => {
    row.getCell(i + 1).value = value
  })
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF085508' },
  }
  row.alignment = { vertical: 'middle', wrapText: true }
}

export async function buildBudgetWorkbook(input: {
  year: string
  lines: BudgetLine[]
  entries: BudgetEntry[]
}): Promise<Buffer> {
  const year = input.year || DEFAULT_FISCAL_YEAR
  const label = year === DEFAULT_FISCAL_YEAR ? FISCAL_YEAR_LABEL : year
  const lines = applyEntryTotals(input.lines, input.entries)
  const summary = summarizeBudget(lines)
  const nameFor = (key: string) => lines.find((l) => l.syncKey === key)?.name ?? key

  const wb = new ExcelJS.Workbook()
  wb.creator = 'SHMS PTO Staff'
  wb.created = new Date()
  wb.title = `SHMS PTO budget ${year}`

  const summarySheet = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] })
  summarySheet.columns = [{ width: 28 }, { width: 16 }, { width: 16 }, { width: 36 }]
  summarySheet.getCell('A1').value = `SHMS PTO planning budget · ${year}`
  summarySheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF085508' } }
  summarySheet.mergeCells('A1:C1')
  summarySheet.getCell('A2').value = label
  summarySheet.getCell('A3').value =
    'Planning worksheet — MoneyMinder remains the ledger. Checking actuals from the BoA CSV; sales from Refresh from Staff.'
  summarySheet.mergeCells('A3:C3')
  summarySheet.getCell('A3').alignment = { wrapText: true }
  summarySheet.getRow(3).height = 32

  headerRow(summarySheet.getRow(5), ['', 'Budgeted', 'Actual', '% of budget'])
  const summaryRows: [string, number, number][] = [
    ['Income', summary.incomeBudgeted, summary.incomeActual],
    ['Expense', summary.expenseBudgeted, summary.expenseActual],
    ['Net', summary.netBudgeted, summary.netActual],
  ]
  summaryRows.forEach(([labelCell, budgeted, actual], i) => {
    const row = summarySheet.getRow(6 + i)
    row.getCell(1).value = labelCell
    row.getCell(1).font = { bold: true }
    row.getCell(2).value = budgeted
    row.getCell(3).value = actual
    moneyCol(row.getCell(2))
    moneyCol(row.getCell(3))
    row.getCell(4).value = budgeted ? actual / budgeted : null
    row.getCell(4).numFmt = '0%'
  })
  summarySheet.getRow(8).font = { bold: true }

  summarySheet.getCell('A10').value = 'How actuals fill'
  summarySheet.getCell('A10').font = { bold: true }
  summarySheet.getCell('A11').value =
    'Staff refresh: memberships, Cove loads, shop, POS, tickets, enrichment fees, donations, paid reimbursements.'
  summarySheet.mergeCells('A11:C11')
  summarySheet.getCell('A12').value =
    'Treasurer keys: beginning cash, sponsorships, spirit nights, Run for Charity, insurance, tax/990, tools, processing, off-system vendor bills.'
  summarySheet.mergeCells('A12:C12')

  const budgetSheet = wb.addWorksheet('Budget')
  budgetSheet.columns = [
    { width: 12 },
    { width: 16 },
    { width: 48 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 48 },
  ]
  headerRow(budgetSheet.getRow(1), [
    'Kind',
    'Category',
    'Line',
    'Budgeted',
    'Actual',
    'Variance',
    '%',
    'Owner',
    'How it fills',
    'Notes',
  ])
  lines.forEach((line, i) => {
    const row = budgetSheet.getRow(i + 2)
    row.getCell(1).value = line.kind
    row.getCell(2).value = line.category
    row.getCell(3).value = line.name
    row.getCell(4).value = line.budgeted
    row.getCell(5).value = line.actual
    row.getCell(6).value = line.actual - line.budgeted
    moneyCol(row.getCell(4))
    moneyCol(row.getCell(5))
    moneyCol(row.getCell(6))
    row.getCell(7).value = line.budgeted ? line.actual / line.budgeted : null
    row.getCell(7).numFmt = '0%'
    row.getCell(8).value = line.owner
    const track = trackingFor(line.syncKey)
    row.getCell(9).value =
      track === 'bank'
        ? 'Bank CSV'
        : track === 'auto'
          ? 'Staff + bank'
          : track === 'skip'
            ? 'Skipped · Staff sales'
            : 'You key'
    row.getCell(10).value = line.notes
    row.getCell(10).alignment = { wrapText: true }
  })
  budgetSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(lines.length + 1, 1), column: 10 },
  }
  budgetSheet.views = [{ state: 'frozen', ySplit: 1 }]

  const activitySheet = wb.addWorksheet('Activity')
  activitySheet.columns = [
    { width: 14 },
    { width: 48 },
    { width: 14 },
    { width: 22 },
    { width: 56 },
  ]
  headerRow(activitySheet.getRow(1), ['Date', 'Line', 'Amount', 'Source', 'Memo'])
  const activity = [...input.entries].sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)))
  activity.forEach((entry, i) => {
    const row = activitySheet.getRow(i + 2)
    const day = String(entry.occurredAt).slice(0, 10)
    row.getCell(1).value = day
    row.getCell(2).value = nameFor(entry.lineSyncKey)
    row.getCell(3).value = entry.amount
    moneyCol(row.getCell(3))
    row.getCell(4).value = originLabel(entry.origin)
    row.getCell(5).value = entry.memo
    row.getCell(5).alignment = { wrapText: true }
  })
  activitySheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(activity.length + 1, 1), column: 5 },
  }
  activitySheet.views = [{ state: 'frozen', ySplit: 1 }]

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
