/**
 * Align Square POS catalog with Wix SKUs so Stand sales can sync into Staff.
 * Also upserts Long Sleeve with Style·Size variants matching Wix inventory.
 *
 *   node --env-file=frontend/.env.local scripts/sync-square-pos-catalog.mjs
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

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
})
const LOCATION_ID = process.env.SQUARE_LOCATION_ID
if (!LOCATION_ID) {
  console.error('SQUARE_LOCATION_ID required')
  process.exit(1)
}

/** Square item name → variation name → Wix SKU */
const SKU_MAP = {
  'Stingrays Spirit T-Shirt': {
    'Youth S': 'SPIRIT-TEE',
    'Youth M': 'SPIRIT-TEE',
    'Youth L': 'SPIRIT-TEE',
    'Adult S': 'SPIRIT-TEE',
    'Adult M': 'SPIRIT-TEE',
    'Adult L': 'SPIRIT-TEE',
    'Adult XL': 'SPIRIT-TEE',
  },
  'Stingrays Hoodie': {
    'Youth S': 'SPIRIT-HOODIE',
    'Youth M': 'SPIRIT-HOODIE',
    'Youth L': 'SPIRIT-HOODIE',
    'Adult S': 'SPIRIT-HOODIE',
    'Adult M': 'SPIRIT-HOODIE',
    'Adult L': 'SPIRIT-HOODIE',
    'Adult XL': 'SPIRIT-HOODIE',
  },
  'Stingrays Drawstring Bag': {
    Black: 'SPIRIT-BAG-BLK',
    Red: 'SPIRIT-BAG-RED',
    Yellow: 'SPIRIT-BAG-YLW',
    Green: 'SPIRIT-BAG-GRN',
    Navy: 'SPIRIT-BAG-NVY',
  },
  'Stone Hill Car Magnet': {
    Regular: 'SHMS-CAR-MAGNET',
    '': 'SHMS-CAR-MAGNET',
  },
}

const LONG_SLEEVE = [
  { name: 'Black · Youth L', sku: 'SPIRIT-LS-BLK-YL', cents: 2200n },
  { name: 'Black · Adult S', sku: 'SPIRIT-LS-BLK-S', cents: 2200n },
  { name: 'Black · Adult L', sku: 'SPIRIT-LS-BLK-L', cents: 2200n },
  { name: 'Black · Adult XL', sku: 'SPIRIT-LS-BLK-XL', cents: 2200n },
  { name: 'Grey Circular · Adult M', sku: 'SPIRIT-LS-GRY-CIR-M', cents: 2200n },
  { name: 'Grey/Burgundy · Youth M', sku: 'SPIRIT-LS-GRY-BRG-YM', cents: 2200n },
  { name: 'Grey/Burgundy · Youth L', sku: 'SPIRIT-LS-GRY-BRG-YL', cents: 2200n },
  { name: 'Grey/Burgundy · Adult S', sku: 'SPIRIT-LS-GRY-BRG-S', cents: 2200n },
  { name: 'Grey/Burgundy · Adult M', sku: 'SPIRIT-LS-GRY-BRG-M', cents: 2200n },
  { name: 'Grey/Burgundy · Adult L', sku: 'SPIRIT-LS-GRY-BRG-L', cents: 2200n },
  { name: 'Grey/Burgundy · Adult XL', sku: 'SPIRIT-LS-GRY-BRG-XL', cents: 2200n },
  { name: 'Grey Stingrays · Adult M', sku: 'SPIRIT-LS-GRY-STG-M', cents: 2200n },
  { name: 'White/Green · Youth L', sku: 'SPIRIT-LS-WHT-GRN-YL', cents: 2200n },
  { name: 'White/Green · Adult XL', sku: 'SPIRIT-LS-WHT-GRN-XL', cents: 2200n },
  { name: 'Heather Green · Adult S', sku: 'SPIRIT-LS-GRN-MRN-S', cents: 2200n },
]

