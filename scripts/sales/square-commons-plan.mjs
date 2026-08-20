#!/usr/bin/env node
/**
 * Create Auraflux Square Catalog subscription plan + $399/mo variation for Commons.
 *
 * Env (Auraflux Square seller only. Never Stone Hill):
 *   SQUARE_ACCESS_TOKEN
 *   SQUARE_ENVIRONMENT=production|sandbox
 *
 * Prints SQUARE_COMMONS_PLAN_VARIATION_ID for Vercel commons-site.
 */
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../commons-site/package.json'))
const { SquareClient, SquareEnvironment } = require('square')

const token = process.env.SQUARE_ACCESS_TOKEN?.trim()
if (!token) {
  console.error('Set SQUARE_ACCESS_TOKEN (Auraflux seller)')
  process.exit(1)
}
const label = (process.env.SQUARE_SELLER_LABEL || '').toLowerCase()
if (label.includes('stone') || label.includes('shms')) {
  console.error('Refusing Stone Hill / SHMS Square. Use Auraflux.')
  process.exit(1)
}

const client = new SquareClient({
  token,
  environment:
    process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase() === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
})

async function main() {
  const planId = `#commons-plan-${randomUUID()}`
  const variationId = `#commons-plan-var-${randomUUID()}`

  const plan = await client.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'SUBSCRIPTION_PLAN',
      id: planId,
      subscriptionPlanData: {
        name: 'Commons PTO OS',
        allItems: true,
      },
    },
  })
  const realPlanId = plan.catalogObject?.id
  if (!realPlanId) throw new Error('No plan id returned')

  const variation = await client.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'SUBSCRIPTION_PLAN_VARIATION',
      id: variationId,
      subscriptionPlanVariationData: {
        name: 'Commons monthly',
        subscriptionPlanId: realPlanId,
        phases: [
          {
            cadence: 'MONTHLY',
            recurringPriceMoney: {
              amount: BigInt(39900),
              currency: 'USD',
            },
          },
        ],
      },
    },
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        planId: realPlanId,
        planVariationId: variation.catalogObject?.id,
        envNote: 'Set SQUARE_COMMONS_PLAN_VARIATION_ID on Vercel project commons-site',
      },
      (_, v) => (typeof v === 'bigint' ? v.toString() : v),
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
