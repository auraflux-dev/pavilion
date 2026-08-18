/**
 * Budget actuals: Staff auto-posts Square/Payments + paid reimbursements;
 * treasurer keys everything that never hits those systems.
 */
import { getWixClient } from '@/lib/wix-client'
import {
  DEFAULT_FISCAL_YEAR,
  ensureMissingPlaceholderLines,
  fiscalYearWindow,
  listBudgetLines,
  money,
  type BudgetLine,
  updateBudgetLine,
} from '@/lib/staff/budget'
import { listExpenseReimbursements } from '@/lib/staff/expenses'

export const BUDGET_ENTRIES_COLLECTION = 'PtoBudgetEntries'

export const AUTO_SYNC_KEYS = new Set([
  'memberships',
  'cove_loads',
  'cove_shop',
  'cove_pos',
  'dance_night',
  'events_other',
  'enrichment_fees',
  'nova_math',
  'gifts',
  'instructor_pay',
  'enrichment_supplies',
  'events',
  'beautification',
  'dance_costs',
  'wellness',
  'cove_restock',
  'merch_restock',
  'membership_perks',
  'comms',
])

export type BudgetEntryOrigin =
  | 'auto-payment'
  | 'auto-expense'
  | 'auto-plaid'
  | 'auto-bofa'
  | 'reclass'
  | 'keyed'
  | 'opening'

const BANK_SYNC_KEYS = new Set([
  'card_payouts',
  'website_tools',
  'processing',
  'insurance',
  'tax_bank',
  'unclassified_income',
  'unclassified_expense',
])

export type BudgetTracking = 'auto' | 'bank' | 'keyed' | 'skip'

export function trackingFor(syncKey: string): BudgetTracking {
  if (syncKey === 'card_payouts') return 'skip'
  if (BANK_SYNC_KEYS.has(syncKey)) return 'bank'
  if (AUTO_SYNC_KEYS.has(syncKey)) return 'auto'
  return 'keyed'
}

export function needsReview(syncKey: string) {
  return syncKey === 'unclassified_income' || syncKey === 'unclassified_expense'
}

export type BudgetEntry = {
  id: string
  fiscalYear: string
  lineSyncKey: string
  occurredAt: string
  amount: number
  memo: string
  origin: BudgetEntryOrigin
  refId: string
  createdByEmail: string
}

export const BUDGET_ENTRY_FIELDS = [
  { key: 'fiscalYear', displayName: 'Fiscal Year', type: 'TEXT' },
  { key: 'lineSyncKey', displayName: 'Budget line key', type: 'TEXT' },
  { key: 'occurredAt', displayName: 'Occurred at', type: 'TEXT' },
  { key: 'amount', displayName: 'Amount $', type: 'NUMBER' },
  { key: 'memo', displayName: 'Memo', type: 'TEXT' },
  { key: 'origin', displayName: 'Origin', type: 'TEXT' },
  { key: 'refId', displayName: 'Ref ID', type: 'TEXT' },
  { key: 'createdByEmail', displayName: 'Created by', type: 'TEXT' },
] as const

function wixHeaders() {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) throw new Error('WIX_API_KEY / WIX_SITE_ID not configured')
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
}

export async function ensureBudgetEntriesCollection(): Promise<void> {
  const headers = wixHeaders()
  const getRes = await fetch(
    `https://www.wixapis.com/wix-data/v2/collections/${BUDGET_ENTRIES_COLLECTION}`,
    { method: 'GET', headers },
  )
  if (getRes.ok) return
  const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collection: {
        id: BUDGET_ENTRIES_COLLECTION,
        displayName: 'PTO Budget Activity',
        fields: BUDGET_ENTRY_FIELDS.map((f) => ({
          key: f.key,
          displayName: f.displayName,
          type: f.type,
        })),
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ADMIN',
        },
      },
    }),
  })
  if (!createRes.ok) {
    const body = await createRes.text()
    throw new Error(`Could not create ${BUDGET_ENTRIES_COLLECTION}: ${body.slice(0, 240)}`)
  }
}

