/**
 * THROWAWAY sandbox verification — mirrors frontend/lib/square.ts flow.
 * Run: cd frontend && node --env-file=.env.local scripts/sandbox-payment-loop.mjs
 * Safe: Square sandbox only (fake money). Refuses to run against production.
 */
import { SquareClient, SquareEnvironment } from 'square'
import { randomUUID } from 'node:crypto'

const ENV = process.env.SQUARE_ENVIRONMENT
if (ENV === 'production') {
  console.error('REFUSING TO RUN: SQUARE_ENVIRONMENT=production. Sandbox only.')
  process.exit(1)
}
const LOCATION_ID = process.env.SQUARE_LOCATION_ID
const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox,
})

const dollars = (cents) => `$${(Number(cents) / 100).toFixed(2)}`
const storeCardLoadCents = (payCents, bonusPercent) =>
  bonusPercent <= 0 ? payCents : Math.round(payCents * (1 + bonusPercent / 100))

async function balanceByGan(gan) {
  const r = await client.giftCards.getFromGan({ gan })
  return Number(r.giftCard?.balanceMoney?.amount ?? 0)
}

async function main() {
  console.log(`\n=== Square SANDBOX payment loop (location ${LOCATION_ID}) ===\n`)

  // 1) Create DIGITAL gift card (membership provisioning path)
  const idem = randomUUID()
  const created = await client.giftCards.create({
    idempotencyKey: `${idem}-create`,
    locationId: LOCATION_ID,
    giftCard: { type: 'DIGITAL' },
  })
  const gan = created.giftCard?.gan
  const giftCardId = created.giftCard?.id
  console.log(`1. Created gift card  GAN=${gan}  id=${giftCardId}  state=${created.giftCard?.state}`)

  // 2) ACTIVATE with membership credit ($20) + 10% limited-time bonus => $22
  const baseCredit = 2000
  const bonusPercent = 10
  const loadCents = storeCardLoadCents(baseCredit, bonusPercent)
  await client.giftCards.activities.create({
    idempotencyKey: `${idem}-activate`,
    giftCardActivity: {
      type: 'ACTIVATE',
      locationId: LOCATION_ID,
      giftCardId,
      activateActivityDetails: {
        amountMoney: { amount: BigInt(loadCents), currency: 'USD' },
        buyerPaymentInstrumentIds: ['membership-provision'],
        referenceId: `${idem}-membership`,
      },
    },
  })
  let bal = await balanceByGan(gan)
  console.log(`2. Membership provision: base ${dollars(baseCredit)} + ${bonusPercent}% => loaded ${dollars(loadCents)}  | balance=${dollars(bal)}  ${bal === loadCents ? 'OK' : 'MISMATCH'}`)

  // 3) Redeem $5 at the Cove register
  const redeemCents = 500
  await client.giftCards.activities.create({
    idempotencyKey: `${idem}-redeem`,
    giftCardActivity: {
      type: 'REDEEM',
      locationId: LOCATION_ID,
      giftCardId,
      redeemActivityDetails: {
        amountMoney: { amount: BigInt(redeemCents), currency: 'USD' },
        referenceId: `${idem}-register`,
      },
    },
  })
  bal = await balanceByGan(gan)
  const expectAfterRedeem = loadCents - redeemCents
  console.log(`3. Register redeem ${dollars(redeemCents)}  | balance=${dollars(bal)}  expect ${dollars(expectAfterRedeem)}  ${bal === expectAfterRedeem ? 'OK' : 'MISMATCH'}`)

  // 4) Parent refill $40 (1:1, no bonus on reload)
  const refillCents = 4000
  await client.giftCards.activities.create({
    idempotencyKey: `${idem}-reload`,
    giftCardActivity: {
      type: 'LOAD',
      locationId: LOCATION_ID,
      giftCardId,
      loadActivityDetails: {
        amountMoney: { amount: BigInt(refillCents), currency: 'USD' },
        buyerPaymentInstrumentIds: ['parent-refill-payment'],
        referenceId: `${idem}-refill`,
      },
    },
  })
  bal = await balanceByGan(gan)
  const expectAfterRefill = expectAfterRedeem + refillCents
  console.log(`4. Parent refill ${dollars(refillCents)} (1:1)  | balance=${dollars(bal)}  expect ${dollars(expectAfterRefill)}  ${bal === expectAfterRefill ? 'OK' : 'MISMATCH'}`)

  // 5) Ledger
  const acts = await client.giftCards.activities.list({ giftCardId, locationId: LOCATION_ID })
  const ledger = acts.data ?? acts.giftCardActivities ?? []
  console.log(`\n5. Activity ledger (${ledger.length} entries):`)
  for (const a of ledger) {
    console.log(`   - ${a.type.padEnd(9)} bal=${dollars(a.giftCardBalanceMoney?.amount ?? 0)}  ${a.createdAt}`)
  }

  const pass = bal === expectAfterRefill
  console.log(`\n=== ${pass ? 'PASS' : 'FAIL'} — final balance ${dollars(bal)} ===\n`)
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error('ERROR:', e?.body ?? e?.message ?? e)
  process.exit(1)
})
