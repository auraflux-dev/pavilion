/**
 * Shared membership enrichment discount codes (not unique per parent).
 * Reef → SHMSREEF10 (10%), Lagoon → SHMSLAGOON15 (15%), Tide → SHMSTIDE30 (30%).
 */
import { enrichmentDiscountPercent } from '@/lib/membership-entitlements'
import {
  clampDiscountPercent,
  createDiscountCode,
  type DiscountCodeRow,
} from '@/lib/staff/discounts'
import { getWixClient } from '@/lib/wix-client'

const SHARED: Record<string, { code: string; percent: number; name: string }> = {
  reef: { code: 'SHMSREEF10', percent: 10, name: 'Reef enrichment 10%' },
  ruby: { code: 'SHMSREEF10', percent: 10, name: 'Reef enrichment 10%' },
  lagoon: { code: 'SHMSLAGOON15', percent: 15, name: 'Lagoon enrichment 15%' },
  supreme: { code: 'SHMSLAGOON15', percent: 15, name: 'Lagoon enrichment 15%' },
  tide: { code: 'SHMSTIDE30', percent: 30, name: 'Tide enrichment 30%' },
  pearl: { code: 'SHMSTIDE30', percent: 30, name: 'Tide enrichment 30%' },
  trench: { code: 'SHMSTIDE30', percent: 30, name: 'Tide enrichment 30%' },
}

const SHARED_CODES = new Set(
  Object.values(SHARED).map((s) => s.code.toUpperCase()),
)

export function isSharedMembershipEnrichmentCode(code: string): boolean {
  return SHARED_CODES.has(String(code ?? '').trim().toUpperCase())
}

export function sharedEnrichmentCodeForTier(tier: string): {
  code: string
  percent: number
  name: string
} | null {
  const t = tier.trim().toLowerCase()
  if (t === 'faculty' || t === 'staff' || t === 'free' || t === 'none' || !t) return null
  const fixed = SHARED[t]
  if (fixed) return fixed
  const pct = enrichmentDiscountPercent(t)
  if (pct <= 0) return null
  return {
    code: `SHMS${t.toUpperCase().slice(0, 8)}${pct}`,
    percent: pct,
    name: `${t} enrichment ${pct}%`,
  }
}

/** Get or create the shared Wix/CMS coupon for a paid tier. Reuses one code for all members. */
export async function ensureSharedEnrichmentCode(tier: string): Promise<DiscountCodeRow | null> {
  const spec = sharedEnrichmentCodeForTier(tier)
  if (!spec) return null
  const percent = clampDiscountPercent(spec.percent)
  const client = getWixClient()
  const existing = await client.items.query('DiscountCodes').eq('code', spec.code).limit(1).find()
  const row = existing.items?.[0] as Record<string, unknown> | undefined
  if (row?._id) {
    return {
      id: String(row._id),
      code: String(row.code ?? spec.code),
      name: String(row.name ?? spec.name),
      percent: Number(row.percent ?? percent),
      active: row.active !== false,
      issuedToEmail: String(row.issuedToEmail ?? ''),
      membershipTier: String(row.membershipTier ?? tier),
      wixCouponId: String(row.wixCouponId ?? ''),
      usageLimit: Number(row.usageLimit ?? 0) || 0,
      note: String(row.note ?? ''),
      createdAt: String((row as { _createdDate?: string })._createdDate ?? ''),
    }
  }

  try {
    return await createDiscountCode({
      code: spec.code,
      name: spec.name,
      percent,
      membershipTier: tier.trim().toLowerCase(),
      usageLimit: 0,
 note: `Shared ${tier} enrichment code. All ${tier} members use the same code`,
      expirationDays: 0,
    })
  } catch (err) {
    // Race: another request created it
    const again = await client.items.query('DiscountCodes').eq('code', spec.code).limit(1).find()
    const found = again.items?.[0] as Record<string, unknown> | undefined
    if (found?._id) {
      return {
        id: String(found._id),
        code: String(found.code ?? spec.code),
        name: String(found.name ?? spec.name),
        percent: Number(found.percent ?? percent),
        active: found.active !== false,
        issuedToEmail: '',
        membershipTier: tier.trim().toLowerCase(),
        wixCouponId: String(found.wixCouponId ?? ''),
        usageLimit: 0,
        note: String(found.note ?? ''),
        createdAt: '',
      }
    }
    throw err
  }
}

/** Clear shared membership enrichment codes from student rows (faculty / free). */
export async function clearEnrichmentCodeFromFamily(parentEmail: string): Promise<void> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) return
  const client = getWixClient()
  const students = await client.items.query('Students').eq('parentEmail', email).find()
  for (const student of students.items ?? []) {
    if (!student._id) continue
    if ((student as { archived?: boolean }).archived === true) continue
    const code = String((student as { discountCode?: string }).discountCode ?? '').trim()
    if (!code || !isSharedMembershipEnrichmentCode(code)) continue
    await client.items.update('Students', {
      ...student,
      discountCode: '',
    })
  }
}

/** Attach shared enrichment code onto every active student for this parent. */
export async function assignEnrichmentCodeToFamily(
  parentEmail: string,
  tier: string,
): Promise<string | null> {
  const t = tier.trim().toLowerCase()
  // Faculty complimentary: never attach SHMSREEF10 / Lagoon / Tide shared codes.
  if (t === 'faculty' || t === 'staff' || t === 'free' || t === 'none' || !t) {
    await clearEnrichmentCodeFromFamily(parentEmail)
    return null
  }
  const shared = await ensureSharedEnrichmentCode(tier)
  if (!shared?.code) return null
  const email = parentEmail.trim().toLowerCase()
  const client = getWixClient()
  const students = await client.items.query('Students').eq('parentEmail', email).find()
  for (const student of students.items ?? []) {
    if (!student._id) continue
    if ((student as { archived?: boolean }).archived === true) continue
    await client.items.update('Students', {
      ...student,
      discountCode: shared.code,
    })
  }
  return shared.code
}
