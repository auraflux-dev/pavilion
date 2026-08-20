/**
 * DiscountCodes CMS helpers (Staff → Discounts).
 * Codes sync to Wix Coupons for checkout; store-card checkouts lock coupons off.
 */
import { getWixClient } from '@/lib/wix-client'
import { createWixPercentCoupon, deactivateWixCoupon } from '@/lib/wix-coupons'
import { getMembershipTierById } from '@/lib/api/membership'

export type DiscountCodeRow = {
  id: string
  code: string
  name: string
  percent: number
  active: boolean
  issuedToEmail: string
  membershipTier: string
  wixCouponId: string
  usageLimit: number
  note: string
  createdAt: string
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20)
}

export function clampDiscountPercent(n: number): number {
  const p = Math.round(Number(n))
  if (!Number.isFinite(p)) throw new Error('Invalid percent')
  if (p < 5 || p > 75) throw new Error('Percent must be between 5 and 75')
  return p
}

export async function listDiscountCodes(): Promise<DiscountCodeRow[]> {
  const client = getWixClient()
  const res = await client.items.query('DiscountCodes').limit(100).find()
  return (res.items ?? []).map((item) => {
    const row = item as Record<string, unknown>
    return {
      id: String(item._id ?? ''),
      code: String(row.code ?? ''),
      name: String(row.name ?? ''),
      percent: Number(row.percent ?? 0),
      active: row.active !== false,
      issuedToEmail: String(row.issuedToEmail ?? ''),
      membershipTier: String(row.membershipTier ?? ''),
      wixCouponId: String(row.wixCouponId ?? ''),
      usageLimit: Number(row.usageLimit ?? 0) || 0,
      note: String(row.note ?? ''),
      createdAt: String(item._createdDate ?? ''),
    }
  })
}

/** Percent to issue for a parent based on their students' highest paid tier. */
export async function resolveTierDiscountPercent(parentEmail: string): Promise<{
  percent: number
  tierId: string
}> {
  const client = getWixClient()
  const email = parentEmail.trim().toLowerCase()
  const students = await client.items.query('Students').eq('parentEmail', email).find()
  const tiers = (students.items ?? [])
    .filter((s) => (s as { archived?: boolean }).archived !== true)
    .map((s) => String((s as { membershipTier?: string }).membershipTier ?? 'free').toLowerCase())
    .filter((t) => t && t !== 'free' && t !== 'faculty')

  // Prefer tide/trench/pearl > lagoon/supreme > reef/ruby > first
  const order = ['tide', 'trench', 'pearl', 'lagoon', 'supreme', 'reef', 'ruby']
  const tierId = order.find((t) => tiers.includes(t)) ?? tiers[0] ?? ''
  if (!tierId) {
    return { percent: 5, tierId: 'free' }
  }
  const cms = await getMembershipTierById(tierId)
  const fromCms = Number(cms?.discountPercent ?? 0)
  if (fromCms >= 5 && fromCms <= 75) return { percent: fromCms, tierId }
  const defaults: Record<string, number> = {
    reef: 10,
    ruby: 10,
    lagoon: 15,
    supreme: 15,
    tide: 30,
    trench: 30,
    pearl: 30,
  }
  return { percent: defaults[tierId] ?? 10, tierId }
}

export async function createDiscountCode(input: {
  code: string
  name: string
  percent: number
  issuedToEmail?: string
  membershipTier?: string
  usageLimit?: number
  note?: string
  expirationDays?: number
}): Promise<DiscountCodeRow> {
  const code = normalizeCode(input.code)
  const percent = clampDiscountPercent(input.percent)
  if (!code) throw new Error('Code is required')

  const client = getWixClient()
  const existing = await client.items.query('DiscountCodes').eq('code', code).limit(1).find()
  if ((existing.items ?? []).length > 0) {
    throw new Error(`Code ${code} already exists`)
  }

  const expirationTimeMs =
    input.expirationDays && input.expirationDays > 0
      ? Date.now() + input.expirationDays * 24 * 60 * 60 * 1000
      : null

  const wix = await createWixPercentCoupon({
    name: input.name || code,
    code,
    percentOffRate: percent,
    usageLimit: input.usageLimit && input.usageLimit > 0 ? input.usageLimit : null,
    limitPerCustomer: input.issuedToEmail ? 1 : null,
    expirationTimeMs,
  })

  const inserted = await client.items.insert('DiscountCodes', {
    code: wix.code,
    name: input.name.trim() || wix.code,
    percent,
    active: true,
    issuedToEmail: (input.issuedToEmail ?? '').trim().toLowerCase(),
    membershipTier: input.membershipTier ?? '',
    wixCouponId: wix.id,
    usageLimit: input.usageLimit ?? 0,
    note: input.note ?? '',
  })

  return {
    id: String(inserted._id ?? ''),
    code: wix.code,
    name: input.name.trim() || wix.code,
    percent,
    active: true,
    issuedToEmail: (input.issuedToEmail ?? '').trim().toLowerCase(),
    membershipTier: input.membershipTier ?? '',
    wixCouponId: wix.id,
    usageLimit: input.usageLimit ?? 0,
    note: input.note ?? '',
    createdAt: new Date().toISOString(),
  }
}

/** Issue a personal code to a member; percent from their membership tier (or override). */
export async function issueDiscountToMember(input: {
  baseName: string
  parentEmail: string
  percentOverride?: number | null
  note?: string
}): Promise<DiscountCodeRow> {
  const email = input.parentEmail.trim().toLowerCase()
  if (!email || !email.includes('@')) throw new Error('Valid parent email required')

  const { percent: tierPercent, tierId } = await resolveTierDiscountPercent(email)
  const percent = clampDiscountPercent(input.percentOverride ?? tierPercent)

  const base = normalizeCode(input.baseName || 'PTO')
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  const code = normalizeCode(`${base}${suffix}`.slice(0, 20))

  return createDiscountCode({
    code,
    name: `${input.baseName.trim() || 'PTO'} · ${tierId || 'member'}`,
    percent,
    issuedToEmail: email,
    membershipTier: tierId,
    usageLimit: 5,
    note: input.note || `Issued to ${email} (${tierId || 'free'} → ${percent}%)`,
    expirationDays: 120,
  })
}

export async function setDiscountActive(id: string, active: boolean): Promise<void> {
  const client = getWixClient()
  const res = await client.items.query('DiscountCodes').eq('_id', id).limit(1).find()
  const row = res.items?.[0]
  if (!row?._id) throw new Error('Discount not found')
  const wixCouponId = String((row as { wixCouponId?: string }).wixCouponId ?? '')
  if (!active && wixCouponId) {
    await deactivateWixCoupon(wixCouponId)
  }
  await client.items.update('DiscountCodes', { ...row, active })
}