function mapEntry(row: Record<string, unknown>): BudgetEntry {
  const originRaw = String(row.origin ?? 'keyed')
  const origin: BudgetEntryOrigin =
    originRaw === 'auto-payment' ||
    originRaw === 'auto-expense' ||
    originRaw === 'auto-plaid' ||
    originRaw === 'auto-bofa' ||
    originRaw === 'reclass' ||
    originRaw === 'opening'
      ? originRaw
      : 'keyed'
  return {
    id: String(row._id ?? ''),
    fiscalYear: String(row.fiscalYear ?? DEFAULT_FISCAL_YEAR),
    lineSyncKey: String(row.lineSyncKey ?? ''),
    occurredAt: String(row.occurredAt ?? ''),
    amount: money(row.amount),
    memo: String(row.memo ?? ''),
    origin,
    refId: String(row.refId ?? ''),
    createdByEmail: String(row.createdByEmail ?? ''),
  }
}

export function isAutoTracked(syncKey: string) {
  return AUTO_SYNC_KEYS.has(syncKey)
}

export function classifyPayment(source: string, programName: string, status: string): string | null {
  const src = source.toLowerCase()
  const name = programName.toLowerCase()
  const st = status.toLowerCase()
  if (src.includes('load_failed') || st.includes('fail') || st.includes('reconcil')) return null
  if (src === 'membership_gift_card' || src === 'cove_register_redeem') return null
  if (st === 'spent') return null

  if (src.includes('membership')) return 'memberships'
  if (src.includes('store_card') || src.includes('auto_topoff')) return 'cove_loads'
  if (src.includes('cove_product')) return 'cove_shop'
  if (
    src.includes('pos_stand') ||
    src.includes('register_stand') ||
    src.includes('terminal') ||
    src.includes('register_cash')
  ) {
    return 'cove_pos'
  }
  if (src.includes('event_ticket') || name.includes('ticket')) {
    if (name.includes('dance')) return 'dance_night'
    if (name.includes('nova')) return 'nova_math'
    return 'events_other'
  }
  if (src.includes('_program') || src.endsWith('program') || src.includes('enrichment')) {
    if (name.includes('nova')) return 'nova_math'
    if (name.includes('dance')) return 'dance_night'
    return 'enrichment_fees'
  }
  if (src.includes('donation') || src.includes('cheddarup') || name.includes('donation')) return 'gifts'
  if (name.includes('membership')) return 'memberships'
  if (name.includes('cove digital') || name.includes('store card') || name.includes('gift card')) {
    return 'cove_loads'
  }
  if (name.includes('spirit') || name.includes('shop') || name.includes('vintage')) return 'cove_shop'
  return null
}

export function classifyExpense(input: {
  committeeEvent: string
  notes: string
  descriptions: string
}): string {
  const t = `${input.committeeEvent} ${input.notes} ${input.descriptions}`.toLowerCase()
  if (/instructor|timesheet|contractor|w-?9|virtual loudoun|\bvlo\b/.test(t)) return 'instructor_pay'
  if (/beautification|meadows farms|sherwin|community project|as we grow/.test(t)) {
    return 'beautification'
  }
  if (/dance/.test(t)) return 'dance_costs'
  if (/wellness|teacher|appreciation|classroom|morale/.test(t)) return 'wellness'
  if (/snack|costco|cove restock|cove snack/.test(t)) return 'cove_restock'
  if (/spirit|merch|inventory|vendor/.test(t) && /wear|shirt|hat|hoodie/.test(t)) return 'merch_restock'
  if (/magnet|membership shirt|perk/.test(t)) return 'membership_perks'
  if (/insurance/.test(t)) return 'insurance'
  if (/\b990\b|tax filing|bank fee/.test(t)) return 'tax_bank'
  if (/wix|vercel|moneyminder|website/.test(t)) return 'website_tools'
  if (/canva|print|newsletter|flyer/.test(t)) return 'comms'
  if (/enrichment|supplies|scholarship/.test(t)) return 'enrichment_supplies'
  if (/processing|square fee|paypal fee/.test(t)) return 'processing'
  if (/event|celebration|pto/.test(t)) return 'events'
  return 'events'
}

