/**
 * Set up Stingrays Long Sleeve with Style + Size variants from Aug 2025 inventory photos.
 *
 *   node --env-file=frontend/.env.local scripts/setup-long-sleeve.mjs
 *
 * Source: Stone Hill Spirit Wear - 08_25_2025 Logos.docx (LONG SLEEVES 1LS–6LS)
 */
import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const PRODUCT_ID = 'f3eedab0-bfd5-4f30-ad8f-7586b783b78f'
const PRICE = '22.00'
const IMG_DIR = resolve(root, 'tmp/spirit-wear-logos')
const DOC_MEDIA = resolve(
  process.env.HOME,
  'Downloads/Stone Hill Spirit Wear - 08_25_2025 Logos.docx',
)

/** Inventory from the Logos doc — qty 1 each listed size. */
const STYLES = [
  {
    code: '1LS',
    label: 'Black',
    file: 'image5.jpg',
    sku: 'BLK',
    sizes: ['Youth L', 'Adult S', 'Adult L', 'Adult XL'],
  },
  {
    code: '2LS',
    label: 'Grey Circular',
    file: 'image1.jpg',
    sku: 'GRY-CIR',
    sizes: ['Adult M'],
  },
  {
    code: '3LS',
    label: 'Grey/Burgundy',
    file: 'image10.jpg',
    sku: 'GRY-BRG',
    // Doc: YM, YL, S, M (?), L, XL — include Adult M
    sizes: ['Youth M', 'Youth L', 'Adult S', 'Adult M', 'Adult L', 'Adult XL'],
  },
  {
    code: '4LS',
    label: 'Grey Stingrays',
    file: 'image9.jpg',
    sku: 'GRY-STG',
    sizes: ['Adult M'],
  },
  {
    code: '5LS',
    label: 'White/Green',
    file: 'image12.jpg',
    sku: 'WHT-GRN',
    sizes: ['Youth L', 'Adult XL'],
  },
  {
    code: '6LS',
    label: 'Heather Green',
    file: 'image13.jpg',
    sku: 'GRN-MRN',
    sizes: ['Adult S'],
  },
]

