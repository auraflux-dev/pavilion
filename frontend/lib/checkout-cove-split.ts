/**
 * Live Cove Digital Card split on a resolved product quote.
 */
import { getGiftCardBalance } from '@/lib/square'
import { listFamilyStudents, resolveFamilyGiftCard } from '@/lib/family-store-card'
import { splitCoveAndCard } from '@/lib/checkout-split-tender'
import type { ResolvedCheckout } from '@/lib/checkout-fulfill'

export async function withCoveSplit(
  resolved: ResolvedCheckout,
  parentEmail: string,
  useCove: boolean,
): Promise<ResolvedCheckout> {
  if (resolved.kind !== 'product') {
    return resolved
  }

  const family = await listFamilyStudents(parentEmail)
  const card = resolveFamilyGiftCard(family)
  const live = card.gan ? await getGiftCardBalance(card.gan) : 0

  if (!useCove) {
    return {
      ...resolved,
      meta: {
        ...resolved.meta,
        coveCents: '0',
        cardCents: String(resolved.amountCents),
        gan: '',
        coveBalance: String(live),
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
    },
  }
}