async function paginate(collection: string, pageSize = 100, max = 1500) {
  const client = getWixClient()
  const rows: Record<string, unknown>[] = []
  for (let skip = 0; skip < max; skip += pageSize) {
    const res = await client.items.query(collection).skip(skip).limit(pageSize).find().catch(() => ({ items: [] }))
    const items = (res.items ?? []) as Record<string, unknown>[]
    rows.push(...items)
    if (items.length < pageSize) break
  }
  return rows
}

function inWindow(iso: string, fromMs: number, toMs: number) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t >= fromMs && t <= toMs
}

export async function listBudgetEntries(fiscalYear = DEFAULT_FISCAL_YEAR): Promise<BudgetEntry[]> {
  await ensureBudgetEntriesCollection()
  const client = getWixClient()
  const rows: BudgetEntry[] = []
  for (let skip = 0; skip < 1500; skip += 100) {
    const res = await client.items
      .query(BUDGET_ENTRIES_COLLECTION)
      .eq('fiscalYear', fiscalYear)
      .skip(skip)
      .limit(100)
      .find()
      .catch(() => ({ items: [] }))
    const items = (res.items ?? []) as Record<string, unknown>[]
    rows.push(...items.map(mapEntry))
    if (items.length < 100) break
  }
  return rows.sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
}

export function sumEntriesByKey(entries: BudgetEntry[]): Record<string, number> {
  const sums: Record<string, number> = {}
  for (const e of entries) {
    if (!e.lineSyncKey) continue
    sums[e.lineSyncKey] = money((sums[e.lineSyncKey] ?? 0) + e.amount)
  }
  return sums
}

export function applyEntryTotals(lines: BudgetLine[], entries: BudgetEntry[]): BudgetLine[] {
  const sums = sumEntriesByKey(entries)
  return lines.map((line) => ({
    ...line,
    actual: sums[line.syncKey] ?? 0,
  }))
}

async function entryExists(refId: string): Promise<boolean> {
  if (!refId) return false
  const client = getWixClient()
  const found = await client.items
    .query(BUDGET_ENTRIES_COLLECTION)
    .eq('refId', refId)
    .limit(1)
    .find()
    .catch(() => ({ items: [] }))
  return (found.items ?? []).length > 0
}

export async function insertEntry(row: Omit<BudgetEntry, 'id'>, knownRefIds?: Set<string>): Promise<boolean> {
  if (row.refId && (knownRefIds?.has(row.refId) || (!knownRefIds && (await entryExists(row.refId))))) {
    return false
  }
  const client = getWixClient()
  await client.items.insert(BUDGET_ENTRIES_COLLECTION, {
    fiscalYear: row.fiscalYear,
    lineSyncKey: row.lineSyncKey,
    occurredAt: row.occurredAt,
    amount: money(row.amount),
    memo: row.memo,
    origin: row.origin,
    refId: row.refId,
    createdByEmail: row.createdByEmail,
  })
  if (row.refId) knownRefIds?.add(row.refId)
  return true
}

