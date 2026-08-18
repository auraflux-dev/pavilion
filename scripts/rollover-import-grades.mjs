/**
 * Fall grade rollover for June 2026 bulk import Students rows.
 *
 * - 6 → 7, 7 → 8 (import cohort only: created 2026-06-10)
 * - Archive import grade-8 students (graduated), including only-child 8th families
 * - Skips @shmspto.org test/board emails
 * - Ensures familyProfileConfirmedAt CMS fields for portal confirm flow
 *
 * Usage (from repo root):
 *   node --env-file=frontend/.env.local scripts/rollover-import-grades.mjs
 *   node --env-file=frontend/.env.local scripts/rollover-import-grades.mjs --apply
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

const IMPORT_DAY = '2026-06-10'
const SKIP_EMAIL_SUFFIX = '@shmspto.org'

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

async function ensureFields() {
  for (const [collectionId, fields] of [
    [
      'Students',
      [{ key: 'familyProfileConfirmedAt', displayName: 'Family Profile Confirmed At', type: 'TEXT' }],
    ],
    [
      'Memberships',
      [{ key: 'familyProfileConfirmedAt', displayName: 'Family Profile Confirmed At', type: 'TEXT' }],
    ],
  ]) {
    const collection = await wix(`/wix-data/v2/collections/${collectionId}`, undefined, 'GET')
    const existing = new Set((collection.collection?.fields ?? []).map((f) => f.key))
    for (const field of fields) {
      if (existing.has(field.key)) {
        console.log(`Field ${collectionId}.${field.key} exists`)
        continue
      }
      try {
        await wix('/wix-data/v2/collections/create-field', {
          dataCollectionId: collectionId,
          field,
        })
        console.log(`Created ${collectionId}.${field.key}`)
      } catch (err) {
        console.warn(
          `Could not create ${collectionId}.${field.key}:`,
          String(err.message || err).slice(0, 200),
        )
      }
    }
  }
}

async function loadAllStudents() {
  const out = []
  let offset = 0
  for (;;) {
    const data = await wix('/wix-data/v2/items/query', {
      dataCollectionId: 'Students',
      query: { paging: { limit: 100, offset } },
    })
    const batch = data.dataItems ?? data.items ?? []
    // normalize: dataItems have { id, data }
    for (const item of batch) {
      if (item.data) out.push({ _id: item.id ?? item.data._id, ...item.data })
      else out.push(item)
    }
    if (batch.length < 100) break
    offset += 100
  }
  return out
}

function createdDay(row) {
  const raw = row._createdDate
  const iso =
    raw && typeof raw === 'object' && raw.$date
      ? raw.$date
      : raw
  if (!iso) return ''
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return String(iso).slice(0, 10)
  }
}

function normGrade(g) {
  return String(g ?? '')
    .trim()
    .toLowerCase()
    .replace(/th$/, '')
}

function isImport(row) {
  return createdDay(row) === IMPORT_DAY
}

function skipEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
    .endsWith(SKIP_EMAIL_SUFFIX)
}

async function updateStudent(row, patch) {
  const data = { ...row, ...patch }
  delete data._id
  // Keep Wix system date objects intact if present
  await wix(
    `/wix-data/v2/items/${row._id}`,
    {
      dataCollectionId: 'Students',
      dataItem: {
        id: row._id,
        data: { ...data, _id: row._id },
      },
    },
    'PUT',
  )
}

async function main() {
  console.log(apply ? 'APPLY mode' : 'DRY RUN (pass --apply to write)')
  await ensureFields()

  const students = await loadAllStudents()
  const importRows = students.filter(isImport)
  console.log(`Students total=${students.length} import_${IMPORT_DAY}=${importRows.length}`)

  const bump = []
  const archive = []
  for (const row of importRows) {
    const email = String(row.parentEmail ?? '').trim().toLowerCase()
    if (email && skipEmail(email)) continue
    const g = normGrade(row.grade)
    if (g === '6') bump.push({ row, from: '6', to: '7' })
    else if (g === '7') bump.push({ row, from: '7', to: '8' })
    else if (g === '8') archive.push(row)
  }

  const byEmail = new Map()
  for (const row of importRows) {
    const email = String(row.parentEmail ?? '').trim().toLowerCase()
    if (!email || skipEmail(email)) continue
    if (!byEmail.has(email)) byEmail.set(email, [])
    byEmail.get(email).push(row)
  }
  const onlyChild8th = []
  for (const [email, kids] of byEmail) {
    if (kids.length !== 1) continue
    if (normGrade(kids[0].grade) === '8') {
      onlyChild8th.push({
        email,
        id: kids[0]._id,
        name: `${kids[0].firstName ?? ''} ${kids[0].lastName ?? ''}`.trim(),
      })
    }
  }

  console.log(
    JSON.stringify(
      {
        bump6to7: bump.filter((b) => b.from === '6').length,
        bump7to8: bump.filter((b) => b.from === '7').length,
        archiveGraduated8th: archive.length,
        onlyChild8thFamilies: onlyChild8th.length,
        sampleOnlyChild8th: onlyChild8th.slice(0, 10),
        sampleBump: bump.slice(0, 5).map((b) => ({
          id: b.row._id,
          name: `${b.row.firstName} ${b.row.lastName}`,
          email: b.row.parentEmail || '(no email)',
          from: b.from,
          to: b.to,
        })),
      },
      null,
      2,
    ),
  )

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to update CMS.')
    return
  }

  let bumped = 0
  let archived = 0
  const archivedAt = new Date().toISOString()
  for (const { row, to } of bump) {
    await updateStudent(row, { grade: to })
    bumped++
    if (bumped % 25 === 0) console.log(`… bumped ${bumped}`)
  }
  for (const row of archive) {
    await updateStudent(row, {
      archived: true,
      archivedAt,
      archivedBy: 'rollover-import-grades',
    })
    archived++
  }
  console.log(`Done. bumped=${bumped} archived=${archived}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
