/**
 * Push Cove snack/merch catalog (Wix storeProductIds) into Square POS so
 * Square Stand can ring everything Staff Cove sells — matching SKUs for webhook sync.
 *
 * Spirit wear is already on Square (see sync-square-pos-catalog.mjs). This script
 * focuses on Cove store items and creates any missing ones.
 *
 *   node --env-file=frontend/.env.local scripts/sync-cove-to-square.mjs
 *   node --env-file=frontend/.env.local scripts/sync-cove-to-square.mjs --dry-run
 */
import { randomUUID } from 'crypto'
import { createRequire } from 'module'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const require = createRequire(resolve(root, 'frontend/package.json'))
const { SquareClient, SquareEnvironment } = require('square')

const dryRun = process.argv.includes('--dry-run')

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

const siteId = process.env.WIX_SITE_ID
const apiKey = process.env.WIX_API_KEY
const LOCATION_ID = process.env.SQUARE_LOCATION_ID
const token = process.env.SQUARE_ACCESS_TOKEN
if (!siteId || !apiKey || !LOCATION_ID || !token) {
  console.error('Need WIX_SITE_ID, WIX_API_KEY, SQUARE_LOCATION_ID, SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

const client = new SquareClient({
  token,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'sandbox'
      ? SquareEnvironment.Sandbox
      : SquareEnvironment.Production,
})

async function wixDataQuery(collection) {
  const out = []
  let cursor
  for (;;) {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: collection,
        query: { paging: { limit: 100, ...(cursor ? { cursor } : {}) } },
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(json).slice(0, 400))
    for (const row of json.dataItems || []) out.push(row.data)
    cursor = json.pagingMetadata?.cursors?.next
    if (!cursor) break
  }
  return out
}

function parseIds(raw) {
  return String(raw || '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function getSiteSettingMap() {
  const rows = await wixDataQuery('SiteSettings')
  const map = {}
  for (const it of rows) {
    const k = it.key || it.settingKey
    if (k) map[k] = it.value
  }
  return map
}

async function getWixProduct(id) {
  const res = await fetch(`https://www.wixapis.com/stores/v3/products/${id}`, {
    headers: { Authorization: apiKey, 'wix-site-id': siteId },
  })
  if (!res.ok) return null
  return (await res.json()).product
}

async function listSquareVariationsBySku() {
  /** @type {Map<string, { itemId: string, itemName: string, variationId: string, variationName: string, version?: bigint }>} */
  const bySku = new Map()
  let cursor
  do {
    const page = await client.catalog.list({ types: 'ITEM', cursor })
    for (const obj of page.data || []) {
      if (obj.type !== 'ITEM') continue
      for (const v of obj.itemData?.variations || []) {
        const sku = String(v.itemVariationData?.sku || '')
          .trim()
          .toUpperCase()
        if (!sku) continue
        bySku.set(sku, {
          itemId: obj.id,
          itemName: obj.itemData?.name || '',
          variationId: v.id,
          variationName: v.itemVariationData?.name || '',
          version: obj.version,
        })
      }
    }
    cursor = page.cursor
  } while (cursor)
  return bySku
}

function dollarsToCents(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n) || n < 0) return 0n
  return BigInt(Math.round(n * 100))
}

function variantLabel(product, variant) {
  const choices = (variant.choices || [])
    .map((c) => c.optionChoiceNames?.choiceName)
    .filter(Boolean)
  if (choices.length) return choices.join(' · ')
  return 'Regular'
}

async function ensureCategory(name) {
  let cursor
  do {
    const page = await client.catalog.list({ types: 'CATEGORY', cursor })
    for (const obj of page.data || []) {
      if (obj.type === 'CATEGORY' && obj.categoryData?.name === name) return obj.id
    }
    cursor = page.cursor
  } while (cursor)

  if (dryRun) {
    console.log(`  [dry-run] would create category ${name}`)
    return `#cat-${name}`
  }

  const res = await client.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'CATEGORY',
      id: `#cat-${name.replace(/\s+/g, '-').toLowerCase()}`,
      categoryData: { name },
    },
  })
  return res.catalogObject?.id
}

