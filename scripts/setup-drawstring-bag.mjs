/**
 * Set up Stingrays Drawstring Bag with Color variants + photos, add to spirit wear shop.
 *
 *   node --env-file=frontend/.env.local scripts/setup-drawstring-bag.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const PRODUCT_ID = 'd5730ad6-8d4a-4757-93fa-05aa3ff1e244'
const BRIGHT = resolve(process.env.HOME, 'Downloads/spirit-wear-bright/drawstring')

const COLORS = [
  { label: 'Black', file: '1D-black.png', sku: 'SPIRIT-BAG-BLK' },
  { label: 'Red', file: '2D-red.png', sku: 'SPIRIT-BAG-RED' },
  { label: 'Yellow', file: '3D-yellow.png', sku: 'SPIRIT-BAG-YLW' },
  { label: 'Green', file: '4D-green.png', sku: 'SPIRIT-BAG-GRN' },
  { label: 'Navy', file: '5D-navy.png', sku: 'SPIRIT-BAG-NVY' },
]

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
if (!siteId || !apiKey) {
  console.error('Need WIX_SITE_ID and WIX_API_KEY')
  process.exit(1)
}

const H = {
  Authorization: apiKey,
  'wix-site-id': siteId,
  'Content-Type': 'application/json',
}

async function wix(path, body, method = 'POST') {
  const res = await fetch(`https://www.wixapis.com${path}`, {
    method,
    headers: H,
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

async function uploadPng(filePath, fileName) {
  const buffer = readFileSync(filePath)
  const gen = await wix('/site-media/v1/files/generate-upload-url', {
    mimeType: 'image/png',
    fileName,
    sizeInBytes: String(buffer.length),
    parentFolderId: 'media-root',
    private: false,
  })
  const put = await fetch(gen.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: buffer,
  })
  if (!put.ok) throw new Error(`upload ${fileName}: ${put.status}`)
  const file = gen.file || gen
  // Complete if needed
  const fileId = file.id || gen.fileId
  if (!fileId && gen.uploadToken) {
    const done = await wix('/site-media/v1/files/import', {
      uploadToken: gen.uploadToken,
      mimeType: 'image/png',
      displayName: fileName,
    })
    return done.file?.id || done.id
  }
  // Poll / use returned path
  const fromUrl = gen.uploadUrl
  // Many Wix flows return file in generate response after PUT via get
  if (fileId) return fileId
  // Fallback: import by bytes already uploaded — try files list by name
  throw new Error(`No file id after upload for ${fileName}: ${JSON.stringify(gen).slice(0, 300)}`)
}

async function uploadPngV2(filePath, fileName) {
  const buffer = readFileSync(filePath)
  const genRes = await fetch('https://www.wixapis.com/site-media/v1/files/generate-upload-url', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      mimeType: 'image/png',
      fileName,
      sizeInBytes: String(buffer.length),
      parentFolderId: 'media-root',
      private: false,
    }),
  })
  const gen = await genRes.json()
  if (!genRes.ok || !gen.uploadUrl) throw new Error(`gen upload: ${JSON.stringify(gen).slice(0, 300)}`)
  const put = await fetch(gen.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: buffer,
  })
  if (!put.ok) throw new Error(`put upload ${put.status}`)
  // Response may include file id in uploadUrl path or gen.file
  let id = gen.file?.id || gen.fileId
  if (!id && put.headers.get('content-type')?.includes('json')) {
    try {
      const body = await put.json()
      id = body.file?.id || body.id
    } catch {
      /* ignore */
    }
  }
  if (!id) {
    // Parse media id from upload URL query/path patterns used by Wix
    const m = String(gen.uploadUrl).match(/([a-f0-9]{10,}_[a-f0-9]+~mv2\.png)/i)
    if (m) id = m[1]
  }
  if (!id) {
    // Try complete upload endpoint
    if (gen.uploadToken) {
      const fin = await fetch('https://www.wixapis.com/site-media/v1/files/upload', {
        method: 'POST',
        headers: H,
        body: JSON.stringify({ uploadToken: gen.uploadToken }),
      })
      const fj = await fin.json()
      id = fj.file?.id || fj.id
    }
  }
  if (!id) throw new Error(`Could not resolve media id for ${fileName}`)
  return id
}