export async function upsertBudgetEntryByRefId(
  row: Omit<BudgetEntry, 'id'>,
): Promise<'inserted' | 'updated' | 'skipped'> {
  if (!row.refId) return 'skipped'
  await ensureBudgetEntriesCollection()
  const client = getWixClient()
  const found = await client.items
    .query(BUDGET_ENTRIES_COLLECTION)
    .eq('refId', row.refId)
    .limit(1)
    .find()
    .catch(() => ({ items: [] }))
  const existing = found.items?.[0] as Record<string, unknown> | undefined
  if (existing?._id) {
    const existingOrigin = String(existing.origin ?? '')
    if (existingOrigin === 'reclass' || existingOrigin === 'keyed') return 'skipped'
    await client.items.update(BUDGET_ENTRIES_COLLECTION, {
      ...existing,
      _id: String(existing._id),
      fiscalYear: row.fiscalYear,
      lineSyncKey: row.lineSyncKey,
      occurredAt: row.occurredAt,
      amount: money(row.amount),
      memo: row.memo,
      origin: row.origin,
      createdByEmail: row.createdByEmail || String(existing.createdByEmail ?? ''),
    })
    return 'updated'
  }
  await insertEntry(row)
  return 'inserted'
}

export async function removeBudgetEntryByRefId(refId: string): Promise<boolean> {
  if (!refId) return false
  const client = getWixClient()
  const found = await client.items
    .query(BUDGET_ENTRIES_COLLECTION)
    .eq('refId', refId)
    .limit(1)
    .find()
    .catch(() => ({ items: [] }))
  const existing = found.items?.[0] as Record<string, unknown> | undefined
  if (!existing?._id) return false
  await client.items.remove(BUDGET_ENTRIES_COLLECTION, String(existing._id))
  return true
}

export async function addKeyedBudgetEntry(input: {
  fiscalYear: string
  lineSyncKey: string
  occurredAt: string
  amount: number
  memo: string
  createdByEmail: string
}): Promise<BudgetEntry[]> {
  const amount = money(input.amount)
  if (!(amount > 0)) throw new Error('Amount must be greater than $0')
  if (!input.lineSyncKey.trim()) throw new Error('Pick a budget line')
  await ensureBudgetEntriesCollection()
  await insertEntry({
    fiscalYear: input.fiscalYear || DEFAULT_FISCAL_YEAR,
    lineSyncKey: input.lineSyncKey.trim(),
    occurredAt: input.occurredAt || new Date().toISOString().slice(0, 10),
    amount,
    memo: input.memo.trim() || 'Keyed by treasurer',
    origin: 'keyed',
    refId: `keyed:${Date.now()}`,
    createdByEmail: input.createdByEmail,
  })
  const entries = await listBudgetEntries(input.fiscalYear)
  await persistLineActuals(input.fiscalYear, entries)
  return entries
}

export async function deleteBudgetEntry(id: string, fiscalYear: string): Promise<BudgetEntry[]> {
  const client = getWixClient()
  const existing = (await client.items.get(BUDGET_ENTRIES_COLLECTION, id)) as Record<string, unknown>
  const origin = String(existing.origin ?? '')
  if (origin === 'auto-payment' || origin === 'auto-expense') {
    throw new Error('Staff sales and reimbursements come back on Refresh from Staff — recategorize instead')
  }
  await client.items.remove(BUDGET_ENTRIES_COLLECTION, id)
  const entries = await listBudgetEntries(fiscalYear)
  await persistLineActuals(fiscalYear, entries)
  return entries
}

export async function reclassifyBudgetEntry(opts: {
  id: string
  lineSyncKey: string
  fiscalYear: string
}): Promise<BudgetEntry[]> {
  const lineSyncKey = opts.lineSyncKey.trim()
  if (!opts.id || !lineSyncKey) throw new Error('Pick a budget line')
  const client = getWixClient()
  const existing = (await client.items.get(BUDGET_ENTRIES_COLLECTION, opts.id)) as Record<string, unknown>
  const origin = String(existing.origin ?? '') as BudgetEntryOrigin
  const nextOrigin: BudgetEntryOrigin =
    origin.startsWith('auto') || origin === 'reclass' ? 'reclass' : origin
  await client.items.update(BUDGET_ENTRIES_COLLECTION, {
    ...existing,
    _id: String(existing._id),
    lineSyncKey,
    origin: nextOrigin,
  })
  const entries = await listBudgetEntries(opts.fiscalYear)
  await persistLineActuals(opts.fiscalYear, entries)
  return entries
}

