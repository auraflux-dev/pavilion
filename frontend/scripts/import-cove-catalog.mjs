#!/usr/bin/env node
/**
 * Import / sync Cove snacks + spirit wear from Rob's price list + image folders.
 *
 *   cd frontend && node --env-file=.env.local ../scripts/import-cove-catalog.mjs
 *
 * Sources (Downloads):
 *   - Regular Store Price List.docx (parsed into SNACKS / SPIRIT / ACCESSORIES below)
 *   - Items of the Week Images/
 *   - Spiritwear/
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { createClient, ApiKeyStrategy } from '@wix/sdk'
import { items } from '@wix/data'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const WEEK =
  path.join(os.homedir(), 'Downloads', 'Items of the Week Images')
const SPIRIT_DIR = path.join(os.homedir(), 'Downloads', 'Spiritwear')

const apiKey = process.env.WIX_API_KEY
const siteId = process.env.WIX_SITE_ID
if (!apiKey || !siteId) {
  console.error('Need WIX_API_KEY + WIX_SITE_ID (run from frontend --env-file=.env.local)')
  process.exit(1)
}

const H = {
  Authorization: apiKey,
  'wix-site-id': siteId,
  'Content-Type': 'application/json',
}

const WIX_PRODUCTS = 'https://www.wixapis.com/stores/v3/products'
const WIX_PRODUCTS_INV = 'https://www.wixapis.com/stores/v3/products-with-inventory'
const DEAL_RIBBON = { id: 'e6833018-bd4d-4394-b1c6-5728537f0c87', name: 'Deal' }

const wixData = createClient({
  modules: { items },
  auth: ApiKeyStrategy({ siteId, apiKey }),
})

/** @type {Array<{name:string, price:number, qty?:number, sku?:string, image?:string, onCove?:boolean, deal?:boolean, match?:RegExp, aliases?:string[]}>} */
const SNACKS = [
  {
    name: 'Granola Bar (Chocolate Chip)',
    price: 0.25,
    qty: 48,
    sku: 'GRANOLA-CC',
    // 4 for $1 on the printed list → unit price for register
  },
  { name: 'Gushers', price: 0.5, qty: 40, sku: 'GUSHERS' }, // 2 for $1
  { name: 'Fruit by the Foot', price: 1, qty: 40, sku: 'FRUIT-FOOT' },
  {
    name: 'Takis Variety Pack (1oz)',
    price: 1,
    qty: 50,
    sku: 'TAKIS-1OZ',
    image: 'takis.jpg',
    deal: true,
    match: /takis/i,
  },
  { name: 'Ring Pop', price: 1, qty: 40, sku: 'RING-POP' },
  {
    name: 'Pop Rocks',
    price: 1,
    qty: 40,
    sku: 'POP-ROCKS',
    image: 'pop_rocks_bubble_gum.jpg',
    match: /^pop rocks$/i,
  },
  {
    name: 'Pop Rocks Gum',
    price: 1,
    qty: 40,
    sku: 'POP-ROCKS-GUM',
    image: 'pop_rocks_bubble_gum.jpg',
  },
  {
    name: 'Oreos (6-pack)',
    price: 2,
    qty: 30,
    sku: 'OREO-6',
    image: 'oreo_cookies_6inpack.PNG',
    match: /oreo/i,
  },
  {
    name: 'Airheads Chewing Gum',
    price: 2,
    qty: 40,
    sku: 'AIRHEADS-GUM',
    image: 'airheads_gum_blue_raspberry.jpg',
    match: /airheads chewing gum|airheads gum/i,
  },
  {
    name: 'Sour Patch Kids',
    price: 2,
    qty: 40,
    sku: 'SOUR-PATCH',
    image: 'sour_patch_kids.jpg',
    match: /sour patch/i,
  },
  {
    name: 'M&Ms Minis Tubes',
    price: 2,
    qty: 40,
    sku: 'MMS-MINIS',
    match: /m&ms|m and m/i,
  },
  {
    name: 'Orion Choco Mont Mushroom Biscuits',
    price: 2,
    qty: 40,
    sku: 'CHOCO-MONT',
    image: 'choco_mushrooms.jpg',
    match: /choco mont|orion/i,
  },
  {
    name: 'Hubba Bubba Bubble Gum Tape',
    price: 3,
    qty: 40,
    sku: 'HUBBA-TAPE',
    image: 'hubba_bubba_original.jpg',
    deal: true,
    match: /hubba bubba/i,
  },
  {
    name: 'Airheads Xtremes Belts',
    price: 3,
    qty: 40,
    sku: 'AIRHEADS-XT',
    image: 'airhead_extremes.jpg',
    match: /airheads xtremes|xtreme/i,
  },
  {
    name: 'Charms Blow Pops Mini',
    price: 3,
    qty: 40,
    sku: 'BLOW-POP-MINI',
    image: 'blow_pop_minis.jpg',
    match: /blow pop/i,
  },
  // Keep popular extras that already sell / have week photos
  {
    name: 'Nerds Gummy Clusters',
    price: 2,
    qty: 40,
    sku: 'NERDS-GUMMY',
    image: 'nerds_gummy_clusters_rainbow.PNG',
    deal: true,
    match: /nerds/i,
  },
  {
    name: 'Jolly Rancher Lollipops',
    price: 1,
    qty: 40,
    sku: 'JOLLY-LOLLI',
    image: 'jolly_rancher_lollipos.jpg',
    match: /jolly rancher/i,
  },
  {
    name: 'Life Savers Gummies',
    price: 2,
    qty: 30,
    sku: 'LIFE-GUMMIES',
    image: 'lifesavers_gummies.jpg',
    match: /life savers gummies|lifesavers gummies/i,
  },
  {
    name: 'Life Savers Swirl Lollipops',
    price: 1,
    qty: 40,
    sku: 'LIFE-SWIRL',
    match: /life savers swirl|swirl lollipop/i,
  },
]

