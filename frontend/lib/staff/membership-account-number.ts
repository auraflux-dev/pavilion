/**
 * Household account numbers (A10001+) — root of the family hierarchy.
 *
 * Lookup order for any household read/validate:
 *   1. Entry key (login email or staff A#####)
 *   2. accountNumber
 *   3. Memberships / Students / Cove / tiers under that number
 *
 * Email alone is never authoritative for household reads.
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

async function findMembershipRowByEmail(
  email: string,
): Promise<Record<string, unknown> | undefined> {
  const client = getWixClient()
  const found = await client.items.query('Memberships').eq('email', email).limit(1).find()
  return found.items?.[0] as Record<string, unknown> | undefined
}

async function writeAccountNumberOnMembershipRow(
  row: Record<string, unknown> | undefined,
  email: string,
  accountNumber: string,
) {
  const client = getWixClient()
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
}

/**
 * Prefer the primary parent's account number when this login is a co-parent/guardian.
 */
async function inheritAccountNumberFromPrimary(email: string): Promise<string> {
  try {
    const { resolvePrimaryParentEmail } = await import('@/lib/family-guardians')
    const primary = (await resolvePrimaryParentEmail(email)).trim().toLowerCase()
    if (!primary || primary === email) return ''
    const primaryRow = await findMembershipRowByEmail(primary)
    const primaryNum = normalizeAccountNumber(primaryRow?.accountNumber)
    if (primaryNum) return primaryNum
    // Allocate on the primary first so the household number is stable.
    return ensureAccountNumberForEmail(primary)
  } catch {
    return ''
  }
}

/**
 * Ensure Memberships row for email has an account number. Returns the number.
 * Co-parents inherit the primary household account number (never mint a second one).
 * Creates a minimal Memberships row if missing.
 */
export async function ensureAccountNumberForEmail(parentEmail: string): Promise<string> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) throw new Error('parentEmail required')

  const row = await findMembershipRowByEmail(email)
  const existing = normalizeAccountNumber(row?.accountNumber)

  // Co-parent must share the primary's A##### even if they already had a solo number.
  const inherited = await inheritAccountNumberFromPrimary(email)
  if (inherited) {
    if (existing !== inherited) {
      await writeAccountNumberOnMembershipRow(row, email, inherited)
    }
    return inherited
  }

  if (existing) return existing

  const accountNumber = await allocateNextAccountNumber()
  await writeAccountNumberOnMembershipRow(row, email, accountNumber)
  return accountNumber
}

/** All Memberships rows sharing an account number. */
export async function listMembershipsByAccountNumber(
  raw: string,
): Promise<Record<string, unknown>[]> {
  const accountNumber = normalizeAccountNumber(raw)
  if (!accountNumber) return []
  const client = getWixClient()
  try {
    const found = await client.items
      .query('Memberships')
      .eq('accountNumber', accountNumber)
      .limit(50)
      .find()
    return (found.items ?? []) as Record<string, unknown>[]
  } catch {
    const rows = await loadAllMemberships()
    return rows.filter((r) => normalizeAccountNumber(r.accountNumber) === accountNumber)
  }
}

