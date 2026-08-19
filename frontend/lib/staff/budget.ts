/**
 * Treasurer planning budget. Official books stay in MoneyMinder / bank / Square.
 * Collection: PtoBudgetLines
 */
import { getWixClient } from '@/lib/wix-client'

export const BUDGET_COLLECTION = 'PtoBudgetLines'
export const DEFAULT_FISCAL_YEAR = '2026-27'
export const FISCAL_YEAR_LABEL = 'Jul 1, 2026 – Jun 30, 2027'

export type BudgetKind = 'income' | 'expense'

export type BudgetLine = {
  id: string
  fiscalYear: string
  kind: BudgetKind
  category: string
  name: string
  budgeted: number
  actual: number
  owner: string
  notes: string
  sortOrder: number
  syncKey: string
}

type SeedLine = Omit<BudgetLine, 'id' | 'fiscalYear' | 'syncKey'> & { syncKey?: string }

export function money(n: unknown) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/** Jul 1 startYear → Jun 30 next year. `2026-27` → Jul 1 2026 – Jun 30 2027. */
export function fiscalYearWindow(year = DEFAULT_FISCAL_YEAR) {
  const startYear = Number(String(year).split('-')[0]) || 2026
  return {
    from: new Date(Date.UTC(startYear, 6, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(startYear + 1, 5, 30, 23, 59, 59, 999)),
  }
}

/** Public fundraising year: Aug 1 startYear → Jul 31 next. Not the treasurer Jul–Jun fiscal year. */
export function schoolYearWindowForFiscalYear(year = DEFAULT_FISCAL_YEAR) {
  const startYear = Number(String(year).split('-')[0]) || 2026
  return {
    from: new Date(Date.UTC(startYear, 7, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(startYear + 1, 6, 31, 23, 59, 59, 999)),
  }
}

const SYNC_KEY_BY_SORT: Record<number, string> = {
  10: 'beginning_cash',
  20: 'memberships',
  30: 'cove_loads',
  40: 'cove_shop',
  50: 'cove_pos',
  55: 'card_payouts',
  60: 'dance_night',
  70: 'events_other',
  80: 'enrichment_fees',
  90: 'nova_math',
  100: 'sponsorships',
  110: 'gifts',
  120: 'run_for_charity',
  130: 'unclassified_income',
  200: 'instructor_pay',
  210: 'enrichment_supplies',
  220: 'events',
  225: 'beautification',
  230: 'dance_costs',
  240: 'wellness',
  250: 'cove_restock',
  260: 'merch_restock',
  270: 'membership_perks',
  280: 'processing',
  290: 'insurance',
  300: 'tax_bank',
  310: 'website_tools',
  320: 'comms',
  330: 'contingency',
  340: 'unclassified_expense',
}

export function defaultSyncKey(sortOrder: number, name: string) {
  if (SYNC_KEY_BY_SORT[sortOrder]) return SYNC_KEY_BY_SORT[sortOrder]
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  return slug || `line_${sortOrder}`
}

function mapRow(row: Record<string, unknown>): BudgetLine {
  const kind = String(row.kind ?? 'expense') === 'income' ? 'income' : 'expense'
  return {
    id: String(row._id ?? ''),
    fiscalYear: String(row.fiscalYear ?? DEFAULT_FISCAL_YEAR),
    kind,
    category: String(row.category ?? ''),
    name: String(row.name ?? ''),
    budgeted: money(row.budgeted),
    actual: money(row.actual),
    owner: String(row.owner ?? ''),
    notes: String(row.notes ?? ''),
    sortOrder: Number(row.sortOrder ?? 99) || 99,
    syncKey: String(row.syncKey ?? '') || defaultSyncKey(Number(row.sortOrder ?? 99) || 99, String(row.name ?? '')),
  }
}

export function summarizeBudget(lines: BudgetLine[]) {
  const income = lines.filter((l) => l.kind === 'income')
  const expense = lines.filter((l) => l.kind === 'expense')
  const sum = (rows: BudgetLine[], key: 'budgeted' | 'actual') =>
    money(rows.reduce((n, r) => n + r[key], 0))
  return {
    incomeBudgeted: sum(income, 'budgeted'),
    incomeActual: sum(income, 'actual'),
    expenseBudgeted: sum(expense, 'budgeted'),
    expenseActual: sum(expense, 'actual'),
    netBudgeted: money(sum(income, 'budgeted') - sum(expense, 'budgeted')),
    netActual: money(sum(income, 'actual') - sum(expense, 'actual')),
  }
}

/** FY 2026–27 lines. Expense budgeted amounts are FY25 checking (Jul 1 2025 – Jun 30 2026), rounded. */
export function placeholderBudgetLines(_fiscalYear = DEFAULT_FISCAL_YEAR): SeedLine[] {
  const income: SeedLine[] = [
    {
      kind: 'income',
      category: 'Carryover',
      name: 'Beginning cash / prior-year reserve',
      budgeted: 5000,
      actual: 0,
      owner: 'Treasurer',
      notes: 'Replace with closing cash from MoneyMinder at 6/30/2026.',
      sortOrder: 10,
    },
    {
      kind: 'income',
      category: 'Memberships',
      name: 'Paid memberships (Reef $49 · Lagoon $149 · Tide $249)',
      budgeted: 8000,
      actual: 0,
      owner: 'Membership',
      notes: 'Matches current internal membership fundraising goal. Largest planned revenue source.',
      sortOrder: 20,
    },
    {
      kind: 'income',
      category: 'The Cove',
      name: 'Cove Digital Card loads (snack window)',
      budgeted: 6000,
      actual: 0,
      owner: 'Retail',
      notes: 'Internal Cove store-card goal. Gross loads, not net of snacks.',
      sortOrder: 30,
    },
    {
      kind: 'income',
      category: 'The Cove',
      name: 'Cove shop & spirit wear (online + pop-ups)',
      budgeted: 3000,
      actual: 0,
      owner: 'Retail',
      notes: 'Spirit wear / merch goal. Includes hats, vintage, and table sales.',
      sortOrder: 40,
    },
    {
      kind: 'income',
      category: 'The Cove',
      name: 'In-person POS / open-house merch',
      budgeted: 1000,
      actual: 0,
      owner: 'Retail',
      notes: 'Square Stand cash/card at events when not already counted in shop totals.',
      sortOrder: 50,
    },
    {
      kind: 'income',
      category: 'Bank',
      name: 'Card processor deposits (Square / PayPal → BoA)',
      budgeted: 0,
      actual: 0,
      owner: 'Treasurer',
      notes: 'Not filled from the bank CSV. Square/PayPal payout deposits are skipped so memberships/Cove/tickets stay on Staff Payments.',
      sortOrder: 55,
    },
    {
      kind: 'income',
      category: 'Events',
      name: 'Dance Night tickets & concessions',
      budgeted: 2500,
      actual: 0,
      owner: 'Events',
      notes: 'Current dance-night fundraising goal.',
      sortOrder: 60,
    },
    {
      kind: 'income',
      category: 'Events',
      name: 'Other PTO event tickets & sales',
      budgeted: 1500,
      actual: 0,
      owner: 'Events',
      notes: 'Placeholder for additional ticketed events during the year.',
      sortOrder: 70,
    },
    {
      kind: 'income',
      category: 'Programs',
      name: 'Enrichment registration fees (gross)',
      budgeted: 12000,
      actual: 0,
      owner: 'Programs',
      notes: 'Mostly pass-through to instructors. Pair with instructor-pay expense below.',
      sortOrder: 80,
    },
    {
      kind: 'income',
      category: 'Programs',
      name: 'NOVA Math / hosted tournaments',
      budgeted: 1500,
      actual: 0,
      owner: 'Programs',
      notes: 'Current Nova Math fundraising goal.',
      sortOrder: 90,
    },
    {
      kind: 'income',
      category: 'Fundraising',
      name: 'Corporate sponsorships',
      budgeted: 5000,
      actual: 0,
      owner: 'Fundraising',
      notes: 'Current sponsorship goal. Track actuals on Fundraising → sponsorships raised.',
      sortOrder: 100,
    },
    {
      kind: 'income',
      category: 'Fundraising',
      name: 'Spirit nights & other gifts',
      budgeted: 1000,
      actual: 0,
      owner: 'Fundraising',
      notes: 'Restaurant nights, one-off donations, GiveButter, etc.',
      sortOrder: 110,
    },
    {
      kind: 'income',
      category: 'Fundraising',
      name: 'Run for Charity (school code SHMS)',
      budgeted: 750,
      actual: 0,
      owner: 'Fundraising',
      notes: 'Best Runners partnership. Enter whatever the school actually receives.',
      sortOrder: 120,
    },
    {
      kind: 'income',
      category: 'Bank',
      name: 'Unclassified BoA deposits',
      budgeted: 0,
      actual: 0,
      owner: 'Treasurer',
      notes: 'BoA CSV could not map these inflows. Move each row in the activity log.',
      sortOrder: 130,
    },
  ]

  const expense: SeedLine[] = [
    {
      kind: 'expense',
      category: 'Programs',
      name: 'Enrichment instructor / contractor pay',
      budgeted: 4700,
      actual: 0,
      owner: 'Programs',
      notes: 'FY25 checking $4,678. Coaches, coordinators, VLO.',
      sortOrder: 200,
    },
    {
      kind: 'expense',
      category: 'Programs',
      name: 'Enrichment supplies, flyers, scholarships',
      budgeted: 3150,
      actual: 0,
      owner: 'Programs',
      notes: 'FY25 checking $3,172 (LEGO, Math Olympiads, Nova Math).',
      sortOrder: 210,
    },
    {
      kind: 'expense',
      category: 'Events',
      name: 'School events & celebrations',
      budgeted: 8350,
      actual: 0,
      owner: 'Events',
      notes: 'FY25 checking $8,334 (STEAM, Fall Annual Night, Sweet Treat, year-end).',
      sortOrder: 220,
    },
    {
      kind: 'expense',
      category: 'Campus',
      name: 'Beautification / community project',
      budgeted: 0,
      actual: 0,
      owner: 'Treasurer',
      notes: 'One-off campus project in 2025–26. Not in the 2026–27 operating plan.',
      sortOrder: 225,
    },
    {
      kind: 'expense',
      category: 'Events',
      name: 'Dance Night production costs',
      budgeted: 1400,
      actual: 0,
      owner: 'Events',
      notes: 'FY25 checking $1,418 (DJ).',
      sortOrder: 230,
    },
    {
      kind: 'expense',
      category: 'Wellness',
      name: 'Teacher & staff wellness / classroom support',
      budgeted: 3300,
      actual: 0,
      owner: 'Wellness',
      notes: 'FY25 checking $3,314 (teacher breakfast and similar).',
      sortOrder: 240,
    },
    {
      kind: 'expense',
      category: 'The Cove',
      name: 'Cove snack restock',
      budgeted: 4250,
      actual: 0,
      owner: 'Retail',
      notes: 'FY25 checking $4,250 (Sam’s / snack cart COGS).',
      sortOrder: 250,
    },
    {
      kind: 'expense',
      category: 'The Cove',
      name: 'Spirit wear / merch restock',
      budgeted: 6850,
      actual: 0,
      owner: 'Retail',
      notes: 'FY25 checking $6,835 (includes Reston Shirt).',
      sortOrder: 260,
    },
    {
      kind: 'expense',
      category: 'Membership',
      name: 'Membership perk shirts & magnets',
      budgeted: 0,
      actual: 0,
      owner: 'Membership',
      notes: 'No separate FY25 checking line (shirts sat on merch). Key here if perk shirts are bought separately this year.',
      sortOrder: 270,
    },
    {
      kind: 'expense',
      category: 'Operations',
      name: 'Card processing (Square / PayPal)',
      budgeted: 800,
      actual: 0,
      owner: 'Treasurer',
      notes: 'Not on the BoA CSV. ~3% of FY25 Square deposits ($29,140). Confirm on Square/PayPal.',
      sortOrder: 280,
    },
    {
      kind: 'expense',
      category: 'Operations',
      name: 'Insurance',
      budgeted: 425,
      actual: 0,
      owner: 'Treasurer',
      notes: 'FY25 checking $423 (Association Insurance). Replace if the premium changed.',
      sortOrder: 290,
    },
    {
      kind: 'expense',
      category: 'Operations',
      name: 'Tax filing, 990, bank',
      budgeted: 475,
      actual: 0,
      owner: 'Treasurer',
      notes: 'FY25 checking $471 (IRS + Tax1099).',
      sortOrder: 300,
    },
    {
      kind: 'expense',
      category: 'Operations',
      name: 'Website & tools (Wix, Vercel, MoneyMinder)',
      budgeted: 2700,
      actual: 0,
      owner: 'Treasurer',
      notes: 'FY25 checking $2,692 (Jumbula, Apple, hardware, tools).',
      sortOrder: 310,
    },
    {
      kind: 'expense',
      category: 'Communications',
      name: 'Print, Canva, newsletters',
      budgeted: 3050,
      actual: 0,
      owner: 'Marketing',
      notes: 'FY25 checking $3,070 (4imprint + FastSigns).',
      sortOrder: 320,
    },
    {
      kind: 'expense',
      category: 'Reserve',
      name: 'Contingency / year-end reserve',
      budgeted: 2000,
      actual: 0,
      owner: 'Treasurer',
      notes: 'Board cushion, not FY25 spend. Not a spend unless needed.',
      sortOrder: 330,
    },
    {
      kind: 'expense',
      category: 'Bank',
      name: 'Unclassified BoA withdrawals',
      budgeted: 0,
      actual: 0,
      owner: 'Treasurer',
      notes: 'BoA CSV could not map these outflows. Move each row in the activity log.',
      sortOrder: 340,
    },
  ]

  return [...income, ...expense].map((line) => ({
    ...line,
    syncKey: line.syncKey || defaultSyncKey(line.sortOrder, line.name),
  }))
}

export const BUDGET_COLLECTION_FIELDS = [
  { key: 'fiscalYear', displayName: 'Fiscal Year', type: 'TEXT' },
  { key: 'kind', displayName: 'Kind (income/expense)', type: 'TEXT' },
  { key: 'category', displayName: 'Category', type: 'TEXT' },
  { key: 'name', displayName: 'Line name', type: 'TEXT' },
  { key: 'budgeted', displayName: 'Budgeted $', type: 'NUMBER' },
  { key: 'actual', displayName: 'Actual $', type: 'NUMBER' },
  { key: 'owner', displayName: 'Owner', type: 'TEXT' },
  { key: 'notes', displayName: 'Notes', type: 'TEXT' },
  { key: 'sortOrder', displayName: 'Sort order', type: 'NUMBER' },
  { key: 'syncKey', displayName: 'Sync key', type: 'TEXT' },
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

async function ensureBudgetFields(headers: { Authorization: string; 'wix-site-id': string; 'Content-Type': string }) {
  const getRes = await fetch(`https://www.wixapis.com/wix-data/v2/collections/${BUDGET_COLLECTION}`, {
    method: 'GET',
    headers,
  })
  const getBody = (await getRes.json().catch(() => ({}))) as {
    collection?: { fields?: { key?: string }[] }
  }
  const existing = new Set((getBody.collection?.fields ?? []).map((f) => String(f.key ?? '')))
  for (const field of BUDGET_COLLECTION_FIELDS) {
    if (existing.has(field.key)) continue
    await fetch('https://www.wixapis.com/wix-data/v2/collections/create-field', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataCollectionId: BUDGET_COLLECTION,
        field: { key: field.key, displayName: field.displayName, type: field.type },
      }),
    })
  }
}

