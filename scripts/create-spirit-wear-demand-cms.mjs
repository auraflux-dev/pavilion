/**
 * Create SpiritWearDemand CMS collection (idempotent).
 * Captures in-person "wanted size / out of stock" interest for reorder.
 *
 * Usage:
 *   node --env-file=frontend/.env.local scripts/create-spirit-wear-demand-cms.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  const path = resolve(root, 'frontend/.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
  }
}

loadEnv()

const API_KEY = process.env.WIX_API_KEY
const SITE_ID = process.env.WIX_SITE_ID
if (!API_KEY || !SITE_ID) {
  console.error('Missing WIX_API_KEY or WIX_SITE_ID')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: API_KEY,
  'wix-site-id': SITE_ID,
}

async function wix(path, body, method = 'POST') {
  const res = await fetch(`https://www.wixapis.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  return { ok: res.ok, status: res.status, data }
}

const permissions = {
  insert: 'ADMIN',
  update: 'ADMIN',
  remove: 'ADMIN',
  read: 'ADMIN',
}

const collection = {
  id: 'SpiritWearDemand',
  displayName: 'Spirit Wear Demand',
  fields: [
    { key: 'parentName', displayName: 'Parent name', type: 'TEXT' },
    { key: 'parentEmail', displayName: 'Parent email', type: 'TEXT' },
    { key: 'parentPhone', displayName: 'Parent phone', type: 'TEXT' },
    { key: 'coveFamilyCode', displayName: 'Cove family code', type: 'TEXT' },
    { key: 'productId', displayName: 'Product ID', type: 'TEXT' },
    { key: 'productName', displayName: 'Product name', type: 'TEXT' },
    { key: 'variantId', displayName: 'Variant ID', type: 'TEXT' },
    { key: 'sizeLabel', displayName: 'Size / option', type: 'TEXT' },
    { key: 'sku', displayName: 'SKU', type: 'TEXT' },
    { key: 'qty', displayName: 'Quantity wanted', type: 'NUMBER' },
    { key: 'eventNote', displayName: 'Event / table note', type: 'TEXT' },
    { key: 'notes', displayName: 'Notes', type: 'TEXT' },
    { key: 'status', displayName: 'Status', type: 'TEXT' },
    { key: 'source', displayName: 'Source', type: 'TEXT' },
    { key: 'createdByEmail', displayName: 'Logged by', type: 'TEXT' },
    { key: 'createdAt', displayName: 'Created at', type: 'TEXT' },
    { key: 'updatedAt', displayName: 'Updated at', type: 'TEXT' },
    { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
  ],
}

const existing = await wix(`/wix-data/v2/collections/${collection.id}`, undefined, 'GET')
if (existing.ok) {
  console.log(`exists: ${collection.id}`)
} else {
  const created = await wix('/wix-data/v2/collections', {
    collection: {
      id: collection.id,
      displayName: collection.displayName,
      fields: collection.fields,
      permissions,
    },
  })
  console.log(
    created.ok ? `created: ${collection.id}` : `fail ${collection.id}`,
    created.status,
    created.data?.message || '',
  )
}

console.log('Done.')
