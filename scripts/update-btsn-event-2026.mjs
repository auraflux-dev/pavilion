/**
 * Update Back to School Night (PTO table) flyer + copy in Wix Events
 * and PortalCalendarEvents.
 *
 *   node --env-file=frontend/.env.local scripts/update-btsn-event-2026.mjs
 */
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const FLYER_SRC = resolve(
  process.env.HOME,
  '.cursor/projects/Users-robertgregory-wix-shmspto/assets/WhatsApp_Image_2026-08-18_at_21.17.48-0759d63a-9ef8-4cbf-af9b-18914ab5bffa.png',
)
const EVENT_ID = '0e92a657-e0b0-4e43-af3f-111c9c9f22b4'
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

function copyPublicJpeg() {
  if (!existsSync(FLYER_SRC)) throw new Error(`Flyer missing: ${FLYER_SRC}`)
  const publicDir = resolve(root, 'frontend/public/events')
  mkdirSync(publicDir, { recursive: true })
  const dest = resolve(publicDir, 'back-to-school-night-2026.jpg')
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', FLYER_SRC, '--out', dest], {
      stdio: 'pipe',
    })
  } catch {
    copyFileSync(FLYER_SRC, dest)
  }
  return dest
}

async function uploadFlyer(destPath) {
  const buffer = readFileSync(destPath)
  const gen = await wix('/site-media/v1/files/generate-upload-url', {
    mimeType: 'image/jpeg',
    fileName: 'back-to-school-night-2026.jpg',
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

const DESCRIPTION = [
  'Meet SHMS PTO in the cafeteria during Back to School Night.',
  'At our table: spirit wear for purchase, PTO memberships, Member Portal and website walkthrough, Cove Digital Card, and enrichment program info. Board members will be on hand.',
  'Sips & Sweets food truck is on site. Stop by the PTO table for refreshment tickets. Lagoon and Tide members show your Family Cove code for free refreshments (paid codes end in 9).',
  'Follow the truck on Instagram: @Sipsnsweets.truck',
].join(' ')

async function main() {
  const dest = copyPublicJpeg()
  console.log('Public flyer:', dest)

  const flyer = await uploadFlyer(dest)
  console.log('Wix media id:', flyer.id)

  const eventPatch = {
    title: 'Back to School Night (PTO table)',
    location: { type: 'VENUE', name: 'SHMS cafeteria' },
    dateAndTimeSettings: {
      startDate: '2026-08-27T22:00:00.000Z',
      endDate: '2026-08-28T00:00:00.000Z',
      timeZoneId: 'America/New_York',
    },
    mainImage: { id: flyer.id },
    shortDescription:
      'Cafeteria PTO table: spirit wear, memberships, Member Portal, Cove Digital Card, enrichment, and Sips & Sweets tickets.',
    description: {
      nodes: [
        {
          type: 'PARAGRAPH',
          nodes: [{ type: 'TEXT', textData: { text: DESCRIPTION } }],
        },
      ],
    },
  }

  const patched = await wix(`/events/v3/events/${EVENT_ID}`, { event: eventPatch }, 'PATCH')
  const ev = patched.event || {}
  console.log('Patched event', {
    id: ev.id || EVENT_ID,
    slug: ev.slug,
    title: ev.title,
    mainImage: ev.mainImage || '(Wix may omit; site uses /events/back-to-school-night-2026.jpg)',
  })

  try {
    await wix(`/events/v1/categories/${CATEGORY_PTO_SHMS}/events`, {
      eventId: [EVENT_ID],
    })
    console.log('Assigned category PTO/SHMS')
  } catch (err) {
    console.warn('category assign skipped', err.message || err)
  }

  const calendar = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'PortalCalendarEvents',
    query: { paging: { limit: 50 } },
  })
  const hit = (calendar.dataItems || []).find((it) =>
    String(it.data?.title || '')
      .toLowerCase()
      .includes('back to school'),
  )
  const calData = {
    title: 'Back to School Night (PTO table)',
    subtitle: 'SHMS cafeteria · 6–8 p.m.',
    startAt: '2026-08-27T22:00:00.000Z',
    endAt: '2026-08-28T00:00:00.000Z',
    href: '/events/back-to-school-night-pto-table',
    audience: 'all',
    active: true,
  }
  if (hit?.id) {
    await wix(
      `/wix-data/v2/items/${hit.id}`,
      {
        dataCollectionId: 'PortalCalendarEvents',
        dataItem: { id: hit.id, data: { ...hit.data, ...calData } },
      },
      'PUT',
    )
    console.log('Updated portal calendar', hit.id)
  } else {
    const inserted = await wix('/wix-data/v2/items', {
      dataCollectionId: 'PortalCalendarEvents',
      dataItem: { data: calData },
    })
    console.log('Created portal calendar', inserted.dataItem?.id)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
