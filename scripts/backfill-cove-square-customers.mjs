/**
 * Backfill Square Customers for Cove families so Stand can search by
 * 6-digit PIN and word passcode (nickname + reference_id "PIN passcode")
 * and charge gift card on file.
 *
 *   node --env-file=frontend/.env.local scripts/backfill-cove-square-customers.mjs
 *   node --env-file=frontend/.env.local scripts/backfill-cove-square-customers.mjs --dry-run
 *   node --env-file=frontend/.env.local scripts/backfill-cove-square-customers.mjs --limit=50
 */
import { createRequire } from 'module'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const require = createRequire(resolve(root, 'frontend/package.json'))
const { SquareClient, SquareEnvironment } = require('square')

const dryRun = process.argv.includes('--dry-run')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0

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
const token = process.env.SQUARE_ACCESS_TOKEN
if (!siteId || !apiKey || !token) {
  console.error('Need WIX_SITE_ID, WIX_API_KEY, SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

const client = new SquareClient({
  token,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
})

async function wixDataQuery(collection, filter) {
  const out = []
  let cursor
  let page = 0
  for (;;) {
    page += 1
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: collection,
        query: {
          ...(filter ? { filter } : {}),
          paging: { limit: 100, ...(cursor ? { cursor } : {}) },
        },
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(`${collection}: ${JSON.stringify(json).slice(0, 400)}`)
    const batch = json.dataItems || []
    for (const row of batch) out.push(row.data)
    console.log(`  ${collection} page ${page}: +${batch.length} (total ${out.length})`)
    cursor = json.pagingMetadata?.cursors?.next
    if (!cursor || batch.length === 0) break
  }
  return out
}

function buildRef(pin, pass) {
  return [String(pin || '').trim(), String(pass || '').trim().toLowerCase()]
    .filter(Boolean)
    .join(' ')
    .slice(0, 100)
}

async function ensureCustomDefs() {
  for (const d of [
    {
      key: 'cove_pin',
      name: 'Cove PIN',
      description: '6-digit Cove family code',
      visibility: 'VISIBILITY_READ_WRITE_VALUES',
      schema: {
        $ref: 'https://developer-production-s.squarecdn.com/schemas/v1/common.json#squareup.common.String',
      },
    },
    {
      key: 'cove_passcode',
      name: 'Cove Passcode',
      description: 'Word passcode for Cove family',
      visibility: 'VISIBILITY_READ_WRITE_VALUES',
      schema: {
        $ref: 'https://developer-production-s.squarecdn.com/schemas/v1/common.json#squareup.common.String',
      },
    },
  ]) {
    try {
      await client.customers.customAttributeDefinitions.create({
        customAttributeDefinition: d,
        idempotencyKey: `def-${d.key}-v1`,
      })
      console.log('created custom attr', d.key)
    } catch {
      // exists
    }
  }
}

async function upsertStandCustomer(row) {
  const email = String(row.email || '')
    .trim()
    .toLowerCase()
  const pin = String(row.pin || '').trim()
  const pass = String(row.pass || '')
    .trim()
    .toLowerCase()
  const name = String(row.name || email.split('@')[0] || 'Cove Family').trim()
  const giftCardId = String(row.giftCardId || '').trim()
  const gan = String(row.gan || '').trim()

  if (!email.includes('@') || !pin) {
    return { ok: false, reason: 'missing email or pin' }
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      email,
      pin,
      pass,
      ref: buildRef(pin, pass),
      gan: gan ? `${gan.slice(0, 4)}…` : '',
    }
  }

  const search = await client.customers.search({
    query: { filter: { emailAddress: { exact: email } } },
    limit: 5n,
  })
  let customer = (search.customers || [])[0]
  const [givenName, ...rest] = name.split(/\s+/)
  const ref = buildRef(pin, pass)

  if (!customer) {
    const created = await client.customers.create({
      idempotencyKey: `cove-bf-${email}`.slice(0, 45),
      emailAddress: email,
      givenName: givenName || 'Cove',
      familyName: rest.join(' ') || 'Family',
      nickname: pin,
      referenceId: ref || undefined,
      companyName: pass || undefined,
      note: `Cove Digital Card · PIN ${pin} · passcode ${pass || '—'}`,
    })
    customer = created.customer
  } else {
    const updated = await client.customers.update({
      customerId: customer.id,
      givenName: customer.givenName || givenName || 'Cove',
      familyName: customer.familyName || rest.join(' ') || 'Family',
      emailAddress: customer.emailAddress || email,
      nickname: pin,
      referenceId: ref || undefined,
      companyName: pass || undefined,
      note: `Cove Digital Card · PIN ${pin} · passcode ${pass || '—'}`,
      version: customer.version,
    })
    customer = updated.customer || customer
  }

  const customerId = customer?.id
  if (!customerId) return { ok: false, reason: 'no customer id', email }

  for (const [key, value] of [
    ['cove_pin', pin],
    ['cove_passcode', pass],
  ]) {
    if (!value) continue
    try {
      await client.customers.customAttributes.upsert({
        customerId,
        key,
        customAttribute: { value },
      })
    } catch {
      // optional
    }
  }

  let linked = false
  let gcId = giftCardId
  if (!gcId && gan) {
    try {
      const g = await client.giftCards.getFromGan({ gan })
      gcId = g.giftCard?.id || ''
    } catch {
      gcId = ''
    }
  }
  if (gcId) {
    try {
      await client.giftCards.linkCustomer({ giftCardId: gcId, customerId })
      linked = true
    } catch {
      linked = false
    }
  }

  return { ok: true, email, pin, pass, customerId, linkedGiftCard: linked }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  console.log(dryRun ? 'DRY RUN' : 'LIVE', process.env.SQUARE_ENVIRONMENT || '(env)')
  if (!dryRun) await ensureCustomDefs()

  console.log('Loading Memberships with Cove PIN…')
  let memberships = []
  try {
    memberships = await wixDataQuery('Memberships', {
      $and: [{ coveFamilyCode: { $exists: true } }, { coveFamilyCode: { $ne: '' } }],
    })
  } catch (err) {
    console.warn('Filtered Memberships query failed, falling back to full scan:', err.message || err)
    memberships = await wixDataQuery('Memberships')
  }

  console.log('Loading Students (for gift card GAN)…')
  let students = []
  try {
    students = await wixDataQuery('Students', {
      $or: [
        { squareGiftCardGan: { $exists: true, $ne: '' } },
        { coveFamilyCode: { $exists: true, $ne: '' } },
      ],
    })
  } catch (err) {
    console.warn('Filtered Students query failed, falling back to full scan:', err.message || err)
    students = await wixDataQuery('Students')
  }

  /** @type {Map<string, { email: string, pin: string, pass: string, name: string, gan: string, giftCardId: string }>} */
  const byEmail = new Map()

  for (const m of memberships) {
    const email = String(m.email || '')
      .trim()
      .toLowerCase()
    if (!email || email.endsWith('@shmspto.org')) continue
    const pin = String(m.coveFamilyCode || '').trim()
    if (!/^\d{4,8}$/.test(pin)) continue
    const pass = String(m.coveFamilyPasscode || '')
      .trim()
      .toLowerCase()
    const name = [m.parentFirstName || m.firstName, m.parentLastName || m.lastName]
      .filter(Boolean)
      .join(' ')
    byEmail.set(email, {
      email,
      pin,
      pass,
      name: name || email.split('@')[0],
      gan: '',
      giftCardId: '',
    })
  }

  // Students may hold GAN + sometimes mirrored codes
  for (const s of students) {
    const email = String(s.parentEmail || '')
      .trim()
      .toLowerCase()
    if (!email || email.endsWith('@shmspto.org')) continue
    const pin = String(s.coveFamilyCode || '').trim()
    const gan = String(s.squareGiftCardGan || '').trim()
    const giftCardId = String(s.squareGiftCardId || '').trim()
    const existing = byEmail.get(email)
    if (existing) {
      if (!existing.gan && gan) existing.gan = gan
      if (!existing.giftCardId && giftCardId) existing.giftCardId = giftCardId
      if (!existing.pass) {
        const pass = String(s.coveFamilyPasscode || '')
          .trim()
          .toLowerCase()
        if (pass) existing.pass = pass
      }
      continue
    }
    if (!/^\d{4,8}$/.test(pin)) continue
    byEmail.set(email, {
      email,
      pin,
      pass: String(s.coveFamilyPasscode || '')
        .trim()
        .toLowerCase(),
      name: [s.parentFirstName, s.parentLastName].filter(Boolean).join(' ') || email.split('@')[0],
      gan,
      giftCardId,
    })
  }

  let rows = [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email))
  if (limit > 0) rows = rows.slice(0, limit)

  console.log(`Families with Cove PIN to sync: ${rows.length}`)

  const summary = { ok: 0, fail: 0, linked: 0, errors: [] }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const r = await upsertStandCustomer(row)
      if (r.ok) {
        summary.ok += 1
        if (r.linkedGiftCard) summary.linked += 1
        console.log(
          `[${i + 1}/${rows.length}] OK ${row.email} pin=${row.pin} pass=${row.pass || '—'} linked=${Boolean(r.linkedGiftCard)}`,
        )
      } else {
        summary.fail += 1
        summary.errors.push({ email: row.email, reason: r.reason })
        console.log(`[${i + 1}/${rows.length}] SKIP ${row.email} ${r.reason}`)
      }
    } catch (err) {
      summary.fail += 1
      const msg = err?.errors?.[0]?.detail || err?.message || String(err)
      summary.errors.push({ email: row.email, reason: msg })
      console.log(`[${i + 1}/${rows.length}] FAIL ${row.email} ${msg}`)
    }
    if (!dryRun) await sleep(150)
  }

  console.log('\n=== SUMMARY ===')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
