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
import {
  createOrLoadStudentGiftCard,
  upsertSquareCustomerForCoveStand,
} from '@/lib/square'

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

/**
 * Base Cove dollars already granted via membership_gift_card loads (excludes bonus).
 * Pass `tier` to count only that tier's grants — each paid tier loads its full credit;
 * unused Square balance rolls over and stacks when they upgrade.
 */
export async function sumLoadedMembershipCoveCreditBase(
  parentEmail: string,
  tier?: 'reef' | 'lagoon' | 'tide',
): Promise<number> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) return 0
  try {
    const client = getWixClient()
    const found = await client.items
      .query('Payments')
      .eq('parentEmail', email)
      .eq('source', 'membership_gift_card')
      .limit(50)
      .find()
    let total = 0
    const tierNeedle = tier ? new RegExp(`\\b${tier}\\b`, 'i') : null
    for (const row of (found.items ?? []) as Array<{
      status?: string
      amount?: number
      notes?: string
      programName?: string
    }>) {
      const status = String(row.status ?? '').trim().toLowerCase()
      if (status !== 'loaded' && status !== 'paid') continue
      const notes = String(row.notes ?? '')
      const programName = String(row.programName ?? '')
      if (tierNeedle && !tierNeedle.test(notes) && !tierNeedle.test(programName)) continue
      const baseFromNotes = notes.match(/credit\s+\$([0-9]+(?:\.[0-9]+)?)/i)
      if (baseFromNotes) {
        total += Number(baseFromNotes[1]) || 0
        continue
      }
      const bonusFromNotes = notes.match(/\+\s*([0-9]+(?:\.[0-9]+)?)\s*%/)
      const loaded = Number(row.amount) || 0
      if (bonusFromNotes && loaded > 0) {
        const pct = Number(bonusFromNotes[1]) || 0
        total += pct > 0 ? loaded / (1 + pct / 100) : loaded
        continue
      }
      total += loaded
    }
    return Math.round(total * 100) / 100
  } catch {
    return 0
  }
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
  /** Spirit Wear size when the parent chose the included T-shirt */
  shirtSize?: string | null
  shirtDesign?: string | null
  shirtProductId?: string | null
  shirtVariantId?: string | null
  /** Lagoon/Tide: magnet OR spirit_shirt */
  physicalPerk?: 'spirit_shirt' | 'magnet' | null
  /** Board seat gift: no SHMSREEF10 (board already gets 75% season codes). */
  skipEnrichmentCode?: boolean
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
  entitlements?: import('@/lib/membership-entitlements').MembershipEntitlement[]
  enrichmentCode?: string | null
  shirtHeld?: boolean
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
  }
  // Default: stamp every active student in the household so roster/Students stay in sync.
  // Gift-card credit still loads once (first target only) below.

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

    // Each paid tier grants its full Cove credit once. Unused Square balance rolls over
    // and stacks when they upgrade (Lagoon credit stays; Tide adds its full credit).
    if (!giftCardResult) {
      const { normalizeMembershipTier } = await import('@/lib/staff/members-roster')
      const previousNormalized = normalizeMembershipTier(previousTier)
      const fullCredit = await resolveGiftCardCredit(tier as 'reef' | 'lagoon' | 'tide')
      const paidTier = tier as 'reef' | 'lagoon' | 'tide'
      const alreadyLoadedForTier = await sumLoadedMembershipCoveCreditBase(email, paidTier)
      const alreadyLoadedBase = await sumLoadedMembershipCoveCreditBase(email)
      const creditDollars = Math.max(0, fullCredit - alreadyLoadedForTier)
      const shouldLoad =
        creditDollars > 0 &&
        (opts.orderId
          ? true
          : previousNormalized === 'free' || previousNormalized !== tier)

      if (!shouldLoad || creditDollars <= 0) {
        giftCardResult = {
          studentId: student._id,
          gan: String((student as { squareGiftCardGan?: string }).squareGiftCardGan ?? ''),
          creditDollars: fullCredit,
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
            const { ensureCoveFamilyCode, getCoveFamilyPasscode } = await import(
              '@/lib/cove-family-code'
            )
            const pin = await ensureCoveFamilyCode(email)
            const pass = await getCoveFamilyPasscode(email)
            const synced = await upsertSquareCustomerForCoveStand({
              email,
              name: opts.parentName || email.split('@')[0],
              coveFamilyCode: pin,
              coveFamilyPasscode: pass,
            })
            customerId = synced.customerId || undefined
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

          try {
            const { ensureCoveFamilyCode, getCoveFamilyPasscode } = await import(
              '@/lib/cove-family-code'
            )
            await upsertSquareCustomerForCoveStand({
              email,
              name: opts.parentName || email.split('@')[0],
              coveFamilyCode: await ensureCoveFamilyCode(email),
              coveFamilyPasscode: await getCoveFamilyPasscode(email),
              giftCardId: card.giftCardId,
              gan: card.gan,
            })
          } catch {
            // Stand directory sync is best-effort
          }

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
              programName: `Membership ${String(tier).charAt(0).toUpperCase()}${String(tier).slice(1)} · Cove credit`,
              amount: loadedDollars,
              status: 'Loaded',
              paymentDate: new Date().toISOString(),
              paymentMethod: 'Membership credit',
              source: 'membership_gift_card',
              orderId: opts.orderId || idempotencyKey,
              notes:
                bonusPercent > 0
                  ? `Membership ${tier} family Cove credit $${creditDollars} → $${loadedDollars.toFixed(2)} (+${bonusPercent}%)${
                      alreadyLoadedBase > 0
                        ? ` ($${alreadyLoadedBase} prior membership Cove base still on ledger; unused Square balance rolls over)`
                        : ''
                    }`
                  : `Membership ${tier} family Cove credit${
                      alreadyLoadedBase > 0
                        ? ` ($${alreadyLoadedBase} prior membership Cove base; unused balance rolls over)`
                        : ''
                    }`,
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
              programName: `Membership ${String(tier).charAt(0).toUpperCase()}${String(tier).slice(1)} · Cove credit`,
              amount: creditDollars,
              status: 'Needs Reconciliation',
              paymentDate: new Date().toISOString(),
              paymentMethod: 'Membership credit',
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

  // Upsert parent Memberships row + perk entitlements for portal / staff fulfillment
  let membershipUpserted = false
  const { buildMembershipEntitlements } = await import('@/lib/membership-entitlements')
  const { assignEnrichmentCodeToFamily } = await import('@/lib/staff/enrichment-codes')
  const fullCredit = await resolveGiftCardCredit(tier)

  let enrichmentCode: string | null = null
  const skipEnrichment =
    opts.skipEnrichmentCode === true ||
    String(opts.orderId ?? '').startsWith('board-seat-')
  try {
    if (skipEnrichment) {
      const { clearEnrichmentCodeFromFamily } = await import('@/lib/staff/enrichment-codes')
      await clearEnrichmentCodeFromFamily(email)
      enrichmentCode = null
    } else {
      enrichmentCode = await assignEnrichmentCodeToFamily(email, tier)
    }
  } catch (err) {
    console.warn('assignEnrichmentCodeToFamily', err)
  }

  // Hold shirt inventory immediately so retail cannot sell the same unit.
  let shirtHeld = false
  let shirtSku: string | undefined
  if (String(opts.shirtVariantId ?? '').trim()) {
    const { holdMembershipShirtInventory, assertMembershipShirtAvailable } = await import(
      '@/lib/membership-shirt'
    )
    const available = await assertMembershipShirtAvailable({
      productId: String(opts.shirtProductId ?? '').trim(),
      variantId: String(opts.shirtVariantId ?? '').trim(),
    })
    await holdMembershipShirtInventory({
      productId: available.productId,
      variantId: available.variantId,
      qty: 1,
    })
    shirtHeld = true
    shirtSku = available.sku
    opts.shirtDesign = opts.shirtDesign || available.design
    opts.shirtSize = opts.shirtSize || available.size
    opts.shirtProductId = available.productId
  }

  const entitlementsWithHold = buildMembershipEntitlements({
    tier,
    shirtSize: opts.shirtSize,
    shirtDesign: opts.shirtDesign,
    shirtProductId: opts.shirtProductId,
    shirtVariantId: opts.shirtVariantId,
    shirtSku,
    shirtHeld,
    physicalPerk: opts.physicalPerk,
    coveCreditDollars: giftCardResult?.creditDollars || fullCredit,
    enrichmentCode,
  })
  // Mark cove credit fulfilled when Square load succeeded (or skipped because already applied)
  let entitlementsStored = entitlementsWithHold.map((e) =>
    e.kind === 'cove_credit' && giftCardResult?.status === 'failed'
      ? { ...e, status: 'pending' as const, notes: giftCardResult.error || e.notes }
      : e
  )
  // Board seat gift: complimentary Reef without SHMSREEF10 entitlement row.
  if (skipEnrichment) {
    entitlementsStored = entitlementsStored.filter((e) => e.kind !== 'enrichment_discount')
  }

  try {
    const existing = await client.items.query('Memberships').eq('email', email).find()
    const row = existing.items?.[0]
    const membershipPayload = {
      email,
      tier,
      expiresAt,
      status: 'active',
      shirtSize: String(opts.shirtSize ?? '').trim() || undefined,
      shirtDesign: String(opts.shirtDesign ?? '').trim() || undefined,
      shirtProductId: String(opts.shirtProductId ?? '').trim() || undefined,
      shirtVariantId: String(opts.shirtVariantId ?? '').trim() || undefined,
      entitlementsJson: JSON.stringify(entitlementsStored),
      // Empty string clears stale SHMSREEF10 on faculty upgrades/downgrades.
      enrichmentCode: enrichmentCode || '',
    }
    if (row?._id) {
      await client.items.update('Memberships', {
        ...row,
        ...membershipPayload,
      })
    } else {
      await client.items.insert('Memberships', membershipPayload)
    }
    membershipUpserted = true
  } catch {
    // Memberships collection may be missing or permissioned differently
  }

  // Reclassify Family Cove code: Lagoon/Tide end in 9 for refreshments; Reef does not.
  try {
    const { ensureCoveFamilyCode } = await import('@/lib/cove-family-code')
    await ensureCoveFamilyCode(email)
  } catch (err) {
    console.warn('ensureCoveFamilyCode after paid membership', err)
  }

  try {
    const { ensureAccountNumberForEmail } = await import(
      '@/lib/staff/membership-account-number'
    )
    await ensureAccountNumberForEmail(email)
  } catch (err) {
    console.warn('ensureAccountNumberForEmail after paid membership', err)
  }

  return {
    updatedStudentIds,
    membershipUpserted,
    giftCard: giftCardResult,
    entitlements: entitlementsStored,
    enrichmentCode,
    shirtHeld,
  }
}