async function main() {
  for (const c of COLORS) {
    const p = resolve(BRIGHT, c.file)
    if (!existsSync(p)) {
      console.error('Missing image', p)
      process.exit(1)
    }
  }

  console.log('Uploading color photos…')
  const mediaIds = []
  for (const c of COLORS) {
    const id = await uploadPngV2(resolve(BRIGHT, c.file), `drawstring-${c.label.toLowerCase()}.png`)
    mediaIds.push(id)
    console.log(' ', c.label, id)
  }

  const get = await wix(`/stores/v3/products/${PRODUCT_ID}?fields=MEDIA_ITEMS_INFO`, undefined, 'GET')
  const product = get.product
  if (!product) throw new Error('Drawstring product not found')
  console.log('Product', product.name, 'rev', product.revision)

  const optionName = 'Color'
  const variants = COLORS.map((c, i) => ({
    sku: c.sku,
    visible: true,
    choices: [
      {
        optionChoiceNames: {
          optionName,
          choiceName: c.label,
          renderType: 'TEXT_CHOICES',
        },
      },
    ],
    price: { actualPrice: { amount: '10.00' } },
    inventoryItem: { quantity: 20 },
  }))

  const patchBody = {
    product: {
      id: PRODUCT_ID,
      revision: String(product.revision),
      name: 'Stingrays Drawstring Bag',
      visible: true,
      visibleInPos: true,
      plainDescription:
        '<p>Official SHMS Stingrays drawstring backpack. Choose your color at checkout.</p><p>$10</p>',
      options: [
        {
          name: optionName,
          optionRenderType: 'TEXT_CHOICES',
          choicesSettings: {
            choices: COLORS.map((c) => ({
              choiceType: 'CHOICE_TEXT',
              name: c.label,
            })),
          },
        },
      ],
      variantsInfo: { variants },
      media: {
        itemsInfo: {
          items: mediaIds.map((id) => ({ id })),
        },
        main: { id: mediaIds[4] }, // Navy as default hero
      },
    },
  }

  // Prefer inventory-aware update endpoint when available
  let updated
  try {
    updated = await wix(`/stores/v3/products/${PRODUCT_ID}`, patchBody, 'PATCH')
  } catch (err) {
    console.warn('PATCH with options failed, trying without media…', String(err.message).slice(0, 200))
    delete patchBody.product.media
    updated = await wix(`/stores/v3/products/${PRODUCT_ID}`, patchBody, 'PATCH')
  }
  const rev = updated.product?.revision
  console.log('Updated variants, rev', rev)

  // Attach media in a second patch if first failed without media
  if (!patchBody.product.media || !updated.product?.media) {
    const g2 = await wix(`/stores/v3/products/${PRODUCT_ID}`, undefined, 'GET')
    await wix(
      `/stores/v3/products/${PRODUCT_ID}`,
      {
        product: {
          id: PRODUCT_ID,
          revision: String(g2.product.revision),
          media: {
            itemsInfo: { items: mediaIds.map((id) => ({ id })) },
            main: { id: mediaIds[4] },
          },
        },
      },
      'PATCH',
    )
    console.log('Media attached')
  }

  // Allowlist
  const rows = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'SiteSettings',
    query: { filter: { key: { $eq: 'spiritWearProductIds' } }, paging: { limit: 1 } },
  })
  const item = rows.dataItems?.[0]
  if (item) {
    const ids = String(item.data.value || '')
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!ids.includes(PRODUCT_ID)) ids.push(PRODUCT_ID)
    const data = { ...item.data, value: ids.join(',') }
    await wix(
      `/wix-data/v2/items/${item.id}`,
      { dataCollectionId: 'SiteSettings', dataItem: { id: item.id, data } },
      'PUT',
    )
    console.log('spiritWearProductIds', data.value)
  } else {
    console.warn('SiteSettings spiritWearProductIds row missing — update defaults in code')
  }

  // Ensure inventory rows exist (variants start out of stock without them)
  const final = await wix(
    `/stores/v3/products/${PRODUCT_ID}?fields=MEDIA_ITEMS_INFO`,
    undefined,
    'GET',
  )
  const vs = final.product?.variantsInfo?.variants || []
  const invQ = await wix('/stores/v3/inventory-items/query', {
    query: { filter: { productId: { $eq: PRODUCT_ID } }, paging: { limit: 20 } },
  })
  const existing = new Set(
    (invQ.inventoryItems || []).map((i) => String(i.variantId || '')),
  )
  const LOCATION = (invQ.inventoryItems || [])[0]?.locationId || '68892ef3-3715-4ce3-8a6e-0561350f8860'
  for (const v of vs) {
    if (existing.has(v.id)) continue
    await wix('/stores/v3/inventory-items', {
      inventoryItem: {
        productId: PRODUCT_ID,
        variantId: v.id,
        locationId: LOCATION,
        quantity: 25,
        trackQuantity: true,
      },
    })
    console.log('Inventory created for', v.sku)
  }

  console.log(
    'Variants:',
    vs.map((v) => ({
      id: v.id,
      sku: v.sku,
      choice: v.choices?.[0]?.optionChoiceNames?.choiceName,
      price: v.price?.actualPrice?.amount,
    })),
  )
  console.log('DONE')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
