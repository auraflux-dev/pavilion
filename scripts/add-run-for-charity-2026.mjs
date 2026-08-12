/**
 * Add Best Runners 14th Annual Run for Charity (Sep 13, 2026) to Wix Events
 * + Fundraising CTAs. School referral code: SHMS.
 *
 *   node --env-file=frontend/.env.local scripts/add-run-for-charity-2026.mjs
 */
import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const FLYER_SRC = resolve(
  process.env.HOME,
  '.cursor/projects/Users-robertgregory-wix-shmspto/assets/R4C2026-1__1_-2522e732-e79a-47a5-bea5-f8a240f70532.png',
)
const REGISTER_URL = 'https://www.shmspto.org/run-for-charity'
const BEST_RUNNERS_SIGNUP = 'https://www.bestrunners.org/run4charity'
const SCHOOL_CODE = 'SHMS'
const CATEGORY_PTO_SHMS = '1d7d7957-439e-4c6b-bafd-2a46d1716d34'

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

const siteId = process.env.WIX_SITE_ID?.trim()
const apiKey = process.env.WIX_API_KEY?.trim()
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

async function uploadFlyer() {
  if (!existsSync(FLYER_SRC)) throw new Error(`Flyer missing: ${FLYER_SRC}`)
  const buffer = readFileSync(FLYER_SRC)
  const publicDir = resolve(root, 'frontend/public/events')
  mkdirSync(publicDir, { recursive: true })
  copyFileSync(FLYER_SRC, resolve(publicDir, 'run-for-charity-2026.jpg'))

  const gen = await wix('/site-media/v1/files/generate-upload-url', {
    mimeType: 'image/jpeg',
    fileName: 'run-for-charity-2026.jpg',
    sizeInBytes: String(buffer.length),
    parentFolderId: 'media-root',
    private: false,
  })
  const put = await fetch(gen.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: buffer,
  })
  const putBody = await put.json().catch(() => ({}))
  if (!put.ok) throw new Error(`upload put ${put.status}: ${JSON.stringify(putBody).slice(0, 400)}`)
  const file = putBody.file || gen.file
  const url = file?.url || file?.displayUrl
  const id = file?.id || file?.media?.image?.image?.id
  if (!url || !id) {
    throw new Error(`No media id/url after upload: ${JSON.stringify(putBody).slice(0, 600)}`)
  }
  return { id, url }
}

function descriptionText() {
  return [
    'Best Runners USA · 14th Annual Run for Charity — 1K & 5K run/walk for families.',
    `Use school / referral code ${SCHOOL_CODE} when you register so 100% of registration fees come back to Stone Hill (bonus funding available based on participation).`,
    'Best Runners handles race day; SHMS PTO shares the invite with our community.',
    'Early bird through Aug 15: Adults $25 · Kids $15. After Aug 15: Adults $30 · Kids $20.',
    'Includes race shirt, finisher medal, and post-race snacks.',
    `Register (copies school code ${SCHOOL_CODE} first): ${REGISTER_URL}`,
    `Best Runners signup (paste ${SCHOOL_CODE} in School / Referral Code): ${BEST_RUNNERS_SIGNUP}`,
  ].join('\n\n')
}

async function findExistingEventId() {
  const j = await wix('/events/v3/events/query', {
    query: {
      filter: { status: { $eq: 'UPCOMING' } },
      paging: { limit: 50 },
    },
    fields: ['DETAILS', 'TEXTS'],
  })
  const hit = (j.events || []).find((e) => {
    const t = String(e.title || '').toLowerCase()
    return t.includes('run for charity') && t.includes('shms')
  })
  return hit?.id || null
}

async function main() {
  console.log('Uploading flyer…')
  const flyer = await uploadFlyer()
  console.log('Flyer URL:', flyer.url)

  const title = 'Run for Charity 1K & 5K (Best Runners · code SHMS)'
  const locationName = 'Rock Ridge High School, Ashburn, VA'
  const startDate = '2026-09-13T12:00:00.000Z' // 8:00 AM EDT
  const endDate = '2026-09-13T15:00:00.000Z'

  let eventId = await findExistingEventId()
  const baseEvent = {
    title,
    location: { type: 'VENUE', name: locationName },
    dateAndTimeSettings: {
      startDate,
      endDate,
      timeZoneId: 'America/New_York',
    },
    mainImage: { id: flyer.id },
    shortDescription: `Register with school code ${SCHOOL_CODE}. Early bird ends Aug 15. 43460 Loudoun Reserve Dr, Ashburn.`,
  }
  const descriptionPatch = {
    description: {
      nodes: [
        {
          type: 'PARAGRAPH',
          nodes: [
            {
              type: 'TEXT',
              textData: {
                text:
                  descriptionText() +
                  '\n\nLocation: Rock Ridge High School, 43460 Loudoun Reserve Dr, Ashburn, VA 20148',
              },
            },
          ],
        },
      ],
    },
  }

  if (eventId) {
    console.log('Updating existing event', eventId)
    await wix(`/events/v3/events/${eventId}`, { event: { ...baseEvent, ...descriptionPatch } }, 'PATCH')
  } else {
    console.log('Creating event…')
    const created = await wix('/events/v3/events', {
      event: {
        ...baseEvent,
        registration: { initialType: 'RSVP' },
      },
      draft: false,
    })
    eventId = created.event?.id || created.id
    console.log('Created', eventId)
    if (eventId) {
      try {
        await wix(`/events/v3/events/${eventId}`, { event: descriptionPatch }, 'PATCH')
      } catch (err) {
        console.warn('description patch skipped', err.message || err)
      }
    }
  }

  if (!eventId) throw new Error('No event id')

  try {
    await wix(`/events/v1/categories/${CATEGORY_PTO_SHMS}/events`, {
      eventId: [eventId],
    })
    console.log('Assigned category PTO/SHMS')
  } catch (err) {
    console.warn('category assign failed', err.message || err)
  }

  // Fundraising CTA via Wix Data REST
  const existing = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'FundraisingCTAs',
    query: { paging: { limit: 50 } },
  })
  const already = (existing.dataItems || []).find((it) =>
    String(it.data?.title || '')
      .toLowerCase()
      .includes('run for charity'),
  )
  const ctaData = {
    title: 'Run for Charity (school code SHMS)',
    description: `Copy school code ${SCHOOL_CODE}, then register for Best Runners’ 1K/5K on Sep 13 at Rock Ridge. Stone Hill receives 100% of your registration fee. Early bird through Aug 15.`,
    ctaLabel: 'Register with code SHMS',
    href: '/run-for-charity',
    icon: 'Ticket',
    sortOrder: 5,
    active: true,
  }
  if (already?.id) {
    await wix(`/wix-data/v2/items/${already.id}`, {
      dataCollectionId: 'FundraisingCTAs',
      dataItem: { id: already.id, data: { ...already.data, ...ctaData } },
    }, 'PUT')
    console.log('Updated Fundraising CTA', already.id)
  } else {
    const inserted = await wix('/wix-data/v2/items', {
      dataCollectionId: 'FundraisingCTAs',
      dataItem: { data: ctaData },
    })
    console.log('Created Fundraising CTA', inserted.dataItem?.id)
  }

  console.log('\nDone.')
  console.log('Event id:', eventId)
  console.log('Register:', REGISTER_URL)
  console.log('School code:', SCHOOL_CODE)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
