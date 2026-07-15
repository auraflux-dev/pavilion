/**
 * Seed SiteSettings catalog/contact keys + PageContent heroes into Wix CMS.
 *
 * Usage (from repo root):
 *   node --env-file=frontend/.env.local scripts/seed-cms-content.mjs
 *
 * Safe to re-run: updates existing SiteSettings by key; upserts PageContent by page.
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
    err.data = data
    throw err
  }
  return data
}

const SITE_SETTINGS = {
  membershipRubyProductId: '89ad5f10-a4bc-4a31-af4a-22b6add4cad4',
  membershipRubyVariantId: '23ea8122-e8b0-4eea-912f-c4227308193d',
  membershipSupremeProductId: '58f334f3-32d7-4d38-9639-7e587a38a26f',
  membershipSupremeVariantId: '1bfd31dd-32e6-4781-9083-97168e82cb1d',
  storeCardProductId: 'eb2a71dc-7f0f-41b4-85bc-76b0869e5d30',
  storeCardVariant10: 'c30c1bf1-a771-427c-85f9-d67317fe785d',
  storeCardVariant20: 'bddb2f05-4ce4-4d41-848a-f6b3dc9bf478',
  storeCardVariant25: '24000231-2b43-4dee-8434-695f3034858d',
  storeCardAmounts: '10,20,25',
  storeCardSlug: 'pto-store-card',
  membershipRubySlug: 'pto-membership-ruby-1',
  membershipSupremeSlug: 'pto-membership-supreme-1',
  portalGrades: '6,7,8',
  contactEmailGeneral: 'info@shmspto.org',
  contactEmailTreasurer: 'treasurer@shmspto.org',
  contactAddress: '23415 Evergreen Ridge Drive, Ashburn, VA 20148',
  contactStoreHours: 'Open during lunch periods, Mon–Fri',
}

const PAGE_ROWS = [
  {
    page: 'home',
    eyebrow: 'Ashburn, Virginia · LCPS',
    title: 'Welcome to Stone Hill Middle School PTO',
    body: 'An active volunteer organization committed to enriching the academic and social experience for all SHMS students and families. Go Stingrays!',
    ctaLabel: 'Join the PTO',
    ctaHref: '/membership',
    active: true,
  },
  {
    page: 'membership',
    eyebrow: 'Join the PTO',
    title: 'PTO Membership',
    body: 'Your membership directly funds enrichment programs, events, and resources that benefit every student at Stone Hill Middle School.',
    sectionTitle: 'Choose Your Membership',
    sectionBody:
      'Start with a free parent account (log in / sign up), then purchase Ruby or Supreme for the 2025–26 school year. Paid tiers include voting rights and member perks in your portal.',
    active: true,
  },
  {
    page: 'events',
    eyebrow: 'Mark Your Calendar',
    title: 'Upcoming Events',
    body: 'Stay connected with everything happening at Stone Hill Middle School — meetings, celebrations, competitions, and more.',
    active: true,
  },
  {
    page: 'programs',
    eyebrow: 'Student Enrichment',
    title: 'Enrichment Programs',
    body: 'PTO-funded programs designed to challenge, inspire, and connect students beyond the standard curriculum.',
    active: true,
  },
  {
    page: 'volunteer',
    eyebrow: 'Get Involved',
    title: 'Volunteer With Us',
    body: 'Every hour you give helps create a richer experience for every student at Stone Hill Middle School.',
    active: true,
  },
  {
    page: 'board',
    eyebrow: '2025–26 School Year',
    title: 'Meet the Board',
    body: 'Your SHMS PTO is run entirely by parent volunteers. Every event, program, and fundraiser starts here.',
    active: true,
  },
  {
    page: 'contact',
    eyebrow: 'Get in Touch',
    title: 'Contact the PTO',
    body: "Questions about programs, the school store, volunteering, or membership? We'll get back to you within one business day.",
    sectionTitle: 'About the PTO Board',
    sectionBody:
      'The SHMS PTO is run entirely by parent volunteers. We try to respond to all messages within one business day during the school year.',
    active: true,
  },
  {
    page: 'store',
    eyebrow: 'SHMS Store Card',
    title: 'Load a card, your student handles the rest.',
    bullets: 'No cash needed\nReload anytime online\nFunds never expire',
    active: true,
  },
  {
    page: 'store-how',
    bullets:
      '1|Parent loads the card|Choose an amount and pay securely online — card or Apple Pay.\n2|Student uses their card|The balance is on the physical store card your student carries.\n3|Tap & go at the window|Cashier taps the card at the PTO store reader — done.',
    active: true,
  },
  {
    page: 'store-cta',
    eyebrow: 'Store Card',
    title: "Ready to load your student's card?",
    body: 'Most students spend $20–$40 per month. Load online, student taps their card at the window. Funds never expire.',
    active: true,
  },
  {
    page: 'spirit-wear',
    eyebrow: 'Spirit Wear',
    title: 'Stingrays Pride',
    body: 'Show your school spirit. All items available year-round — order online and pick up at school.',
    active: true,
  },
  {
    page: 'fundraising',
    eyebrow: '2025–26 School Year · Live',
    title: 'Fundraising Tracker',
    body: 'Every Wix purchase — online or in-store — counts here automatically.',
    active: true,
  },
  {
    page: 'meetings',
    eyebrow: 'Transparency & Communication',
    title: 'Meetings & Minutes',
    body: "Stay informed on what's happening at Stone Hill Middle School. View upcoming meetings, join live, and read past minutes from PTO and advisory committees.",
    active: true,
  },
  {
    page: 'newsletter',
    eyebrow: 'Stay Connected',
    title: 'SHMS PTO Newsletter',
    body: 'Stay in the loop on everything happening at Stone Hill Middle School — delivered straight to your inbox.',
    active: true,
  },
  {
    page: 'member-portal',
    title: 'Member Portal',
    body: 'Your store card balance, membership, and quick links — all in one place.',
    active: true,
  },
  {
    page: 'portal',
    title: 'Free parent account',
    body: "You're signed in as a free parent member. Add your students here, then upgrade to Ruby or Supreme anytime for paid benefits.",
    sectionTitle: 'Paid PTO membership active',
    sectionBody:
      'Thanks for supporting SHMS. Your Ruby/Supreme benefits show on each student card below.',
    bullets:
      'Welcome to the SHMS PTO\nYour free parent account is ready. Add a student to track programs, store card balance, and paid membership status.\nPaid members get a pre-loaded store card, free or discounted program registration, and free refreshments at school events.',
    active: true,
  },
]

async function ensureProgramSessionsCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'ProgramSessions',
        displayName: 'Program Sessions',
        fields: [
          { key: 'programId', displayName: 'Program ID', type: 'TEXT' },
          { key: 'programName', displayName: 'Program Name', type: 'TEXT' },
          { key: 'title', displayName: 'Title', type: 'TEXT' },
          { key: 'startAt', displayName: 'Start At', type: 'DATETIME' },
          { key: 'endAt', displayName: 'End At', type: 'DATETIME' },
          { key: 'location', displayName: 'Location', type: 'TEXT' },
          { key: 'instructorName', displayName: 'Instructor Name', type: 'TEXT' },
          { key: 'grades', displayName: 'Grades', type: 'TEXT' },
          { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
        ],
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ANYONE',
        },
      },
    })
    console.log('Created ProgramSessions collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('ProgramSessions collection already exists')
      return
    }
    console.warn('ProgramSessions create skipped:', err.message.slice(0, 200))
  }
}

async function ensureParentMessagesCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'ParentMessages',
        displayName: 'Parent Messages',
        fields: [
          { key: 'parentEmail', displayName: 'Parent Email', type: 'TEXT' },
          { key: 'audience', displayName: 'Audience', type: 'TEXT' },
          { key: 'grade', displayName: 'Grade', type: 'TEXT' },
          { key: 'studentId', displayName: 'Student ID', type: 'TEXT' },
          { key: 'studentName', displayName: 'Student Name', type: 'TEXT' },
          { key: 'programName', displayName: 'Program Name', type: 'TEXT' },
          { key: 'fromName', displayName: 'From Name', type: 'TEXT' },
          { key: 'subject', displayName: 'Subject', type: 'TEXT' },
          { key: 'body', displayName: 'Body', type: 'TEXT' },
          { key: 'sentAt', displayName: 'Sent At', type: 'DATETIME' },
          { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
        ],
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ADMIN',
        },
      },
    })
    console.log('Created ParentMessages collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('ParentMessages collection already exists')
      return
    }
    console.warn('ParentMessages create skipped:', err.message.slice(0, 200))
  }
}

async function ensurePageContentCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'PageContent',
        displayName: 'Page Content',
        fields: [
          { key: 'page', displayName: 'Page', type: 'TEXT' },
          { key: 'eyebrow', displayName: 'Eyebrow', type: 'TEXT' },
          { key: 'title', displayName: 'Title', type: 'TEXT' },
          { key: 'body', displayName: 'Body', type: 'TEXT' },
          { key: 'sectionTitle', displayName: 'Section Title', type: 'TEXT' },
          { key: 'sectionBody', displayName: 'Section Body', type: 'TEXT' },
          { key: 'bullets', displayName: 'Bullets', type: 'TEXT' },
          { key: 'ctaLabel', displayName: 'CTA Label', type: 'TEXT' },
          { key: 'ctaHref', displayName: 'CTA Href', type: 'TEXT' },
          { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
        ],
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ANYONE',
        },
      },
    })
    console.log('Created PageContent collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('PageContent collection already exists')
      return
    }
    // Some sites use different create shapes — continue and try inserts
    console.warn('Collection create skipped:', err.message.slice(0, 200))
  }
}

async function upsertSiteSettings() {
  const existing = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'SiteSettings',
    query: { paging: { limit: 200 } },
  })
  const byKey = new Map()
  for (const item of existing.dataItems ?? []) {
    if (item.data?.key) byKey.set(item.data.key, item)
  }

  for (const [key, value] of Object.entries(SITE_SETTINGS)) {
    const found = byKey.get(key)
    if (found) {
      await wix(`/wix-data/v2/items/${found.id}`, {
        dataCollectionId: 'SiteSettings',
        dataItem: {
          id: found.id,
          data: { ...(found.data ?? {}), key, value },
        },
      }, 'PATCH')
      console.log('Updated SiteSettings', key)
    } else {
      await wix('/wix-data/v2/items', {
        dataCollectionId: 'SiteSettings',
        dataItem: { data: { key, value } },
      })
      console.log('Inserted SiteSettings', key)
    }
  }
}

async function upsertPageContent() {
  const existing = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'PageContent',
    query: { paging: { limit: 100 } },
  }).catch((err) => {
    console.error('PageContent query failed — create the collection in CMS manually:', err.message)
    return null
  })
  if (!existing) return

  const byPage = new Map()
  for (const item of existing.dataItems ?? []) {
    if (item.data?.page) byPage.set(item.data.page, item)
  }

  for (const row of PAGE_ROWS) {
    const found = byPage.get(row.page)
    if (found) {
      await wix(`/wix-data/v2/items/${found.id}`, {
        dataCollectionId: 'PageContent',
        dataItem: {
          id: found.id,
          data: { ...(found.data ?? {}), ...row },
        },
      }, 'PATCH')
      console.log('Updated PageContent', row.page)
    } else {
      await wix('/wix-data/v2/items', {
        dataCollectionId: 'PageContent',
        dataItem: { data: row },
      })
      console.log('Inserted PageContent', row.page)
    }
  }
}

async function main() {
  await ensurePageContentCollection()
  await ensureParentMessagesCollection()
  await ensureProgramSessionsCollection()
  await upsertSiteSettings()
  await upsertPageContent()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