const SIZE_ORDER = ['Youth M', 'Youth L', 'Adult S', 'Adult M', 'Adult L', 'Adult XL']

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
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text.slice(0, 800)}`)
  return json
}

async function uploadJpeg(filePath, fileName) {
  const buffer = readFileSync(filePath)
  const gen = await wix('/site-media/v1/files/generate-upload-url', {
    mimeType: 'image/jpeg',
    fileName,
    sizeInBytes: String(buffer.length),
    parentFolderId: 'media-root',
    private: false,
  })
  if (!gen.uploadUrl) throw new Error(`gen upload: ${JSON.stringify(gen).slice(0, 300)}`)
  const put = await fetch(gen.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: buffer,
  })
  const putBody = await put.json().catch(() => ({}))
  if (!put.ok) throw new Error(`put upload ${put.status}: ${JSON.stringify(putBody).slice(0, 400)}`)
  const file = putBody.file || gen.file
  const id = file?.id || file?.media?.image?.image?.id
  if (!id) throw new Error(`No media id for ${fileName}: ${JSON.stringify(putBody).slice(0, 500)}`)
  return id
}

function sizeSku(size) {
  return size
    .replace('Youth ', 'Y')
    .replace('Adult ', '')
    .replace(/\s+/g, '')
    .toUpperCase()
}

function variantLabel(style, size) {
  return `${style.label} · ${size}`
}

async function ensureImages() {
  mkdirSync(IMG_DIR, { recursive: true })
  for (const s of STYLES) {
    const dest = resolve(IMG_DIR, s.file)
    if (existsSync(dest)) continue
    // Fall back: extract from docx if previews missing
    if (!existsSync(DOC_MEDIA)) throw new Error(`Missing ${dest} and docx`)
  }
}

async function main() {
  await ensureImages()
  for (const s of STYLES) {
    const p = resolve(IMG_DIR, s.file)
    if (!existsSync(p)) throw new Error(`Missing image ${p}`)
  }

  console.log('Uploading long-sleeve logo photos…')
  const mediaByStyle = {}
  const mediaIds = []
  for (const s of STYLES) {
    const id = await uploadJpeg(resolve(IMG_DIR, s.file), `longsleeve-${s.code.toLowerCase()}.jpg`)
    mediaByStyle[s.code] = id
    mediaIds.push(id)
    console.log(' ', s.code, s.label, id)
  }

  const get = await wix(`/stores/v3/products/${PRODUCT_ID}`, undefined, 'GET')
  const product = get.product
  if (!product) throw new Error('Long sleeve product not found')
  console.log('Product', product.name, 'rev', product.revision)

  const optionName = 'Style / Size'
  const stocked = []
  for (const style of STYLES) {
    for (const size of SIZE_ORDER) {
      if (!style.sizes.includes(size)) continue
      stocked.push({ style, size })
    }
  }

  const choices = stocked.map(({ style, size }) => ({
    choiceType: 'CHOICE_TEXT',
    name: variantLabel(style, size),
  }))

  const variants = stocked.map(({ style, size }) => ({
    sku: `SPIRIT-LS-${style.sku}-${sizeSku(size)}`,
    visible: true,
    choices: [
      {
        optionChoiceNames: {
          optionName,
          choiceName: variantLabel(style, size),
          renderType: 'TEXT_CHOICES',
        },
      },
    ],
    price: { actualPrice: { amount: PRICE } },
    inventoryItem: { quantity: 1 },
  }))

  const mainMediaId = mediaByStyle['3LS'] // Grey/Burgundy — current hero style

  const patchBody = {
    product: {
      id: PRODUCT_ID,
      revision: String(product.revision),
      name: 'Stingrays Long Sleeve Shirt',
      visible: true,
      visibleInPos: true,
      plainDescription:
        '<p>Official Stone Hill Middle School Stingrays long sleeve. Pick style and size — inventory from Aug 2025 stock.</p><p>$22</p><p>Photos are logo close-ups until full garment shots are available.</p>',
      options: [
        {
          name: optionName,
          optionRenderType: 'TEXT_CHOICES',
          choicesSettings: { choices },
        },
      ],
      variantsInfo: { variants },
      media: {
        itemsInfo: { items: mediaIds.map((id) => ({ id })) },
        main: { id: mainMediaId },
      },
    },
  }

  let updated
  try {
    updated = await wix(`/stores/v3/products/${PRODUCT_ID}`, patchBody, 'PATCH')
  } catch (err) {
    console.warn('PATCH with media failed, retrying without media…', String(err.message).slice(0, 250))
    delete patchBody.product.media
    updated = await wix(`/stores/v3/products/${PRODUCT_ID}`, patchBody, 'PATCH')
  }
  console.log('Updated variants, rev', updated.product?.revision)

  if (!patchBody.product.media) {
    const g2 = await wix(`/stores/v3/products/${PRODUCT_ID}`, undefined, 'GET')
    await wix(
      `/stores/v3/products/${PRODUCT_ID}`,
      {
        product: {
          id: PRODUCT_ID,
          revision: String(g2.product.revision),
          media: {
            itemsInfo: { items: mediaIds.map((id) => ({ id })) },
            main: { id: mainMediaId },
          },
        },
      },
      'PATCH',
    )
    console.log('Media attached')
  }

  const final = await wix(`/stores/v3/products/${PRODUCT_ID}`, undefined, 'GET')
  const vs = final.product?.variantsInfo?.variants || []
  console.log(
    'Variants:',
    vs.map((v) => ({
      sku: v.sku,
      choice: v.choices?.[0]?.optionChoiceNames?.choiceName,
      price: v.price?.actualPrice?.amount,
    })),
  )

  // Inventory rows
  const invQ = await wix('/stores/v3/inventory-items/query', {
    query: { filter: { productId: { $eq: PRODUCT_ID } }, paging: { limit: 100 } },
  })
  const byVariant = new Map(
    (invQ.inventoryItems || []).map((i) => [String(i.variantId || ''), i]),
  )
  const LOCATION =
    (invQ.inventoryItems || [])[0]?.locationId || '68892ef3-3715-4ce3-8a6e-0561350f8860'

  for (const v of vs) {
    const existing = byVariant.get(v.id)
    if (existing) {
      await wix(
        `/stores/v3/inventory-items/${existing.id}`,
        {
          inventoryItem: {
            id: existing.id,
            revision: existing.revision,
            quantity: 1,
            trackQuantity: true,
          },
        },
        'PATCH',
      )
      console.log('Inventory updated', v.sku)
    } else {
      await wix('/stores/v3/inventory-items', {
        inventoryItem: {
          productId: PRODUCT_ID,
          variantId: v.id,
          locationId: LOCATION,
          quantity: 1,
          trackQuantity: true,
        },
      })
      console.log('Inventory created', v.sku)
    }
  }

  // Copy originals into public for reference (optional local cache)
  const pub = resolve(root, 'frontend/public/spirit-wear/long-sleeve')
  mkdirSync(pub, { recursive: true })
  for (const s of STYLES) {
    copyFileSync(resolve(IMG_DIR, s.file), resolve(pub, `${s.code.toLowerCase()}.jpg`))
  }
  console.log('Local copies →', pub)
  console.log('DONE —', vs.length, 'style/size variants @ $' + PRICE)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
