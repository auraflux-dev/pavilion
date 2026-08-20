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


async function patchDataItem(collectionId, item, values) {
  const fieldModifications = Object.entries(values)
    .filter(([key, value]) => JSON.stringify(item.data?.[key] ?? null) !== JSON.stringify(value ?? null))
    .map(([fieldPath, value]) => ({
      fieldPath,
      action: 'SET_FIELD',
      setFieldOptions: { value },
    }))

  if (!fieldModifications.length) return false
  await wix(`/wix-data/v2/items/${item.id}`, {
    dataCollectionId: collectionId,
    patch: {
      dataItemId: item.id,
      fieldModifications,
    },
  }, 'PATCH')
  return true
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
  /** Comma-separated Catalog product UUIDs for /store (+ fundraising store totals) */
  storeProductIds: [
    '90ae23f7-51f4-438d-869c-1fbb28afd381',
    '96ca63ab-2535-4f91-8ad1-28a5d7d7d7d0',
    'ad137b27-cfa1-45ff-b506-c1021bfad12f',
    'a3e4a887-ad91-42b2-843d-653a11712544',
    '530bfb7e-370e-4174-8e2f-4463b5f34642',
    '53d1d89c-74e3-4f41-9988-5594ce2d590b',
    'fac09820-055c-4202-81ac-545639b8e24f',
    '03be5162-4928-4c39-b707-6e2de07921e0',
    '62b109c8-7b96-4f0d-b09d-fb8d93ff8f9d',
    'fd0bcb5b-6d08-4f0e-bb7c-27bfdc023ae4',
    'd9ed5b01-324d-4136-809d-21a3211b9d89',
    '9e7d4b13-4437-4c51-b63d-4942d18edf64',
  ].join(','),
  /** Comma-separated Catalog product UUIDs for /spirit-wear (+ fundraising spirit totals) */
  spiritWearProductIds: [
    '82ee7b02-5b3e-4383-8cd8-fcf089b45370',
    '1c0e1c1c-23f8-4095-8e4d-a9c467e6fef8',
    'd0bed142-0410-4442-a8e9-f1a5232862ef',
    'd5730ad6-8d4a-4757-93fa-05aa3ff1e244',
    'e9fbcab5-ae25-418e-a4ac-81889d93acc7',
    'f3eedab0-bfd5-4f30-ad8f-7586b783b78f',
    '791e1007-b926-4416-8a90-24dd641d0887',
  ].join(','),
  homeVolunteerImageUrl: '/placeholder.svg?height=450&width=600',
  homeVolunteerImageAlt:
    'SHMS PTO students and parent volunteers working together at a school event',
  homeVolunteerSecondaryCta: 'Learn More',
  homeCommunityImageUrl:
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1440&h=400&fit=crop&crop=center',
  homeCommunityImageAlt: 'Stone Hill Middle School PTO community',
  portalGrades: '6,7,8',
  contactEmailGeneral: 'president@shmspto.org',
  contactEmailTreasurer: 'treasurer@shmspto.org',
  contactAddress: '23415 Evergreen Ridge Drive, Ashburn, VA 20148',
  contactStoreHours: 'Open during lunch periods, Mon–Fri',
  socialFacebook: 'https://www.facebook.com/stonehillmspto/',
  socialInstagram: 'https://www.instagram.com/stonehillmspto',
  socialTwitter: '',
  socialYoutube: '',
  socialFacebookAccountId: '122099888691399229',
  socialFacebookPageId: '1223487774180200',
  socialInstagramAccountId: '',
  socialPublishEnabled: 'true',
}

