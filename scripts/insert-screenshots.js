/**
 * insert-screenshots.js
 *
 * Reads the manifest from wix-screenshots.js, uploads each screenshot
 * to Google Drive (in a Screenshots subfolder), then appends an image
 * link to the bottom of each corresponding Google Doc.
 *
 * Usage: node scripts/insert-screenshots.js
 */

const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')
const OUT_DIR = path.join(__dirname, 'screenshots')
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json')
const ROOT_FOLDER_ID = '1G83OPP-_IMoAYTDnNQqV638UOjEvIqJx'

function getAuth() {
  const oauthRaw = JSON.parse(fs.readFileSync(OAUTH_PATH))
  const key = Object.keys(oauthRaw)[0]
  const { client_id, client_secret } = oauthRaw[key]
  const oAuth2 = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob')
  const token = JSON.parse(fs.readFileSync(CREDS_PATH))
  oAuth2.setCredentials(token)
  oAuth2.on('tokens', (t) => {
    fs.writeFileSync(CREDS_PATH, JSON.stringify({ ...token, ...t }, null, 2))
  })
  return oAuth2
}

async function findOrCreateFolder(drive, name, parentId) {
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
  const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' })
  if (res.data.files.length > 0) return res.data.files[0].id
  const created = await drive.files.create({
    resource: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  })
  return created.data.id
}

async function uploadImage(drive, filePath, name, folderId) {
  // Check if already uploaded
  const q = `name='${name}' and '${folderId}' in parents and trashed=false`
  const existing = await drive.files.list({ q, fields: 'files(id,webViewLink,webContentLink)', spaces: 'drive' })
  if (existing.data.files.length > 0) {
    console.log(`  ✓ Already uploaded: ${name}`)
    return existing.data.files[0].id
  }

  const res = await drive.files.create({
    resource: { name, parents: [folderId] },
    media: { mimeType: 'image/png', body: fs.createReadStream(filePath) },
    fields: 'id',
  })
  console.log(`  ⬆️  Uploaded: ${name}`)
  return res.data.id
}

async function findDoc(drive, title) {
  const q = `name='${title}' and mimeType='application/vnd.google-apps.document' and trashed=false`
  const res = await drive.files.list({ q, fields: 'files(id,name)', spaces: 'drive' })
  return res.data.files.length > 0 ? res.data.files[0].id : null
}

async function appendScreenshotLink(docsApi, docId, imageFileId, imageUrl) {
  // Check if screenshot section already added
  const doc = await docsApi.documents.get({ documentId: docId })
  const bodyText = doc.data.body.content
    .map(e => e.paragraph?.elements?.map(el => el.textRun?.content).join('') || '')
    .join('')

  if (bodyText.includes('Screenshot')) {
    console.log(`  ✓ Screenshot already in doc`)
    return
  }

  // Append heading + Drive image link at end of doc
  const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1

  await docsApi.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: endIndex },
            text: '\nScreenshot\nhttps://drive.google.com/file/d/' + imageFileId + '/view\n',
          },
        },
        {
          updateParagraphStyle: {
            range: { startIndex: endIndex + 1, endIndex: endIndex + 12 },
            paragraphStyle: { namedStyleType: 'HEADING_1' },
            fields: 'namedStyleType',
          },
        },
      ],
    },
  })
  console.log(`  ✅ Screenshot link added to doc`)
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ No manifest found. Run: node scripts/wix-screenshots.js first')
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH))
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docsApi = google.docs({ version: 'v1', auth })

  console.log('\n🖼️  Inserting screenshots into Google Docs...\n')

  // Create Screenshots subfolder
  const screenshotsFolderId = await findOrCreateFolder(drive, 'Screenshots', ROOT_FOLDER_ID)

  for (const item of manifest) {
    if (!item.filePath || !fs.existsSync(item.filePath)) {
      console.log(`  – Skipping (no file): ${item.name}`)
      continue
    }

    console.log(`\n  Processing: ${item.doc}`)

    // Upload image to Drive
    const imageName = `${item.name}.png`
    const imageFileId = await uploadImage(drive, item.filePath, imageName, screenshotsFolderId)

    // Find the doc
    const docId = await findDoc(drive, item.doc)
    if (!docId) {
      console.log(`  ⚠️  Doc not found: ${item.doc}`)
      continue
    }

    // Append screenshot link to doc
    await appendScreenshotLink(docsApi, docId, imageFileId, null)
  }

  console.log('\n✅ All screenshots inserted.\n')
}

main().catch(err => { console.error(err.message); process.exit(1) })
