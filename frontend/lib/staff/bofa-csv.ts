/**
 * Bank of America activity CSV → budget entries.
 * BoA online: checking → Activity → Download → Spreadsheet (CSV).
 * Amount sign in BoA files: positive = deposit, negative = withdrawal.
 * classifyBankTransaction uses Plaid signs (positive = money left), so we flip.
 */
import { createHash } from 'node:crypto'
import { classifyBankTransaction, isProcessorPayout } from '@/lib/staff/plaid-classify'
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

export type ParsedBofaRow = {
  date: string
  description: string
  amount: number
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    if (ch !== '\r') cell += ch
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function normHeader(h: string) {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function moneyCell(raw: string) {
  const s = raw.replace(/[$,\s]/g, '').replace(/^\((.+)\)$/, '-$1')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function isoDate(raw: string): string | null {
  const t = raw.trim()
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdy) {
    const month = mdy[1].padStart(2, '0')
    const day = mdy[2].padStart(2, '0')
    let year = mdy[3]
    if (year.length === 2) year = `20${year}`
    return `${year}-${month}-${day}`
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return null
}

function findHeaderIndex(rows: string[][]) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const heads = rows[i].map(normHeader)
    const hasDate = heads.some((h) => h === 'date' || h.includes('posted date') || h === 'transaction date')
    const hasAmount = heads.some((h) => h === 'amount' || h === 'debit' || h === 'credit')
    if (hasDate && hasAmount) return i
  }
  return -1
}

export function parseBofaCsv(text: string): ParsedBofaRow[] {
  const rows = parseCsv(text)
  const headerAt = findHeaderIndex(rows)
  if (headerAt < 0) {
    throw new Error('Could not find Date and Amount columns. Download CSV (not PDF) from BoA Activity.')
  }
  const heads = rows[headerAt].map(normHeader)
  const dateIdx = heads.findIndex((h) => h === 'date' || h.includes('posted date') || h === 'transaction date')
  const descIdx = heads.findIndex(
    (h) => h === 'description' || h === 'payee' || h === 'name' || h.includes('original description'),
  )
  const amountIdx = heads.findIndex((h) => h === 'amount')
  const debitIdx = heads.findIndex((h) => h === 'debit' || h === 'withdrawal')
  const creditIdx = heads.findIndex((h) => h === 'credit' || h === 'deposit')

  const out: ParsedBofaRow[] = []
  for (const raw of rows.slice(headerAt + 1)) {
    const date = isoDate(raw[dateIdx] ?? '')
    if (!date) continue
    const description = String(raw[descIdx >= 0 ? descIdx : 1] ?? '').trim()
    if (/beginning balance|ending balance|total credits|total debits/i.test(description)) continue
    let amount: number | null = null
    if (amountIdx >= 0) amount = moneyCell(raw[amountIdx] ?? '')
    else {
      const debit = debitIdx >= 0 ? moneyCell(raw[debitIdx] ?? '') : null
      const credit = creditIdx >= 0 ? moneyCell(raw[creditIdx] ?? '') : null
      if (credit && credit !== 0) amount = Math.abs(credit)
      else if (debit && debit !== 0) amount = -Math.abs(debit)
    }
    if (amount == null || amount === 0) continue
    out.push({ date, description, amount })
  }
  if (!out.length) throw new Error('No posted transactions in that file.')
  return out
}

function bofaRefId(row: ParsedBofaRow) {
  const slug = row.description.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80)
  const cents = Math.round(row.amount * 100)
  const hash = createHash('sha1').update(`${row.date}|${cents}|${slug}`).digest('hex').slice(0, 16)
  return `bofa:${hash}`
}

export async function importBofaCsv(opts: {
  csv: string
  fiscalYear?: string
  actorEmail: string
}): Promise<{ added: number; updated: number; skipped: number; skippedPayouts: number; rows: number }> {
  const fiscalYear = opts.fiscalYear || DEFAULT_FISCAL_YEAR
  // Fundraising and this import use Aug–Jul, not the whole downloaded statement.
  const { from, to } = schoolYearWindowForFiscalYear(fiscalYear)
  const fromMs = from.getTime()
  const toMs = to.getTime()
  await ensureBankBudgetLines(fiscalYear)
  await ensureMissingPlaceholderLines(fiscalYear)

  const parsed = parseBofaCsv(opts.csv)
  let added = 0
  let updated = 0
  let skipped = 0
  let skippedPayouts = 0

  for (const row of parsed) {
    const t = new Date(`${row.date}T12:00:00.000Z`).getTime()
    if (!Number.isFinite(t) || t < fromMs || t > toMs) {
      skipped += 1
      continue
    }
    const plaidSigned = -row.amount
    if (
      isProcessorPayout({
        name: row.description,
        amount: plaidSigned,
      }) ||
      isProcessorPayout({
        name: row.description,
        amount: row.amount,
      })
    ) {
      skippedPayouts += 1
      continue
    }
    const classified = classifyBankTransaction({
      name: row.description,
      amount: plaidSigned,
    })
    if (!classified) {
      skipped += 1
      continue
    }
    const result = await upsertBudgetEntryByRefId({
      fiscalYear,
      lineSyncKey: classified.syncKey,
      occurredAt: row.date,
      amount: classified.amount,
      memo: row.description.slice(0, 180),
      origin: 'auto-bofa',
      refId: bofaRefId(row),
      createdByEmail: opts.actorEmail,
    })
    if (result === 'inserted') added += 1
    else if (result === 'updated') updated += 1
    else skipped += 1
  }

  const entries = await listBudgetEntries(fiscalYear)
  await persistLineActuals(fiscalYear, entries)
  return { added, updated, skipped, skippedPayouts, rows: parsed.length }
}
