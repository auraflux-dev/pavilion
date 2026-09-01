/**
 * Create StaffAuditLog + BackupRuns CMS collections (idempotent).
 *
 * Usage:
 *   node --env-file=frontend/.env.local scripts/create-ops-cms-collections.mjs
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
    id: 'StaffAuditLog',
    displayName: 'Staff Audit Log',
    fields: [
      { key: 'action', displayName: 'Action', type: 'TEXT' },
      { key: 'actorEmail', displayName: 'Actor email', type: 'TEXT' },
      { key: 'targetEmail', displayName: 'Target email', type: 'TEXT' },
      { key: 'detail', displayName: 'Detail', type: 'TEXT' },
      { key: 'route', displayName: 'Route', type: 'TEXT' },
      { key: 'ip', displayName: 'IP', type: 'TEXT' },
      { key: 'createdAt', displayName: 'Created at', type: 'TEXT' },
    ],
  },
  {
    id: 'PlatformActivity',
    displayName: 'Platform Activity',
    fields: [
      { key: 'category', displayName: 'Category', type: 'TEXT' },
      { key: 'action', displayName: 'Action', type: 'TEXT' },
      { key: 'actorKind', displayName: 'Actor kind', type: 'TEXT' },
      { key: 'emailHash', displayName: 'Email hash', type: 'TEXT' },
      { key: 'emailDomain', displayName: 'Email domain', type: 'TEXT' },
      { key: 'method', displayName: 'Method', type: 'TEXT' },
      { key: 'outcome', displayName: 'Outcome', type: 'TEXT' },
      { key: 'route', displayName: 'Route', type: 'TEXT' },
      { key: 'ip', displayName: 'IP', type: 'TEXT' },
      { key: 'userAgentClass', displayName: 'User agent class', type: 'TEXT' },
      { key: 'correlationId', displayName: 'Correlation ID', type: 'TEXT' },
      { key: 'detail', displayName: 'Detail', type: 'TEXT' },
      { key: 'createdAt', displayName: 'Created at', type: 'TEXT' },
    ],
  },
  {
    id: 'BackupRuns',
    displayName: 'Backup Runs',
    fields: [
      { key: 'createdAt', displayName: 'Created at', type: 'TEXT' },
      { key: 'ok', displayName: 'OK', type: 'BOOLEAN' },
      { key: 'driveFileId', displayName: 'Drive file ID', type: 'TEXT' },
      { key: 'driveLink', displayName: 'Drive link', type: 'TEXT' },
      { key: 'collectionCount', displayName: 'Collection count', type: 'NUMBER' },
      { key: 'itemCount', displayName: 'Item count', type: 'NUMBER' },
      { key: 'note', displayName: 'Note', type: 'TEXT' },
      { key: 'summaryJson', displayName: 'Summary JSON', type: 'TEXT' },
    ],
  },
  {
    id: 'ErrorEvents',
    displayName: 'Error Events',
    fields: [
      { key: 'eventId', displayName: 'Event ID', type: 'TEXT' },
      { key: 'route', displayName: 'Route', type: 'TEXT' },
      { key: 'message', displayName: 'Message', type: 'TEXT' },
      { key: 'stack', displayName: 'Stack', type: 'TEXT' },
      { key: 'tagsJson', displayName: 'Tags JSON', type: 'TEXT' },
      { key: 'extraJson', displayName: 'Extra JSON', type: 'TEXT' },
      { key: 'createdAt', displayName: 'Created at', type: 'TEXT' },
    ],
  },
  {
    id: 'Sponsors',
    displayName: 'Sponsors',
    fields: [
      { key: 'name', displayName: 'Name', type: 'TEXT' },
      { key: 'blurb', displayName: 'Blurb', type: 'TEXT' },
      { key: 'logoUrl', displayName: 'Logo URL', type: 'TEXT' },
      { key: 'websiteUrl', displayName: 'Website URL', type: 'TEXT' },
      { key: 'tier', displayName: 'Tier', type: 'TEXT' },
      { key: 'sortOrder', displayName: 'Sort order', type: 'NUMBER' },
      { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
    ],
  },
]

for (const col of collections) {
  const existing = await wix(`/wix-data/v2/collections/${col.id}`, undefined, 'GET')
  if (existing.ok) {
    console.log(`exists: ${col.id}`)
    continue
  }
  const created = await wix('/wix-data/v2/collections', {
    collection: {
      id: col.id,
      displayName: col.displayName,
      fields: col.fields,
      permissions,
    },
  })
  console.log(created.ok ? `created: ${col.id}` : `fail ${col.id}`, created.status, created.data?.message || '')
}

console.log('Done.')