const ACCESSORIES = [
  {
    name: 'Magnetic Photo Frame for Locker',
    price: 1,
    qty: 24,
    sku: 'LOCKER-FRAME',
    onCove: true,
  },
  {
    name: 'Heart-Shaped Post-it Notes',
    price: 1,
    qty: 20,
    sku: 'POSTIT-HEART',
    image: 'heart_shaped_postit_notes.jpg',
    onCove: true,
  },
  {
    name: 'Scented Pens',
    price: 1,
    qty: 20,
    sku: 'SCENTED-PEN',
    image: 'scented_pens.PNG',
    onCove: true,
  },
]

/** Spirit wear — prices from Regular Store Price List */
const SPIRIT = [
  {
    name: 'Stingrays Drawstring Bag',
    price: 10,
    qty: 20,
    sku: 'SPIRIT-BAG',
    match: /drawstring/i,
  },
  {
    name: 'Stingrays Hat',
    price: 12,
    qty: 20,
    sku: 'SPIRIT-HAT',
    match: /hat/i,
    // IMG_4507 is a grey hoodie mockup — do not attach until a real hat photo exists.
  },
  {
    name: 'Stingrays Spirit T-Shirt',
    price: 18,
    qty: 30,
    sku: 'SPIRIT-TEE',
    match: /spirit t-?shirt|short sleeve/i,
    imageAbs: path.join(SPIRIT_DIR, 'pastel_rainbow_stingray_tshirt_mockup.png'),
  },
  {
    name: 'Stingrays Long Sleeve Shirt (Grey/Burgundy)',
    price: 22,
    qty: 24,
    sku: 'SPIRIT-LS',
    match: /long sleeve/i,
  },
  {
    name: 'Stingrays Hoodie',
    price: 30,
    qty: 24,
    sku: 'SPIRIT-HOODIE',
    match: /hoodie/i,
    imageAbs: path.join(SPIRIT_DIR, 'stonehill_green_hoodie.png'),
  },
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function listAllProducts() {
  const r = await fetch(`${WIX_PRODUCTS}/query`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      query: { paging: { limit: 100 } },
      fields: ['MEDIA_ITEMS_INFO', 'MIN_PRICE_VARIANT', 'MERCHANT_DATA'],
    }),
  })
  if (!r.ok) throw new Error(`list products ${r.status}`)
  const d = await r.json()
  return d.products || []
}

