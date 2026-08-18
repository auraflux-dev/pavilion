/**
 * POS-only BTSN food-truck ticket (not on /cove or /spirit-wear).
 * Ring on Square Stand / phone POS; Cove QR or Card on File; then hand a ticket.
 * Lagoon/Tide (code ends in 9) stay free — do not ring this item.
 *
 *   node --env-file=frontend/.env.local scripts/setup-btsn-refreshment-ticket.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const require = createRequire(resolve(root, 'frontend/package.json'))
const { SquareClient, SquareEnvironment } = require('square')

function loadEnv() {
  const path = resolve(root, 'frontend/.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const ITEM = {
  name: 'BTSN food truck ticket',
  sku: 'POS-REFRESH',
  variationName: 'Ticket',
  priceCents: 600,
  qty: 80,
}

const siteId = process.env.WIX_SITE_ID
const apiKey = process.env.WIX_API_KEY
const token = process.env.SQUARE_ACCESS_TOKEN
const locationId = process.env.SQUARE_LOCATION_ID
if (!siteId || !apiKey || !token || !locationId) {
  console.error('Need WIX_SITE_ID, WIX_API_KEY, SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID')
  process.exit(1)
}

const WH = {
  Authorization: apiKey,
  'wix-site-id': siteId,
  'Content-Type': 'application/json',
}

const square = new SquareClient({
  token,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
})

async function wix(path, body, method = 'POST') {
  const res = await fetch(`https://www.wixapis.com${path}`, {
    method,
    headers: WH,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text.slice(0, 500)}`)
  return json
}

async function findWixProductBySku(sku) {
  const upper = sku.toUpperCase()
  let cursor
  for (let i = 0; i < 20; i++) {
    const res = await wix('/stores/v3/products/query', {
      query: { cursor, paging: { limit: 100 } },
    })
    for (const p of res.products || []) {
      for (const v of p.variantsInfo?.variants || []) {
        if (String(v.sku || '').toUpperCase() === upper) {
          return { product: p, variant: v }
        }
      }
    }
    cursor = res.metadata?.cursors?.next || res.pagingMetadata?.cursors?.next
    if (!cursor) break
  }
  return null
}

async function ensureWixProduct() {
  const existing = await findWixProductBySku(ITEM.sku)
  if (existing) {
    const productId = String(existing.product.id)
    const variantId = String(existing.variant.id)
    try {
      await wix(
        `/stores/v3/products/${productId}`,
        {
          product: {
            id: productId,
            revision: existing.product.revision,
            visible: false,
            name: ITEM.name,
            variantsInfo: {
              variants: [
                {
                  id: variantId,
                  sku: ITEM.sku,
                  price: { actualPrice: { amount: (ITEM.priceCents / 100).toFixed(2) } },
                },
              ],
            },
          },
        },
        'PATCH',
      )
    } catch (err) {
      console.warn('Wix price/hide patch', ITEM.sku, err.message)
    }
    return { productId, variantId, created: false }
  }

  const created = await wix('/stores/v3/products-with-inventory', {
    product: {
      name: ITEM.name,
      visible: false,
      visibleInPos: false,
      productType: 'PHYSICAL',
      physicalProperties: {},
      variantsInfo: {
        variants: [
          {
            sku: ITEM.sku,
            visible: true,
            price: { actualPrice: { amount: (ITEM.priceCents / 100).toFixed(2) } },
            inventoryItem: { quantity: ITEM.qty, trackQuantity: true },
          },
        ],
      },
    },
  })
  const product = created.product
  const variant = product.variantsInfo?.variants?.[0]
  if (!product?.id || !variant?.id) throw new Error(`Wix create incomplete for ${ITEM.sku}`)
  return { productId: String(product.id), variantId: String(variant.id), created: true }
}

async function upsertCoveInventory({ productId, variantId }) {
  const list = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'CoveInventory',
    query: { filter: { sku: { $eq: ITEM.sku } }, paging: { limit: 5 } },
  })
  const existing = (list.dataItems || [])[0]
  const fields = {
    productId,
    variantId,
    name: ITEM.name,
    sku: ITEM.sku,
    quantity: ITEM.qty,
    active: true,
  }
  if (existing?.id) {
    await wix(
      `/wix-data/v2/items/${existing.id}`,
      {
        dataCollectionId: 'CoveInventory',
        dataItem: { id: existing.id, data: { ...existing.data, ...fields } },
      },
      'PUT',
    )
    return existing.id
  }
  const inserted = await wix('/wix-data/v2/items', {
    dataCollectionId: 'CoveInventory',
    dataItem: { data: fields },
  })
  return inserted.dataItem?.id
}

async function listSquareItems() {
  const out = []
  let cursor
  do {
    const page = await square.catalog.list({ types: 'ITEM', cursor })
    out.push(...(page.data || page.objects || []))
    cursor = page.cursor
  } while (cursor)
  return out
}

async function ensureSquareItem() {
  const all = await listSquareItems()
  for (const obj of all) {
    const name = obj.itemData?.name || ''
    const variations = obj.itemData?.variations || []
    for (const v of variations) {
      const sku = String(v.itemVariationData?.sku || '').toUpperCase()
      if (sku === ITEM.sku || name.toLowerCase() === ITEM.name.toLowerCase()) {
        await square.catalog.object.upsert({
          idempotencyKey: randomUUID(),
          object: {
            type: 'ITEM',
            id: obj.id,
            version: obj.version,
            presentAtAllLocations: true,
            itemData: {
              name: ITEM.name,
              description:
                '$6 each. Reef/guests pay with Cove, cash, or card. Lagoon/Tide (code ends in 9) free — do not ring.',
              productType: 'REGULAR',
              variations: [
                {
                  type: 'ITEM_VARIATION',
                  id: v.id,
                  version: v.version,
                  presentAtAllLocations: true,
                  itemVariationData: {
                    itemId: obj.id,
                    name: ITEM.variationName,
                    sku: ITEM.sku,
                    pricingType: 'FIXED_PRICING',
                    priceMoney: { amount: BigInt(ITEM.priceCents), currency: 'USD' },
                    trackInventory: true,
                  },
                },
              ],
            },
          },
        })
        return { itemId: obj.id, variationId: v.id, created: false, updated: true }
      }
    }
  }

  const itemId = `#pos_item_${ITEM.sku}`
  const varId = `#pos_var_${ITEM.sku}`
  const upsert = await square.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'ITEM',
      id: itemId,
      presentAtAllLocations: true,
      itemData: {
        name: ITEM.name,
        description:
          '$6 each. Reef/guests pay with Cove, cash, or card. Lagoon/Tide (code ends in 9) free — do not ring.',
        productType: 'REGULAR',
        variations: [
          {
            type: 'ITEM_VARIATION',
            id: varId,
            presentAtAllLocations: true,
            itemVariationData: {
              itemId,
              name: ITEM.variationName,
              sku: ITEM.sku,
              pricingType: 'FIXED_PRICING',
              priceMoney: { amount: BigInt(ITEM.priceCents), currency: 'USD' },
              trackInventory: true,
            },
          },
        ],
      },
    },
  })

  const created = upsert.catalogObject || upsert.object
  const maps = upsert.idMappings || []
  const itemMap = maps.find((m) => String(m.clientObjectId || '').includes(`pos_item_${ITEM.sku}`))
  const varMap = maps.find((m) => String(m.clientObjectId || '').includes(`pos_var_${ITEM.sku}`))
  return {
    itemId: created?.id || itemMap?.objectId,
    variationId: created?.itemData?.variations?.[0]?.id || varMap?.objectId,
    created: true,
  }
}

async function setSquareInventory(variationId, quantity) {
  await square.inventory.batchCreateChanges({
    idempotencyKey: randomUUID(),
    changes: [
      {
        type: 'PHYSICAL_COUNT',
        physicalCount: {
          catalogObjectId: variationId,
          locationId,
          quantity: String(quantity),
          state: 'IN_STOCK',
          occurredAt: new Date().toISOString(),
        },
      },
    ],
  })
}

async function main() {
  console.log(`BTSN ticket $${(ITEM.priceCents / 100).toFixed(2)} sku=${ITEM.sku} qty=${ITEM.qty}`)
  const wixProd = await ensureWixProduct()
  await upsertCoveInventory(wixProd)
  const sq = await ensureSquareItem()
  if (sq.variationId) {
    try {
      await setSquareInventory(sq.variationId, ITEM.qty)
    } catch (err) {
      console.warn('Square inventory set failed', err.message || err)
    }
  }
  console.log(
    JSON.stringify(
      {
        name: ITEM.name,
        sku: ITEM.sku,
        price: ITEM.priceCents / 100,
        qty: ITEM.qty,
        wixProductId: wixProd.productId,
        wixVariantId: wixProd.variantId,
        squareItemId: sq.itemId,
        squareVariationId: sq.variationId,
        onPublicSite: false,
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
