/** Checkout quote/pay fixtures for synthetic staging and agent work. */

export const FIXTURE_MEMBERSHIP_QUOTE = {
  kind: 'membership',
  tier: 'lagoon',
  name: 'Lagoon membership',
  amount: 149,
  listPrice: 149,
  isUpgrade: false,
  currentTier: 'free',
  synthetic: true,
}

export const FIXTURE_PRODUCT_QUOTE = {
  kind: 'product',
  name: 'Stingray spirit shirt',
  amount: 22,
  quantity: 1,
  synthetic: true,
}

export const FIXTURE_PROGRAM_QUOTE = {
  kind: 'program',
  name: 'After-school art studio',
  amount: 85,
  studentName: 'Alex Example',
  synthetic: true,
}

export const FIXTURE_CHECKOUT_PAY_BLOCKED = {
  ok: false,
  synthetic: true,
  error:
    'Synthetic staging. Card charges are off here. Use production or Square sandbox loadtest for live payment tests.',
}