async function getProduct(id) {
  const r = await fetch(`${WIX_PRODUCTS}/${id}`, { headers: H })
  if (!r.ok) throw new Error(`get ${id} ${r.status}`)
  const d = await r.json()
  return d.product || d
}

function findMatch(catalog, spec) {
  const byExact = catalog.find(
    (p) => String(p.name || '').toLowerCase() === spec.name.toLowerCase()
  )
  if (byExact) return byExact
  if (spec.match) {
    return catalog.find((p) => spec.match.test(String(p.name || '')))
  }
  return null
}

async function uploadImage(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null
  const buf = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.jxl'
        ? 'image/jxl'
        : 'image/jpeg'
  const fileName = path.basename(filePath).replace(/\.jxl$/i, '.jpg')
  const gen = await fetch(
    'https://www.wixapis.com/site-media/v1/files/generate-upload-url',
    {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        mimeType: mime === 'image/jxl' ? 'image/jpeg' : mime,
        fileName,
        sizeInBytes: String(buf.length),
        parentFolderId: 'media-root',
        private: false,
      }),
    }
  )
  const genBody = await gen.json()
  if (!gen.ok || !genBody.uploadUrl) {
    throw new Error(`upload url: ${JSON.stringify(genBody).slice(0, 200)}`)
  }
  const put = await fetch(genBody.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mime === 'image/jxl' ? 'image/jpeg' : mime },
    body: buf,
  })
  const putBody = await put.json()
  if (!put.ok || !putBody.file?.url) {
    throw new Error(`upload put: ${JSON.stringify(putBody).slice(0, 200)}`)
  }
  return putBody.file
}

async function upsertInventory({ productId, variantId, name, sku, quantity }) {
  const existing = await wixData.items
    .query('CoveInventory')
    .eq('productId', productId)
    .limit(20)
    .find()
  const row = (existing.items || []).find(
    (r) => !variantId || String(r.variantId || '') === String(variantId || '')
  )
  const payload = {
    productId,
    variantId: variantId || '',
    name,
    sku: sku || '',
    quantity: Math.max(0, Math.floor(quantity)),
    active: true,
  }
  if (row?._id) {
    await wixData.items.update('CoveInventory', { ...row, ...payload })
  } else {
    await wixData.items.insert('CoveInventory', payload)
  }
}

async function readSetting(key) {
  const q = await wixData.items.query('SiteSettings').eq('key', key).limit(5).find()
  return q.items?.[0] || null
}

async function writeAllowlist(key, ids) {
  const unique = [...new Set(ids.map((x) => String(x).trim()).filter(Boolean))]
  const value = unique.join(',')
  const row = await readSetting(key)
  if (row?._id) {
    await wixData.items.update('SiteSettings', { ...row, key, value })
  } else {
    await wixData.items.insert('SiteSettings', { key, value })
  }
  return unique
}

async function createProduct(spec, { spirit = false } = {}) {
  const body = {
    name: spec.name,
    visible: true,
    visibleInPos: true,
    productType: 'PHYSICAL',
    physicalProperties: {},
    variantsInfo: {
      variants: [
        {
          sku: spec.sku || undefined,
          visible: true,
          price: { actualPrice: { amount: Number(spec.price).toFixed(2) } },
          inventoryItem: {
            quantity: Math.max(0, Math.floor(spec.qty ?? 20)),
          },
        },
      ],
    },
  }
  if (spec.deal) body.ribbon = DEAL_RIBBON

  const r = await fetch(WIX_PRODUCTS_INV, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ product: body }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`create ${spec.name}: ${text.slice(0, 300)}`)
  const data = JSON.parse(text)
  const product = data.product
  const variantId = product.variantsInfo?.variants?.[0]?.id || ''
  await upsertInventory({
    productId: product.id,
    variantId,
    name: spec.name,
    sku: spec.sku || '',
    quantity: spec.qty ?? 20,
  })
  return product
}

