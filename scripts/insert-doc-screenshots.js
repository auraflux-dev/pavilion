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
    images: [
      { file: '21-store-products.png', after: 'Wix Dashboard → Store / Catalog → Products' },
    ],
  },
  {
    docTitle: '21 - How to Show a New Store or Spirit Product',
    images: [
      { file: '21-store-products.png', after: '1. Wix Dashboard → Store → Products → create (or open) the product → Publish' },
      { file: '21-site-settings.png', after: '3. Content Manager → Site Settings → open storeProductIds or spiritWearProductIds' },
    ],
  },
  {
    docTitle: '13 - How to Edit Page Heroes and Marketing Copy (PageContent)',
    images: [
      { file: '13-pagecontent.png', after: 'Wix Dashboard → Content Manager → Page Content' },
    ],
  },
  {
    docTitle: '19 - How to Manage Volunteer Opportunities and Meeting Minutes',
    images: [
      { file: '19-volunteer-opps.png', after: 'Content Manager → Volunteer Opportunities' },
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

function docHasImage(doc) {
  return Object.keys(doc.inlineObjects ?? {}).length > 0
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
    if (docHasImage(doc)) { console.log('SKIP (already has images):', placement.docTitle); continue }

    // Resolve anchor indices, insert bottom-up so earlier indices stay valid.
    const inserts = []
    for (const img of placement.images) {
      const idx = paragraphEndIndexByText(doc, img.after)
      if (idx == null) { console.log('  ! anchor not found:', img.after); continue }
      const { width, height } = pngSize(path.join(SHOTS_DIR, img.file))
      const w = 420
      const h = Math.round((height / width) * w)
      inserts.push({ idx, uri: uriByFile[img.file], w, h })
    }
    inserts.sort((a, b) => b.idx - a.idx)

    const requests = []
    for (const ins of inserts) {
      requests.push({ insertText: { location: { index: ins.idx }, text: '\n' } })
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