const PAGE_ROWS = [
  {
    page: 'home',
    eyebrow: 'Ashburn, Virginia',
    title: 'Welcome to Stone Hill Middle School PTO',
    body: 'An active volunteer organization committed to enriching the academic and social experience for all SHMS PTO students and families. Go Stingrays!',
    ctaLabel: 'Join the PTO',
    ctaHref: '/membership',
    active: true,
  },
  {
    page: 'home-volunteer',
    eyebrow: 'Get Involved',
    title: 'Volunteer With Us',
    body: 'Every hour you volunteer helps create a richer, more vibrant experience for every student at Stone Hill Middle School. Whether you can give an hour a month or a few hours a week, your time makes a real difference.',
    bullets: [
      'Make a direct impact on student enrichment',
      'Connect with other SHMS PTO families',
      'Flexible time commitments for every schedule',
      'Be part of school events and celebrations',
    ].join('\n'),
    ctaLabel: 'Join Today',
    ctaHref: '/volunteer',
    sectionTitle:
      'Volunteering with SHMS PTO has been one of the most rewarding experiences of our family\'s school year.',
    sectionBody: '— SHMS PTO Parent, 2025–2026',
    active: true,
  },
  {
    page: 'home-community',
    title: 'Building community together.\nGo Stingrays!',
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
    body: 'Robotics, MATHCOUNTS, Young Entrepreneurs, and essay writing.\nOpen to grades 6 to 8.\nTuesdays and Wednesdays in the library, 12 sessions each.\nPaid members register first and save 10%, 15%, or 30%.\nSee the Fall 2026 schedule for times and dates.',
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
    eyebrow: 'SHMS PTO Store Card',
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
      'Thanks for supporting SHMS PTO. Your Ruby/Supreme benefits show on each student card below.',
    bullets:
      'Welcome to the SHMS PTO\nYour free parent account is ready. Add a student to track programs, store card balance, and paid membership status.\nPaid members get a pre-loaded store card, free or discounted program registration, and free refreshments at school events.',
    active: true,
  },
  {
    page: 'portal-hub',
    title: 'Member portal UI labels',
    body: 'Edit keyed bullets (key|text). One key per line. Unknown keys are ignored.',
    bullets: [
      'calendarTitle|Calendar & Messages',
      'accountTitle|My Account',
      'studentsTitle|My Students',
      'storeTitle|Store & Purchases',
      'tabCalendar|Calendar',
      'tabMessages|Messages',
      'signOut|Sign out',
      'refresh|Refresh',
      'loadError|Could not load your portal.',
      'calendarEmptyTitle|No dates yet',
      'calendarEmptyBody|After you enroll a student in a program, session times and school events show up here.',
      'calendarEmptyCta|Browse programs',
      'messagesEmptyTitle|Inbox empty',
      'messagesEmptyBody|Instructors can send updates here after your student is enrolled — class reminders, location changes, and more.',
      'viewMemberships|View paid memberships',
      'memberSince|Member since',
      'studentsLabel|Students',
      'paidMembershipsLabel|Paid memberships',
      'whatsappHeading|Grade WhatsApp',
      'storeCardsLabel|Store cards',
      'storeCardsHint|Current Balance',
      'recentBuysLabel|Recent buys',
      'recentBuysHint|Payment History',
      'ctaLoadCard|Load card',
      'ctaSpiritWear|Spirit wear',
      'ctaPrograms|Programs',
      'purchasesEmpty|Purchases from the site — memberships, programs, store card loads — will list here so you can see what each student is signed up for.',
      'addStudentCta|Add a student',
      'addStudentTitle|Add a student',
      'firstNameLabel|First name',
      'lastNameLabel|Last name',
      'gradeLabel|Grade',
      'addStudentSubmit|Add student',
      'cancel|Cancel',
      'addStudentError|Could not add student. Please try again.',
      'loadCardHelp|One family Cove Digital Card and balance. Choose $20 / $40 / $75, or enter any whole dollar amount. Pay with card or PayPal. Saving a card with Square is optional for faster reloads and auto top off.',
      'paymentMethodsTitle|How you pay',
      'paymentMethodsBody|Snack window: prepaid family Cove Digital Card. Online: pay with credit/debit card or PayPal in this portal (membership, The Cove, and Cove Digital Card reloads). Saving a card is optional.',
    ].join('\n'),
    active: true,
  },
  {
    page: 'portal-help',
    title: 'Portal help',
    body: 'Parent FAQ — member portal only. question|answer per line.',
    bullets: [
      'How do I update My Account?|Click Edit profile in My Account. Change name and phone here.',
      'How do I add another student?|My Students → Add a student at the bottom.',
      'How do I fix a student name or grade?|Open the student card → Edit student → Save.',
      'How do I reload the store card?|Store & Purchases → Load card → choose amount and pay.',
      'Do I need a store card?|Only for the snack window. Memberships and spirit wear pay online.',
      'Can I save a payment card?|Yes. Save it during a reload. Square secures it; SHMS PTO never receives the card number. Remove it anytime.',
      'Where do surveys appear?|Below your quadrants — same form we send by email, text, or WhatsApp.',
    ].join('\n'),
    active: true,
  },
  {
    page: 'legal-privacy',
    title: 'Privacy Policy',
    sectionTitle: 'July 2026',
    bullets: [
      'Who we are|Stone Hill Middle School PTO operates shmspto.org. Contact: president@shmspto.org.',
      'Information we collect|Account details, student grade info, enrollments, payments, survey responses, and messages.',
      'Payments|Processed by Square and/or Wix Payments. SHMS PTO does not store full card numbers.',
      'Photos|See /photo-release for event photography rules.',
    ].join('\n'),
    active: true,
  },
  {
    page: 'legal-terms',
    title: 'Terms of Use',
    sectionTitle: 'July 2026',
    bullets: [
      'Agreement|By using shmspto.org you agree to these terms and our Privacy Policy.',
      'Accounts|Provide accurate information. Parents manage only their household students.',
      'Purchases|Memberships, spirit wear, store-card reloads, and program fees follow posted pricing.',
    ].join('\n'),
    active: true,
  },
  {
    page: 'legal-photo-release',
    title: 'Photo & Media Release',
    sectionTitle: 'July 2026',
    bullets: [
      'Purpose|SHMS PTO may photograph events to celebrate students and promote programs.',
      'What we avoid|We do not post student last names on public social channels without explicit permission.',
      'Opt out|Email president@shmspto.org with student name and grade to opt out of public photo use.',
    ].join('\n'),
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
      const changed = await patchDataItem('SiteSettings', found, { key, value })
      console.log(changed ? 'Updated SiteSettings' : 'Skip SiteSettings (unchanged)', key)
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
      const changed = await patchDataItem('PageContent', found, row)
      console.log(changed ? 'Updated PageContent' : 'Skip PageContent (unchanged)', row.page)
    } else {
      await wix('/wix-data/v2/items', {
        dataCollectionId: 'PageContent',
        dataItem: { data: row },
      })
      console.log('Inserted PageContent', row.page)
    }
  }
}

