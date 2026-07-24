/**
 * insert-doc-screenshots-gaps.js
 *
 * Fills the how-to docs that had 0 inline images by reusing existing action
 * screenshots from ./shots for the matching Staff/CMS workspace. Idempotent:
 * skips any caption already present. Same OAuth as insert-doc-screenshots.js.
 */
const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')
const ROOT_FOLDER_ID = '1G83OPP-_IMoAYTDnNQqV638UOjEvIqJx'
const SHOTS_DIR = path.join(__dirname, 'shots')

const PLACEMENTS = [
  {
    docTitle: '03 - How to Update Membership Tiers and Perks v2',
    images: [
      {
        file: '35-staff-tiers.png',
        after: 'Content Manager → Membership Tiers → open the tier',
        caption:
          'Action screenshot — Staff → Membership tiers editor (prices, perks, store-card credit, product IDs).',
      },
    ],
  },
  {
    docTitle: '08 - How to Manage Spirit Wear v2',
    images: [
      {
        file: '21-store-products.png',
        after: 'Dashboard → Store → Products → "+ New Product"',
        caption: 'Action screenshot — create and publish the product in Wix Stores first.',
      },
      {
        file: '21-staff-retail.png',
        after: 'Open the row with key: spiritWearProductIds',
        caption:
          'Action screenshot — Staff → Store & spirit allowlist (spiritWearProductIds).',
      },
    ],
  },
  {
    docTitle: '14 - How to Edit Member Portal Copy',
    images: [
      {
        file: '26-staff-content.png',
        after: 'Most labels and blurbs are editable in Page Content',
        caption: 'Action screenshot — Staff → Page copy editor (member-portal / portal rows).',
      },
      {
        file: '13-pagecontent.png',
        after: 'Edit the Bullets field. One key per line, format: key|text',
        caption: 'Action screenshot — CMS Page Content portal-hub key|text labels.',
      },
    ],
  },
  {
    docTitle: '17 - How to Manage Students, Enrollments, and Payments',
    images: [
      {
        file: '15-staff-members.png',
        after: '1. Sign in with an admin @shmspto.org account → Staff top nav → Members.',
        caption: 'Action screenshot — Staff → Members lookup, Archive / Restore a student.',
      },
      {
        file: '19-staff-payments.png',
        after: 'Content Manager → Payments (and related order sync)',
        caption: 'Action screenshot — Staff → Payments ledger and reconciliation.',
      },
    ],
  },
  {
    docTitle: '18 - How to Edit Nav and Footer Links',
    images: [
      {
        file: '40-staff-board.png',
        after: 'Wix Dashboard → Content Manager → Nav Links (or Navigation Links)',
        caption:
          'Action screenshot — Staff → Visitor CMS by role workspace (includes Nav & footer links).',
      },
    ],
  },
  {
    docTitle: '24 - How to Review and Export Survey Responses',
    images: [
      {
        file: '23-staff-surveys.png',
        after: 'Staff → Surveys',
        caption: 'Action screenshot — Staff → Surveys workspace (review responses & Download CSV).',
      },
    ],
  },
  // Canonical (renamed) variants that shipped without screenshots.
  {
    docTitle: '33 - Staff Inbox, Calendar & Docs (Google Workspace)',
    images: [
      {
        file: '33-staff-inbox.png',
        after: 'Left: Folders — Inbox on top',
        caption:
          'Action screenshot — Staff → Inbox / Google Workspace hub (folders, threads, reply).',
      },
    ],
  },
  {
    docTitle: '34 - Memberships Workspace (Roster, Mass Email, WhatsApp)',
    images: [
      {
        file: '34-staff-memberships.png',
        after: 'Search/filter members; see email, phone, tier',
        caption: 'Action screenshot — Staff → Memberships roster, mass email, WhatsApp.',
      },
    ],
  },
  {
    docTitle: '35 - Membership Tiers Reef · Lagoon · Tide (Parent Guide)',
    images: [
      {
        file: '14-my-account.png',
        after: 'Open Membership on the website (or Upgrade in the member portal).',
        caption:
          'Action screenshot — member portal (Upgrade to Reef / Lagoon / Tide entry point).',
      },
      {
        file: '38-portal-help.png',
        after: 'Free: Upgrade CTA + Portal help covers how to join.',
        caption: 'Action screenshot — Portal help FAQ (how to join / upgrade).',
      },
    ],
  },
  {
    docTitle: '36 - Discount Codes & Spirit Coupons (Staff)',
    images: [
      {
        file: '36-staff-discounts.png',
        after: 'Open Staff → Discounts.',
        caption: 'Action screenshot — Staff → Discounts workspace (active codes).',
      },
    ],
  },
  {
    docTitle: '38 - Parent Portal Checklist (Free & Paid)',
    images: [
      {
        file: '14-my-account.png',
        after: 'Edit My Account (name, phone)',
        caption: 'Action screenshot — member portal My Account (name, phone).',
      },
      {
        file: '12b-reload-card.png',
        after: 'Load a store card / view balance',
        caption: 'Action screenshot — Load a student store card / view balance.',
      },
      {
        file: '38-portal-help.png',
        after: 'Use Portal help FAQ',
        caption: 'Action screenshot — Portal help FAQ (free & paid).',
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
  oAuth2.on('tokens', (t) =>
    fs.writeFileSync(CREDS_PATH, JSON.stringify({ ...token, ...t }, null, 2))
  )
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
    fields: 'files(id)',
    spaces: 'drive',
  })
  let id
  if (existing.data.files.length) {
    id = existing.data.files[0].id
  } else {
    const created = await drive.files.create({
      resource: { name, parents: [folderId] },
      media: { mimeType: 'image/png', body: fs.createReadStream(file) },
      fields: 'id',
    })
    id = created.data.id
  }
  await drive.permissions
    .create({ fileId: id, requestBody: { role: 'reader', type: 'anyone' } })
    .catch(() => {})
  return id
}

async function findDoc(drive, title) {
  const res = await drive.files.list({
    q: `name='${title.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.document' and trashed=false`,
    fields: 'files(id,name)',
    spaces: 'drive',
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

  const uriByFile = {}
  const files = [...new Set(PLACEMENTS.flatMap((p) => p.images.map((i) => i.file)))]
  for (const f of files) {
    const id = await uploadImage(drive, shotsFolder, path.join(SHOTS_DIR, f))
    uriByFile[f] = `https://drive.google.com/uc?export=download&id=${id}`
  }

  for (const placement of PLACEMENTS) {
    const docId = await findDoc(drive, placement.docTitle)
    if (!docId) {
      console.log('SKIP (not found):', placement.docTitle)
      continue
    }
    const doc = (await docs.documents.get({ documentId: docId })).data
    const existingText = documentText(doc)

    const inserts = []
    for (const img of placement.images) {
      if (existingText.includes(img.caption)) {
        console.log('  skip existing:', img.caption)
        continue
      }
      const idx = paragraphEndIndexByText(doc, img.after)
      if (idx == null) {
        console.log('  ! anchor not found:', img.after)
        continue
      }
      const { width, height } = pngSize(path.join(SHOTS_DIR, img.file))
      const w = 420
      const h = Math.round((height / width) * w)
      inserts.push({ idx, uri: uriByFile[img.file], w, h, caption: img.caption })
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
    if (!requests.length) {
      console.log('  nothing to insert:', placement.docTitle)
      continue
    }
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
