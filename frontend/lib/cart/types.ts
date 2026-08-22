/**
 * Visitor mini-cart lines. Persisted in localStorage so parents can leave and resume.
 */
export type CartLineKind = 'program' | 'product' | 'membership' | 'event' | 'donation'

export type CartLine = {
  id: string
  kind: CartLineKind
  title: string
  /** List price in dollars (pre-discount). */
  amount: number
  href?: string
  programId?: string
  addonProgramIds?: string[]
  studentId?: string
  productId?: string
  variantId?: string
  tier?: string
  eventId?: string
  quantity?: number
  amountCents?: number
  shirtSize?: string | null
  shirtDesign?: string | null
  shirtProductId?: string | null
  shirtVariantId?: string | null
  physicalPerk?: 'spirit_shirt' | 'magnet' | null
  addedAt: number
}

export type CartState = {
  lines: CartLine[]
  open: boolean
}

export const CART_STORAGE_KEY = 'shms_visitor_cart_v1'
