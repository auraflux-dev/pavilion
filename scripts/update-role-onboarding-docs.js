/**
 * Create Drive doc 47 - Staff Role Onboarding + Quick Start append.
 * Usage: node scripts/update-role-onboarding-docs.js
 */
const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')
const ROOT_FOLDER = '1G83OPP-_IMoAYTDnNQqV638UOjEvIqJx'

function getAuth() {
  const oauthRaw = JSON.parse(fs.readFileSync(OAUTH_PATH))
  const key = Object.keys(oauthRaw)[0]
  const { client_id, client_secret } = oauthRaw[key]
  const oAuth2 = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob')
  const token = JSON.parse(fs.readFileSync(CREDS_PATH))
  oAuth2.setCredentials(token)
  return oAuth2
}

async function findDoc(drive, title) {
  const q = `name='${title.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.document' and trashed=false`
  const res = await drive.files.list({
    q,
    fields: 'files(id,name,parents)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  return res.data.files?.[0] || null
}

async function replaceBody(docs, docId, paragraphs) {
  const doc = await docs.documents.get({ documentId: docId })
  const end = doc.data.body.content.at(-1).endIndex
  const requests = []
  if (end > 2) {
    requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: end - 1 } } })
  }
  requests.push({ insertText: { location: { index: 1 }, text: paragraphs.join('\n') + '\n' } })
  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } })
}

async function appendSection(docs, docId, heading, lines) {
  const doc = await docs.documents.get({ documentId: docId })
  const end = doc.data.body.content.at(-1).endIndex
  const text = `\n${heading}\n${lines.join('\n')}\n`
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests: [{ insertText: { location: { index: end - 1 }, text } }] },
  })
}

async function ensureDoc(docs, drive, title, paragraphs) {
  let file = await findDoc(drive, title)
  if (!file) {
    const created = await docs.documents.create({ requestBody: { title } })
    const docId = created.data.documentId
    await drive.files.update({
      fileId: docId,
      addParents: ROOT_FOLDER,
      removeParents: 'root',
      fields: 'id,parents',
      supportsAllDrives: true,
    })
    file = { id: docId }
    console.log('CREATED', title)
  } else {
    console.log('UPDATE', title)
  }
  await replaceBody(docs, file.id, paragraphs)
  console.log(`  https://docs.google.com/document/d/${file.id}/edit`)
  return file.id
}

async function main() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docs = google.docs({ version: 'v1', auth })

  await ensureDoc(docs, drive, '47 - Staff Role Onboarding', [
    '47 - Staff Role Onboarding',
    'SHMS PTO Staff · August 2026',
    '',
    'Where: Staff → Home (checklist cards under personal email)',
    'Who: VP Marketing, Secretary, Treasurer (President/Admin sees all three tracks)',
    '',
    'Purpose',
    'First-week setup so new board members know which Staff tools they own — without a separate training spreadsheet.',
    '',
    'How to use',
    '1. Sign in with @shmspto.org',
    '2. Save personal email on Home (parent portal)',
    '3. Connect Google for Inbox / Calendar / Docs',
    '4. Open each step’s workspace (or MoneyMinder / Square for Treasurer)',
    '5. Mark done — progress saves to your StaffRoles row',
    '',
    'VP Marketing track',
    '• Connect Google · personal email',
    '• Comms & content calendar (month grid)',
    '• Social · Newsletter / WhatsApp · Page copy · Surveys · Help',
    '',
    'Secretary track',
    '• Connect Google · personal email',
    '• Minutes · Comms & content · Board roster · Events · Newsletter · Help',
    '',
    'Treasurer track',
    '• Connect Google · personal email',
    '• Payments (Needs Reconciliation) · Expenses · Reports',
    '• MoneyMinder · Square (external books of record) · Help',
    '',
    'Notes',
    'Personal email + Google Connect auto-check when already complete.',
    'Official ledgers stay in MoneyMinder / bank / Square — Staff is operations, not the books.',
  ])

  const doc30 = await findDoc(drive, '30 - Staff Portal Quick Start')
  if (doc30) {
    await appendSection(docs, doc30.id, 'Role onboarding (Aug 2026)', [
      'Marketing, Secretary, and Treasurer see a first-week checklist on Staff Home.',
      'See Drive doc 47 - Staff Role Onboarding.',
    ])
    console.log('Appended to 30')
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
