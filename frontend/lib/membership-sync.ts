/**
 * Apply paid PTO membership (Ruby / Supreme) onto CMS Students + Memberships.
 */
import { getWixClient } from '@/lib/wix-client'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { CATALOG_DEFAULTS } from '@/lib/defaults/catalog'
import type { CatalogConfig } from '@/lib/defaults/catalog'

export type PaidTier = 'ruby' | 'supreme'

export function tierFromProductId(
  productId: string | undefined | null,
  cfg?: Pick<CatalogConfig, 'rubyProductId' | 'supremeProductId'>
): PaidTier | null {
  if (!productId) return null
  const ruby = cfg?.rubyProductId ?? CATALOG_DEFAULTS.membershipRubyProductId
  const supreme = cfg?.supremeProductId ?? CATALOG_DEFAULTS.membershipSupremeProductId
  if (productId === ruby) return 'ruby'
  if (productId === supreme) return 'supreme'
  return null
}

/** Resolve tier using SiteSettings-aware catalog config. */
export async function tierFromProductIdAsync(
  productId: string | undefined | null
): Promise<PaidTier | null> {
  const cfg = await getCatalogConfig()
  return tierFromProductId(productId, cfg)
}

export function tierFromSlugOrName(value: string | undefined | null): PaidTier | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('supreme')) return 'supreme'
  if (v.includes('ruby')) return 'ruby'
  return null
}

/**
 * Upgrade a specific student, or the parent's first free student if studentId omitted.
 * Also upserts the parent-level Memberships CMS row (legacy source).
 */
export async function applyPaidMembership(opts: {
  parentEmail: string
  tier: PaidTier
  studentId?: string | null
  expiresAt?: string | null
}): Promise<{ updatedStudentIds: string[]; membershipUpserted: boolean }> {
  const email = opts.parentEmail.trim().toLowerCase()
  const client = getWixClient()
  const expiresAt =
    opts.expiresAt ??
    // End of next June (typical school-year membership)
    `${new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0)}-06-30T23:59:59.000Z`

  const students = await client.items.query('Students').eq('parentEmail', email).find()
  const items = students.items ?? []

  let targets = items
  if (opts.studentId) {
    targets = items.filter((s) => s._id === opts.studentId)
  } else {
    // Prefer upgrading a free (or missing tier) student first
    const free = items.filter((s) => {
      const tier = String((s as { membershipTier?: string }).membershipTier ?? 'free')
      return tier === 'free' || !tier
    })
    targets = free.length > 0 ? [free[0]] : items.slice(0, 1)
  }

  const updatedStudentIds: string[] = []
  for (const student of targets) {
    if (!student._id) continue
    await client.items.update('Students', {
      ...student,
      membershipTier: opts.tier,
      membershipStatus: 'active',
    })
    updatedStudentIds.push(student._id)
  }

  // Upsert parent Memberships row
  let membershipUpserted = false
  try {
    const existing = await client.items.query('Memberships').eq('email', email).find()
    const row = existing.items?.[0]
    if (row?._id) {
      await client.items.update('Memberships', {
        ...row,
        email,
        tier: opts.tier,
        expiresAt,
        status: 'active',
      })
    } else {
      await client.items.insert('Memberships', {
        email,
        tier: opts.tier,
        expiresAt,
        status: 'active',
      })
    }
    membershipUpserted = true
  } catch {
    // Memberships collection may be missing or permissioned differently
  }

  return { updatedStudentIds, membershipUpserted }
}
