/**
 * Inserts the Expense Reimbursement action screenshots into the
 * "39 - Expense Reimbursements (Submit · Approve · Pay)" Google Doc.
 * Reuses the same OAuth + Drive/Docs approach as insert-doc-screenshots.js.
 */
const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')
const ROOT_FOLDER_ID = '1G83OPP-_IMoAYTDnNQqV638UOjEvIqJx'
const SHOTS_DIR = path.join(__dirname, 'shots')

const DOC_TITLE = '39 - Expense Reimbursements (Submit · Approve · Pay)'
const IMAGES = [
  {
    file: '39-expenses-form-empty.png',
    after: 'open the Expenses tab',
    caption: 'Action screenshot — Staff → Expenses submit form (requestor, breakdown, receipts, payment).',
  },
  {
    file: '39-expenses-form-filled.png',
    after: 'the Total due updates automatically',
    caption: 'Action screenshot — itemized breakdown with the Total due calculated automatically.',
  },
  {
    file: '39-expenses-submitted.png',
    after: 'appears in your list',
    caption: 'Action screenshot — a Submitted request; President / Admin see Approve and Reject.',
  },
  {
    file: '39-expenses-approved.png',
    after: 'look for requests with status Approved',
    caption: 'Action screenshot — an Approved request; Treasurer / Admin see Mark paid.',
  },
  {
    file: '39-expenses-paid.png',
    after: 'The status changes to Paid',
    caption: 'Action screenshot — a Paid request with the recorded paid date.',
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
  const norm = (s) => s.replace(/\s+/g, ' ').trim()
  for (const el of doc.body?.content ?? []) {
    const para = el.paragraph
    if (!para) continue
    const runs = (para.elements ?? []).map((e) => e.textRun?.content ?? '').join('')
    if (norm(runs).includes(norm(text))) return el.endIndex
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
  const docId = await findDoc(drive, DOC_TITLE)
  if (!docId) { console.error('Doc not found:', DOC_TITLE); process.exit(1) }

  const uriByFile = {}
  for (const img of IMAGES) {
    const id = await uploadImage(drive, shotsFolder, path.join(SHOTS_DIR, img.file))
    uriByFile[img.file] = `https://drive.google.com/uc?export=download&id=${id}`
    console.log('Uploaded', img.file)
  }

  const doc = (await docs.documents.get({ documentId: docId })).data
  const existingText = documentText(doc)

  const inserts = []
  for (const img of IMAGES) {
    if (existingText.includes(img.caption)) { console.log('  skip existing:', img.file); continue }
    const idx = paragraphEndIndexByText(doc, img.after)
    if (idx == null) { console.log('  ! anchor not found:', img.after); continue }
    const { width, height } = pngSize(path.join(SHOTS_DIR, img.file))
    const w = 450
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
  if (!requests.length) { console.log('Nothing to insert.'); return }
  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } })
  console.log(`Inserted ${inserts.length} image(s) into ${DOC_TITLE}`)
  console.log(`https://docs.google.com/document/d/${docId}/edit`)
}

main().catch((err) => { console.error('Error:', err.errors ?? err.message ?? err); process.exit(1) })
