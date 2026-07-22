/**
 * Create Newsletters + PortalCalendarEvents Wix CMS collections (idempotent).
 *
 * Usage (from repo root):
 *   node --env-file=frontend/.env.local scripts/create-portal-cms-collections.mjs
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

const collections = [
  {
    id: 'Newsletters',
    displayName: 'Newsletters',
    fields: [
      { key: 'title', displayName: 'Title', type: 'TEXT' },
      { key: 'body', displayName: 'Body', type: 'TEXT' },
      { key: 'fromName', displayName: 'From name', type: 'TEXT' },
      { key: 'audience', displayName: 'Audience', type: 'TEXT' },
      { key: 'grade', displayName: 'Grade', type: 'TEXT' },
      { key: 'publishedAt', displayName: 'Published at', type: 'TEXT' },
      { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
    ],
  },
  {
    id: 'PortalCalendarEvents',
    displayName: 'Portal Calendar Events',
    fields: [
      { key: 'title', displayName: 'Title', type: 'TEXT' },
      { key: 'subtitle', displayName: 'Subtitle', type: 'TEXT' },
      { key: 'startAt', displayName: 'Start at', type: 'TEXT' },
      { key: 'endAt', displayName: 'End at', type: 'TEXT' },
      { key: 'href', displayName: 'Link', type: 'TEXT' },
      { key: 'audience', displayName: 'Audience', type: 'TEXT' },
      { key: 'grade', displayName: 'Grade', type: 'TEXT' },
      { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
    ],
  },
]

async function ensureCollection(def) {
  const existing = await wix(`/wix-data/v2/collections/${encodeURIComponent(def.id)}`, null, 'GET')
  if (existing.ok) {
    console.log(`✓ ${def.id} already exists`)
    return
  }
  const created = await wix('/wix-data/v2/collections', {
    collection: {
      id: def.id,
      displayName: def.displayName,
      fields: def.fields,
      permissions,
    },
  })
  if (created.ok) {
    console.log(`✓ Created ${def.id}`)
    return
  }
  console.error(`✗ Failed ${def.id}:`, created.status, JSON.stringify(created.data).slice(0, 400))
}

for (const def of collections) {
  await ensureCollection(def)
}

// Add powrEmbedHtml field to Surveys if missing (full collection PUT)
const surveys = await wix('/wix-data/v2/collections/Surveys', null, 'GET')
if (surveys.ok) {
  const collection = surveys.data?.collection
  const fields = collection?.fields ?? []
  const hasPowr = fields.some((f) => f.key === 'powrEmbedHtml')
  if (!hasPowr) {
    const nextFields = [
      ...fields.filter((f) => !String(f.key ?? '').startsWith('_')),
      { key: 'powrEmbedHtml', displayName: 'POWR embed HTML', type: 'TEXT' },
    ]
    const updated = await wix(
      '/wix-data/v2/collections',
      { collection: { ...collection, fields: nextFields } },
      'PUT',
    )
    if (updated.ok) console.log('✓ Added Surveys.powrEmbedHtml')
    else
      console.warn(
        '⚠ Could not add Surveys.powrEmbedHtml:',
        updated.status,
        JSON.stringify(updated.data).slice(0, 300),
      )
  } else {
    console.log('✓ Surveys.powrEmbedHtml already present')
  }
} else {
  console.warn('⚠ Surveys collection not found — skip powrEmbedHtml field')
}

console.log('Done.')
