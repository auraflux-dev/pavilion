/**
 * Audit Square POS catalog vs Wix store/spirit SKUs.
 * Optionally delete Square items that have no SKU (can't decrement inventory).
 *
 *   node --env-file=frontend/.env.local scripts/audit-square-wix-skus.mjs
 *   node --env-file=frontend/.env.local scripts/audit-square-wix-skus.mjs --delete-no-sku
 */
import { createRequire } from 'module'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const require = createRequire(resolve(root, 'frontend/package.json'))
const { SquareClient, SquareEnvironment } = require('square')

const deleteNoSku = process.argv.includes('--delete-no-sku')

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
const token = process.env.SQUARE_ACCESS_TOKEN
if (!siteId || !apiKey || !token) {
  console.error('Need WIX_SITE_ID, WIX_API_KEY, SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

const client = new SquareClient({
  token,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
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

async function main() {
  const settings = {}
  for (const it of await wixDataQuery('SiteSettings')) {
    const k = it.key || it.settingKey
    if (k) settings[k] = it.value
  }
  const ids = [
    ...new Set([
      ...parseIds(settings.storeProductIds),
      ...parseIds(settings.spiritWearProductIds),
    ]),
  ]

  /** @type {Map<string, string>} */
  const wixBySku = new Map()
  for (const id of ids) {
    const res = await fetch(`https://www.wixapis.com/stores/v3/products/${id}`, {
      headers: { Authorization: apiKey, 'wix-site-id': siteId },
    })
    if (!res.ok) continue
    const p = (await res.json()).product
    for (const v of p.variantsInfo?.variants || []) {
      const sku = String(v.sku || '')
        .trim()
        .toUpperCase()
      if (sku) wixBySku.set(sku, p.name || sku)
    }
  }

  /** @type {Map<string, string>} */
  const squareBySku = new Map()
  /** @type {Array<{ itemId: string, name: string, variationId: string }>} */
  const noSku = []
  let cursor
  do {
    const page = await client.catalog.list({ types: 'ITEM', cursor })
    for (const obj of page.data || []) {
      if (obj.type !== 'ITEM') continue
      const name = obj.itemData?.name || ''
      for (const v of obj.itemData?.variations || []) {
        const sku = String(v.itemVariationData?.sku || '')
          .trim()
          .toUpperCase()
        if (!sku) {
          noSku.push({ itemId: obj.id, name, variationId: v.id })
        } else {
          squareBySku.set(sku, name)
        }
      }
    }
    cursor = page.cursor
  } while (cursor)

  const matched = [...wixBySku.keys()].filter((s) => squareBySku.has(s))
  const onlyWix = [...wixBySku.keys()].filter((s) => !squareBySku.has(s))
  const onlySquare = [...squareBySku.keys()].filter((s) => !wixBySku.has(s))

  console.log(`Wix SKUs: ${wixBySku.size}`)
  console.log(`Square SKUs: ${squareBySku.size}`)
  console.log(`Matched: ${matched.length}`)
  console.log(`Wix missing on Square: ${onlyWix.length}`)
  for (const s of onlyWix) console.log(`  NEED ${s} · ${wixBySku.get(s)}`)
  console.log(`Square orphans (SKU not in Wix): ${onlySquare.length}`)
  for (const s of onlySquare) console.log(`  ORPHAN ${s} · ${squareBySku.get(s)}`)
  console.log(`Square variations with no SKU: ${noSku.length}`)
  for (const x of noSku) console.log(`  NO-SKU ${x.name} · ${x.itemId}`)

  if (deleteNoSku && noSku.length) {
    const itemIds = [...new Set(noSku.map((x) => x.itemId))]
    for (const objectId of itemIds) {
      await client.catalog.object.delete({ objectId })
      console.log('Deleted no-SKU item', objectId)
    }
  } else if (noSku.length) {
    console.log('\nRe-run with --delete-no-sku to remove no-SKU Stand items.')
  }

  if (onlyWix.length) {
    console.log('\nTip: node --env-file=frontend/.env.local scripts/sync-cove-to-square.mjs')
    console.log('  and/or scripts/sync-square-pos-catalog.mjs')
  }

  if (matched.length === wixBySku.size && noSku.length === 0 && onlySquare.length === 0) {
    console.log('\nOK — every allowlisted Wix SKU is on Square; Stand sales can decrement inventory.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
