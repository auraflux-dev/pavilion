#!/usr/bin/env node
/**
 * Create Auraflux Stripe Product + $399/mo Price for Commons SaaS.
 *
 * Env:
 *   STRIPE_SECRET_KEY (Auraflux Stripe account)
 *
 * Prints STRIPE_PRICE_ID for Vercel commons-site.
 * School parent payments stay on each school's Square. Not this key.
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../commons-site/package.json'))
const Stripe = require('stripe')

const key = process.env.STRIPE_SECRET_KEY?.trim()
if (!key) {
  console.error('Set STRIPE_SECRET_KEY (Auraflux)')
  process.exit(1)
}

const stripe = new Stripe(key)

async function main() {
  const product = await stripe.products.create({
    name: 'Commons PTO OS',
    description: 'Public site, family portal, and staff portal. $399 per school per month.',
    metadata: { product: 'commons' },
  })

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 39900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { product: 'commons' },
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        productId: product.id,
        priceId: price.id,
        envNote: 'Set STRIPE_PRICE_ID on Vercel project commons-site',
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