async function createSquareItem({ name, description, categoryId, variations }) {
  if (dryRun) {
    console.log(`  [dry-run] create ITEM ${name} (${variations.length} vars)`)
    return null
  }
  const itemId = `#item-${randomUUID().slice(0, 8)}`
  const res = await client.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'ITEM',
      id: itemId,
      presentAtAllLocations: true,
      itemData: {
        name,
        description: description || undefined,
        productType: 'REGULAR',
        categories: categoryId ? [{ id: categoryId }] : undefined,
        variations: variations.map((v, i) => ({
          type: 'ITEM_VARIATION',
          id: `${itemId}-v${i}`,
          presentAtAllLocations: true,
          itemVariationData: {
            name: v.name,
            sku: v.sku,
            pricingType: 'FIXED_PRICING',
            priceMoney: { amount: v.cents, currency: 'USD' },
            itemId,
            trackInventory: false,
            sellable: true,
            stockable: true,
          },
        })),
      },
    },
  })
  return res.catalogObject?.id
}

async function main() {
  const settings = await getSiteSettingMap()
  const storeIds = parseIds(settings.storeProductIds)
  if (!storeIds.length) {
    console.error('No storeProductIds in SiteSettings')
    process.exit(1)
  }

  console.log(`Cove store products: ${storeIds.length}`)
  console.log(dryRun ? 'DRY RUN — no Square writes' : 'APPLY — writing to Square')

  const existingBySku = await listSquareVariationsBySku()
  console.log(`Existing Square SKUs: ${existingBySku.size}`)

  const snacksCategoryId = await ensureCategory('Cove Snacks')

  let created = 0
  let skipped = 0
  let missingSku = 0

  for (const productId of storeIds) {
    const product = await getWixProduct(productId)
    if (!product) {
      console.warn('Wix product missing', productId)
      continue
    }
    const name = String(product.name || '').trim()
    const variants = product.variantsInfo?.variants || []
    if (!variants.length) {
      console.warn('No variants', name)
      continue
    }

    const toCreate = []
    for (const v of variants) {
      const sku = String(v.sku || '')
        .trim()
        .toUpperCase()
      if (!sku) {
        missingSku++
        console.warn(`  ${name}: variant missing SKU — skip`)
        continue
      }
      if (existingBySku.has(sku)) {
        skipped++
        console.log(`  ok ${sku} → already on Square (${existingBySku.get(sku).itemName})`)
        continue
      }
      const price =
        v.price?.actualPrice?.amount ?? product.price?.actualPrice?.amount ?? '0'
      toCreate.push({
        name: variantLabel(product, v),
        sku,
        cents: dollarsToCents(price),
      })
    }

    if (!toCreate.length) continue

    // One Square item per Wix product (all missing variations together)
    console.log(`\nCreate: ${name}`)
    for (const v of toCreate) {
      console.log(`  + ${v.name} ${v.sku} $${(Number(v.cents) / 100).toFixed(2)}`)
    }
    const id = await createSquareItem({
      name,
      description: 'Cove snack window / Open House — synced from shmspto.org',
      categoryId: snacksCategoryId,
      variations: toCreate,
    })
    if (id) {
      created++
      for (const v of toCreate) {
        existingBySku.set(v.sku, {
          itemId: id,
          itemName: name,
          variationId: '',
          variationName: v.name,
        })
      }
      console.log('  →', id)
    } else if (dryRun) {
      created++
    }
  }

  console.log('\n---')
  console.log({ created, alreadyOnSquare: skipped, missingSku, dryRun })
  console.log(
    dryRun
      ? 'Re-run without --dry-run to create items. Then pull-to-refresh Square Stand Library.'
      : 'Done. On iPad Square Stand: Library → pull to refresh (or sign out/in). Favorites can pin snacks.',
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
