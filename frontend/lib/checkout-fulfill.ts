/**
 * Shared quote + post-payment fulfillment for Square and PayPal.
 */
import { getCatalogConfig, isAllowedStoreCardLoadAmount } from '@/lib/api/catalog-config'
import { getPaidMembershipTiers } from '@/lib/api/membership'
import { fetchCatalogProductPrice } from '@/lib/catalog-price'
import { applyPaidMembership } from '@/lib/membership-sync'
import { getSiteSettings } from '@/lib/api/site-settings'
import {
  listFamilyStudents,
  resolveFamilyGiftCard,
  syncFamilyStoreCard,
} from '@/lib/family-store-card'
import { getWixClient } from '@/lib/wix-client'
import { createOrLoadStudentGiftCard, loadGiftCard } from '@/lib/square'
import {
  getStoreCardBonusPercent,
  resolveParentLoadBonusPercent,
  storeCardLoadCents,
} from '@/lib/store-card-bonus'

export type CheckoutKind = 'membership' | 'product' | 'store-card'

export type CheckoutIntent = {
  kind: CheckoutKind
  tier?: string
  studentId?: string | null
  productId?: string
  amountCents?: number
}

export type ResolvedCheckout = {
  kind: CheckoutKind
  amount: number
  amountCents: number
  description: string
  customId: string
  /** Extra fields needed at fulfill time */
  meta: Record<string, string>
}

type StudentRow = {
  _id: string
  firstName?: string
  lastName?: string
  parentEmail?: string
  squareGiftCardGan?: string
  archived?: boolean
}

export async function resolveCheckoutIntent(
  intent: CheckoutIntent,
  parentEmail: string
): Promise<ResolvedCheckout> {
  const kind = intent.kind

  if (kind === 'membership') {
    const tier = String(intent.tier ?? '').trim().toLowerCase()
    const tiers = await getPaidMembershipTiers()
    const match = tiers.find((t) => t.tierId === tier && t.active)
    if (!match || match.price <= 0) throw new Error('Unknown membership tier')
    return {
      kind,
      amount: match.price,
      amountCents: Math.round(match.price * 100),
      description: `SHMS PTO membership — ${match.name}`,
      customId: `membership:${tier}`,
      meta: {
        tier,
        tierName: match.name,
        studentId: intent.studentId ? String(intent.studentId) : '',
      },
    }
  }

  if (kind === 'product') {
    const productId = String(intent.productId ?? '').trim()
    const cfg = await getCatalogConfig()
    const allowed = new Set([...cfg.spiritWearProductIds, ...cfg.storeProductIds])
    if (!productId || !allowed.has(productId)) {
      throw new Error('Product not available for checkout')
    }
    const catalog = await fetchCatalogProductPrice(productId)
    if (!catalog || catalog.price < 1) throw new Error('Could not resolve product price')
    return {
      kind,
      amount: catalog.price,
      amountCents: Math.round(catalog.price * 100),
      description: `The Cove — ${catalog.name}`,
      customId: `cove:${productId.slice(0, 40)}`,
      meta: { productId, productName: catalog.name },
    }
  }

  const studentId = String(intent.studentId ?? '').trim()
  const amountCents = Number(intent.amountCents)
  const amount = amountCents / 100
  const cfg = await getCatalogConfig()
  if (!Number.isInteger(amountCents) || !isAllowedStoreCardLoadAmount(amount, cfg)) {
    throw new Error(
      `Invalid amount (use whole dollars $${cfg.storeCardMinAmount}–$${cfg.storeCardMaxAmount})`
    )
  }
  const family = await listFamilyStudents(parentEmail)
  if (family.length === 0) {
    throw new Error('Add a student before loading the family Cove card.')
  }
  const student = (studentId ? family.find((s) => s._id === studentId) : undefined) ?? family[0]
  if (!student?._id) {
    throw new Error('Student not found')
  }
  const familyCard = resolveFamilyGiftCard(family)
  return {
    kind: 'store-card',
    amount,
    amountCents,
    description: 'Family Cove card load',
    customId: `store-card:${parentEmail}`,
    meta: {
      studentId: student._id,
      gan: familyCard.gan,
      giftCardId: familyCard.giftCardId,
      parentEmail,
      studentLabel: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
    },
  }
}

