/**
 * CMS find/replace: bare "SHMS" → "SHMS PTO" (never leave SHMS without PTO).
 * Also strips LCPS from PageContent eyebrows.
 *
 * Usage (from repo root):
 *   node --env-file=frontend/.env.local scripts/fix-shms-pto-branding.mjs
 *   node --env-file=frontend/.env.local scripts/fix-shms-pto-branding.mjs --apply
 *
 * Default is dry-run (prints diffs only). Pass --apply to write CMS updates.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const APPLY = process.argv.includes('--apply')

function loadEnv() {
  const path = resolve(root, 'frontend/.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    const value = m[2].replace(/^["']|["']$/g, '')
    // Prefer non-empty .env.local over empty --env-file / shell placeholders
    if (!process.env[m[1]] || process.env[m[1]].trim() === '') {
      process.env[m[1]] = value
    }
  }
}

loadEnv()

const API_KEY = process.env.WIX_API_KEY
const SITE_ID = process.env.WIX_SITE_ID
if (!API_KEY || !SITE_ID) {
  console.error('Missing WIX_API_KEY or WIX_SITE_ID (use --env-file=frontend/.env.local)')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: API_KEY,
  'wix-site-id': SITE_ID,
}

/** Collections + string fields that hold public / portal marketing copy */
const TARGETS = [
  {
    id: 'PageContent',
    fields: [
      'eyebrow',
      'title',
      'body',
      'sectionTitle',
      'sectionBody',
      'bullets',
      'ctaLabel',
    ],
    label: (row) => `page=${row.data?.page ?? row.id}`,
  },
  {
    id: 'FundraisingCTAs',
    fields: ['title', 'description', 'ctaLabel'],
    label: (row) => `cta=${row.data?.title ?? row.id}`,
  },
  {
    id: 'FAQItems',
    fields: ['question', 'answer'],
    label: (row) => `faq=${String(row.data?.question ?? '').slice(0, 40)}`,
  },
  {
    id: 'NavLinks',
    fields: ['label'],
    label: (row) => `nav=${row.data?.label ?? row.id}`,
  },
  {
    id: 'SiteSettings',
    fields: ['value'],
    label: (row) => `setting=${row.data?.key ?? row.id}`,
  },
  {
    id: 'VolunteerOpportunities',
    fields: ['title', 'description', 'location'],
    label: (row) => `vol=${row.data?.title ?? row.id}`,
  },
  {
    id: 'PortalCalendarEvents',
    fields: ['title', 'description', 'location'],
    label: (row) => `cal=${row.data?.title ?? row.id}`,
  },
  {
    id: 'AnnouncementBar',
    fields: ['text'],
    label: (row) => `announce`,
  },
]

/**
 * Rewrite branding in a string. Safe to re-run.
 * - Bare SHMS → SHMS PTO (codes like SHMSREEF10 / SHMSCOVE / emails untouched)
 * - LCPS removed from marketing phrasing
 */
function brandifyShmsPto(input) {
  if (typeof input !== 'string' || !input) return input
  let s = input

  // Protect codes / domains / paths that legitimately contain SHMS without " PTO"
  const protectedChunks = []
  const protect = (re) => {
    s = s.replace(re, (m) => {
      protectedChunks.push(m)
      return `«P${protectedChunks.length - 1}»`
    })
  }
  protect(/shmspto\.org/gi)
  protect(/@shmspto\b/gi)
  protect(/SHMSREEF\d+/g)
  protect(/SHMSLAGOON\d+/g)
  protect(/SHMSTIDE\d+/g)
  protect(/SHMSCOVE(?::\d+)?/gi)
  protect(/pass\.org\.shmspto\b/gi)
  protect(/\/shms-[a-z0-9._-]+/gi)
  protect(/shms-logo/gi)

  s = s
    .replace(/\s*[·•|]\s*LCPS\b/gi, '')
    .replace(/\bLCPS\b/gi, '')
    .replace(/\bSHMS\b(?!\s+PTO)/g, 'SHMS PTO')
    .replace(/SHMS PTO PTO/g, 'SHMS PTO')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()

  s = s.replace(/«P(\d+)»/g, (_, i) => protectedChunks[Number(i)])
  return s
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

async function queryAll(collectionId) {
  const items = []
  for (let i = 0; i < 50; i++) {
    let data
    try {
      data = await wix('/wix-data/v2/items/query', {
        dataCollectionId: collectionId,
        query: {
          paging: { limit: 100, offset: items.length },
        },
      })
    } catch (err) {
      if (err.status === 404) return null
      throw err
    }
    const batch = data.dataItems ?? data.items ?? []
    items.push(...batch)
    if (batch.length < 100) break
  }
  return items
}

async function patchFields(collectionId, item, values) {
  const fieldModifications = Object.entries(values).map(([fieldPath, value]) => ({
    fieldPath,
    action: 'SET_FIELD',
    setFieldOptions: { value },
  }))
  await wix(
    `/wix-data/v2/items/${item.id}`,
    {
      dataCollectionId: collectionId,
      patch: {
        dataItemId: item.id,
        fieldModifications,
      },
    },
    'PATCH',
  )
}

function preview(before, after) {
  if (before === after) return null
  const a = before.length > 120 ? `${before.slice(0, 117)}…` : before
  const b = after.length > 120 ? `${after.slice(0, 117)}…` : after
  return { before: a, after: b }
}

async function main() {
  console.log(APPLY ? 'APPLY mode — writing CMS updates' : 'DRY RUN — pass --apply to write')
  let changedRows = 0
  let changedFields = 0

  for (const target of TARGETS) {
    let rows
    try {
      rows = await queryAll(target.id)
    } catch (err) {
      console.warn(`Skip ${target.id}:`, err.message)
      continue
    }
    if (rows == null) {
      console.log(`Skip ${target.id} (collection missing)`)
      continue
    }
    console.log(`\n${target.id}: ${rows.length} row(s)`)

    for (const item of rows) {
      const data = item.data ?? item
      const updates = {}
      const diffs = []
      for (const field of target.fields) {
        const raw = data[field]
        if (typeof raw !== 'string' || !raw.trim()) continue
        const next = brandifyShmsPto(raw)
        if (next === raw) continue
        updates[field] = next
        diffs.push({ field, ...preview(raw, next) })
      }
      if (!Object.keys(updates).length) continue

      changedRows += 1
      changedFields += Object.keys(updates).length
      console.log(`  • ${target.label({ data, id: item.id })}`)
      for (const d of diffs) {
        console.log(`      ${d.field}:`)
        console.log(`        - ${JSON.stringify(d.before)}`)
        console.log(`        + ${JSON.stringify(d.after)}`)
      }

      if (APPLY) {
        try {
          await patchFields(target.id, item, updates)
          console.log('      ✓ updated')
        } catch (err) {
          console.error('      ✗', err.message)
        }
      }
    }
  }

  console.log(
    `\nDone. ${changedFields} field(s) across ${changedRows} row(s)${APPLY ? ' written' : ' would change (dry-run)'}.`,
  )
  if (!APPLY && changedRows > 0) {
    console.log('Re-run with --apply to write these updates to Wix CMS.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
