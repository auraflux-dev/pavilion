/**
 * Create/update Comms & Content Calendar staff Drive doc + appends.
 * Usage: node scripts/update-comms-calendar-docs.js
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

async function appendSection(docs, docId, heading, lines) {
  const doc = await docs.documents.get({ documentId: docId })
  const end = doc.data.body.content.at(-1).endIndex
  const text = `\n${heading}\n${lines.join('\n')}\n`
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{ insertText: { location: { index: end - 1 }, text } }],
    },
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
    file = { id: docId, name: title }
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

  await ensureDoc(docs, drive, '46 - Comms & Content Calendar', [
    '46 - Comms & Content Calendar',
    'SHMS PTO Staff · August 2026',
    '',
    'Where: Staff → Comms & content (/staff?workspace=comms)',
    'Who: Marketing, Secretary, Membership, Events, Admin',
    '',
    'Purpose',
    'Shared schedule of record for outbound communications and marketing content.',
    'Does not auto-send. Publish from Newsletter, Social, or WhatsApp, then Mark published.',
    '',
    'Two planners',
    '1. Communications — email, WhatsApp, in-person / meeting messages to parents, school (teachers/principal/admin), and internal board.',
    '2. Content planner — social (FB/IG), flyers/print, portal content.',
    '',
    'Views',
    '• Month — real calendar grid (Mon–Sun). Click a day to schedule. Chips show titles; side panel lists that day.',
    '• Agenda — week list with prev / this / next week.',
    '',
    'Statuses',
    'Idea → Drafting → In review → Scheduled → Published (or Cancelled).',
    '',
    'Tips',
    '• Put Canva / Drive / Doc links in Asset / draft link.',
    '• Use Open Newsletter / WA or Open social when ready to send.',
    '• Projects also has a Calendar tab for tasks by due date.',
    '',
    'CMS',
    'Collection: CommsCalendarItems (seeded via scripts/seed-cms-content.mjs).',
  ])

  const doc29 = await findDoc(drive, '29 - Staff Year Project Board')
  if (doc29) {
    await appendSection(docs, doc29.id, 'Calendar view (Aug 2026)', [
      'Projects → Calendar shows tasks on a month grid by due date.',
      'Click a day to review that day’s tasks; undated open tasks appear in the side list.',
      'Year board / My board / Project swimlanes are unchanged.',
    ])
    console.log('Appended Calendar view to 29')
  } else {
    console.log('Skip append — 29 not found')
  }

  const doc30 = await findDoc(drive, '30 - Staff Portal Quick Start')
  if (doc30) {
    await appendSection(docs, doc30.id, 'Comms & content (Aug 2026)', [
      'Open Comms & content for the shared month calendar of parent / school / board messages and social/flyer content.',
      'See Drive doc 46 for full how-to.',
    ])
    console.log('Appended to 30')
  }

  const doc32 = await findDoc(drive, '32 - Staff Workspaces Map (Role Tools)')
  if (doc32) {
    await appendSection(docs, doc32.id, 'Comms & content workspace (Aug 2026)', [
      'Nav label: Comms & content',
      'Roles: marketing, secretary, membership, events, admin',
      'Month + agenda views; Communications and Content planner tabs.',
    ])
    console.log('Appended to 32')
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