/** Resolve account number → parent emails (usually one; co-parents share the number). */
export async function lookupEmailsByAccountNumber(raw: string): Promise<string[]> {
  const rows = await listMembershipsByAccountNumber(raw)
  return [
    ...new Set(
      rows
        .map((r) => String(r.email ?? '').trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
}

export type HouseholdStudentRow = {
  _id: string
  parentEmail?: string
  firstName?: string
  lastName?: string
  membershipTier?: string
  membershipStatus?: string
  squareGiftCardGan?: string
  squareGiftCardId?: string
  storeCardBalance?: number
  archived?: boolean
  [key: string]: unknown
}

export type HouseholdMembershipRow = {
  email: string
  tier: string
  accountNumber: string
  status?: string
  raw: Record<string, unknown>
}

/**
 * Authoritative household hierarchy.
 *
 *   accountNumber (A#####)
 *     └─ Memberships (all emails sharing this number)
 *         └─ Students (parentEmail in those emails)
 *         └─ Cove / tier / entitlements / fulfillment
 *
 * Login email or staff-entered A##### is only the entry key.
 * Never treat a single email as the household without going through accountNumber first.
 */
export type Household = {
  accountNumber: string
  /** Entry used to open the household (email or account number). */
  entryEmail: string
  emails: string[]
  memberships: HouseholdMembershipRow[]
  students: HouseholdStudentRow[]
  tierCandidates: string[]
  /** Best email for write ownership when no guardian primary is set. */
  primaryEmail: string
}

export type HouseholdMembershipContext = {
  accountNumber: string
  emails: string[]
  tierCandidates: string[]
  memberships: Array<{ email: string; tier: string; accountNumber: string }>
}

async function loadStudentsForEmails(emails: string[]): Promise<HouseholdStudentRow[]> {
  const client = getWixClient()
  const byId = new Map<string, HouseholdStudentRow>()
  for (const e of emails) {
    try {
      const result = await client.items.query('Students').eq('parentEmail', e).limit(100).find()
      for (const item of (result.items ?? []) as HouseholdStudentRow[]) {
        if (item.archived === true) continue
        const id = String(item._id ?? '')
        if (id) byId.set(id, item)
        else byId.set(`${e}:${item.firstName}:${item.lastName}`, item)
      }
    } catch {
      // continue
    }
  }
  return [...byId.values()]
}

function pickPrimaryEmail(
  entryEmail: string,
  emails: string[],
  memberships: HouseholdMembershipRow[],
  students: HouseholdStudentRow[],
): string {
  const counts = new Map<string, number>()
  for (const s of students) {
    const pe = String(s.parentEmail ?? '').trim().toLowerCase()
    if (!pe) continue
    counts.set(pe, (counts.get(pe) ?? 0) + 1)
  }
  let bestStudentOwner = ''
  let bestCount = 0
  for (const [pe, n] of counts) {
    if (n > bestCount) {
      bestCount = n
      bestStudentOwner = pe
    }
  }
  if (bestStudentOwner) return bestStudentOwner

  const paid = memberships.find((m) => {
    const t = String(m.tier ?? '').trim().toLowerCase()
    return t && t !== 'free'
  })
  if (paid?.email) return paid.email

  if (entryEmail && emails.includes(entryEmail)) return entryEmail
  return emails[0] || entryEmail || ''
}

/** Open household from account number (staff / already-known A#####). */
export async function resolveHouseholdByAccountNumber(
  rawAccountNumber: string,
  entryEmail = '',
): Promise<Household> {
  const accountNumber = normalizeAccountNumber(rawAccountNumber)
  if (!accountNumber) {
    return {
      accountNumber: '',
      entryEmail: entryEmail.trim().toLowerCase(),
      emails: entryEmail ? [entryEmail.trim().toLowerCase()] : [],
      memberships: [],
      students: [],
      tierCandidates: [],
      primaryEmail: entryEmail.trim().toLowerCase(),
    }
  }

  const rows = await listMembershipsByAccountNumber(accountNumber)
  const memberships: HouseholdMembershipRow[] = rows
    .map((r) => ({
      email: String(r.email ?? '').trim().toLowerCase(),
      tier: String(r.tier ?? 'free'),
      accountNumber: normalizeAccountNumber(r.accountNumber) || accountNumber,
      status: String(r.status ?? ''),
      raw: r,
    }))
    .filter((m) => m.email)

  const entry = entryEmail.trim().toLowerCase()
  const emails = [...new Set([...(entry ? [entry] : []), ...memberships.map((m) => m.email)])]
  const students = await loadStudentsForEmails(emails)
  const tierCandidates = [
    ...memberships.map((m) => m.tier),
    ...students.map((s) => String(s.membershipTier ?? 'free')),
  ]
  const primaryEmail = pickPrimaryEmail(entry, emails, memberships, students)

  return {
    accountNumber,
    entryEmail: entry,
    emails,
    memberships,
    students,
    tierCandidates,
    primaryEmail,
  }
}

/**
 * Canonical household open: email or account number → A##### → everything underneath.
 */
export async function resolveHousehold(opts: {
  email?: string
  accountNumber?: string
}): Promise<Household> {
  const email = String(opts.email ?? '').trim().toLowerCase()
  const direct = normalizeAccountNumber(opts.accountNumber)

  if (direct) {
    return resolveHouseholdByAccountNumber(direct, email)
  }

  if (!email) {
    return {
      accountNumber: '',
      entryEmail: '',
      emails: [],
      memberships: [],
      students: [],
      tierCandidates: [],
      primaryEmail: '',
    }
  }

  const accountNumber = await ensureAccountNumberForEmail(email)
  return resolveHouseholdByAccountNumber(accountNumber, email)
}

/**
 * Login email → account number → household membership summary.
 * Prefer `resolveHousehold` when you need students or primaryEmail too.
 */
export async function resolveHouseholdMembershipContext(
  viewerEmail: string,
): Promise<HouseholdMembershipContext> {
  const h = await resolveHousehold({ email: viewerEmail })
  return {
    accountNumber: h.accountNumber,
    emails: h.emails,
    tierCandidates: h.tierCandidates,
    memberships: h.memberships.map((m) => ({
      email: m.email,
      tier: m.tier,
      accountNumber: m.accountNumber,
    })),
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
