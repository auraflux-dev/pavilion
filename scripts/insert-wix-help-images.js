/**
 * insert-wix-help-images.js
 *
 * Inserts official Wix Help Center screenshots (downloaded by the probe in
 * scripts/wix-help-images/) into the SHMS PTO admin guide Google Docs, right
 * after the step text each image illustrates. Every image gets an italic
 * attribution caption ("Image: Wix Help — <article>").
 *
 * Idempotent: skips an image if its caption text already exists in the doc.
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
const IMAGES_DIR = path.join(__dirname, 'wix-help-images')

const ARTICLE_TITLES = {
  'stores-add-physical-product': 'Wix Stores: Adding a Physical Product',
  'stores-inventory': 'Wix Stores: About Inventory Management',
  'stores-ribbons': 'Wix Stores: Managing Ribbons',
  'cms-collections': 'CMS: Managing Your Collection Content',
  'media-manager': 'Wix Media: About the Media Manager',
  'events-manage': 'Wix Events: Managing Your Events',
}

// Doc title → images + the exact step text each image goes after.
const PLACEMENTS = [
  {
    docTitle: '01 - How to Manage Board Members v2',
    images: [
      { file: 'cms-collections-5.png', after: 'Click "+ New Item"' },
      { file: 'media-manager-3.png', after: 'Media Manager → Upload → copy the URL' },
    ],
  },
  {
    docTitle: '02 - How to Add or Edit Programs v2',
    images: [
      { file: 'cms-collections-5.png', after: 'Content Manager → Programs → "+ New Item"' },
    ],
  },
  {
    docTitle: '03 - How to Update Membership Tiers and Perks v2',
    images: [
      { file: 'cms-collections-3.png', after: 'Wix Dashboard → Content Manager → Membership Tiers' },
    ],
  },
  {
    docTitle: '04 - How to Update the Announcement Bar v2',
    images: [
      { file: 'cms-collections-3.png', after: 'Wix Dashboard → Content Manager → Site Settings' },
    ],
  },
  {
    docTitle: '05 - How to Update Fundraising Goals v2',
    images: [
      { file: 'cms-collections-3.png', after: 'Wix Dashboard → Content Manager → Site Settings' },
    ],
  },
  {
    docTitle: '06 - How to Manage the FAQ v2',
    images: [
      { file: 'cms-collections-5.png', after: 'Content Manager → FAQ Items → "+ New Item"' },
    ],
  },
  {
    docTitle: '07 - How to Manage Events v2',
    images: [
      { file: 'events-manage-3.jpg', after: 'Dashboard → Events → find the event → click to open → Edit' },
    ],
  },
  {
    docTitle: '08 - How to Manage Spirit Wear v2',
    images: [
      { file: 'stores-add-physical-product-5.png', after: 'Fill in: product name, price, description (optional), product image' },
      { file: 'stores-inventory-0.png', after: 'Open the product → Inventory → set quantity to 0 or toggle to "Out of Stock".' },
    ],
  },
  {
    docTitle: '08b - How to Manage the School Store Inventory v2',
    images: [
      { file: 'stores-inventory-1.png', after: 'Set quantity to 0 or toggle to "Out of Stock"' },
      { file: 'stores-ribbons-2.png', after: 'Find the "Ribbon" field → type any text (e.g. "Deal")' },
    ],
  },
  {
    docTitle: '12b - How to Manage the Store Card',
    images: [
      { file: 'stores-inventory-2.png', after: 'Open the product → Variants tab' },
    ],
  },
  {
    docTitle: '19 - How to Manage Volunteer Opportunities and Meeting Minutes',
    images: [
      { file: 'cms-collections-5.png', after: 'Content Manager → Volunteer Opportunities → + New Item' },
    ],
  },
  {
    docTitle: 'SHMS PTO — Image Upload Guide',
    images: [
      { file: 'media-manager-3.png', after: 'you cannot add these through the Wix dashboard.' },
      { file: 'stores-add-physical-product-5.png', after: 'Click Add Media and upload the product photo' },
    ],
  },
  {
    docTitle: 'SHMS PTO — Meetings & Minutes: How to Update the Collection',
    images: [
      { file: 'cms-collections-5.png', after: 'Click + New Item in the MeetingMinutes collection.' },
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

function imageSize(file) {
  const buf = fs.readFileSync(file)
  if (file.endsWith('.png')) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }
  // Minimal JPEG SOF scan
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue }
    const marker = buf[i + 1]
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
    }
    i += 2 + buf.readUInt16BE(i + 2)
  }
  return { width: 800, height: 450 }
}

function captionFor(file) {
  const slug = file.replace(/-\d+\.(png|jpe?g|gif)$/, '')
  return `Image: Wix Help — ${ARTICLE_TITLES[slug] || 'support.wix.com'}`
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
  const mime = file.endsWith('.jpg') ? 'image/jpeg' : 'image/png'
  const existing = await drive.files.list({
    q: `name='${name}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)', spaces: 'drive',
  })
  let id
  if (existing.data.files.length) {
    id = existing.data.files[0].id
  } else {
    const created = await drive.files.create({
      resource: { name, parents: [folderId] },
      media: { mimeType: mime, body: fs.createReadStream(file) },
      fields: 'id',
    })
    id = created.data.id
  }
  await drive.permissions.create({ fileId: id, requestBody: { role: 'reader', type: 'anyone' } }).catch(() => {})
  return `https://drive.google.com/uc?export=download&id=${id}`
}

async function findDoc(drive, title) {
  const res = await drive.files.list({
    q: `name='${title.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.document' and trashed=false`,
    fields: 'files(id,name)', spaces: 'drive',
  })
  return res.data.files[0]?.id ?? null
}

function docText(doc) {
  let out = ''
  for (const el of doc.body?.content ?? []) {
    if (!el.paragraph) continue
    out += (el.paragraph.elements ?? []).map((e) => e.textRun?.content ?? '').join('')
  }
  return out.replace(/\s+/g, ' ')
}

function paragraphEndIndexByText(doc, text) {
  const needle = text.replace(/\s+/g, ' ').trim()
  for (const el of doc.body?.content ?? []) {
    const para = el.paragraph
    if (!para) continue
    const runs = (para.elements ?? []).map((e) => e.textRun?.content ?? '').join('')
    if (runs.replace(/\s+/g, ' ').trim().includes(needle)) return el.endIndex
  }
  return null
}

async function main() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docsApi = google.docs({ version: 'v1', auth })

  const helpFolder = await findFolder(drive, 'Wix Help Images', ROOT_FOLDER_ID)

  const uriByFile = {}
  const files = [...new Set(PLACEMENTS.flatMap((p) => p.images.map((i) => i.file)))]
  for (const f of files) {
    uriByFile[f] = await uploadImage(drive, helpFolder, path.join(IMAGES_DIR, f))
    console.log('Ready:', f)
  }

  for (const placement of PLACEMENTS) {
    const docId = await findDoc(drive, placement.docTitle)
    if (!docId) { console.log('SKIP (not found):', placement.docTitle); continue }
    const doc = (await docsApi.documents.get({ documentId: docId })).data
    const fullText = docText(doc)

    const inserts = []
    for (const img of placement.images) {
      const caption = captionFor(img.file)
      // One caption per doc per source image file — skip if already inserted.
      if (fullText.includes(caption) && doc.inlineObjects && Object.values(doc.inlineObjects).length > 0) {
        // Cheap check: caption present means this image was placed before.
        console.log('  skip (already placed):', img.file, 'in', placement.docTitle)
        continue
      }
      const idx = paragraphEndIndexByText(doc, img.after)
      if (idx == null) { console.log('  ! anchor not found:', JSON.stringify(img.after), 'in', placement.docTitle); continue }
      const { width, height } = imageSize(path.join(IMAGES_DIR, img.file))
      const w = Math.min(430, Math.round(width * 0.75))
      const h = Math.round((height / width) * w)
      inserts.push({ idx, uri: uriByFile[img.file], w, h, caption })
    }
    // Bottom-up so earlier anchor indices stay valid.
    inserts.sort((a, b) => b.idx - a.idx)

    const requests = []
    for (const ins of inserts) {
      // Order matters: text first, then image lands before it at the same index.
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
      // After both inserts: [img](1) \n(1) caption... → caption starts at idx+2
      requests.push({
        updateTextStyle: {
          range: { startIndex: ins.idx + 2, endIndex: ins.idx + 2 + ins.caption.length },
          textStyle: {
            italic: true,
            fontSize: { magnitude: 9, unit: 'PT' },
            foregroundColor: { color: { rgbColor: { red: 0.45, green: 0.45, blue: 0.45 } } },
          },
          fields: 'italic,fontSize,foregroundColor',
        },
      })
    }
    if (!requests.length) { console.log('  nothing to insert:', placement.docTitle); continue }

    await docsApi.documents.batchUpdate({ documentId: docId, requestBody: { requests } })
    console.log(`Inserted ${inserts.length} image(s): ${placement.docTitle}`)
    console.log(`  https://docs.google.com/document/d/${docId}`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error('Error:', err.errors ?? err.message ?? err)
  process.exit(1)
})