async function findItemByName(name) {
  const keywords = name.split(/\s+/).slice(0, 3)
  const s = await client.catalog.search({
    objectTypes: ['ITEM'],
    query: { textQuery: { keywords } },
    limit: 30,
  })
  return (s.objects || []).find((o) => o.itemData?.name === name) || null
}

async function setVariationSkus(itemObj, nameToSku) {
  const variations = itemObj.itemData?.variations || []
  let changed = false
  const nextVariations = variations.map((v) => {
    const vName = String(v.itemVariationData?.name || '').trim()
    const sku = nameToSku[vName] || nameToSku['']
    if (!sku) {
      console.warn('  no SKU map for variation', vName)
      return v
    }
    if (v.itemVariationData?.sku === sku) {
      console.log('  ok', vName, sku)
      return v
    }
    changed = true
    console.log('  set', vName, '→', sku)
    return {
      ...v,
      itemVariationData: {
        ...v.itemVariationData,
        sku,
      },
    }
  })
  if (!changed) return

  const res = await client.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'ITEM',
      id: itemObj.id,
      version: itemObj.version,
      presentAtAllLocations: itemObj.presentAtAllLocations,
      presentAtLocationIds: itemObj.presentAtLocationIds,
      absentAtLocationIds: itemObj.absentAtLocationIds,
      itemData: {
        ...itemObj.itemData,
        variations: nextVariations,
      },
    },
  })
  console.log('  saved', res.catalogObject?.id)
}

async function ensureLongSleeve() {
  const existing = await findItemByName('Stingrays Long Sleeve Shirt')
  if (existing) {
    console.log('Long sleeve exists', existing.id)
    const map = Object.fromEntries(LONG_SLEEVE.map((v) => [v.name, v.sku]))
    await setVariationSkus(existing, map)
    // If variation count is short, recreate missing via item update is complex — log
    const have = new Set(
      (existing.itemData?.variations || []).map((v) => v.itemVariationData?.name),
    )
    for (const v of LONG_SLEEVE) {
      if (!have.has(v.name)) console.warn('  missing variation on Square:', v.name)
    }
    return existing.id
  }

  console.log('Creating Long Sleeve on Square…')
  const itemId = `#longsleeve`
  const variations = LONG_SLEEVE.map((v, i) => ({
    type: 'ITEM_VARIATION',
    id: `#ls-${i}`,
    itemVariationData: {
      name: v.name,
      sku: v.sku,
      pricingType: 'FIXED_PRICING',
      priceMoney: { amount: v.cents, currency: 'USD' },
      itemId,
      trackInventory: true,
    },
  }))

  const res = await client.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'ITEM',
      id: itemId,
      itemData: {
        name: 'Stingrays Long Sleeve Shirt',
        description: 'Official SHMS long sleeve — style and size. $22',
        productType: 'REGULAR',
        variations,
      },
    },
  })
  console.log('Created', res.catalogObject?.id)
  return res.catalogObject?.id
}

async function main() {
  for (const [itemName, map] of Object.entries(SKU_MAP)) {
    console.log('\n' + itemName)
    const item = await findItemByName(itemName)
    if (!item) {
      // magnet name may include em-dash extras
      if (itemName === 'Stone Hill Car Magnet') {
        const s = await client.catalog.search({
          objectTypes: ['ITEM'],
          query: { textQuery: { keywords: ['Magnet'] } },
          limit: 10,
        })
        const hit = (s.objects || []).find((o) =>
          String(o.itemData?.name || '').includes('Car Magnet'),
        )
        if (hit) {
          console.log(' found', hit.itemData.name)
          await setVariationSkus(hit, map)
          continue
        }
      }
      console.warn('  NOT FOUND on Square')
      continue
    }
    await setVariationSkus(item, map)
  }

  console.log('\nStingrays Long Sleeve Shirt')
  await ensureLongSleeve()
  console.log('\nDONE — ring these on Square Stand; webhook syncs to Staff by SKU')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