export async function fulfillPaidCheckout(opts: {
  resolved: ResolvedCheckout
  parentEmail: string
  parentName: string
  transactionId: string
  paymentMethod: string
  sourcePrefix: 'square' | 'paypal'
}): Promise<Record<string, unknown>> {
  const { resolved, parentEmail, parentName, transactionId, paymentMethod, sourcePrefix } = opts
  const client = getWixClient()

  if (resolved.kind === 'membership') {
    const tier = resolved.meta.tier
    const studentId = resolved.meta.studentId || null
    const applied = await applyPaidMembership({
      parentEmail,
      tier,
      studentId,
      orderId: transactionId,
      parentName: parentName || null,
    })
    await client.items.insert('Payments', {
      programName: `Membership — ${resolved.meta.tierName}`,
      amount: resolved.amount,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_membership`,
      parentEmail,
    })
    return { kind: 'membership', tier, applied, paymentId: transactionId }
  }

  if (resolved.kind === 'product') {
    await client.items.insert('Payments', {
      programName: `The Cove — ${resolved.meta.productName}`,
      amount: resolved.amount,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_cove_product`,
      parentEmail,
      notes: resolved.meta.productId,
    })
    return {
      kind: 'product',
      productId: resolved.meta.productId,
      productName: resolved.meta.productName,
      amount: resolved.amount,
      paymentId: transactionId,
    }
  }

  const studentId = resolved.meta.studentId
  const parentEmailForCard = resolved.meta.parentEmail || parentEmail
  try {
    const settings = await getSiteSettings()
    const configuredBonus = getStoreCardBonusPercent(settings.get('storeCardBonusPercent', '10'))
    const bonusPercent = await resolveParentLoadBonusPercent(parentEmailForCard, configuredBonus)
    const loadCents = storeCardLoadCents(resolved.amountCents, bonusPercent)
    const isFirstLoad = bonusPercent > 0

    const family = await listFamilyStudents(parentEmailForCard)
    const familyCard = resolveFamilyGiftCard(family)
    let gan = String(resolved.meta.gan || familyCard.gan || '').trim()
    let giftCardId = String(resolved.meta.giftCardId || familyCard.giftCardId || '').trim()
    let activity: Awaited<ReturnType<typeof loadGiftCard>> | null = null
    let newBalance: number | null = null

    if (!gan) {
      const card = await createOrLoadStudentGiftCard({
        amountCents: loadCents,
        idempotencyKey: `first-load-${transactionId}`.slice(0, 45),
        buyerPaymentInstrumentIds: [transactionId],
      })
      gan = card.gan
      giftCardId = card.giftCardId
      newBalance = loadCents / 100
    } else {
      activity = await loadGiftCard(gan, loadCents, `reload-${transactionId}`.slice(0, 45), [transactionId])
      newBalance = activity?.giftCardBalanceMoney
        ? Number(activity.giftCardBalanceMoney.amount) / 100
        : familyCard.balance + loadCents / 100
    }

    await syncFamilyStoreCard({
      parentEmail: parentEmailForCard,
      gan,
      giftCardId,
      balanceDollars: newBalance ?? loadCents / 100,
    })

    await client.items.insert('Payments', {
      studentId,
      parentEmail: parentEmailForCard,
      programName: isFirstLoad
        ? `Family Cove Card First Load (+${bonusPercent}% bonus)`
        : 'Family Cove Card Reload',
      amount: resolved.amount,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_store_card_reload`,
      notes:
        bonusPercent > 0
          ? `Paid $${resolved.amount}; loaded $${(loadCents / 100).toFixed(2)} (+${bonusPercent}%) on family card`
          : 'Family Cove card load',
    })
    return {
      kind: 'store-card',
      paymentId: transactionId,
      bonusPercent,
      loadedCents: loadCents,
      newBalance,
    }
  } catch (loadError) {
    await client.items.insert('Payments', {
      studentId,
      programName: 'Store Card Reload',
      amount: resolved.amount,
      status: 'Needs Reconciliation',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_store_card_reload_load_failed`,
    })
    console.error('Payment completed but gift card load failed:', loadError)
    const err = new Error(
      'Payment completed, but the balance update needs PTO review. Do not retry this charge.'
    ) as Error & { paymentId?: string; status?: number }
    err.paymentId = transactionId
    err.status = 502
    throw err
  }
}
