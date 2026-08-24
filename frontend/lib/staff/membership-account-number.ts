/**
 * Stable family account numbers on Memberships (A10001+).
 * Separate from Cove PIN. Never reset when PIN changes.
 */
import { getWixClient } from '@/lib/wix-client'
import { upsertSiteSetting } from '@/lib/staff/cms-catalog'

export const ACCOUNT_NUMBER_PREFIX = 'A'
export const ACCOUNT_NUMBER_START = 10001
export const NEXT_ACCOUNT_NUMBER_KEY = 'nextAccountNumber'

export const MEMBERSHIPS_ACCOUNT_NUMBER_FIELD = {
  key: 'accountNumber',
  displayName: 'Account Number',
  type: 'TEXT',
} as const

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

/** Normalize to A##### or empty. */
export function normalizeAccountNumber(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
  if (!s) return ''
  const m = s.match(/^A?(\d{4,6})$/)
  if (!m) return ''
  const n = parseInt(m[1], 10)
  if (!Number.isFinite(n) || n < 1) return ''
  return `${ACCOUNT_NUMBER_PREFIX}${String(n).padStart(5, '0')}`
}

export function formatAccountNumber(seq: number): string {
  return `${ACCOUNT_NUMBER_PREFIX}${String(seq).padStart(5, '0')}`
}

export function parseAccountNumberSeq(raw: string): number | null {
  const n = normalizeAccountNumber(raw)
  if (!n) return null
  const seq = parseInt(n.slice(1), 10)
  return Number.isFinite(seq) ? seq : null
}

export async function ensureMembershipAccountNumberField() {
  const headers = wixHeaders()
  const getRes = await fetch('https://www.wixapis.com/wix-data/v2/collections/Memberships', {
    method: 'GET',
    headers,
  })
  const getBody = (await getRes.json().catch(() => ({}))) as {
    collection?: { fields?: { key?: string }[] }
    message?: string
  }
  if (!getRes.ok) {
    throw new Error(getBody.message || `Could not read Memberships collection (${getRes.status})`)
  }

  const existing = new Set((getBody.collection?.fields ?? []).map((f) => String(f.key ?? '')))
  if (existing.has(MEMBERSHIPS_ACCOUNT_NUMBER_FIELD.key)) {
    return { ok: true as const, created: [] as string[], existing: [MEMBERSHIPS_ACCOUNT_NUMBER_FIELD.key] }
  }

  const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections/create-field', {
    method: 'POST',
    headers,
    body: JSON.stringify({ dataCollectionId: 'Memberships', field: MEMBERSHIPS_ACCOUNT_NUMBER_FIELD }),
  })
  if (!createRes.ok) {
    const err = (await createRes.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message || `Could not add field ${MEMBERSHIPS_ACCOUNT_NUMBER_FIELD.key}`)
  }
  return {
    ok: true as const,
    created: [MEMBERSHIPS_ACCOUNT_NUMBER_FIELD.key],
    existing: [] as string[],
  }
}

async function loadAllMemberships(): Promise<Record<string, unknown>[]> {
  const client = getWixClient()
  const items: Record<string, unknown>[] = []
  let skip = 0
  const pageSize = 100
  for (let i = 0; i < 80; i += 1) {
    const result = await client.items.query('Memberships').limit(pageSize).skip(skip).find()
    const batch = (result.items ?? []) as Record<string, unknown>[]
    items.push(...batch)
    if (batch.length < pageSize) break
    skip += pageSize
  }
  return items
}

async function readCounter(): Promise<number> {
  const client = getWixClient()
  const found = await client.items
    .query('SiteSettings')
    .eq('key', NEXT_ACCOUNT_NUMBER_KEY)
    .limit(1)
    .find()
  const raw = String((found.items?.[0] as { value?: string } | undefined)?.value ?? '').trim()
  const n = parseInt(raw, 10)
  if (Number.isFinite(n) && n >= ACCOUNT_NUMBER_START) return n
  return ACCOUNT_NUMBER_START
}

async function writeCounter(next: number) {
  await upsertSiteSetting(NEXT_ACCOUNT_NUMBER_KEY, String(next))
}

