/**
 * Ensure Programs / PageContent / StaffRoles enrichment fields exist in Wix CMS.
 *
 * Usage:
 *   node --env-file=frontend/.env.local scripts/ensure-enrichment-cms-fields.mjs
 *
 * Or with Vercel secrets available in the shell environment.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  for (const rel of ['frontend/.env.local', 'frontend/.env.vercel.tmp']) {
    const path = resolve(root, rel)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      const val = m[2].replace(/^["']|["']$/g, '')
      if (val) process.env[m[1]] ??= val
    }
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

async function ensureFields(collectionId, fields) {
  const collection = await wix(`/wix-data/v2/collections/${collectionId}`, null, 'GET')
  if (!collection.ok) {
    console.log(collectionId, 'GET failed', collection.status, JSON.stringify(collection.data).slice(0, 240))
    return
  }
  const existing = new Set((collection.data.collection?.fields ?? []).map((f) => f.key))
  for (const field of fields) {
    if (existing.has(field.key)) {
      console.log('ok', `${collectionId}.${field.key}`)
      continue
    }
    const created = await wix('/wix-data/v2/collections/create-field', {
      dataCollectionId: collectionId,
      field,
    })
    console.log(
      created.ok ? 'Created' : 'FAIL',
      `${collectionId}.${field.key}`,
      created.status,
      JSON.stringify(created.data).slice(0, 200),
    )
  }
}

await ensureFields('Programs', [
  { key: 'dayOfWeek', displayName: 'Day of Week', type: 'TEXT' },
  { key: 'classTime', displayName: 'Class Time', type: 'TEXT' },
  { key: 'durationWeeks', displayName: 'Duration (Weeks)', type: 'NUMBER' },
  { key: 'startDate', displayName: 'Start Date', type: 'DATE' },
  { key: 'endDate', displayName: 'End Date', type: 'DATE' },
  { key: 'image', displayName: 'Flyer / Image URL', type: 'TEXT' },
  { key: 'schedule', displayName: 'Schedule Summary', type: 'TEXT' },
  { key: 'detail', displayName: 'Detail', type: 'TEXT' },
])

await ensureFields('PageContent', [
  { key: 'flyerImage', displayName: 'Flyer / Hero Image URL', type: 'TEXT' },
])

await ensureFields('StaffRoles', [
  { key: 'assignedProgramIds', displayName: 'Assigned Program IDs', type: 'TEXT' },
])

await ensureFields('ProgramEnrollments', [
  { key: 'waitlistPosition', displayName: 'Waitlist Position', type: 'NUMBER' },
])

console.log('Done.')
