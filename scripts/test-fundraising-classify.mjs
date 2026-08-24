/**
 * Pure fundraising classifier checks (no CMS / env).
 * Run: cd frontend && npx tsx ../scripts/test-fundraising-classify.mjs
 */
import assert from 'node:assert/strict'
import {
  classifyFundraisingPayment,
  mapBankSyncKeyForFundraising,
  FUNDRAISING_LEDGER_ONLY_BANK_KEYS,
} from '../frontend/lib/api/fundraising-classify.ts'
import { classifyBankTransaction } from '../frontend/lib/staff/plaid-classify.ts'

function ok(label) {
  console.log(`  ok  ${label}`)
}

// Membership bundled Cove credit
assert.equal(
  classifyFundraisingPayment('membership_gift_card', 'Family Cove credit', 'Completed', 'Square'),
  null,
)
ok('membership_gift_card excluded')

// Membership dues count
assert.equal(
  classifyFundraisingPayment('membership', 'Reef Membership', 'Completed', 'Square'),
  'membership',
)
ok('membership dues count')

// Parent load / reload count
assert.equal(
  classifyFundraisingPayment('square_store_card_reload', 'Family Cove Digital Card Reload', 'Completed', 'Square'),
  'store',
)
assert.equal(
  classifyFundraisingPayment('store_card_first_load', 'Family Cove Digital Card First Load', 'Completed', 'Square'),
  'store',
)
ok('parent Cove loads/reloads count')

// Cove card spend excluded; cash POS counts
assert.equal(
  classifyFundraisingPayment('cove_register_redeem', 'The Cove: snack', 'Completed', 'Cove family'),
  null,
)
assert.equal(
  classifyFundraisingPayment('cove_register_cash', 'The Cove: snack', 'Completed', 'Cash'),
  'spiritWear',
)
assert.equal(
  classifyFundraisingPayment('cove_register_stand', 'The Cove: candy', 'Completed', 'Square Stand'),
  'spiritWear',
)
ok('POS: Cove tender excluded; cash/stand count')

// Bank ledger-only keys
for (const key of ['cash_box_deposits', 'card_payouts', 'cove_pos']) {
  assert.equal(mapBankSyncKeyForFundraising(key), null)
  assert.ok(FUNDRAISING_LEDGER_ONLY_BANK_KEYS.has(key))
}
ok('bank ledger-only keys skip fundraising')

assert.equal(mapBankSyncKeyForFundraising('cove_loads'), 'store')
assert.equal(mapBankSyncKeyForFundraising('gifts'), 'other')
ok('other bank income keys still map')

// Counter Credit → cash_box_deposits (Plaid sign: negative = inflow)
const counter = classifyBankTransaction({
  name: 'Counter Credit',
  amount: -85.5,
})
assert.deepEqual(counter, { syncKey: 'cash_box_deposits', amount: 85.5, kind: 'income' })
ok('Counter Credit → cash_box_deposits')

const mobile = classifyBankTransaction({
  name: 'BKOFAMERICA MOBILE DEPOSIT 123',
  amount: -40,
})
assert.equal(mobile?.syncKey, 'cash_box_deposits')
ok('mobile deposit → cash_box_deposits')

console.log('\nAll fundraising classify checks passed.')