/** Highest existing seq + 1, at least ACCOUNT_NUMBER_START. */
export async function syncAccountNumberCounterFromMemberships(): Promise<number> {
  const rows = await loadAllMemberships()
  let max = ACCOUNT_NUMBER_START - 1
  for (const row of rows) {
    const seq = parseAccountNumberSeq(String(row.accountNumber ?? ''))
    if (seq != null && seq > max) max = seq
  }
  const next = Math.max(ACCOUNT_NUMBER_START, max + 1)
  const current = await readCounter()
  if (next > current) await writeCounter(next)
  return Math.max(next, current)
}

export async function allocateNextAccountNumber(): Promise<string> {
  let next = await readCounter()
  const client = getWixClient()
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = formatAccountNumber(next)
    try {
      const found = await client.items
        .query('Memberships')
        .eq('accountNumber', candidate)
        .limit(1)
        .find()
      if ((found.items ?? []).length === 0) {
        await writeCounter(next + 1)
        return candidate
      }
    } catch {
      // Field may not exist yet; still mint
      await writeCounter(next + 1)
      return candidate
    }
    next += 1
  }
  throw new Error('Could not allocate account number')
}

/**
 * Ensure Memberships row for email has an account number. Returns the number.
 * Creates a minimal Memberships row if missing.
 */
export async function ensureAccountNumberForEmail(parentEmail: string): Promise<string> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) throw new Error('parentEmail required')

  const client = getWixClient()
  const found = await client.items.query('Memberships').eq('email', email).limit(1).find()
  const row = found.items?.[0] as Record<string, unknown> | undefined
  const existing = normalizeAccountNumber(row?.accountNumber)
  if (existing) return existing

  const accountNumber = await allocateNextAccountNumber()
  if (row?._id) {
    await client.items.update('Memberships', {
      ...row,
      _id: String(row._id),
      accountNumber,
    } as never)
  } else {
    await client.items.insert('Memberships', {
      email,
      tier: 'free',
      status: 'active',
      accountNumber,
    } as never)
  }
  return accountNumber
}

/** Resolve account number → parent emails (usually one). */
export async function lookupEmailsByAccountNumber(raw: string): Promise<string[]> {
  const accountNumber = normalizeAccountNumber(raw)
  if (!accountNumber) return []
  const client = getWixClient()
  try {
    const found = await client.items
      .query('Memberships')
      .eq('accountNumber', accountNumber)
      .limit(10)
      .find()
    return (found.items ?? [])
      .map((item) => String((item as { email?: string }).email ?? '').trim().toLowerCase())
      .filter(Boolean)
  } catch {
    // Field may not exist yet; scan
    const rows = await loadAllMemberships()
    return rows
      .filter((r) => normalizeAccountNumber(r.accountNumber) === accountNumber)
      .map((r) => String(r.email ?? '').trim().toLowerCase())
      .filter(Boolean)
  }
}

/**
 * Backfill: ensure CMS field, assign numbers to Memberships missing one.
 * Returns counts only (no PII).
 */
export async function backfillMembershipAccountNumbers(): Promise<{
  fieldCreated: string[]
  fieldExisting: string[]
  assigned: number
  already: number
  next: number
}> {
  const field = await ensureMembershipAccountNumberField()
  const rows = await loadAllMemberships()
  let max = ACCOUNT_NUMBER_START - 1
  for (const row of rows) {
    const seq = parseAccountNumberSeq(String(row.accountNumber ?? ''))
    if (seq != null && seq > max) max = seq
  }

  let nextSeq = Math.max(ACCOUNT_NUMBER_START, max + 1)
  const currentCounter = await readCounter()
  if (currentCounter > nextSeq) nextSeq = currentCounter

  const client = getWixClient()
  let assigned = 0
  let already = 0

  for (const row of rows) {
    const email = String(row.email ?? '').trim().toLowerCase()
    if (!email || !row._id) continue
    const existing = normalizeAccountNumber(row.accountNumber)
    if (existing) {
      already += 1
      continue
    }
    const accountNumber = formatAccountNumber(nextSeq)
    nextSeq += 1
    await client.items.update('Memberships', {
      ...row,
      _id: String(row._id),
      accountNumber,
    } as never)
    assigned += 1
  }

  await writeCounter(nextSeq)

  return {
    fieldCreated: field.created,
    fieldExisting: field.existing,
    assigned,
    already,
    next: nextSeq,
  }
}
