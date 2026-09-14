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

  // Household truth starts at Memberships.accountNumber (A#####).
  let accountNumber = ''
  let family: Awaited<ReturnType<typeof listFamilyStudents>> = []
  try {
    const { resolveHousehold } = await import('@/lib/staff/membership-account-number')
    const household = await resolveHousehold({ email: parentEmail })
    accountNumber = household.accountNumber
    family = household.students as typeof family
  } catch {
    family = await listFamilyStudents(parentEmail)
  }

  const card = resolveFamilyGiftCard(family)
  // Tender math must use live Square balance only. CMS storeCardBalance can be
  // stale while the GAN is dead — that charged the card, then redeem failed and
  // auto-refunded (parents saw “refunds” with no enrollment).
  let live = 0
  let squareBalanceOk = false
  if (card.gan) {
    try {
      live = await getGiftCardBalance(card.gan)
      squareBalanceOk = true
    } catch {
      if (useCove) {
        throw new Error(
          'Your Cove Digital Card could not be verified. Uncheck “Use Cove balance” and pay by card, or contact treasurer@shmspto.org to relink the card.',
        )
      }
      live = 0
    }
  }

  const displayBalance = squareBalanceOk ? live : Number(card.balance) || 0
  const baseMeta = {
    ...resolved.meta,
    coveBalance: String(displayBalance),
    accountNumber,
  }

  if (!useCove) {
    return {
      ...resolved,
      meta: {
        ...baseMeta,
        coveCents: '0',
        cardCents: String(resolved.amountCents),
        gan: '',
      },
    }
  }

  if (!card.gan || !squareBalanceOk || live <= 0) {
    return {
      ...resolved,
      meta: {
        ...baseMeta,
        coveCents: '0',
        cardCents: String(resolved.amountCents),
        gan: '',
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
      ...baseMeta,
      coveCents: String(split.coveCents),
      cardCents: String(split.cardCents),
      gan: card.gan,
      giftCardId: card.giftCardId,
      coveBalance: live.toFixed(2),
    },
  }
}
