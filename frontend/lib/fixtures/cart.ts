import type { CartLine } from '@/lib/cart/types'

/** Sample visitor cart for agents, Storybook, and synthetic staging. */
export const FIXTURE_CART_LINES: CartLine[] = [
  {
    id: 'fixture-line-membership',
    kind: 'membership',
    title: 'Lagoon membership',
    amount: 149,
    tier: 'lagoon',
    quantity: 1,
    addedAt: 1_700_000_000_000,
  },
  {
    id: 'fixture-line-program',
    kind: 'program',
    title: 'After-school art studio',
    amount: 85,
    programId: 'fixture-prog-art',
    studentId: 'fixture-stu-1',
    quantity: 1,
    addedAt: 1_700_000_001_000,
  },
  {
    id: 'fixture-line-product',
    kind: 'product',
    title: 'Stingray spirit shirt',
    amount: 22,
    productId: 'fixture-prod-shirt',
    variantId: 'fixture-var-m',
    shirtSize: 'M',
    quantity: 1,
    addedAt: 1_700_000_002_000,
  },
]

export const FIXTURE_CART_STATE = {
  lines: FIXTURE_CART_LINES,
  open: false,
}
