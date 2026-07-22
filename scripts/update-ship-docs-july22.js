/**
 * Create/update July 22 ship docs in SHMS PTO Platform Docs via local gdrive OAuth.
 * Usage: node scripts/update-ship-docs-july22.mjs
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
  await replaceBody(docs, file.id, paragraphs)
  console.log(`  https://docs.google.com/document/d/${file.id}/edit`)
  return file.id
}

const DOCS = [
  {
    title: '41 - Purchase Confirmations & Portal Messages',
    paragraphs: [
      'Purchase confirmations & Messages',
      'Audience: Free & paid parents · Staff (membership / treasurer / programs)',
      'Live: https://www.shmspto.org  |  Updated: July 22, 2026',
      '',
      'What parents get after a paid checkout',
      '1) On-screen next steps in the checkout success modal',
      '2) Member Portal → Messages (always attempted — even if email is not connected)',
      '3) Email from a connected Gmail mailbox when send is ready (membership@ or treasurer@ preferred)',
      '4) Square / PayPal may still send their own receipts separately',
      'Applies to: membership, enrichment registration, Cove products, store-card reload, and event tickets.',
      '',
      'Where to look',
      'Parent: sign in with your personal email → Member Portal → Calendar & Messages → Messages',
      'New activity: green banner + badge when a message arrives after your last visit',
      '',
      'Staff: turn on confirmation email',
      '1) Sign into Staff as membership@shmspto.org or treasurer@shmspto.org',
      '2) Staff → Inbox → Connect Google (authorize that Workspace account)',
      '3) Staff → Reports shows “Purchase emails: ready (as …)” when send works',
      'If Connect fails with redirect_uri_mismatch, add this exact URI in Google Cloud → Credentials → Web OAuth client:',
      'https://www.shmspto.org/api/staff/workspace/connect/callback',
      'Optional Vercel Production: GMAIL_REFRESH_TOKEN + GMAIL_SENDER (+ client id/secret).',
      '',
      'Related: 27 Parent Support · 33 Staff Inbox · 42 Staff Reports',
    ],
  },
  {
    title: '42 - Staff Reports (View · Sort · CSV)',
    paragraphs: [
      'Staff Reports',
      'Audience: Staff (role-scoped)  |  Path: Staff → Reports (/staff?view=reports)',
      'Updated: July 22, 2026',
      '',
      'What it is',
      'View, sort, scroll, and CSV-export operational data for your role:',
      '• Programs — enrollments',
      '• Cove — store card + Cove sales',
      '• Payments — transactions (treasurer / admin)',
      '• Membership — membership payments',
      '• Events — ticket orders',
      'Pick a date range, click column headers to sort, Download CSV.',
      '',
      'Also on this screen',
      'Purchase emails status (ready / not connected). Connect Google as membership@ or treasurer@ under Inbox if not ready.',
      '',
      'Tips',
      'Exports are capped (hundreds of rows). Narrow the date range for large seasons.',
      'Payment reconcile for failed gift-card loads remains under Staff → Payments (Needs Reconciliation).',
      '',
      'Related: 12b Payments · 32 Workspaces map · 41 Purchase confirmations',
    ],
  },
  {
    title: '43 - Event Tickets (Buy on /events)',
    paragraphs: [
      'Event tickets (public /events)',
      'Audience: Visitors & members · Staff Events',
      'Updated: July 22, 2026',
      '',
      'Parents / visitors',
      '1) Open https://www.shmspto.org/events',
      '2) Ticketed events show Buy tickets with price',
      '3) Pay with Square or PayPal',
      '4) After pay: on-screen next steps + portal Messages (if logged in) + email when Gmail send is ready',
      '',
      'Staff',
      '1) Staff → Events',
      '2) Mark event Ticketed; set price and capacity',
      '3) Sales appear under Staff → Reports → Events',
      '',
      'Notes',
      'Off-season pages may show no public events — tickets appear when staff publish ticketed events.',
      'Processor receipts (Square/PayPal) may still arrive separately.',
      '',
      'Related: 07 Events · 41 Confirmations · 42 Reports',
    ],
  },
  {
    title: '44 - Enrichment Attendance, Refunds & Calendar',
    paragraphs: [
      'Enrichment ops (July 2026 ship)',
      'Audience: VP Programs · instructors · parents',
      'Updated: July 22, 2026',
      '',
      'Staff → Programs',
      'Attendance (CICO): open program → Attendance tab → Present / Checked out',
      'Calendar: Programs → Calendar tab for session overview',
      'Roster medical fields: roster + CSV include safety fields from the student record — treat CSV as confidential',
      'Refunds & transfers: parent requests from Member Portal; staff approve/cancel/refund on Roster',
      'Money is NOT auto-refunded in Square — treasurer completes processor refund separately',
      'CheddarUp URL field removed from Staff Programs UI (in-app Square/PayPal is the path)',
      '',
      'Parents (free & paid)',
      'Same registration on /programs. After pay: Messages + next steps.',
      'Request refund/transfer from portal. See attendance under the student.',
      '',
      'Related: 02 Programs · 02c Parent enrichment · 27 Parent support · 41 Confirmations',
    ],
  },
  {
    title: '45 - Staff Activity Notices & Google Connect',
    paragraphs: [
      'Staff activity notices & Google Connect',
      'Audience: All @shmspto.org staff',
      'Updated: July 22, 2026',
      '',
      'Staff Home — Needs your attention',
      'When counts are non-zero, Home shows: unread Workspace Inbox, payments needing reconciliation (treasurer/admin), recent website form submissions.',
      '',
      'Inbox / Calendar / Docs',
      'Connect Google once while signed in as your @shmspto.org account.',
      'After connect: Inbox lists your Workspace mail (bold = unread), New email, folders.',
      'Purchase confirmation SEND also uses a connected membership@ or treasurer@ mailbox (see doc 41).',
      '',
      'OAuth redirect fix',
      'Authorized redirect URI must include:',
      'https://www.shmspto.org/api/staff/workspace/connect/callback',
      'Also add origin https://www.shmspto.org',
      '',
      'Related: 30 Quick Start · 33 Inbox · 41 Confirmations · 42 Reports',
    ],
  },
]

async function appendIndexNote(docs, drive) {
  const title = '00 - START HERE — Platform Docs Index (July 2026)'
  const file = await findDoc(drive, title)
  if (!file) {
    console.warn('Index not found')
    return
  }
  const note = [
    '',
    'July 22, 2026 — Ecommerce & enrichment ship (new)',
    '41 - Purchase Confirmations & Portal Messages (parents + Gmail send ops)',
    '42 - Staff Reports (View · Sort · CSV)',
    '43 - Event Tickets (Buy on /events)',
    '44 - Enrichment Attendance, Refunds & Calendar',
    '45 - Staff Activity Notices & Google Connect',
    'Also: logged-out nav Join / Already a member; parent Messages activity banner; CheddarUp field removed from Staff Programs UI.',
    '',
  ].join('\n')
  const doc = await docs.documents.get({ documentId: file.id })
  const end = doc.data.body.content.at(-1).endIndex
  await docs.documents.batchUpdate({
    documentId: file.id,
    requestBody: {
      requests: [{ insertText: { location: { index: end - 1 }, text: note } }],
    },
  })
  console.log('APPENDED index note →', `https://docs.google.com/document/d/${file.id}/edit`)
}

async function appendToExisting(docs, drive, title, noteLines) {
  const file = await findDoc(drive, title)
  if (!file) {
    console.warn('SKIP missing', title)
    return
  }
  const doc = await docs.documents.get({ documentId: file.id })
  const end = doc.data.body.content.at(-1).endIndex
  const text = '\n\n' + noteLines.join('\n') + '\n'
  await docs.documents.batchUpdate({
    documentId: file.id,
    requestBody: {
      requests: [{ insertText: { location: { index: end - 1 }, text } }],
    },
  })
  console.log('APPENDED', title)
}

async function main() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docs = google.docs({ version: 'v1', auth })

  for (const d of DOCS) {
    await ensureDoc(docs, drive, d.title, d.paragraphs)
  }

  await appendIndexNote(docs, drive)

  await appendToExisting(docs, drive, '27 - Member Portal Parent Support Guide', [
    'July 22, 2026 updates',
    '• After paid checkout you get portal Messages + on-screen next steps (email when Gmail send is ready). See doc 41.',
    '• New message banner/badge appears when something new lands after your last visit.',
    '• Event tickets: when an event is ticketed, Buy tickets is on /events (doc 43).',
    '• Enrichment: request refund/transfer and view attendance from your student card (doc 44).',
    '• Logged out: top nav Join (create account) and Already a member (login to Member Portal).',
  ])

  await appendToExisting(docs, drive, '02c - Parent Enrichment Registration (Free & Paid Members)', [
    'July 22, 2026 updates',
    '• Confirmation lands in Member Portal Messages; email when Gmail is connected (doc 41).',
    '• Request refund or transfer from Member Portal on the enrolled student.',
    '• Attendance history appears under the student when instructors mark CICO (doc 44).',
  ])

  await appendToExisting(docs, drive, '02 - How to Add or Edit Programs v2', [
    'July 22, 2026 updates',
    '• Attendance tab: check-in / check-out (CICO).',
    '• Calendar tab: session overview.',
    '• Roster + CSV include medical / safety fields — keep confidential.',
    '• Refund/transfer requests from parents; staff actions on Roster (doc 44).',
    '• CheddarUp URL field removed from this UI — use in-app Square/PayPal checkout.',
    '• Staff → Reports for enrollment exports (doc 42).',
  ])

  await appendToExisting(docs, drive, '30 - Staff Portal Quick Start', [
    'July 22, 2026 updates',
    '• Home may show Needs your attention (unread mail, reconcile payments, recent forms) — doc 45.',
    '• Reports workspace: view/sort/CSV (doc 42).',
    '• Inbox Connect Google enables Workspace mail and purchase confirmation send (docs 33, 41, 45).',
    '• Programs: Attendance, Calendar, refunds/transfers (doc 44). Events: ticketed sales (doc 43).',
  ])

  await appendToExisting(docs, drive, '32 - Staff Workspaces Map (Role Tools)', [
    'July 22, 2026 updates',
    '• Reports — role-scoped CSV exports (doc 42).',
    '• Programs — Attendance + Calendar tabs; CheddarUp URL field removed.',
    '• Events — ticketed offers + Reports → Events.',
    '• Home activity strip + Inbox Google Connect for send (docs 41, 45).',
  ])

  await appendToExisting(docs, drive, '33 - Staff Inbox, Calendar & Docs (Google Workspace)', [
    'July 22, 2026 updates',
    '• Production redirect URI required: https://www.shmspto.org/api/staff/workspace/connect/callback',
    '• Connected membership@ or treasurer@ also powers purchase confirmation email (doc 41).',
    '• After Connect, Staff Home can show unread Inbox counts (doc 45).',
  ])

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
