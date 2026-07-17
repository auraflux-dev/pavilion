/**
 * insert-doc-screenshots.js
 *
 * Uploads action screenshots to Drive and inserts each into the matching
 * SHMS PTO how-to Google Doc, right after the step text it illustrates.
 *
 * Idempotent-ish: skips a doc that already contains inline images.
 *
 * Auth: same OAuth token as create-pto-docs.js (~/.gdrive-oauth.json + creds).
 */

const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')
const ROOT_FOLDER_ID = '1G83OPP-_IMoAYTDnNQqV638UOjEvIqJx'
const SHOTS_DIR = path.join(__dirname, 'shots')

// Doc title → images + the exact step text to place each image after.
const PLACEMENTS = [
  {
    docTitle: '08b - How to Manage the School Store Inventory v2',
    legacy: true,
    images: [
      { file: '21-store-products.png', after: 'Wix Dashboard → Store / Catalog → Products' },
    ],
  },
  {
    docTitle: '02 - How to Add or Edit Programs v2',
    images: [
      {
        file: '02-staff-programs.png',
        after: '1. Sign in with @shmspto.org → Staff top nav → Programs.',
        caption: 'Action screenshot — Staff → Programs registration and featured toggles.',
      },
    ],
  },
  {
    docTitle: '07 - How to Manage Events v2',
    images: [
      {
        file: '13-staff-events.png',
        after: 'Recommended view: Staff top nav → Events — shows upcoming events and a Manage in Wix Events button.',
        caption: 'Action screenshot — Staff → Events list and Manage in Wix Events shortcut.',
      },
    ],
  },
  {
    docTitle: '12b - How to Manage the Store Card',
    images: [
      {
        file: '12b-reload-card.png',
        after: '1. Parent signs in → Store & Purchases → Load card (or /store).',
        caption: 'Action screenshot — choose the student, amount, and secure Square payment.',
      },
      {
        file: '19-staff-payments.png',
        after: 'Treasurer / admin: Staff top nav → Payments. Filter or open rows with status Needs Reconciliation.',
        caption: 'Action screenshot — Staff → Payments Needs Reconciliation filter.',
      },
    ],
  },
  {
    docTitle: '13 - How to Edit Page Heroes and Marketing Copy (PageContent)',
    images: [
      {
        file: '26-staff-content.png',
        after: '1. Preferred: Staff top nav → Page copy → open the page slug you need.',
        caption: 'Action screenshot — Staff → Page copy editor.',
      },
      {
        file: '13-pagecontent.png',
        after: '2. Or: Content Manager → Page Content → open the row whose page matches the site URL (e.g. programs for /programs, or home-volunteer for the home volunteer block)',
        caption: 'Action screenshot — CMS Page Content backup path.',
      },
    ],
  },
  {
    docTitle: '15 - How to Add Program Session Dates (Calendar)',
    images: [
      {
        file: '02-staff-programs.png',
        after: '1. Staff top nav → Programs → Sessions tab',
        caption: 'Action screenshot — Staff → Programs (use Sessions tab for calendar dates).',
      },
    ],
  },
  {
    docTitle: '16 - How to Send Parent Messages (Portal Inbox)',
    images: [
      {
        file: '25-staff-messages.png',
        after: '4. Select Send to inbox. The message appears inside the parent portal.',
        caption: 'Action screenshot — Staff → Messages composer and audience targeting.',
      },
    ],
  },
  {
    docTitle: '19 - How to Manage Volunteer Opportunities and Meeting Minutes',
    images: [
      {
        file: '19-volunteer-opps.png',
        after: 'Content Manager → Volunteer Opportunities',
        caption: 'Action screenshot — Volunteer Opportunities in Content Manager.',
      },
      {
        file: '31-staff-minutes.png',
        after: '1. Staff → Minutes → add or edit the meeting → publish / save (or CMS: + New Item → fill fields → active = true → Save)',
        caption: 'Action screenshot — Staff → Minutes publish form.',
      },
    ],
  },
  {
    docTitle: '21 - How to Show a New Store or Spirit Product',
    images: [
      {
        file: '21-store-products.png',
        after: '1. Wix Dashboard → Store → Products → create (or open) the product → Publish',
        caption: 'Action screenshot — create/publish the product in Wix Stores first.',
      },
      {
        file: '21-staff-retail.png',
        after: 'After you have the Product ID, Staff top nav → Store & spirit — paste into the store or spirit list and save. Site Settings below remains the CMS backup.',
        caption: 'Action screenshot — Staff → Store & spirit UUID lists.',
      },
      {
        file: '21-site-settings.png',
        after: '3. Content Manager → Site Settings → open storeProductIds or spiritWearProductIds',
        caption: 'Action screenshot — CMS Site Settings allowlist backup.',
      },
    ],
  },
  {
    docTitle: '23 - How to Create and Share a Branded Survey',
    images: [
      {
        file: '23-staff-surveys.png',
        after: '2. Click Create survey.',
        caption: 'Action screenshot — Staff → Surveys create and share workspace.',
      },
      {
        file: '23-portal-survey.png',
        after: '5. Toggle Active, Show in member portal, and Require login as needed → Create survey.',
        caption: 'Action screenshot — active surveys appear inside the parent portal.',
      },
      {
        file: '23-branded-survey-form.png',
        after: 'Still on Staff → Surveys: choose the survey, then Open Email / SMS / WhatsApp, or Copy. Open live survey opens /survey/your-slug.',
        caption: 'Action screenshot — the branded form parents complete on the PTO site.',
      },
    ],
  },
  {
    docTitle: '25 - How to Publish to Facebook and Instagram from Wix',
    images: [
      {
        file: '12b-staff-social.png',
        after: 'Recommended board workflow: sign in to shmspto.org → Staff top nav → Social.',
        caption: 'Action screenshot — Staff → Social Facebook compose.',
      },
    ],
  },
  {
    docTitle: '26 - Staff Roles & Portal Workspaces',
    images: [
      {
        file: '30-staff-home.png',
        after: 'Each role home shows what that position owns and a short This Week checklist.',
        caption: 'Action screenshot — Staff Home with role cards and This Week.',
      },
      {
        file: '16-staff-access.png',
        after: '2. An admin signs in → Staff top nav → Staff access. The new person already appears in the list with no roles.',
        caption: 'Action screenshot — Staff → Staff access role assignment.',
      },
      {
        file: '15-staff-members.png',
        after: 'Admin searches a parent, clicks Act as, lands in that parent portal view (read-oriented). Exit act-as returns to /staff.',
        caption: 'Action screenshot — Staff → Members lookup.',
      },
      {
        file: '12b-staff-social.png',
        after: 'Staff → Social supports Facebook Post/Reel/Story with Media Manager upload, gallery, link preview metadata, scheduling, and optional site-asset promotion. Instagram unlocks after a second Wix social slot. Doc 25.',
        caption: 'Action screenshot — marketing Social workspace.',
      },
      {
        file: '25-staff-messages.png',
        after: 'Write the subject and message, target a parent, grade, or program, then Send to inbox. Parents read it without leaving the portal. Doc 16.',
        caption: 'Action screenshot — Staff → Messages.',
      },
    ],
  },
  {
    docTitle: '27 - Member Portal Parent Support Guide',
    images: [
      {
        file: '14-my-account.png',
        after: 'The My Account panel shows the signed-in email, membership summary, student count, payment explanation, and grade WhatsApp links.',
        caption: 'Action screenshot — the parent My Account home panel.',
      },
      {
        file: '14-edit-account.png',
        after: 'To update a name or mobile phone: select Edit profile, make the change, then Save. The sign-in email is not editable here.',
        caption: 'Action screenshot — edit the parent name or mobile phone.',
      },
      {
        file: '14-edit-student.png',
        after: 'To fix a student name or grade: open the student card, select Edit student, make the change, then Save.',
        caption: 'Action screenshot — edit student name and grade.',
      },
      {
        file: '12b-reload-card.png',
        after: 'In Store & Purchases, select Load card, choose the student and $10 / $20 / $25, then enter payment details.',
        caption: 'Action screenshot — reload a selected student store card.',
      },
      {
        file: '23-portal-survey.png',
        after: 'Active Surveys for you appear below the portal panels. The parent opens and submits the branded survey without leaving the PTO site.',
        caption: 'Action screenshot — in-portal survey placement.',
      },
    ],
  },
  {
    docTitle: '29 - Staff Work Board (Tasks by Role)',
    images: [
      {
        file: '29-staff-projects.png',
        after: '3. Staff top nav → Projects (Year board / My board / Project views).',
        caption: 'Action screenshot — Staff → Projects year swimlanes.',
      },
    ],
  },
  {
    docTitle: '30 - Staff Portal Quick Start',
    images: [
      {
        file: '30-staff-home.png',
        after: 'Home — role home cards + This week checklist',
        caption: 'Action screenshot — Staff Home and top-nav workspaces.',
      },
    ],
  },
  {
    docTitle: '31 - Admin Lookup, Act-as & Student Archive',
    images: [
      {
        file: '15-staff-members.png',
        after: '1. Staff top nav → Members.',
        caption: 'Action screenshot — Staff → Members lookup.',
      },
    ],
  },
  {
    docTitle: '32 - Staff Workspaces Map (Role Tools)',
    images: [
      {
        file: '30-staff-home.png',
        after: 'Everyone on Staff. Role home cards + This Week checklist. Doc 26, 30.',
        caption: 'Action screenshot — Staff Home workspace map entry point.',
      },
    ],
  },
]

