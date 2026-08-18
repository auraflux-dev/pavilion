/**
 * Clean then sanitize Students (and matching Memberships emails).
 *
 * Clean:
 *  - Archive role-mailbox / demo students (@shmspto.org)
 *  - Archive exact duplicate active rows (same child + email + grade)
 *  - Archive no-email rows that duplicate an emailed child
 *  - Archive typo-email duplicate households (e.g. karnki vs karanki)
 *  - Archive parent-as-extra-child rows
 *  - Archive LCPS staff-as-student (parent name = child, or parent "Not Applicable")
 * Sanitize:
 *  - Lowercase / trim parent emails, fix common domain typos
 *  - Trim names, clear placeholder parent names
 *  - Incoming 5th → 6th, empty membershipTier → free
 *
 * Usage (from repo root):
 *   node --env-file=frontend/.env.local scripts/sanitize-students-directory.mjs
 *   node --env-file=frontend/.env.local scripts/sanitize-students-directory.mjs --apply
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const apply = process.argv.includes('--apply')

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

const DOMAIN_FIX = {
  'yahoo.comm': 'yahoo.com',
  'yhaoo.fr': 'yahoo.fr',
  'hotmail.cm': 'hotmail.com',
  'gmail.con': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'hmail.com': 'gmail.com',
}

const PLACEHOLDER_NAME =
  /^(not applicable|n\/a|na|none|null|n\.a\.|-|\.|unknown|tbd)$/i

async function wix(path, body, method = 'POST') {
  const res = await fetch(`https://www.wixapis.com${path}`, {
    method,
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
      'wix-site-id': siteId,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const err = new Error(json.message || text || res.statusText)
    err.status = res.status
    throw err
  }
  return json
}

async function loadAll(collection) {
  const out = []
  const seen = new Set()
  let offset = 0
  for (;;) {
    const data = await wix('/wix-data/v2/items/query', {
      dataCollectionId: collection,
      query: { paging: { limit: 100, offset } },
    })
    const batch = data.dataItems ?? data.items ?? []
    for (const item of batch) {
      const id = String(item.id ?? item.data?._id ?? '')
      if (id && seen.has(id)) continue
      if (id) seen.add(id)
      if (item.data) out.push({ _id: id, ...item.data })
      else out.push(item)
    }
    if (batch.length < 100) break
    offset += 100
  }
  return out
}

function collapse(s) {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function lower(s) {
  return collapse(s).toLowerCase()
}

function kidName(row) {
  return lower(`${row.firstName ?? ''} ${row.lastName ?? ''}`)
}

function parentName(row) {
  return lower(`${row.parentFirstName ?? ''} ${row.parentLastName ?? ''}`)
}

function sanitizeEmail(raw) {
  const e = lower(raw)
  if (!e || !e.includes('@')) return e
  const at = e.lastIndexOf('@')
  const local = e.slice(0, at)
  const domain = e.slice(at + 1)
  return `${local}@${DOMAIN_FIX[domain] || domain}`
}

function sanitizePersonName(raw) {
  const v = collapse(raw)
  if (!v || PLACEHOLDER_NAME.test(v)) return ''
  return v
}

function normGrade(raw) {
  const g = collapse(raw)
    .toLowerCase()
    .replace(/th$/, '')
  if (g === '5') return '6'
  if (g === '6' || g === '7' || g === '8') return g
  return collapse(raw)
}

function normTier(raw) {
  const t = lower(raw)
  if (!t || t === 'none') return 'free'
  if (t === 'ruby') return 'reef'
  if (t === 'supreme') return 'lagoon'
  if (t === 'pearl' || t === 'trench') return 'tide'
  return t
}

function richness(row) {
  let n = 0
  if (row.familyProfileConfirmedAt) n += 16
  if (collapse(row.parentPhone)) n += 8
  if (collapse(row.grade)) n += 4
  if (collapse(row.coveFamilyCode)) n += 4
  if (collapse(row.jumbulaSid)) n += 4
  if (row.storeCardBalance) n += 2
  if (collapse(row.parentEmail)) n += 2
  return n
}

function parseTime(v) {
  if (v == null || v === '') return 0
  if (typeof v === 'object' && v && '$date' in v) return Date.parse(String(v.$date)) || 0
  return Date.parse(String(v)) || 0
}

function pickKeeper(rows) {
  return [...rows].sort((a, b) => {
    const r = richness(b) - richness(a)
    if (r) return r
    return parseTime(b._updatedDate) - parseTime(a._updatedDate)
  })[0]
}

async function updateItem(collection, row, patch) {
  const data = { ...row, ...patch }
  delete data._id
  await wix(
    `/wix-data/v2/items/${row._id}`,
    {
      dataCollectionId: collection,
      dataItem: {
        id: row._id,
        data: { ...data, _id: row._id },
      },
    },
    'PUT',
  )
}

function preview(row, extra = {}) {
  return {
    id: row._id,
    email: row.parentEmail || '(none)',
    kid: `${collapse(row.firstName)} ${collapse(row.lastName)}`.trim(),
    grade: row.grade || '',
    ...extra,
  }
}

function planStudents(students) {
  const working = students.map((s) => ({
    ...s,
    parentEmail: sanitizeEmail(s.parentEmail),
  }))

  const archive = new Map()
  const patches = new Map()

  function markArchive(row, reason) {
    if (!row?._id || archive.has(row._id)) return
    archive.set(row._id, reason)
  }

  function markPatch(id, patch) {
    const prev = patches.get(id) || {}
    patches.set(id, { ...prev, ...patch })
  }

  for (const row of working) {
    if (row.archived === true) continue
    if (lower(row.parentEmail).endsWith('@shmspto.org')) {
      markArchive(row, 'role-mailbox')
    }
  }

  const active = () => working.filter((s) => s.archived !== true && !archive.has(s._id))

  // Typo-local duplicate: same child on emails that differ by one obvious misspelling
  const byKid = new Map()
  for (const row of active()) {
    const k = kidName(row)
    if (!k) continue
    if (!byKid.has(k)) byKid.set(k, [])
    byKid.get(k).push(row)
  }
  for (const [, rows] of byKid) {
    const emails = [...new Set(rows.map((r) => lower(r.parentEmail)).filter(Boolean))]
    if (emails.length !== 2) continue
    const [a, b] = emails.sort()
    const close =
      (a.replace(/karnki/, 'karanki') === b || b.replace(/karnki/, 'karanki') === a)
    if (!close) continue
    const keepEmail = a.includes('karanki') ? a : b
    for (const row of rows) {
      if (lower(row.parentEmail) !== keepEmail) markArchive(row, 'typo-email-duplicate')
    }
  }

  // Parent listed as an extra child
  const byEmail = new Map()
  for (const row of active()) {
    const e = lower(row.parentEmail) || '(none)'
    if (!byEmail.has(e)) byEmail.set(e, [])
    byEmail.get(e).push(row)
  }
  for (const [email, rows] of byEmail) {
    if (email === '(none)') continue
    for (const row of rows) {
      const child = kidName(row)
      const parent = parentName(row)
      if (!child || child !== parent) continue
      const others = rows.filter((s) => kidName(s) && kidName(s) !== child)
      if (others.length) markArchive(row, 'parent-as-extra-child')
      else if (email.endsWith('@lcps.org')) markArchive(row, 'staff-as-student')
    }
  }

  // LCPS + placeholder parent name (often split as first=Not last=Applicable)
  for (const row of active()) {
    const email = lower(row.parentEmail)
    if (!email.endsWith('@lcps.org')) continue
    const parent = parentName(row)
    if (
      PLACEHOLDER_NAME.test(collapse(row.parentFirstName)) ||
      PLACEHOLDER_NAME.test(collapse(row.parentLastName)) ||
      parent === 'not applicable'
    ) {
      markArchive(row, 'staff-placeholder-parent')
    }
  }

  // Exact duplicates after email sanitization
  const exact = new Map()
  for (const row of active()) {
    const key = `${kidName(row)}|${lower(row.grade)}|${lower(row.parentEmail)}`
    if (!kidName(row)) continue
    if (!exact.has(key)) exact.set(key, [])
    exact.get(key).push(row)
  }
  for (const [, rows] of exact) {
    if (rows.length < 2) continue
    const keep = pickKeeper(rows)
    for (const row of rows) {
      if (row._id !== keep._id) markArchive(row, 'exact-duplicate')
    }
  }

  // No-email row duplicates an emailed child in exactly one household
  const emailedByName = new Map()
  for (const row of active()) {
    if (!lower(row.parentEmail)) continue
    const k = kidName(row)
    if (!k) continue
    if (!emailedByName.has(k)) emailedByName.set(k, new Set())
    emailedByName.get(k).add(lower(row.parentEmail))
  }
  for (const row of active()) {
    if (lower(row.parentEmail)) continue
    const houses = emailedByName.get(kidName(row))
    if (houses && houses.size === 1) markArchive(row, 'no-email-duplicate')
    else if (houses && houses.size > 1) markArchive(row, 'no-email-ambiguous-duplicate')
  }

  // Field sanitization on rows we are keeping
  for (const row of students) {
    if (archive.has(row._id)) continue
    const alreadyArchived = row.archived === true
    const nextEmail = sanitizeEmail(row.parentEmail)
    if (alreadyArchived) {
      if (String(row.parentEmail ?? '') !== nextEmail && nextEmail) {
        markPatch(row._id, { parentEmail: nextEmail })
      }
      continue
    }
    const next = {
      parentEmail: nextEmail,
      firstName: collapse(row.firstName),
      lastName: collapse(row.lastName),
      parentFirstName: sanitizePersonName(row.parentFirstName),
      parentLastName: sanitizePersonName(row.parentLastName),
      parentPhone: collapse(row.parentPhone),
      grade: normGrade(row.grade),
      membershipTier: normTier(row.membershipTier),
    }
    const changed = {}
    for (const [k, v] of Object.entries(next)) {
      if (collapse(row[k]) !== v) changed[k] = v
    }
    if (String(row.parentEmail ?? '') !== nextEmail) changed.parentEmail = nextEmail
    const keys = Object.keys(changed)
    if (keys.length === 1 && changed.membershipTier === 'free') continue
    if (keys.length) markPatch(row._id, changed)
  }

  return { archive, patches }
}

async function main() {
  console.log(apply ? 'APPLY mode' : 'DRY RUN (pass --apply to write)')
  const [students, memberships] = await Promise.all([
    loadAll('Students'),
    loadAll('Memberships'),
  ])
  const byId = new Map(students.map((s) => [s._id, s]))
  const { archive, patches } = planStudents(students)

  const archiveByReason = {}
  for (const reason of archive.values()) {
    archiveByReason[reason] = (archiveByReason[reason] || 0) + 1
  }

  const membershipPatches = []
  for (const m of memberships) {
    const nextEmail = sanitizeEmail(m.email ?? m.parentEmail)
    if (!nextEmail) continue
    if (nextEmail.endsWith('@shmspto.org') && normTier(m.tier) === 'free') {
      membershipPatches.push({
        id: m._id,
        action: 'expire-role-mailbox',
        email: nextEmail,
      })
      continue
    }
    if (String(m.email ?? '') !== nextEmail) {
      membershipPatches.push({
        id: m._id,
        action: 'sanitize-email',
        from: m.email,
        to: nextEmail,
      })
    }
  }

  const sampleArchive = {}
  for (const [id, reason] of archive) {
    if (!sampleArchive[reason]) sampleArchive[reason] = []
    if (sampleArchive[reason].length < 5) {
      sampleArchive[reason].push(preview(byId.get(id), { reason }))
    }
  }

  const remainingActive = students.filter(
    (s) => s.archived !== true && !archive.has(s._id),
  )
  const remainingHouseholds = new Set(
    remainingActive.map((s) => sanitizeEmail(s.parentEmail)).filter(Boolean),
  )

  console.log(
    JSON.stringify(
      {
        students: students.length,
        archive: archive.size,
        archiveByReason,
        sanitizeFieldPatches: patches.size,
        membershipPatches: membershipPatches.length,
        remainingActiveStudents: remainingActive.length,
        remainingEmailedHouseholds: remainingHouseholds.size,
        sampleArchive,
        samplePatches: [...patches.entries()].slice(0, 8).map(([id, patch]) => ({
          ...preview(byId.get(id)),
          patch,
        })),
        membershipPatchSample: membershipPatches.slice(0, 8),
      },
      null,
      2,
    ),
  )

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to update CMS.')
    return
  }

  const archivedAt = new Date().toISOString()
  let archived = 0
  let sanitized = 0
  let membershipsUpdated = 0

  for (const [id, reason] of archive) {
    const row = byId.get(id)
    const fieldPatch = patches.get(id) || {}
    await updateItem('Students', row, {
      ...fieldPatch,
      archived: true,
      archivedAt,
      archivedBy: `sanitize-students-directory:${reason}`,
    })
    archived += 1
    if (archived % 25 === 0) console.log(`… archived ${archived}`)
  }

  for (const [id, patch] of patches) {
    if (archive.has(id)) continue
    const row = byId.get(id)
    await updateItem('Students', row, patch)
    sanitized += 1
    if (sanitized % 25 === 0) console.log(`… sanitized ${sanitized}`)
  }

  for (const m of memberships) {
    const nextEmail = sanitizeEmail(m.email ?? m.parentEmail)
    if (!nextEmail) continue
    if (nextEmail.endsWith('@shmspto.org') && normTier(m.tier) === 'free') {
      await updateItem('Memberships', m, {
        email: nextEmail,
        status: 'expired',
      })
      membershipsUpdated += 1
      continue
    }
    if (String(m.email ?? '') !== nextEmail) {
      await updateItem('Memberships', m, { email: nextEmail })
      membershipsUpdated += 1
    }
  }

  console.log(
    `Done. archived=${archived} sanitized=${sanitized} memberships=${membershipsUpdated}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