async function ensureSurveysCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'Surveys',
        displayName: 'Surveys',
        fields: [
          { key: 'slug', displayName: 'Slug', type: 'TEXT' },
          { key: 'title', displayName: 'Title', type: 'TEXT' },
          { key: 'description', displayName: 'Description', type: 'TEXT' },
          { key: 'intro', displayName: 'Intro', type: 'TEXT' },
          { key: 'fieldsJson', displayName: 'Fields JSON', type: 'TEXT' },
          { key: 'brandingJson', displayName: 'Branding JSON', type: 'TEXT' },
          { key: 'audience', displayName: 'Audience', type: 'TEXT' },
          { key: 'showInPortal', displayName: 'Show In Portal', type: 'BOOLEAN' },
          { key: 'requireLogin', displayName: 'Require Login', type: 'BOOLEAN' },
          { key: 'createdBy', displayName: 'Created By', type: 'TEXT' },
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
    console.log('Created Surveys collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('Surveys collection already exists')
      return
    }
    console.warn('Surveys create skipped:', err.message.slice(0, 200))
  }
}

async function ensureSurveyResponsesCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'SurveyResponses',
        displayName: 'Survey Responses',
        fields: [
          { key: 'surveyId', displayName: 'Survey ID', type: 'TEXT' },
          { key: 'surveySlug', displayName: 'Survey Slug', type: 'TEXT' },
          { key: 'surveyTitle', displayName: 'Survey Title', type: 'TEXT' },
          { key: 'respondentEmail', displayName: 'Respondent Email', type: 'TEXT' },
          { key: 'respondentName', displayName: 'Respondent Name', type: 'TEXT' },
          { key: 'answersJson', displayName: 'Answers JSON', type: 'TEXT' },
          { key: 'channel', displayName: 'Channel', type: 'TEXT' },
          { key: 'submittedAt', displayName: 'Submitted At', type: 'DATETIME' },
        ],
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ADMIN',
        },
      },
    })
    console.log('Created SurveyResponses collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('SurveyResponses collection already exists')
      return
    }
    console.warn('SurveyResponses create skipped:', err.message.slice(0, 200))
  }
}

async function ensureStoredPaymentMethodsCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'StoredPaymentMethods',
        displayName: 'Stored Payment Methods',
        fields: [
          { key: 'parentEmail', displayName: 'Parent Email', type: 'TEXT' },
          { key: 'wixMemberId', displayName: 'Wix Member ID', type: 'TEXT' },
          { key: 'squareCustomerId', displayName: 'Square Customer ID', type: 'TEXT' },
          { key: 'squareCardId', displayName: 'Square Card ID', type: 'TEXT' },
          { key: 'brand', displayName: 'Card Brand', type: 'TEXT' },
          { key: 'last4', displayName: 'Last 4', type: 'TEXT' },
          { key: 'expMonth', displayName: 'Expiration Month', type: 'NUMBER' },
          { key: 'expYear', displayName: 'Expiration Year', type: 'NUMBER' },
          { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
          { key: 'updatedAt', displayName: 'Updated At', type: 'DATETIME' },
        ],
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ADMIN',
        },
      },
    })
    console.log('Created StoredPaymentMethods collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('StoredPaymentMethods collection already exists')
      return
    }
    console.warn('StoredPaymentMethods create skipped:', err.message.slice(0, 200))
  }
}

async function upsertSurveys() {
  const rows = [
    {
      slug: 'spring-feedback',
      title: 'Spring PTO Feedback',
      description: 'Share what is working and what you would like the PTO to focus on next.',
      intro: 'Your feedback helps the PTO plan programs, events, communications, and family support.',
      fieldsJson: JSON.stringify([
        {
          id: 'comments',
          type: 'textarea',
          label: 'Your feedback',
          required: true,
        },
      ]),
      brandingJson: JSON.stringify({
        accentColor: '#085508',
        thankYouMessage: 'Thank you — your feedback was sent to the SHMS PTO team.',
      }),
      audience: 'all',
      showInPortal: true,
      requireLogin: false,
      createdBy: 'SHMS PTO',
      active: true,
    },
  ]

  const existing = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'Surveys',
    query: { paging: { limit: 100 } },
  })
  const items = existing.dataItems ?? existing.items ?? []

  for (const row of rows) {
    const found = items.find((item) => item.data?.slug === row.slug)
    if (found) {
      const changed = await patchDataItem('Surveys', found, row)
      console.log(changed ? 'Updated Survey' : 'Skip Survey (unchanged)', row.slug)
    } else {
      await wix('/wix-data/v2/items', {
        dataCollectionId: 'Surveys',
        dataItem: { data: row },
      })
      console.log('Inserted Survey', row.slug)
    }
  }
}

