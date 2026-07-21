/**
 * Apply paid PTO membership onto CMS Students + Memberships,
 * and load the tier's Square gift-card credit onto the student store card.
 */
import { getWixClient } from '@/lib/wix-client'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { CATALOG_DEFAULTS } from '@/lib/defaults/catalog'
import type { CatalogConfig } from '@/lib/defaults/catalog'
import {
  getMembershipTierById,
  getPaidMembershipTiers,
} from '@/lib/api/membership'
import { getSiteSettings } from '@/lib/api/site-settings'
import {
  listFamilyStudents,
  resolveFamilyGiftCard,
  syncFamilyStoreCard,
} from '@/lib/family-store-card'
import {
  getStoreCardBonusPercent,
  storeCardLoadCents,
} from '@/lib/store-card-bonus'
import { createOrLoadStudentGiftCard, upsertSquareCustomer } from '@/lib/square'

/** Any paid tier slug (ruby / supreme / pearl / future). */
export type PaidTier = string

export function tierFromProductId(
  productId: string | undefined | null,
  cfg?: CatalogConfig
): PaidTier | null {
  if (!productId) return null
  const map = cfg?.membershipByTier
  if (map) {
    for (const [tierId, entry] of Object.entries(map)) {
      if (entry.productId && entry.productId === productId) return tierId
    }
  }
  const ruby = cfg?.rubyProductId ?? CATALOG_DEFAULTS.membershipRubyProductId
  const supreme = cfg?.supremeProductId ?? CATALOG_DEFAULTS.membershipSupremeProductId
  const pearl = cfg?.pearlProductId ?? CATALOG_DEFAULTS.membershipPearlProductId
  if (productId === ruby) return 'reef'
  if (productId === supreme) return 'lagoon'
  if (pearl && productId === pearl) return 'tide'
  return null
}

/** Resolve tier using SiteSettings-aware catalog config + CMS productId overrides. */
export async function tierFromProductIdAsync(
  productId: string | undefined | null
): Promise<PaidTier | null> {
  if (!productId) return null
  const [cfg, tiers] = await Promise.all([getCatalogConfig(), getPaidMembershipTiers()])
  for (const t of tiers) {
    if (t.productId && t.productId === productId) return t.tierId
  }
  return tierFromProductId(productId, cfg)
}

export function tierFromSlugOrName(value: string | undefined | null): PaidTier | null {
  if (!value) return null
  const v = value.toLowerCase()
  // Current ocean names
  if (v.includes('tide')) return 'tide'
  if (v.includes('lagoon')) return 'lagoon'
  if (v.includes('reef')) return 'reef'
  // Legacy names (orders / students created before rename)
  if (v.includes('trench') || v.includes('pearl')) return 'tide'
  if (v.includes('supreme')) return 'lagoon'
  if (v.includes('ruby')) return 'reef'
  const slugMatch = v.match(
    /(?:membership[-_])?(tide|trench|lagoon|reef|pearl|supreme|ruby)\b/
  )
  if (!slugMatch?.[1]) return null
  const legacy: Record<string, string> = {
    trench: 'tide',
    pearl: 'tide',
    supreme: 'lagoon',
    ruby: 'reef',
  }
  const id = slugMatch[1]
  return legacy[id] ?? id
}

async function resolveGiftCardCredit(tier: PaidTier): Promise<number> {
  const cms = await getMembershipTierById(tier)
  if (cms && cms.giftCardCredit > 0) return cms.giftCardCredit
  const cfg = await getCatalogConfig()
  const entry = cfg.membershipByTier[tier]
  return entry?.giftCardCredit ?? 0
}

async function resolveCheckoutProduct(
  tier: PaidTier
): Promise<{ productId: string; variantId: string } | null> {
  const cms = await getMembershipTierById(tier)
  if (cms?.productId) {
    return { productId: cms.productId, variantId: cms.variantId || '' }
  }
  const cfg = await getCatalogConfig()
  const entry = cfg.membershipByTier[tier]
  if (entry?.productId) {
    return { productId: entry.productId, variantId: entry.variantId || '' }
  }
  return null
}

export async function getMembershipCheckoutProduct(tier: PaidTier) {
  return resolveCheckoutProduct(tier)
}

/**
 * Upgrade a specific student, or the parent's first free student if studentId omitted.
 * Also upserts the parent-level Memberships CMS row and loads Square gift-card credit.
 */