export async function persistLineActuals(fiscalYear: string, entries: BudgetEntry[]) {
  const lines = await listBudgetLines(fiscalYear)
  const sums = sumEntriesByKey(entries)
  for (const line of lines) {
    const next = sums[line.syncKey] ?? 0
    if (money(line.actual) !== next) {
      await updateBudgetLine(line.id, { actual: next })
    }
  }
}

export async function refreshBudgetActuals(opts: {
  fiscalYear?: string
  actorEmail: string
}): Promise<{ added: number; entries: BudgetEntry[] }> {
  const fiscalYear = opts.fiscalYear || DEFAULT_FISCAL_YEAR
  const { from, to } = fiscalYearWindow(fiscalYear)
  const fromMs = from.getTime()
  const toMs = to.getTime()
  await ensureBudgetEntriesCollection()
  await ensureMissingPlaceholderLines(fiscalYear)

  const knownRefIds = new Set((await listBudgetEntries(fiscalYear)).map((e) => e.refId).filter(Boolean))
  let added = 0
  const payments = await paginate('Payments')
  for (const raw of payments) {
    const source = String(raw.source ?? '')
    const programName = String(raw.programName ?? '')
    const status = String(raw.status ?? '')
    const key = classifyPayment(source, programName, status)
    if (!key) continue
    const when = String(raw.paymentDate ?? raw._createdDate ?? '')
    if (!inWindow(when, fromMs, toMs)) continue
    const amount = money(raw.amount)
    if (!(amount > 0) || !raw._id) continue
    const inserted = await insertEntry(
      {
        fiscalYear,
        lineSyncKey: key,
        occurredAt: when.slice(0, 10),
        amount,
        memo: programName || source,
        origin: 'auto-payment',
        refId: `payment:${String(raw._id)}`,
        createdByEmail: opts.actorEmail,
      },
      knownRefIds,
    )
    if (inserted) added += 1
  }

  const expenses = await listExpenseReimbursements()
  for (const ex of expenses) {
    if (ex.status !== 'Paid') continue
    const when = ex.treasurerPaidDate || ex.dateOfRequest || ex.createdDate
    if (!inWindow(when, fromMs, toMs)) continue
    const amount = money(ex.totalAmount)
    if (!(amount > 0)) continue
    const key = classifyExpense({
      committeeEvent: ex.committeeEvent,
      notes: ex.notes,
      descriptions: ex.lineItems.map((li) => `${li.vendor} ${li.description}`).join(' '),
    })
    const inserted = await insertEntry(
      {
        fiscalYear,
        lineSyncKey: key,
        occurredAt: String(when).slice(0, 10),
        amount,
        memo: ex.committeeEvent || 'Reimbursement',
        origin: 'auto-expense',
        refId: `expense:${ex.id}`,
        createdByEmail: opts.actorEmail,
      },
      knownRefIds,
    )
    if (inserted) added += 1
  }

  // Carry forward worksheet actuals the treasurer typed before activity rows existed.
  const lines = await listBudgetLines(fiscalYear)
  const entries = await listBudgetEntries(fiscalYear)
  const keyedOrAuto = new Set(entries.map((e) => e.lineSyncKey))
  for (const line of lines) {
    if (!(line.actual > 0) || keyedOrAuto.has(line.syncKey)) continue
    const inserted = await insertEntry(
      {
        fiscalYear,
        lineSyncKey: line.syncKey,
        occurredAt: from.toISOString().slice(0, 10),
        amount: line.actual,
        memo: 'Opening actual from worksheet',
        origin: 'opening',
        refId: `opening:${line.id}`,
        createdByEmail: opts.actorEmail,
      },
      knownRefIds,
    )
    if (inserted) added += 1
  }

  const next = await listBudgetEntries(fiscalYear)
  await persistLineActuals(fiscalYear, next)
  return { added, entries: next }
}
