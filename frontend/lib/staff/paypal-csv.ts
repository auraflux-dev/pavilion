/**
 * PayPal activity CSV → budget entries (school year Aug–Jul only).
 * PayPal → Activity → Download. Checkout API credentials cannot list the
 * business account; Transaction Search is a separate product, and Vercel
 * PAYPAL_CLIENT_SECRET is currently empty. Skip bank withdrawals so those
 * dollars stay on Staff Payments / BoA, not twice.
 */
import { createHash } from 'node:crypto'
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

type ParsedPaypalRow = {
  date: string
  description: string
  amount: number
  type: string
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
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
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
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const heads = rows[i].map(normHeader)
    const hasDate = heads.some((h) => h === 'date')
    const hasAmount = heads.some((h) => h === 'gross' || h === 'net' || h === 'amount')
    if (hasDate && hasAmount) return i
  }
  return -1
}

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

export function parsePaypalCsv(text: string): ParsedPaypalRow[] {
  const rows = parseCsv(text)
  const headerAt = findHeaderIndex(rows)
  if (headerAt < 0) {
    throw new Error('Could not find Date and Gross/Amount columns. Download CSV from PayPal Activity.')
  }
  const heads = rows[headerAt].map(normHeader)
  const dateIdx = heads.findIndex((h) => h === 'date')
  const nameIdx = heads.findIndex((h) => h === 'name' || h === 'from' || h === 'from email address')
  const typeIdx = heads.findIndex((h) => h === 'type')
  const statusIdx = heads.findIndex((h) => h === 'status')
  const currencyIdx = heads.findIndex((h) => h === 'currency' || h === 'currency code')
  const grossIdx = heads.findIndex((h) => h === 'gross' || h === 'amount')
  const out: ParsedPaypalRow[] = []
  for (const raw of rows.slice(headerAt + 1)) {
    const date = isoDate(raw[dateIdx] ?? '')
    if (!date) continue
    const status = String(raw[statusIdx] ?? '').toLowerCase()
    if (status && !/completed|cleared|success/.test(status)) continue
    const currency = String(raw[currencyIdx] ?? 'USD').toUpperCase()
    if (currency && currency !== 'USD') continue
    const amount = moneyCell(raw[grossIdx] ?? '')
    if (amount == null || !(amount > 0)) continue
    const type = String(raw[typeIdx] ?? '').trim()
    if (isSkippedPaypalType(type)) continue
    const description = String(raw[nameIdx >= 0 ? nameIdx : 1] ?? type).trim()
    out.push({ date, description, amount, type })
  }
  if (!out.length) throw new Error('No completed PayPal payments in that file.')
  return out
}

function paypalRefId(row: ParsedPaypalRow) {
  const slug = `${row.type} ${row.description}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80)
  const cents = Math.round(row.amount * 100)
  const hash = createHash('sha1').update(`${row.date}|${cents}|${slug}`).digest('hex').slice(0, 16)
  return `paypalcsv:${hash}`
}

export async function importPaypalCsv(opts: {
  csv: string
  fiscalYear?: string
  actorEmail: string
}): Promise<{ added: number; updated: number; skipped: number; rows: number }> {
  const fiscalYear = opts.fiscalYear || DEFAULT_FISCAL_YEAR
  const { from, to } = schoolYearWindowForFiscalYear(fiscalYear)
  const fromMs = from.getTime()
  const toMs = to.getTime()
  await ensureBankBudgetLines(fiscalYear)
  await ensureMissingPlaceholderLines(fiscalYear)

  const parsed = parsePaypalCsv(opts.csv)
  let added = 0
  let updated = 0
  let skipped = 0

  for (const row of parsed) {
    const t = new Date(`${row.date}T12:00:00.000Z`).getTime()
    if (!Number.isFinite(t) || t < fromMs || t > toMs) {
      skipped += 1
      continue
    }
    const key = classifyPaypal(row.type, row.description)
    if (!key) {
      skipped += 1
      continue
    }
    const result = await upsertBudgetEntryByRefId({
      fiscalYear,
      lineSyncKey: key,
      occurredAt: row.date,
      amount: row.amount,
      memo: `${row.type}: ${row.description}`.slice(0, 180),
      origin: 'auto-paypal',
      refId: paypalRefId(row),
      createdByEmail: opts.actorEmail,
    })
    if (result === 'inserted') added += 1
    else if (result === 'updated') updated += 1
    else skipped += 1
  }

  const entries = await listBudgetEntries(fiscalYear)
  await persistLineActuals(fiscalYear, entries)
  return { added, updated, skipped, rows: parsed.length }
}