async function ensureStaffRolesCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'StaffRoles',
        displayName: 'Staff Roles',
        fields: [
          { key: 'email', displayName: 'Email', type: 'TEXT' },
          { key: 'name', displayName: 'Name', type: 'TEXT' },
          { key: 'boardTitle', displayName: 'Board Title', type: 'TEXT' },
          { key: 'roles', displayName: 'System Roles', type: 'TEXT' },
          {
            key: 'assignedProgramIds',
            displayName: 'Assigned Program IDs',
            type: 'TEXT',
          },
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
    console.log('Created StaffRoles collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('StaffRoles collection already exists')
    } else {
      console.warn('StaffRoles create skipped:', err.message.slice(0, 200))
    }
  }

  try {
    const collection = await wix('/wix-data/v2/collections/StaffRoles', undefined, 'GET')
    const existing = new Set((collection.collection?.fields ?? []).map((field) => field.key))
    if (!existing.has('onboardingProgress')) {
      await wix('/wix-data/v2/collections/create-field', {
        dataCollectionId: 'StaffRoles',
        field: { key: 'onboardingProgress', displayName: 'Onboarding Progress', type: 'TEXT' },
      })
      console.log('Created StaffRoles field onboardingProgress')
    }
    if (!existing.has('assignedProgramIds')) {
      await wix('/wix-data/v2/collections/create-field', {
        dataCollectionId: 'StaffRoles',
        field: {
          key: 'assignedProgramIds',
          displayName: 'Assigned Program IDs',
          type: 'TEXT',
        },
      })
      console.log('Created StaffRoles field assignedProgramIds')
    }
  } catch (err) {
    console.warn('StaffRoles field ensure skipped:', String(err.message || err).slice(0, 200))
  }
}

async function ensureProgramEnrollmentsFields() {
  try {
    const collection = await wix('/wix-data/v2/collections/ProgramEnrollments', undefined, 'GET')
    if (!collection.collection) {
      console.warn('ProgramEnrollments collection missing — create it in Wix Content Manager first')
      return
    }
    const existing = new Set((collection.collection?.fields ?? []).map((field) => field.key))
    const fields = [
      { key: 'waitlistPosition', displayName: 'Waitlist Position', type: 'NUMBER' },
      { key: 'photoMediaConsent', displayName: 'Photo Media Consent', type: 'BOOLEAN' },
      { key: 'transactionId', displayName: 'Transaction ID', type: 'TEXT' },
      { key: 'feePaid', displayName: 'Fee Paid', type: 'NUMBER' },
      { key: 'enrolledAt', displayName: 'Enrolled At', type: 'DATETIME' },
    ]
    for (const field of fields) {
      if (existing.has(field.key)) continue
      await wix('/wix-data/v2/collections/create-field', {
        dataCollectionId: 'ProgramEnrollments',
        field,
      })
      console.log('Created ProgramEnrollments field', field.key)
    }
  } catch (err) {
    console.warn(
      'ProgramEnrollments field ensure skipped:',
      String(err.message || err).slice(0, 200),
    )
  }
}

async function ensureStudentArchiveFields() {
  const collection = await wix('/wix-data/v2/collections/Students', undefined, 'GET')
  const existing = new Set((collection.collection?.fields ?? []).map((field) => field.key))
  const fields = [
    { key: 'archived', displayName: 'Archived', type: 'BOOLEAN' },
    { key: 'archivedAt', displayName: 'Archived At', type: 'DATETIME' },
    { key: 'archivedBy', displayName: 'Archived By', type: 'TEXT' },
  ]

  for (const field of fields) {
    if (existing.has(field.key)) continue
    await wix('/wix-data/v2/collections/create-field', {
      dataCollectionId: 'Students',
      field,
    })
    console.log('Created Students field', field.key)
  }
}

async function ensureCommsCalendarItemsCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'CommsCalendarItems',
        displayName: 'Comms Calendar Items',
        fields: [
          { key: 'title', displayName: 'Title', type: 'TEXT' },
          { key: 'body', displayName: 'Body', type: 'TEXT' },
          { key: 'audiences', displayName: 'Audiences', type: 'TEXT' },
          { key: 'channel', displayName: 'Channel', type: 'TEXT' },
          { key: 'kind', displayName: 'Planner Kind', type: 'TEXT' },
          { key: 'status', displayName: 'Status', type: 'TEXT' },
          { key: 'publishAt', displayName: 'Publish At', type: 'DATETIME' },
          { key: 'ownerEmail', displayName: 'Owner Email', type: 'TEXT' },
          { key: 'ownerName', displayName: 'Owner Name', type: 'TEXT' },
          { key: 'assetUrl', displayName: 'Asset URL', type: 'TEXT' },
          { key: 'notes', displayName: 'Notes', type: 'TEXT' },
          { key: 'publishedAt', displayName: 'Published At', type: 'DATETIME' },
          { key: 'publishedByEmail', displayName: 'Published By Email', type: 'TEXT' },
          { key: 'createdByEmail', displayName: 'Created By Email', type: 'TEXT' },
          { key: 'createdAt', displayName: 'Created At', type: 'DATETIME' },
          { key: 'updatedAt', displayName: 'Updated At', type: 'DATETIME' },
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
    console.log('Created CommsCalendarItems collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('CommsCalendarItems collection already exists')
      return
    }
    console.warn('CommsCalendarItems create skipped:', err.message.slice(0, 200))
  }
}