export async function ensureBudgetCollection(): Promise<void> {
  const headers = wixHeaders()
  const getRes = await fetch(`https://www.wixapis.com/wix-data/v2/collections/${BUDGET_COLLECTION}`, {
    method: 'GET',
    headers,
  })
  if (getRes.ok) {
    await ensureBudgetFields(headers)
    return
  }
  const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collection: {
        id: BUDGET_COLLECTION,
        displayName: 'PTO Budget Lines',
        fields: BUDGET_COLLECTION_FIELDS.map((f) => ({
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
    throw new Error(`Could not create ${BUDGET_COLLECTION}: ${body.slice(0, 240)}`)
  }
}

export async function listBudgetLines(fiscalYear = DEFAULT_FISCAL_YEAR): Promise<BudgetLine[]> {
  await ensureBudgetCollection()
  const client = getWixClient()
  const res = await client.items
    .query(BUDGET_COLLECTION)
    .eq('fiscalYear', fiscalYear)
    .ascending('sortOrder')
    .limit(200)
    .find()
  return (res.items ?? [])
    .map((r) => mapRow(r as Record<string, unknown>))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function seedPlaceholderBudget(fiscalYear = DEFAULT_FISCAL_YEAR): Promise<BudgetLine[]> {
  const existing = await listBudgetLines(fiscalYear)
  if (existing.length) return existing
  const client = getWixClient()
  const seed = placeholderBudgetLines(fiscalYear)
  for (let i = 0; i < seed.length; i += 5) {
    await Promise.all(
      seed.slice(i, i + 5).map((line) =>
        client.items.insert(BUDGET_COLLECTION, { ...line, fiscalYear, actual: 0 }),
      ),
    )
  }
  return listBudgetLines(fiscalYear)
}

/** Insert any placeholder lines that are missing so new categories (e.g. campus) appear without reseeding. */
export async function ensureMissingPlaceholderLines(fiscalYear = DEFAULT_FISCAL_YEAR): Promise<void> {
  const existing = await listBudgetLines(fiscalYear)
  const have = new Set(existing.map((l) => l.syncKey))
  for (const spec of placeholderBudgetLines(fiscalYear)) {
    if (!spec.syncKey || have.has(spec.syncKey)) continue
    await createBudgetLine({
      fiscalYear,
      kind: spec.kind,
      category: spec.category,
      name: spec.name,
      budgeted: spec.budgeted,
      actual: 0,
      owner: spec.owner,
      notes: spec.notes,
      sortOrder: spec.sortOrder,
      syncKey: spec.syncKey,
    })
  }
}

export async function createBudgetLine(
  input: Omit<BudgetLine, 'id' | 'syncKey'> & { id?: string; syncKey?: string },
): Promise<BudgetLine> {
  await ensureBudgetCollection()
  if (!input.name.trim()) throw new Error('Line name is required')
  const client = getWixClient()
  const inserted = await client.items.insert(BUDGET_COLLECTION, {
    fiscalYear: input.fiscalYear || DEFAULT_FISCAL_YEAR,
    kind: input.kind === 'income' ? 'income' : 'expense',
    category: input.category.trim() || 'Other',
    name: input.name.trim(),
    budgeted: money(input.budgeted),
    actual: money(input.actual),
    owner: input.owner.trim(),
    notes: input.notes.trim(),
    sortOrder: Number(input.sortOrder) || 400,
    syncKey:
      input.syncKey?.trim() || defaultSyncKey(Number(input.sortOrder) || 400, input.name.trim()),
  })
  return mapRow(inserted as Record<string, unknown>)
}

export async function updateBudgetLine(
  id: string,
  patch: Partial<Omit<BudgetLine, 'id'>>,
): Promise<BudgetLine> {
  const client = getWixClient()
  const existing = (await client.items.get(BUDGET_COLLECTION, id)) as Record<string, unknown>
  const next = {
    ...existing,
    ...patch,
    _id: id,
    budgeted: patch.budgeted !== undefined ? money(patch.budgeted) : existing.budgeted,
    actual: patch.actual !== undefined ? money(patch.actual) : existing.actual,
  }
  const updated = await client.items.update(BUDGET_COLLECTION, next as never)
  return mapRow(updated as Record<string, unknown>)
}

export async function deleteBudgetLine(id: string): Promise<void> {
  const client = getWixClient()
  await client.items.remove(BUDGET_COLLECTION, id)
}
