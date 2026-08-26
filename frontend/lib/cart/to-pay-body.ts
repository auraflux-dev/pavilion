/**
 * Map visitor cart lines → PortalCardCheckout /api/checkout/pay body.
 */
import type { CartLine } from '@/lib/cart/types'
import type { PortalPayBody } from '@/components/checkout/portal-card-checkout'

export type CartPayLine = Exclude<PortalPayBody, { kind: 'cart' }>

export function cartLineToPayBody(line: CartLine): CartPayLine | null {
  if (line.kind === 'program' && line.programId) {
    const sid = String(line.studentId ?? '').trim()
    if (!sid) return null
    return {
      kind: 'program',
      programId: line.programId,
      studentId: sid,
      addonProgramIds: line.addonProgramIds,
    }
  }
  if (line.kind === 'product' && line.productId) {
    return {
      kind: 'product',
      productId: line.productId,
      variantId: line.variantId,
    }
  }
  if (line.kind === 'membership' && line.tier) {
    return {
      kind: 'membership',
      tier: line.tier,
      studentId: line.studentId || null,
      shirtSize: line.shirtSize,
      shirtDesign: line.shirtDesign,
      shirtProductId: line.shirtProductId,
      shirtVariantId: line.shirtVariantId,
      physicalPerk: line.physicalPerk,
    }
  }
  if (line.kind === 'event' && line.eventId) {
    return {
      kind: 'event',
      eventId: line.eventId,
      quantity: Math.max(1, Number(line.quantity ?? 1) || 1),
    }
  }
  if (line.kind === 'donation' && line.amountCents) {
    return {
      kind: 'donation',
      amountCents: line.amountCents,
      note: line.note,
    }
  }
  if (line.kind === 'store-card' && line.studentId && line.amountCents) {
    return {
      kind: 'store-card',
      studentId: line.studentId,
      amountCents: line.amountCents,
    }
  }
  return null
}

/** Build `{ kind: 'cart', cartLines }` or null when nothing is payable. */
export function cartLinesToPayBody(
  lines: CartLine[],
): Extract<PortalPayBody, { kind: 'cart' }> | null {
  const cartLines: CartPayLine[] = []
  for (const line of lines) {
    const body = cartLineToPayBody(line)
    if (body) cartLines.push(body)
  }
  if (cartLines.length === 0) return null
  return { kind: 'cart', cartLines }
}