async function ensureStaffProjectsCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'StaffProjects',
        displayName: 'Staff Projects',
        fields: [
          { key: 'title', displayName: 'Title', type: 'TEXT' },
          { key: 'description', displayName: 'Description', type: 'TEXT' },
          { key: 'schoolYear', displayName: 'School Year', type: 'TEXT' },
          { key: 'leadEmail', displayName: 'Lead Email', type: 'TEXT' },
          { key: 'leadName', displayName: 'Lead Name', type: 'TEXT' },
          { key: 'leadRole', displayName: 'Lead Role', type: 'TEXT' },
          { key: 'memberEmails', displayName: 'Member Emails', type: 'TEXT' },
          { key: 'status', displayName: 'Status', type: 'TEXT' },
          { key: 'sortOrder', displayName: 'Sort Order', type: 'NUMBER' },
          { key: 'createdByEmail', displayName: 'Created By Email', type: 'TEXT' },
          { key: 'createdAt', displayName: 'Created At', type: 'DATETIME' },
          { key: 'updatedAt', displayName: 'Updated At', type: 'DATETIME' },
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
    console.log('Created StaffProjects collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('StaffProjects collection already exists')
      return
    }
    console.warn('StaffProjects create skipped:', err.message.slice(0, 200))
  }
}

async function ensureStaffTasksCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'StaffTasks',
        displayName: 'Staff Tasks',
        fields: [
          { key: 'title', displayName: 'Title', type: 'TEXT' },
          { key: 'description', displayName: 'Description', type: 'TEXT' },
          { key: 'projectId', displayName: 'Project Id', type: 'TEXT' },
          { key: 'ownerRole', displayName: 'Owner Role', type: 'TEXT' },
          { key: 'assigneeEmail', displayName: 'Assignee Email', type: 'TEXT' },
          { key: 'assigneeName', displayName: 'Assignee Name', type: 'TEXT' },
          { key: 'status', displayName: 'Status', type: 'TEXT' },
          { key: 'dueAt', displayName: 'Due At', type: 'DATETIME' },
          { key: 'blockedByTaskId', displayName: 'Blocked By Task Id', type: 'TEXT' },
          { key: 'blockedByNote', displayName: 'Blocked By Note', type: 'TEXT' },
          { key: 'requestedBy', displayName: 'Requested By', type: 'TEXT' },
          { key: 'source', displayName: 'Source', type: 'TEXT' },
          { key: 'createdByEmail', displayName: 'Created By Email', type: 'TEXT' },
          { key: 'createdByName', displayName: 'Created By Name', type: 'TEXT' },
          { key: 'createdAt', displayName: 'Created At', type: 'DATETIME' },
          { key: 'updatedAt', displayName: 'Updated At', type: 'DATETIME' },
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
    console.log('Created StaffTasks collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('StaffTasks collection already exists')
    } else {
      console.warn('StaffTasks create skipped:', err.message.slice(0, 200))
    }
  }

  // Add project/assignee fields if collection already existed without them
  try {
    const collection = await wix('/wix-data/v2/collections/StaffTasks', undefined, 'GET')
    const existing = new Set((collection.collection?.fields ?? []).map((field) => field.key))
    const fields = [
      { key: 'projectId', displayName: 'Project Id', type: 'TEXT' },
      { key: 'assigneeEmail', displayName: 'Assignee Email', type: 'TEXT' },
      { key: 'assigneeName', displayName: 'Assignee Name', type: 'TEXT' },
    ]
    for (const field of fields) {
      if (existing.has(field.key)) continue
      await wix('/wix-data/v2/collections/create-field', {
        dataCollectionId: 'StaffTasks',
        field,
      })
      console.log('Created StaffTasks field', field.key)
    }
  } catch (err) {
    console.warn('StaffTasks field ensure skipped:', String(err.message || err).slice(0, 200))
  }
}

