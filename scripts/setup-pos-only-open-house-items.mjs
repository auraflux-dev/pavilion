/**
 * Create POS-only Hats + Vintage ($5) in Square + hidden Wix + CoveInventory.
 * NOT added to storeProductIds / spiritWearProductIds (stay off /cove and /spirit-wear).
 *
 *   node --env-file=frontend/.env.local scripts/setup-pos-only-open-house-items.mjs
 *   node --env-file=frontend/.env.local scripts/setup-pos-only-open-house-items.mjs --qty=40
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

const qtyArg = process.argv.find((a) => a.startsWith('--qty='))
const START_QTY = Math.max(0, parseInt(qtyArg?.split('=')[1] || '50', 10) || 50)

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

/** POS-only open-house style items — keep off public site allowlists. */
const ITEMS = [
  { name: 'Hats', sku: 'POS-HAT', priceCents: 500, price: START_QTY },
  { name: 'Vintage item', sku: 'POS-VINTAGE', priceCents: 500, qty: START_QTY },
]

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
  // Search products list (paginated lightly)
  let cursor
  for (let i = 0; i < 20; i++) {
    const q = {
      query: {
        cursor,
        paging: { limit: 100 },
      },
    }
    const res = await wix('/stores/v3/products/query', q)
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

async function ensureWixProduct(item) {
  const existing = await findWixProductBySku(item.sku)
  if (existing) {
    const productId = String(existing.product.id)
    const variantId = String(existing.variant.id)
    // Keep hidden from storefront
    try {
      await wix(
        `/stores/v3/products/${productId}`,
        {
          product: {
            id: productId,
            revision: existing.product.revision,
            visible: false,
            name: item.name,
          },
        },
        'PATCH',
      )
    } catch (err) {
      console.warn('Wix hide patch', item.sku, err.message)
    }
    return { productId, variantId, created: false }
  }

  const created = await wix('/stores/v3/products-with-inventory', {
    product: {
      name: item.name,
      visible: false,
      visibleInPos: false,
      productType: 'PHYSICAL',
      physicalProperties: {},
      variantsInfo: {
        variants: [
          {
            sku: item.sku,
            visible: true,
            price: { actualPrice: { amount: (item.priceCents / 100).toFixed(2) } },
            inventoryItem: { quantity: item.qty, trackQuantity: true },
          },
        ],
      },
    },
  })
  const product = created.product
  const variant = product.variantsInfo?.variants?.[0]
  if (!product?.id || !variant?.id) throw new Error(`Wix create incomplete for ${item.sku}`)
  return { productId: String(product.id), variantId: String(variant.id), created: true }
}

async function upsertCoveInventory({ productId, variantId, name, sku, quantity }) {
  const clientMod = await import(resolve(root, 'frontend/node_modules/@wix/sdk/index.js')).catch(() => null)
  // Use REST for CMS
  const list = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'CoveInventory',
    query: {
      filter: { sku: { $eq: sku } },
      paging: { limit: 5 },
    },
  })
  const existing = (list.dataItems || [])[0]
  const fields = {
    productId,
    variantId,
    name,
    sku,
    quantity,
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
    const page = await square.catalog.search({
      objectTypes: ['ITEM'],
      cursor,
      limit: 100,
    })
    out.push(...(page.objects || []))
    cursor = page.cursor
  } while (cursor)
  return out
}

async function ensureSquareItem(item) {
  const all = await listSquareItems()
  for (const obj of all) {
    const name = obj.itemData?.name || obj.item_data?.name || ''
    const variations = obj.itemData?.variations || obj.item_data?.variations || []
    for (const v of variations) {
      const sku = (v.itemVariationData?.sku || v.item_variation_data?.sku || '').toUpperCase()
      if (sku === item.sku || name.toLowerCase() === item.name.toLowerCase()) {
        return {
          itemId: obj.id,
          variationId: v.id,
          created: false,
        }
      }
    }
  }

  const itemId = `#pos_item_${item.sku}`
  const varId = `#pos_var_${item.sku}`
  const upsert = await square.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'ITEM',
      id: itemId,
      presentAtAllLocations: true,
      itemData: {
        name: item.name,
        productType: 'REGULAR',
        variations: [
          {
            type: 'ITEM_VARIATION',
            id: varId,
            presentAtAllLocations: true,
            itemVariationData: {
              itemId,
              name: 'Regular',
              sku: item.sku,
              pricingType: 'FIXED_PRICING',
              priceMoney: { amount: BigInt(item.priceCents), currency: 'USD' },
              trackInventory: true,
            },
          },
        ],
      },
    },
  })

  const created = upsert.catalogObject || upsert.object
  const variation =
    created?.itemData?.variations?.[0] ||
    (upsert.idMappings || []).find((m) => String(m.clientObjectId || '').includes('var'))

  const realItemId = created?.id
  const realVarId =
    created?.itemData?.variations?.[0]?.id ||
    (upsert.idMappings || []).find((m) => String(m.clientObjectId).includes(`pos_var_${item.sku}`))
      ?.objectId

  if (!realItemId || !realVarId) {
    // fallback from idMappings
    const maps = upsert.idMappings || []
    const itemMap = maps.find((m) => String(m.clientObjectId).includes(`pos_item_${item.sku}`))
    const varMap = maps.find((m) => String(m.clientObjectId).includes(`pos_var_${item.sku}`))
    return {
      itemId: itemMap?.objectId || realItemId,
      variationId: varMap?.objectId || realVarId,
      created: true,
    }
  }

  return { itemId: realItemId, variationId: realVarId, created: true }
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
  console.log(`Creating POS-only items at $${(500 / 100).toFixed(2)} each, qty=${START_QTY}`)
  const results = []
  for (const item of ITEMS) {
    const wixProd = await ensureWixProduct(item)
    await upsertCoveInventory({
      productId: wixProd.productId,
      variantId: wixProd.variantId,
      name: item.name,
      sku: item.sku,
      quantity: item.qty,
    })
    const sq = await ensureSquareItem(item)
    if (sq.variationId) {
      try {
        await setSquareInventory(sq.variationId, item.qty)
      } catch (err) {
        console.warn('Square inventory set failed', item.sku, err.message || err)
      }
    }
    results.push({
      name: item.name,
      sku: item.sku,
      price: item.priceCents / 100,
      qty: item.qty,
      wixProductId: wixProd.productId,
      wixVariantId: wixProd.variantId,
      wixCreated: wixProd.created,
      squareItemId: sq.itemId,
      squareVariationId: sq.variationId,
      squareCreated: sq.created,
      onPublicSite: false,
    })
    console.log(`OK ${item.name} (${item.sku}) wix=${wixProd.productId} square=${sq.itemId}`)
  }

  console.log('\nDone. Not on /cove or /spirit-wear. Adjust qty in Staff Cove inventory / Square.')
  console.log(JSON.stringify(results, null, 2))
  console.log('\nSkipped: “T Shirt · Regular” (sold at $5 and $10 yesterday — confirm price before creating).')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