function getAuth() {
  const oauthRaw = JSON.parse(fs.readFileSync(OAUTH_PATH))
  const key = Object.keys(oauthRaw)[0]
  const { client_id, client_secret } = oauthRaw[key]
  const oAuth2 = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob')
  const token = JSON.parse(fs.readFileSync(CREDS_PATH))
  oAuth2.setCredentials(token)
  oAuth2.on('tokens', (t) => fs.writeFileSync(CREDS_PATH, JSON.stringify({ ...token, ...t }, null, 2)))
  return oAuth2
}

function pngSize(file) {
  const buf = fs.readFileSync(file)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

async function findFolder(drive, name, parentId) {
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
  const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' })
  if (res.data.files.length) return res.data.files[0].id
  const created = await drive.files.create({
    resource: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  })
  return created.data.id
}

async function uploadImage(drive, folderId, file) {
  const name = path.basename(file)
  const existing = await drive.files.list({
    q: `name='${name}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)', spaces: 'drive',
  })
  let id
  if (existing.data.files.length) {
    id = existing.data.files[0].id
    await drive.files.update({ fileId: id, media: { mimeType: 'image/png', body: fs.createReadStream(file) } })
  } else {
    const created = await drive.files.create({
      resource: { name, parents: [folderId] },
      media: { mimeType: 'image/png', body: fs.createReadStream(file) },
      fields: 'id',
    })
    id = created.data.id
  }
  await drive.permissions.create({ fileId: id, requestBody: { role: 'reader', type: 'anyone' } }).catch(() => {})
  return id
}

async function findDoc(drive, title) {
  const res = await drive.files.list({
    q: `name='${title.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.document' and trashed=false`,
    fields: 'files(id,name)', spaces: 'drive',
  })
  return res.data.files[0]?.id ?? null
}

function paragraphEndIndexByText(doc, text) {
  for (const el of doc.body?.content ?? []) {
    const para = el.paragraph
    if (!para) continue
    const runs = (para.elements ?? []).map((e) => e.textRun?.content ?? '').join('')
    if (runs.replace(/\s+/g, ' ').trim().includes(text.replace(/\s+/g, ' ').trim())) {
      return el.endIndex
    }
  }
  return null
}

function documentText(doc) {
  return (doc.body?.content ?? [])
    .flatMap((el) => el.paragraph?.elements ?? [])
    .map((el) => el.textRun?.content ?? '')
    .join('')
}

async function main() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docs = google.docs({ version: 'v1', auth })

  const shotsFolder = await findFolder(drive, 'Screenshots', ROOT_FOLDER_ID)
  console.log('Screenshots folder:', shotsFolder)

  // Upload every referenced image once, get a public URI.
  const uriByFile = {}
  const files = [...new Set(PLACEMENTS.flatMap((p) => p.images.map((i) => i.file)))]
  for (const f of files) {
    const id = await uploadImage(drive, shotsFolder, path.join(SHOTS_DIR, f))
    uriByFile[f] = `https://drive.google.com/uc?export=download&id=${id}`
    console.log('Uploaded', f, '→', id)
  }

  for (const placement of PLACEMENTS) {
    const docId = await findDoc(drive, placement.docTitle)
    if (!docId) { console.log('SKIP (not found):', placement.docTitle); continue }
    let doc = (await docs.documents.get({ documentId: docId })).data
    if (placement.legacy && Object.keys(doc.inlineObjects ?? {}).length > 0) {
      console.log('SKIP (legacy images already present):', placement.docTitle)
      continue
    }
    const existingText = documentText(doc)

    // Resolve anchor indices, insert bottom-up so earlier indices stay valid.
    const inserts = []
    for (const img of placement.images) {
      const caption = img.caption ?? `Action screenshot — ${img.file}`
      if (existingText.includes(caption)) {
        console.log('  skip existing:', caption)
        continue
      }
      const idx = paragraphEndIndexByText(doc, img.after)
      if (idx == null) { console.log('  ! anchor not found:', img.after); continue }
      const { width, height } = pngSize(path.join(SHOTS_DIR, img.file))
      const w = 420
      const h = Math.round((height / width) * w)
      inserts.push({ idx, uri: uriByFile[img.file], w, h, caption })
    }
    inserts.sort((a, b) => b.idx - a.idx)

    const requests = []
    for (const ins of inserts) {
      requests.push({ insertText: { location: { index: ins.idx }, text: `\n${ins.caption}\n` } })
      requests.push({
        insertInlineImage: {
          location: { index: ins.idx },
          uri: ins.uri,
          objectSize: {
            width: { magnitude: ins.w, unit: 'PT' },
            height: { magnitude: ins.h, unit: 'PT' },
          },
        },
      })
    }
    if (!requests.length) { console.log('  nothing to insert:', placement.docTitle); continue }

    await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } })
    console.log(`Inserted ${inserts.length} image(s): ${placement.docTitle}`)
    console.log(`  https://docs.google.com/document/d/${docId}`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error('Error:', err.errors ?? err.message ?? err)
  process.exit(1)
})