async function ensureSocialPostsCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'SocialPosts',
        displayName: 'Social Posts',
        fields: [
          { key: 'platform', displayName: 'Platform', type: 'TEXT' },
          { key: 'text', displayName: 'Text', type: 'TEXT' },
          { key: 'imageUrl', displayName: 'Image URL', type: 'TEXT' },
          { key: 'linkUrl', displayName: 'Link URL', type: 'TEXT' },
          { key: 'createdByEmail', displayName: 'Created By Email', type: 'TEXT' },
          { key: 'createdByName', displayName: 'Created By Name', type: 'TEXT' },
          { key: 'status', displayName: 'Status', type: 'TEXT' },
          { key: 'resultMessage', displayName: 'Result Message', type: 'TEXT' },
          { key: 'createdAt', displayName: 'Created At', type: 'DATETIME' },
        ],
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ADMIN',
        },
      },
    })
    console.log('Created SocialPosts collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('SocialPosts collection already exists')
      return
    }
    console.warn('SocialPosts create skipped:', err.message.slice(0, 200))
  }
}

async function upsertStaffRoles() {
  // Policy: staff logins must be @shmspto.org. Admin is president@ only.
  const rows = [
    {
      email: 'president@shmspto.org',
      name: 'Robert Gregory',
      boardTitle: 'President',
      roles: 'admin',
      personalEmail: 'gregory.robert.c@gmail.com',
      active: true,
    },
    {
      email: 'treasurer@shmspto.org',
      name: 'Ravi Batchu',
      boardTitle: 'Treasurer',
      roles: 'treasurer',
      personalEmail: '',
      active: true,
    },
  ]
  const existing = await wix('/wix-data/v2/items/query', {
    dataCollectionId: 'StaffRoles',
    query: { paging: { limit: 100 } },
  })
  const items = existing.dataItems ?? []

  // Deactivate any active staff row that is not on the official domain.
  for (const item of items) {
    const email = String(item.data?.email ?? '').toLowerCase()
    if (item.data?.active && email && !email.endsWith('@shmspto.org')) {
      await patchDataItem('StaffRoles', item, { active: false })
      console.log('Deactivated non-domain StaffRoles', email)
    }
  }

  for (const row of rows) {
    const found = items.find((item) => String(item.data?.email ?? '').toLowerCase() === row.email)
    if (found) {
      const changed = await patchDataItem('StaffRoles', found, row)
      console.log(changed ? 'Updated StaffRoles' : 'Skip StaffRoles (unchanged)', row.email)
    } else {
      await wix('/wix-data/v2/items', {
        dataCollectionId: 'StaffRoles',
        dataItem: { data: row },
      })
      console.log('Inserted StaffRoles', row.email)
    }
  }
}

async function ensureNewsletterTemplateHeroFields() {
  try {
    const collection = await wix('/wix-data/v2/collections/NewsletterTemplates', undefined, 'GET')
    const existing = new Set((collection.collection?.fields ?? []).map((f) => f.key))
    for (const field of [
      { key: 'heroImageUrl', displayName: 'Hero Image URL', type: 'TEXT' },
      { key: 'heroImageKey', displayName: 'Hero Image Key', type: 'TEXT' },
    ]) {
      if (existing.has(field.key)) continue
      await wix('/wix-data/v2/collections/create-field', { dataCollectionId: 'NewsletterTemplates', field })
      console.log('Created NewsletterTemplates field', field.key)
    }
  } catch (err) {
    console.warn("NewsletterTemplates hero fields:", String(err.message||err).slice(0,200))
  }
}

async function ensureNewsletterTemplatesCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'NewsletterTemplates',
        displayName: 'Newsletter Templates',
        fields: [
          { key: 'name', displayName: 'Name', type: 'TEXT' },
          { key: 'subject', displayName: 'Subject', type: 'TEXT' },
          { key: 'body', displayName: 'Body', type: 'TEXT' },
          { key: 'utmCampaign', displayName: 'UTM Campaign', type: 'TEXT' },
          { key: 'canvaDesignId', displayName: 'Canva Design Id', type: 'TEXT' },
          { key: 'canvaTitle', displayName: 'Canva Title', type: 'TEXT' },
          { key: 'canvaEditUrl', displayName: 'Canva Edit URL', type: 'TEXT' },
          { key: 'canvaViewUrl', displayName: 'Canva View URL', type: 'TEXT' },
          { key: 'canvaThumbnailUrl', displayName: 'Canva Thumbnail URL', type: 'TEXT' },
          { key: 'heroImageUrl', displayName: 'Hero Image URL', type: 'TEXT' },
          { key: 'heroImageKey', displayName: 'Hero Image Key', type: 'TEXT' },
          { key: 'updatedAt', displayName: 'Updated At', type: 'DATETIME' },
          { key: 'createdByEmail', displayName: 'Created By Email', type: 'TEXT' },
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
    console.log('Created NewsletterTemplates collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('NewsletterTemplates collection already exists')
      return
    }
    console.warn('NewsletterTemplates create skipped:', err.message.slice(0, 200))
  }
}

async function ensureNewsletterSendsCollection() {
  try {
    await wix('/wix-data/v2/collections', {
      collection: {
        id: 'NewsletterSends',
        displayName: 'Newsletter Sends',
        fields: [
          { key: 'templateId', displayName: 'Template Id', type: 'TEXT' },
          { key: 'subject', displayName: 'Subject', type: 'TEXT' },
          { key: 'body', displayName: 'Body', type: 'TEXT' },
          { key: 'linksJson', displayName: 'Links JSON', type: 'TEXT' },
          { key: 'utmCampaign', displayName: 'UTM Campaign', type: 'TEXT' },
          { key: 'tier', displayName: 'Tier', type: 'TEXT' },
          { key: 'grade', displayName: 'Grade', type: 'TEXT' },
          { key: 'recipientCount', displayName: 'Recipient Count', type: 'NUMBER' },
          { key: 'openCount', displayName: 'Open Count', type: 'NUMBER' },
          { key: 'clickCount', displayName: 'Click Count', type: 'NUMBER' },
          { key: 'sentAt', displayName: 'Sent At', type: 'DATETIME' },
          { key: 'sentByEmail', displayName: 'Sent By Email', type: 'TEXT' },
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
    console.log('Created NewsletterSends collection')
  } catch (err) {
    if (err.status === 409 || /already exists|ALREADY_EXISTS/i.test(String(err.message))) {
      console.log('NewsletterSends collection already exists')
      return
    }
    console.warn('NewsletterSends create skipped:', err.message.slice(0, 200))
  }
}

async function main() {
  await ensurePageContentCollection()
  await ensureParentMessagesCollection()
  await ensureProgramSessionsCollection()
  await ensureSurveysCollection()
  await ensureSurveyResponsesCollection()
  await ensureStoredPaymentMethodsCollection()
  await ensureStaffRolesCollection()
  await ensureProgramEnrollmentsFields()
  await ensureStudentArchiveFields()
  await ensureSocialPostsCollection()
  await ensureStaffProjectsCollection()
  await ensureStaffTasksCollection()
  await ensureCommsCalendarItemsCollection()
  await ensureNewsletterTemplatesCollection()
  await ensureNewsletterTemplateHeroFields()
  await ensureNewsletterSendsCollection()
  await upsertSiteSettings()
  await upsertPageContent()
  await upsertSurveys()
  await upsertStaffRoles()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
