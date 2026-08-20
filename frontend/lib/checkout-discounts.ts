/**
 * Apply DiscountCodes on Square/PayPal checkout (Wix coupon records, our charge).
 * Board 75% codes: one enrichment program per season. Spirit codes: Cove catalog only.
 */
import { getWixClient } from '@/lib/wix-client'
import { clampDiscountPercent, normalizeCode } from '@/lib/staff/discounts'

export type DiscountScope = 'product' | 'program'

export type AppliedCheckoutDiscount = {
  code: string
  percent: number
  dollars: number
  listAmount: number
  amount: number
  consumeId: string | null
  name: string
}

type DiscountRow = {
  _id?: string
  code?: string
  name?: string
  percent?: number
  active?: boolean
  issuedToEmail?: string
  membershipTier?: string
  usageLimit?: number
  timesUsed?: number
  note?: string
}

const PROGRAM_TIERS = new Set([
  'board',
  'reef',
  'ruby',
  'lagoon',
  'supreme',
  'tide',
  'pearl',
  'trench',
])

function seasonExpirationMs(season: 'fall' | 'spring'): number {
  const now = new Date()
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  if (season === 'fall') return Date.UTC(year, 0, 31, 23, 59, 59)
  return Date.UTC(year, 5, 30, 23, 59, 59)
}

export function discountScopeForCode(code: string, membershipTier: string): DiscountScope {
  const c = code.trim().toUpperCase()
  const t = membershipTier.trim().toLowerCase()
  if (t === 'board' || c.startsWith('BRD75')) return 'program'
  if (PROGRAM_TIERS.has(t)) return 'program'
  if (c.startsWith('SHMSREEF') || c.startsWith('SHMSLAGOON') || c.startsWith('SHMSTIDE')) {
    return 'program'
  }
  return 'product'
}

function boardCodeExpired(code: string): boolean {
  const c = code.trim().toUpperCase()
  if (c.startsWith('BRD75F')) return Date.now() > seasonExpirationMs('fall')
  if (c.startsWith('BRD75S')) return Date.now() > seasonExpirationMs('spring')
  return false
}

/** Fall Jul–Jan; Spring Feb–Jun (school enrichment seasons). */
export function currentBoardSeason(now = new Date()): 'fall' | 'spring' {
  const m = now.getMonth()
  if (m >= 1 && m <= 5) return 'spring'
  return 'fall'
}

