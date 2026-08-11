#!/usr/bin/env node
/**
 * Create/update Stone Hill car magnet @ $10 + Faculty $20 CMS.
 *
 *   node --env-file=frontend/.env.local scripts/create-car-magnet-product.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const siteId = process.env.WIX_SITE_ID
const apiKey = process.env.WIX_API_KEY
if (!siteId || !apiKey) {
  console.error('Need WIX_SITE_ID and WIX_API_KEY')
  process.exit(1)
}

const H = {
  Authorization: apiKey,
  'wix-site-id': siteId,
  'Content-Type': 'application/json',
}
const WIX_PRODUCTS = 'https://www.wixapis.com/stores/v3/products'
const WIX_PRODUCTS_INV = 'https://www.wixapis.com/stores/v3/products-with-inventory'
const WIX_DATA = 'https://www.wixapis.com/wix-data/v2/items'
const SKU = 'SHMS-CAR-MAGNET'
const NAME = 'Stone Hill Car Magnet'
const PRICE = '10.00'
const DESC =
  '<p>Official Stone Hill Middle School PTO car magnet. Show your Stingray pride on the go.</p><p>$10 · Available in the spirit shop.</p>'
const IMAGE = path.join(
  ROOT,
  'promo-videos/assets/membership-tiers/stills/car_magnet_mockup.png'
)

async function queryCollection(collectionId, filter) {
  const res = await fetch(`${WIX_DATA}/query`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      dataCollectionId: collectionId,
      query: { filter, paging: { limit: 20 } },
    }),
  })
  if (!res.ok) throw new Error(`query ${collectionId}: ${await res.text()}`)
  return (await res.json()).dataItems ?? []
}

async function updateItem(collectionId, id, data) {
  const res = await fetch(`${WIX_DATA}/${id}`, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ dataCollectionId: collectionId, dataItem: { id, data } }),
  })
  if (!res.ok) throw new Error(`update ${collectionId}: ${await res.text()}`)
}

async function uploadImage(filePath) {
  const buffer = fs.readFileSync(filePath)
  const gen = await fetch(
    'https://www.wixapis.com/site-media/v1/files/generate-upload-url',
    {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        mimeType: 'image/png',
        fileName: path.basename(filePath),
        sizeInBytes: String(buffer.length),
        parentFolderId: 'media-root',
        private: false,
      }),
    }
  )
  const genBody = await gen.json()
  if (!gen.ok || !genBody.uploadUrl) throw new Error(JSON.stringify(genBody).slice(0, 200))
  const put = await fetch(genBody.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: buffer,
  })
  const putBody = await put.json()
  if (!put.ok || !putBody.file?.url) throw new Error(JSON.stringify(putBody).slice(0, 200))
  return putBody.file
}

async function main() {
  // Faculty $20
  const faculty = (await queryCollection('MembershipTiers', { tierId: { $eq: 'faculty' } }))[0]
  if (faculty?.id) {
    await updateItem('MembershipTiers', faculty.id, {
      ...faculty.data,
      price: 20,
      description:
        'Faculty and staff memberships are $20 for the school year. We appreciate everything SHMS PTO educators do for our students.',
    })
    console.log('✓ Faculty → $20')
  }

  // Find or create magnet (no HTML description on create — use plainDescription after)
  let product = null
  const q = await fetch(`${WIX_PRODUCTS}/query`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      query: { filter: { name: { $eq: NAME } }, paging: { limit: 3 } },
    }),
  })
  const qd = await q.json()
  product = qd.products?.[0] || null

  if (!product) {
    const body = {
      product: {
        name: NAME,
        productType: 'PHYSICAL',
        physicalProperties: {},
        visible: true,
        visibleInPos: true,
        variantsInfo: {
          variants: [
            {
              sku: SKU,
              visible: true,
              price: { actualPrice: { amount: PRICE } },
              inventoryItem: { quantity: 50 },
            },
          ],
        },
      },
    }
    const r = await fetch(WIX_PRODUCTS_INV, {
      method: 'POST',
      headers: H,
      body: JSON.stringify(body),
    })
    const text = await r.text()
    if (!r.ok) throw new Error(`create: ${text.slice(0, 400)}`)
    product = JSON.parse(text).product
    console.log('✓ Created', product.id)
  } else {
    console.log('✓ Exists', product.id)
  }

  const fresh = await fetch(`${WIX_PRODUCTS}/${product.id}`, { headers: H }).then((r) =>
    r.json()
  )
  let revision = String(fresh.product.revision)

  if (fs.existsSync(IMAGE)) {
    const file = await uploadImage(IMAGE)
    const pr = await fetch(`${WIX_PRODUCTS}/${product.id}`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({
        product: {
          id: product.id,
          revision,
          plainDescription: DESC,
          media: { itemsInfo: { items: [{ id: file.id }] } },
        },
      }),
    })
    if (!pr.ok) console.warn('image/desc', (await pr.text()).slice(0, 200))
    else {
      revision = String((await pr.json()).product.revision)
      console.log('✓ Image + description')
    }
  }

  // Allowlist
  const rows = await queryCollection('SiteSettings', {
    key: { $eq: 'spiritWearProductIds' },
  })
  const row = rows[0]
  const data = row?.data || {}
  const ids = String(data.value ?? '')
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (!ids.includes(product.id)) ids.push(product.id)
  const value = ids.join(',')
  if (row?.id) await updateItem('SiteSettings', row.id, { ...data, key: 'spiritWearProductIds', value })
  console.log('✓ spiritWearProductIds', value)
  console.log('DONE', product.id)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