export async function applyPaidMembership(opts: {
  parentEmail: string
  tier: PaidTier
  studentId?: string | null
  expiresAt?: string | null
  orderId?: string | null
  parentName?: string | null
}): Promise<{
  updatedStudentIds: string[]
  membershipUpserted: boolean
  giftCard?: {
    studentId: string
    gan: string
    creditDollars: number
    status: 'loaded' | 'skipped' | 'failed'
    error?: string
  }
}> {
  const email = opts.parentEmail.trim().toLowerCase()
  const tier = opts.tier.trim().toLowerCase()
  const client = getWixClient()
  const expiresAt =
    opts.expiresAt ??
    `${new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0)}-06-30T23:59:59.000Z`

  const students = await client.items.query('Students').eq('parentEmail', email).find()
  const items = (students.items ?? []).filter(
    (student) => (student as { archived?: boolean }).archived !== true
  )

  let targets = items
  if (opts.studentId) {
    targets = items.filter((s) => s._id === opts.studentId)
  } else {
    const free = items.filter((s) => {
      const t = String((s as { membershipTier?: string }).membershipTier ?? 'free')
      return t === 'free' || !t
    })
    targets = free.length > 0 ? [free[0]] : items.slice(0, 1)
  }

  const updatedStudentIds: string[] = []
  let giftCardResult:
    | {
        studentId: string
        gan: string
        creditDollars: number
        status: 'loaded' | 'skipped' | 'failed'
        error?: string
      }
    | undefined

  for (const student of targets) {
    if (!student._id) continue
    const previousTier = String(
      (student as { membershipTier?: string }).membershipTier ?? 'free'
    )
    await client.items.update('Students', {
      ...student,
      membershipTier: tier,
      membershipStatus: 'active',
    })
    updatedStudentIds.push(student._id)

    // Gift-card credit once per order (or once when moving free → paid without orderId)
    if (!giftCardResult) {
      const creditDollars = await resolveGiftCardCredit(tier)
      const shouldLoad =
        creditDollars > 0 &&
        (opts.orderId
          ? true
          : previousTier === 'free' || previousTier === '' || previousTier !== tier)

      if (!shouldLoad || creditDollars <= 0) {
        giftCardResult = {
          studentId: student._id,
          gan: String((student as { squareGiftCardGan?: string }).squareGiftCardGan ?? ''),
          creditDollars,
          status: 'skipped',
        }
      } else {
        try {
          if (opts.orderId) {
            const existingPay = await client.items
              .query('Payments')
              .eq('source', 'membership_gift_card')
              .eq('orderId', opts.orderId)
              .limit(1)
              .find()
            if ((existingPay.items ?? []).length > 0) {
              giftCardResult = {
                studentId: student._id,
                gan: String(
                  (student as { squareGiftCardGan?: string }).squareGiftCardGan ?? ''
                ),
                creditDollars,
                status: 'skipped',
              }
              continue
            }
          }

          let customerId: string | undefined
          try {
            const customer = await upsertSquareCustomer(
              email,
              opts.parentName || email.split('@')[0]
            )
            customerId = customer?.id
          } catch {
            // optional
          }

          const idempotencyKey = opts.orderId
            ? `membership-gc-${opts.orderId}`
            : `membership-gc-${student._id}-${tier}-${expiresAt.slice(0, 10)}`

          const settings = await getSiteSettings()
          const bonusPercent = getStoreCardBonusPercent(
            settings.get('storeCardBonusPercent', '10')
          )
          const creditCents = Math.round(creditDollars * 100)
          const loadCents = storeCardLoadCents(creditCents, bonusPercent)
          const loadedDollars = loadCents / 100

          const family = await listFamilyStudents(email)
          const familyCard = resolveFamilyGiftCard(family)
          const existingGan =
            familyCard.gan ||
            String((student as { squareGiftCardGan?: string }).squareGiftCardGan ?? '')

          const card = await createOrLoadStudentGiftCard({
            amountCents: loadCents,
            idempotencyKey,
            existingGan: existingGan || null,
            customerId,
            buyerPaymentInstrumentIds: [opts.orderId || 'membership-provision'],
          })

          const balanceDollars = existingGan
            ? familyCard.balance + loadedDollars
            : loadedDollars

          await syncFamilyStoreCard({
            parentEmail: email,
            gan: card.gan,
            giftCardId: card.giftCardId,
            balanceDollars,
          })

          try {
            await client.items.insert('Payments', {
              parentEmail: email,
              studentId: student._id,
              amount: creditDollars,
              status: 'Paid',
              source: 'membership_gift_card',
              orderId: opts.orderId || idempotencyKey,
              notes:
                bonusPercent > 0
                  ? `Membership ${tier} family Cove credit $${creditDollars} → $${loadedDollars.toFixed(2)} (+${bonusPercent}%)`
                  : `Membership ${tier} family Cove credit`,
            })
          } catch {
            // Payments insert is best-effort for ledger / idempotency
          }

          giftCardResult = {
            studentId: student._id,
            gan: card.gan,
            creditDollars: loadedDollars,
            status: 'loaded',
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Gift card load failed'
          try {
            await client.items.insert('Payments', {
              parentEmail: email,
              studentId: student._id,
              amount: creditDollars,
              status: 'Needs Reconciliation',
              source: 'membership_gift_card',
              orderId: opts.orderId || `membership-gc-fail-${student._id}-${Date.now()}`,
              notes: message,
            })
          } catch {
            // ignore
          }
          giftCardResult = {
            studentId: student._id,
            gan: '',
            creditDollars,
            status: 'failed',
            error: message,
          }
        }
      }
    }
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
        tier,
        expiresAt,
        status: 'active',
      })
    } else {
      await client.items.insert('Memberships', {
        email,
        tier,
        expiresAt,
        status: 'active',
      })
    }
    membershipUpserted = true
  } catch {
    // Memberships collection may be missing or permissioned differently
  }

  return { updatedStudentIds, membershipUpserted, giftCard: giftCardResult }
}