/** Unused board 75% code for this household and current season, if any. */
export async function resolveUnusedBoardDiscountCode(opts: {
  parentEmail: string
  accountEmails?: string[]
}): Promise<string | null> {
  const emails = [
    ...new Set(
      [opts.parentEmail, ...(opts.accountEmails ?? [])]
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
  if (emails.length === 0) return null
  const season = currentBoardSeason()
  const field = season === 'fall' ? 'boardDiscountFallCode' : 'boardDiscountSpringCode'
  const client = getWixClient()

  for (const email of emails) {
    if (email.endsWith('@shmspto.org')) continue
    const res = await client.items.query('Memberships').eq('email', email).limit(1).find()
    const row = res.items?.[0] as Record<string, unknown> | undefined
    if (!row) continue
    const code = String(row[field] ?? '').trim()
    if (!code) continue
    const disc = await lookupDiscountCode(code)
    if (!disc || disc.active === false) continue
    const usageLimit = Number(disc.usageLimit ?? 0) || 0
    const timesUsed = Number(disc.timesUsed ?? 0) || 0
    if (usageLimit > 0 && timesUsed >= usageLimit) continue
    const normalized = String(disc.code ?? code).toUpperCase()
    if (boardCodeExpired(normalized)) continue
    const issued = String(disc.issuedToEmail ?? '').trim().toLowerCase()
    if (issued && !emails.includes(issued)) continue
    return normalized
  }
  return null
}

function money(n: number): number {
  return Math.max(0, Math.round(n * 100) / 100)
}

export async function lookupDiscountCode(raw: string): Promise<DiscountRow | null> {
  const code = normalizeCode(raw)
  if (!code) return null
  const client = getWixClient()
  const existing = await client.items.query('DiscountCodes').eq('code', code).limit(1).find()
  const row = existing.items?.[0] as DiscountRow | undefined
  return row?._id ? row : null
}

export async function applyCheckoutDiscount(opts: {
  scope: DiscountScope
  listAmount: number
  couponCode?: string | null
  parentEmail: string
  /** Staff login / guardian aliases that may also match issuedToEmail. */
  accountEmails?: string[]
  /** Program only: automatic membership tier % when no better coupon. */
  tierPercent?: number
}): Promise<{ amount: number; discount: AppliedCheckoutDiscount | null; error?: string }> {
  const listAmount = money(opts.listAmount)
  const tierPercent = Math.min(75, Math.max(0, Math.round(Number(opts.tierPercent ?? 0) || 0)))
  const typed = (opts.couponCode ?? '').trim()

  if (!typed) {
    if (opts.scope === 'program') {
      const autoBoard = await resolveUnusedBoardDiscountCode({
        parentEmail: opts.parentEmail,
        accountEmails: opts.accountEmails,
      })
      if (autoBoard) {
        return applyCheckoutDiscount({ ...opts, couponCode: autoBoard })
      }
    }
    if (opts.scope !== 'program' || tierPercent <= 0) {
      return { amount: listAmount, discount: null }
    }
    const dollars = money(listAmount * (tierPercent / 100))
    return {
      amount: money(listAmount - dollars),
      discount: {
        code: '',
        percent: tierPercent,
        dollars,
        listAmount,
        amount: money(listAmount - dollars),
        consumeId: null,
        name: `${tierPercent}% membership discount`,
      },
    }
  }

  const row = await lookupDiscountCode(typed)
  if (!row) return { amount: listAmount, discount: null, error: 'That discount code was not found.' }
  if (row.active === false) {
    return { amount: listAmount, discount: null, error: 'That discount code is no longer active.' }
  }

  const code = String(row.code ?? typed).toUpperCase()
  const scope = discountScopeForCode(code, String(row.membershipTier ?? ''))
  if (scope !== opts.scope) {
    return {
      amount: listAmount,
      discount: null,
      error:
        scope === 'program'
          ? 'That code is for enrichment programs, not Cove shop items.'
          : 'That code is for Cove shop / spirit wear, not enrichment programs.',
    }
  }

  const issued = String(row.issuedToEmail ?? '').trim().toLowerCase()
  const allowed = new Set(
    [opts.parentEmail, ...(opts.accountEmails ?? [])]
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
  if (issued && !allowed.has(issued)) {
    return { amount: listAmount, discount: null, error: 'That discount code is not assigned to this account.' }
  }

  if (boardCodeExpired(code)) {
    return { amount: listAmount, discount: null, error: 'That board season code has expired.' }
  }

  const usageLimit = Number(row.usageLimit ?? 0) || 0
  const timesUsed = Number(row.timesUsed ?? 0) || 0
  if (usageLimit > 0 && timesUsed >= usageLimit) {
    return { amount: listAmount, discount: null, error: 'That discount code has already been used.' }
  }

  let couponPercent = Math.round(Number(row.percent ?? 0) || 0)
  try {
    couponPercent = clampDiscountPercent(couponPercent)
  } catch {
    return { amount: listAmount, discount: null, error: 'That discount code has no percent off.' }
  }

  const percent =
    opts.scope === 'program' ? Math.max(couponPercent, tierPercent) : couponPercent
  const dollars = money(listAmount * (percent / 100))
  const amount = money(listAmount - dollars)
  const usedCoupon = opts.scope === 'product' || couponPercent >= tierPercent
  const consume = Boolean(usedCoupon && usageLimit > 0)

  return {
    amount,
    discount: {
      code,
      percent,
      dollars,
      listAmount,
      amount,
      consumeId: consume ? String(row._id) : null,
      name: String(row.name ?? code),
    },
  }
}

export async function consumeDiscountCode(id: string): Promise<void> {
  if (!id) return
  try {
    const client = getWixClient()
    const row = (await client.items.get('DiscountCodes', id).catch(() => null)) as DiscountRow | null
    if (!row?._id) return
    const usageLimit = Number(row.usageLimit ?? 0) || 0
    const timesUsed = (Number(row.timesUsed ?? 0) || 0) + 1
    await client.items.update('DiscountCodes', {
      ...(row as object),
      _id: row._id,
      timesUsed,
      active: usageLimit > 0 && timesUsed >= usageLimit ? false : row.active !== false,
    } as never)
  } catch (err) {
    console.error('consumeDiscountCode', err)
  }
}
