/**
 * Ensure DiscountCodes CMS collection + discountPercent on Membership Tiers.
 *
 * Usage (from repo root):
 *   node --env-file=frontend/.env.local scripts/seed-discount-codes.mjs
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
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`)
    err.status = res.status
    throw err
  }
  return data
}

async function ensureDiscountCodesCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'DiscountCodes',
        displayName: 'Discount Codes',
        fields: [
          { key: 'code', displayName: 'Code', type: 'TEXT' },
          { key: 'name', displayName: 'Name', type: 'TEXT' },
          { key: 'percent', displayName: 'Percent', type: 'NUMBER' },
          { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
          { key: 'issuedToEmail', displayName: 'Issued To Email', type: 'TEXT' },
          { key: 'membershipTier', displayName: 'Membership Tier', type: 'TEXT' },
          { key: 'wixCouponId', displayName: 'Wix Coupon ID', type: 'TEXT' },
          { key: 'usageLimit', displayName: 'Usage Limit', type: 'NUMBER' },
          { key: 'note', displayName: 'Note', type: 'TEXT' },
        ],
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ADMIN',
        },
      },
    })
    console.log('Created DiscountCodes collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('DiscountCodes collection already exists')
      return
    }
    throw err
  }
}

async function ensureTierDiscountPercentField() {
  try {
    await wix('/wix-data/v2/collections/create-field', {
      dataCollectionId: 'MembershipTiers',
      field: {
        key: 'discountPercent',
        displayName: 'Discount Percent',
        type: 'NUMBER',
      },
    })
    console.log('Added discountPercent to MembershipTiers')
  } catch (err) {
    if (/already exists|ALREADY_EXISTS|409/i.test(String(err.message))) {
      console.log('discountPercent field already exists')
      return
    }
    console.warn('discountPercent field:', err.message.slice(0, 200))
  }
}

const TIER_DEFAULTS = { ruby: 5, supreme: 10, pearl: 15 }

async function seedTierDiscountPercents() {
  const res = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'MembershipTiers',
    query: { paging: { limit: 50 } },
  })
  for (const item of res.dataItems ?? []) {
    const tierId = String(item.data?.tierId ?? '').toLowerCase()
    const current = Number(item.data?.discountPercent ?? 0)
    const target = TIER_DEFAULTS[tierId]
    if (!target) continue
    if (current >= 5 && current <= 75) {
      console.log(`  ${tierId}: discountPercent=${current} (keep)`)
      continue
    }
    await wix(
      `/wix-data/v2/items/${item.id}`,
      {
        dataCollectionId: 'MembershipTiers',
        patch: {
          dataItemId: item.id,
          fieldModifications: [
            {
              fieldPath: 'discountPercent',
              action: 'SET_FIELD',
              setFieldOptions: { value: target },
            },
          ],
        },
      },
      'PATCH'
    )
    console.log(`  ${tierId}: set discountPercent=${target}`)
  }
}

await ensureDiscountCodesCollection()
await ensureTierDiscountPercentField()
await seedTierDiscountPercents()
console.log('Done.')
