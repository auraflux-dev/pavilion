/**
 * Create SHMS PTO first board meeting agenda as a Google Doc.
 * Usage: node scripts/create-board-meeting-agenda.js
 */
const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')
const ROOT_FOLDER = '1G83OPP-_IMoAYTDnNQqV638UOjEvIqJx'
const TITLE = 'SHMS PTO Board Meeting Agenda — July 23, 2026 (First Meeting)'

function getAuth() {
  const oauthRaw = JSON.parse(fs.readFileSync(OAUTH_PATH))
  const key = Object.keys(oauthRaw)[0]
  const { client_id, client_secret } = oauthRaw[key]
  const oAuth2 = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob')
  const token = JSON.parse(fs.readFileSync(CREDS_PATH))
  oAuth2.setCredentials(token)
  oAuth2.on('tokens', (newToken) => {
    fs.writeFileSync(CREDS_PATH, JSON.stringify({ ...token, ...newToken }, null, 2))
  })
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
  const text = paragraphs.join('\n') + '\n'
  requests.push({ insertText: { location: { index: 1 }, text } })
  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } })
}

const PARAGRAPHS = [
  'SHMS PTO Board Meeting Agenda',
  'First meeting · Thursday, July 23, 2026',
  'Suggested length: 60–75 minutes',
  'Site: https://www.shmspto.org',
  '',
  '1. Call to order (2 min)',
  'Welcome, quorum check, approve agenda.',
  '',
  '2. Introductions & roles (8 min)',
  'Name, board title, Staff @shmspto.org login status.',
  'Confirm each person has (or will set) a personal email on Staff Home for the parent portal.',
  '',
  '3. President / platform snapshot (10 min)',
  'What’s live on shmspto.org:',
  '• Public site, Member Portal, Staff workspaces',
  '• Membership (Reef / Lagoon / Tide), Cove, programs path',
  '• Facebook + Instagram in footers',
  '• Contractor W-9 reminder on Timesheets → treasurer@shmspto.org',
  'Form W-9 PDF: https://www.shmspto.org/forms/fw9.pdf',
  '',
  '4. Treasurer (10 min)',
  'Banking / MoneyMinder / Square / PayPal access owners.',
  'W-9 collection for contractors (possible 1099 if pay ≥ $600 in a calendar year).',
  'Near-term expenses and reimbursement path in Staff.',
  '',
  '5. Membership & parent outreach (8 min)',
  'Free vs paid parent accounts.',
  'How parents log in / join.',
  'Fall welcome plan (newsletter, WhatsApp grade groups when school resumes).',
  '',
  '6. Programs & Cove (8 min)',
  'Fall enrichment timeline and instructor/contractor onboarding.',
  'Cove snack window hours vs online shop.',
  'Who owns register shifts.',
  '',
  '7. Events & calendar (5 min)',
  'First fall events / Dance Night / meeting cadence.',
  'Publishing minutes after this meeting (Staff → Minutes).',
  '',
  '8. Decisions & owners (10 min)',
  'Capture action items, for example:',
  '• Staff role assigned + personal email linked — Each board member — This week',
  '• W-9 on file for paid contractors — Treasurer — Before first payment',
  '• Fall membership push dates — Membership — Next meeting',
  '• Next board meeting date — Secretary — Today',
  '',
  '9. Open floor (5 min)',
  '',
  '10. Adjourn',
  'Confirm next meeting date/time.',
  'Secretary posts minutes to Staff → Minutes (and public Meetings when ready).',
  '',
  'Notes / parking lot',
  '',
  '',
  'Attendance',
  '',
  '',
  'Draft prepared for the July 23, 2026 first board meeting.',
]

async function main() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docs = google.docs({ version: 'v1', auth })

  let file = await findDoc(drive, TITLE)
  if (!file) {
    const created = await docs.documents.create({ requestBody: { title: TITLE } })
    const docId = created.data.documentId
    await drive.files.update({
      fileId: docId,
      addParents: ROOT_FOLDER,
      removeParents: 'root',
      fields: 'id,parents',
      supportsAllDrives: true,
    })
    file = { id: docId, name: TITLE }
    console.log('CREATED', TITLE)
  } else {
    console.log('UPDATE', TITLE)
    const parents = file.parents || []
    if (!parents.includes(ROOT_FOLDER)) {
      await drive.files.update({
        fileId: file.id,
        addParents: ROOT_FOLDER,
        removeParents: parents.join(',') || undefined,
        fields: 'id,parents',
        supportsAllDrives: true,
      })
    }
  }

  await replaceBody(docs, file.id, PARAGRAPHS)
  console.log(`https://docs.google.com/document/d/${file.id}/edit`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