async function updateProduct(existingId, spec, { clearDeal = false } = {}) {
  const raw = await getProduct(existingId)
  const revision = String(raw.revision ?? '1')
  const variants = raw.variantsInfo?.variants || []
  const v0 = variants[0] || {}

  const patch = {
    id: existingId,
    revision,
    name: spec.name || raw.name,
    visible: true,
    variantsInfo: {
      variants: [
        {
          id: v0.id,
          sku: spec.sku || v0.sku || undefined,
          visible: true,
          price: { actualPrice: { amount: Number(spec.price).toFixed(2) } },
          inventoryItem: {
            quantity: Math.max(
              0,
              Math.floor(spec.qty ?? v0.inventoryItem?.quantity ?? 20)
            ),
          },
          choices: v0.choices,
        },
      ],
    },
  }

  if (spec.deal) patch.ribbon = DEAL_RIBBON
  else if (clearDeal) patch.ribbon = null

  const r = await fetch(`${WIX_PRODUCTS_INV}/${existingId}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({ product: patch }),
  })
  const text = await r.text()
  if (!r.ok) {
    // fallback: product PATCH without inventory wrapper
    const r2 = await fetch(`${WIX_PRODUCTS}/${existingId}`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({
        product: {
          id: existingId,
          revision,
          name: patch.name,
          visible: true,
          ...(spec.deal ? { ribbon: DEAL_RIBBON } : clearDeal ? { ribbon: null } : {}),
          variantsInfo: {
            variants: [
              {
                id: v0.id,
                sku: spec.sku || v0.sku,
                visible: true,
                price: { actualPrice: { amount: Number(spec.price).toFixed(2) } },
              },
            ],
          },
        },
      }),
    })
    const t2 = await r2.text()
    if (!r2.ok) throw new Error(`update ${spec.name}: ${text.slice(0, 150)} / ${t2.slice(0, 150)}`)
  }

  await upsertInventory({
    productId: existingId,
    variantId: v0.id || '',
    name: spec.name,
    sku: spec.sku || '',
    quantity: spec.qty ?? 20,
  })
}

async function attachImage(productId, filePath) {
  const uploaded = await uploadImage(filePath)
  if (!uploaded) return null
  const raw = await getProduct(productId)
  const revision = String(raw.revision ?? '1')
  const mediaId = uploaded.id
  const r = await fetch(`${WIX_PRODUCTS}/${productId}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({
      product: {
        id: productId,
        revision,
        media: {
          itemsInfo: {
            items: [{ id: mediaId }],
          },
        },
      },
    }),
  })
  const text = await r.text()
  if (!r.ok) {
    // try URL form
    const r2 = await fetch(`${WIX_PRODUCTS}/${productId}`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({
        product: {
          id: productId,
          revision: String((await getProduct(productId)).revision ?? '1'),
          media: { itemsInfo: { items: [{ url: uploaded.url }] } },
        },
      }),
    })
    if (!r2.ok) throw new Error(`image ${productId}: ${text.slice(0, 200)}`)
  }
  return uploaded.url
}

function resolveImage(spec) {
  if (spec.imageAbs) return spec.imageAbs
  if (!spec.image) return null
  const p = path.join(WEEK, spec.image)
  if (fs.existsSync(p)) return p
  // try case / extension variants
  const base = path.basename(spec.image, path.extname(spec.image))
  for (const f of fs.readdirSync(WEEK)) {
    if (f.toLowerCase().startsWith(base.toLowerCase())) return path.join(WEEK, f)
  }
  return null
}

