/**
 * Live Cove Digital Card split on a resolved checkout quote.
 * Opt-in only (never assume). Store-card loads cannot use Cove to pay themselves.
 */
import { getGiftCardBalance } from '@/lib/square'
import { listFamilyStudents, resolveFamilyGiftCard } from '@/lib/family-store-card'
import { splitCoveAndCard } from '@/lib/checkout-split-tender'
import type { ResolvedCheckout } from '@/lib/checkout-fulfill'

const COVE_SPLIT_KINDS = new Set([
  'product',
  'membership',
  'program',
  'event',
  'donation',
  'cart',
])

export function checkoutAllowsCoveSplit(kind: string): boolean {
  return COVE_SPLIT_KINDS.has(String(kind ?? '').trim().toLowerCase())
}

/** Explicit opt-in. Missing or false means do not apply Cove. */
export function wantsCoveBalance(raw: unknown): boolean {
  return raw === true || raw === 'true' || raw === 1 || raw === '1'
}

export async function withCoveSplit(
  resolved: ResolvedCheckout,
  parentEmail: string,
  useCove: boolean,
): Promise<ResolvedCheckout> {
  if (!checkoutAllowsCoveSplit(resolved.kind)) {
    return resolved
  }

  // Co-parents share the primary household Cove card (same as portal / family-code).
  const { resolvePrimaryParentEmail } = await import('@/lib/family-guardians')
  const householdEmail = await resolvePrimaryParentEmail(parentEmail)

  const family = await listFamilyStudents(householdEmail)
  const card = resolveFamilyGiftCard(family)
  let live = Number(card.balance) || 0
  if (card.gan) {
    try {
      live = await getGiftCardBalance(card.gan)
    } catch {
      // Keep CMS balance so checkout still offers the opt-in.
    }
  }

  if (!useCove) {
    return {
      ...resolved,
      meta: {
        ...resolved.meta,
        coveCents: '0',
        cardCents: String(resolved.amountCents),
        gan: '',
        coveBalance: String(live),
        householdEmail,
      },
    }
  }

  if (!card.gan || live <= 0) {
    return {
      ...resolved,
      meta: {
        ...resolved.meta,
        coveCents: '0',
        cardCents: String(resolved.amountCents),
        gan: '',
        coveBalance: String(live),
        householdEmail,
      },
    }
  }

  const split = splitCoveAndCard({
    totalCents: resolved.amountCents,
    coveBalanceCents: Math.round(live * 100),
    useCove: true,
  })

  return {
    ...resolved,
    meta: {
      ...resolved.meta,
      coveCents: String(split.coveCents),
      cardCents: String(split.cardCents),
      gan: card.gan,
      giftCardId: card.giftCardId,
      coveBalance: live.toFixed(2),
      householdEmail,
    },
  }
}
