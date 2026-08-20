/**
 * Board benefit: 75% off one enrichment program per season (Fall + Spring).
 * Personal Wix coupon per member, usageLimit 1 each.
 */
import { getWixClient } from '@/lib/wix-client'
import { createWixPercentCoupon } from '@/lib/wix-coupons'
import {
  clampDiscountPercent,
  type DiscountCodeRow,
} from '@/lib/staff/discounts'
import {
  parseEntitlementsJson,
  type MembershipEntitlement,
} from '@/lib/membership-entitlements'

const BOARD_DISCOUNT_PERCENT = 75

function boardCodeSuffix(email: string): string {
  let h = 0
  for (const c of email.toLowerCase()) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h).toString(36).toUpperCase().slice(0, 4).padStart(4, '0')
}

function seasonExpirationMs(season: 'fall' | 'spring'): number {
  const now = new Date()
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  if (season === 'fall') {
    // Fall enrichment season through Jan 31
    return Date.UTC(year, 0, 31, 23, 59, 59)
  }
  // Spring through June 30 (school year end)
  return Date.UTC(year, 5, 30, 23, 59, 59)
}

function boardCouponCode(email: string, season: 'fall' | 'spring'): string {
  const suffix = boardCodeSuffix(email)
  const prefix = season === 'fall' ? 'BRD75F' : 'BRD75S'
  return `${prefix}${suffix}`.slice(0, 20)
}

function boardEntitlement(
  season: 'fall' | 'spring',
  code: string,
): MembershipEntitlement {
  const kind = season === 'fall' ? 'board_enrichment_fall' : 'board_enrichment_spring'
  const label =
    season === 'fall'
      ? '75% off 1 enrichment program (Fall season)'
      : '75% off 1 enrichment program (Spring season)'
  const when = season === 'fall' ? 'Fall 2026 enrichment registration' : 'Spring 2027 enrichment registration'
  return {
    kind,
    label,
    status: 'info',
    detail: code,
    notes: `Board benefit · one use only · ${when}. Use this code instead of your tier code for that enrollment.`,
  }
}

async function ensureBoardSeasonCoupon(opts: {
  email: string
  season: 'fall' | 'spring'
  displayName: string
}): Promise<DiscountCodeRow> {
  const email = opts.email.trim().toLowerCase()
  const code = boardCouponCode(email, opts.season)
  const percent = clampDiscountPercent(BOARD_DISCOUNT_PERCENT)
  const client = getWixClient()
  const existing = await client.items.query('DiscountCodes').eq('code', code).limit(1).find()
  const row = existing.items?.[0] as Record<string, unknown> | undefined
  if (row?._id) {
    return {
      id: String(row._id),
      code: String(row.code ?? code),
      name: String(row.name ?? ''),
      percent: Number(row.percent ?? percent),
      active: row.active !== false,
      issuedToEmail: String(row.issuedToEmail ?? email),
      membershipTier: String(row.membershipTier ?? 'board'),
      wixCouponId: String(row.wixCouponId ?? ''),
      usageLimit: Number(row.usageLimit ?? 1) || 1,
      note: String(row.note ?? ''),
      createdAt: String((row as { _createdDate?: string })._createdDate ?? ''),
    }
  }

  const seasonLabel = opts.season === 'fall' ? 'Fall' : 'Spring'
  const wix = await createWixPercentCoupon({
    name: `Board 75% · ${seasonLabel} · ${opts.displayName || email}`,
    code,
    percentOffRate: percent,
    usageLimit: 1,
    limitPerCustomer: 1,
    expirationTimeMs: seasonExpirationMs(opts.season),
  })

  const inserted = await client.items.insert('DiscountCodes', {
    code: wix.code,
    name: `Board 75% · ${seasonLabel}`,
    percent,
    active: true,
    issuedToEmail: email,
    membershipTier: 'board',
    wixCouponId: wix.id,
    usageLimit: 1,
    note: `Board seat · 75% off one enrichment program · ${seasonLabel} season · ${email}`,
  })

  return {
    id: String(inserted._id ?? ''),
    code: wix.code,
    name: `Board 75% · ${seasonLabel}`,
    percent,
    active: true,
    issuedToEmail: email,
    membershipTier: 'board',
    wixCouponId: wix.id,
    usageLimit: 1,
    note: `Board seat · ${seasonLabel} · ${email}`,
    createdAt: new Date().toISOString(),
  }
}

/** Issue Fall + Spring 75% board codes and store on Memberships + entitlementsJson. */
export async function issueBoardEnrichmentDiscounts(opts: {
  parentEmail: string
  displayName?: string
}): Promise<{ fallCode: string; springCode: string }> {
  const email = opts.parentEmail.trim().toLowerCase()
  if (!email || !email.includes('@') || email.endsWith('@shmspto.org')) {
    throw new Error('Board discounts require a personal parent email (not @shmspto.org)')
  }

  const displayName = String(opts.displayName ?? email.split('@')[0]).trim()
  const [fall, spring] = await Promise.all([
    ensureBoardSeasonCoupon({ email, season: 'fall', displayName }),
    ensureBoardSeasonCoupon({ email, season: 'spring', displayName }),
  ])

  const client = getWixClient()
  const res = await client.items.query('Memberships').eq('email', email).limit(1).find()
  const row = res.items?.[0] as Record<string, unknown> | undefined
  if (!row?._id) {
    throw new Error(`No Memberships row for ${email}. Grant Reef or Faculty first.`)
  }

  const stored = parseEntitlementsJson(row.entitlementsJson)
  const withoutBoard = stored.filter(
    (e) => e.kind !== 'board_enrichment_fall' && e.kind !== 'board_enrichment_spring',
  )
  const merged = [
    ...withoutBoard,
    boardEntitlement('fall', fall.code),
    boardEntitlement('spring', spring.code),
  ]

  await client.items.update('Memberships', {
    _id: String(row._id),
    ...row,
    boardDiscountFallCode: fall.code,
    boardDiscountSpringCode: spring.code,
    entitlementsJson: JSON.stringify(merged),
  })

  return { fallCode: fall.code, springCode: spring.code }
}

/** Rehydrate board season perks from Memberships fields if entitlementsJson is stale. */
export function appendBoardEntitlements(
  row: Record<string, unknown>,
  entitlements: MembershipEntitlement[],
): MembershipEntitlement[] {
  const fall = String(row.boardDiscountFallCode ?? '').trim()
  const spring = String(row.boardDiscountSpringCode ?? '').trim()
  const hasFall = entitlements.some((e) => e.kind === 'board_enrichment_fall')
  const hasSpring = entitlements.some((e) => e.kind === 'board_enrichment_spring')
  const out = [...entitlements]
  if (fall && !hasFall) out.push(boardEntitlement('fall', fall))
  if (spring && !hasSpring) out.push(boardEntitlement('spring', spring))
  return out
}