async function syncGroup(specs, catalog, { spirit = false } = {}) {
  const results = []
  for (const spec of specs) {
    await sleep(400)
    const hit = findMatch(catalog, spec)
    try {
      let id
      if (hit) {
        id = hit.id
        console.log(`↻ ${spec.name} ← ${hit.name} ($${spec.price})`)
        await updateProduct(id, spec)
      } else {
        console.log(`＋ ${spec.name} ($${spec.price})`)
        const created = await createProduct(spec, { spirit })
        id = created.id
        catalog.push({ id, name: spec.name })
      }
      const img = resolveImage(spec)
      if (img) {
        try {
          await sleep(300)
          const url = await attachImage(id, img)
          console.log(`  📷 ${path.basename(img)}`)
          results.push({ name: spec.name, id, price: spec.price, image: url, action: hit ? 'update' : 'create' })
        } catch (e) {
          console.warn(`  ⚠️ image failed: ${e.message}`)
          results.push({ name: spec.name, id, price: spec.price, action: hit ? 'update' : 'create', imageError: e.message })
        }
      } else {
        results.push({ name: spec.name, id, price: spec.price, action: hit ? 'update' : 'create' })
      }
    } catch (e) {
      console.error(`✗ ${spec.name}: ${e.message}`)
      results.push({ name: spec.name, error: e.message })
    }
  }
  return results
}

async function main() {
  console.log('Listing Wix products…')
  let catalog = await listAllProducts()
  console.log(`Found ${catalog.length} products`)

  console.log('\n=== SNACKS (price list + week images) ===')
  const snackResults = await syncGroup(SNACKS, catalog, { spirit: false })

  console.log('\n=== ACCESSORIES ===')
  catalog = await listAllProducts()
  const accResults = await syncGroup(ACCESSORIES, catalog, { spirit: false })

  console.log('\n=== SPIRIT WEAR ===')
  catalog = await listAllProducts()
  const spiritResults = await syncGroup(SPIRIT, catalog, { spirit: true })

  // Allowlists
  const snackIds = [...snackResults, ...accResults]
    .filter((r) => r.id && !r.error)
    .map((r) => r.id)
  // keep any existing storeProductIds that are still snacks (not membership / store card / spirit)
  const settingsStore = await readSetting('storeProductIds')
  const prevStore = String(settingsStore?.value || '')
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const membershipLike = new Set(
    catalog
      .filter((p) => /membership|store card|pto store/i.test(String(p.name || '')))
      .map((p) => p.id)
  )
  const spiritIdsNew = spiritResults.filter((r) => r.id && !r.error).map((r) => r.id)
  const spiritSettings = await readSetting('spiritWearProductIds')
  const prevSpirit = String(spiritSettings?.value || '')
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  // Final store allowlist = synced snacks/accessories (+ prior non-membership that aren't spirit)
  const storeAllow = [
    ...new Set([
      ...snackIds,
      ...prevStore.filter((id) => !membershipLike.has(id) && !spiritIdsNew.includes(id) && !prevSpirit.includes(id)),
    ]),
  ]
  // Spirit allowlist = synced spirit + prior spirit that still exist
  const allIds = new Set(catalog.map((p) => p.id))
  // Spirit allowlist = synced SPIRIT specs only. Yard sign / water bottle stay out of shop.
  const hiddenSpirit = new Set(
    catalog
      .filter((p) => /water bottle|yard sign/i.test(String(p.name || '')))
      .map((p) => p.id),
  )
  const spiritAllow = [
    ...new Set([
      ...spiritIdsNew,
      ...prevSpirit.filter((id) => allIds.has(id) && !hiddenSpirit.has(id)),
    ]),
  ].filter((id) => !hiddenSpirit.has(id))

  console.log('\n=== ALLOWLISTS ===')
  await writeAllowlist('storeProductIds', storeAllow)
  console.log(`storeProductIds (${storeAllow.length}):`, storeAllow.join(','))
  await writeAllowlist('spiritWearProductIds', spiritAllow)
  console.log(`spiritWearProductIds (${spiritAllow.length}):`, spiritAllow.join(','))

  const summary = {
    snacks: snackResults,
    accessories: accResults,
    spirit: spiritResults,
    storeProductIds: storeAllow,
    spiritWearProductIds: spiritAllow,
  }
  const out = path.join(ROOT, 'tmp', 'cove-catalog-import.json')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(summary, null, 2))
  console.log('\nWrote', out)
  console.log('DONE')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
