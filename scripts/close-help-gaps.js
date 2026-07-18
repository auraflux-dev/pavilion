/**
 * close-help-gaps.js
 *
 * Creates/updates Drive how-tos for new Staff workspaces (33–39) and refreshes
 * Events (07), Workspaces map (32), Roles (26), Parent support (27).
 *
 * Run from repo root:
 *   node scripts/close-help-gaps.js
 * Then:
 *   node scripts/insert-doc-screenshots.js
 */

const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')
const ROOT_FOLDER_ID = '1G83OPP-_IMoAYTDnNQqV638UOjEvIqJx'

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

async function docExists(drive, title, folderId) {
  const q = `name='${title.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.document' and '${folderId}' in parents and trashed=false`
  const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' })
  return res.data.files[0]?.id ?? null
}

function buildRequests(blocks) {
  const requests = []
  let index = 1
  for (const block of blocks) {
    const text = block.text + '\n'
    requests.push({ insertText: { location: { index }, text } })
    const style =
      block.type === 'title'
        ? 'TITLE'
        : block.type === 'h1'
          ? 'HEADING_1'
          : block.type === 'h2'
            ? 'HEADING_2'
            : 'NORMAL_TEXT'
    if (style !== 'NORMAL_TEXT') {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: index, endIndex: index + text.length },
          paragraphStyle: { namedStyleType: style },
          fields: 'namedStyleType',
        },
      })
    }
    index += text.length
  }
  return requests
}

async function replaceDocContent(docs, docId, content) {
  const doc = await docs.documents.get({ documentId: docId })
  const endIndex = doc.data.body.content.at(-1).endIndex
  const requests = []
  if (endIndex > 2) {
    requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } })
  }
  requests.push(...buildRequests(content))
  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } })
}

async function upsertDoc(docs, drive, title, folderId, content) {
  const existing = await docExists(drive, title, folderId)
  if (existing) {
    await replaceDocContent(docs, existing, content)
    console.log(`Updated: ${title}`)
    console.log(`  https://docs.google.com/document/d/${existing}`)
    return existing
  }
  const file = await drive.files.create({
    resource: { name: title, mimeType: 'application/vnd.google-apps.document', parents: [folderId] },
    fields: 'id',
  })
  const docId = file.data.id
  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests: buildRequests(content) } })
  console.log(`Created: ${title}`)
  console.log(`  https://docs.google.com/document/d/${docId}`)
  return docId
}

const DOCS = [
  {
    title: '07 - How to Manage Events v2',
    content: [
      { type: 'title', text: 'How to Manage Events' },
      { type: 'body', text: 'SHMS PTO — Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'body', text: 'Preferred path: create, edit, and cancel events from Staff. They show on the public /events page.' },
      { type: 'h1', text: 'Create an event (Staff)' },
      { type: 'body', text: '1. Sign in with @shmspto.org → Staff top nav → Events.' },
      { type: 'body', text: '2. Click New event.' },
      { type: 'body', text: '3. Enter title, description, location, start and end times.' },
      { type: 'body', text: '4. Choose RSVP (free) or Ticketed. Optionally check Save as draft (not public yet).' },
      { type: 'body', text: '5. Click Publish event (or Create draft).' },
      { type: 'h1', text: 'Edit or cancel' },
      { type: 'body', text: '1. Staff → Events → Edit on a listed event → Save changes.' },
      { type: 'body', text: '2. Cancel event closes registration. Drafts can be deleted from Wix Events if needed.' },
      { type: 'h1', text: 'Advanced (Wix)' },
      { type: 'body', text: 'Use Wix Events (advanced) for ticket pricing, registration forms, and guest check-in tools.' },
      { type: 'body', text: 'Roles: events, secretary, marketing, admin.' },
    ],
  },
  {
    title: '19 - How to Manage Volunteer Opportunities and Meeting Minutes',
    content: [
      { type: 'title', text: 'Volunteer Opportunities & Meeting Minutes' },
      { type: 'body', text: 'SHMS PTO — Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'h1', text: 'Volunteer opportunities (Staff)' },
      { type: 'body', text: '1. Staff top nav → Volunteer ops.' },
      { type: 'body', text: '2. Add or edit titles, descriptions, commitment, sort order, and Active.' },
      { type: 'body', text: '3. Active opportunities appear on /volunteer and the volunteer form dropdown.' },
      { type: 'body', text: 'Roles: events, secretary, admin.' },
      { type: 'h1', text: 'Meeting minutes (Staff)' },
      { type: 'body', text: '1. Staff → Minutes → add or edit the meeting → publish / save (or CMS: + New Item → fill fields → active = true → Save)' },
      { type: 'body', text: 'Published minutes appear on /meetings.' },
      { type: 'body', text: 'Roles: secretary, admin.' },
    ],
  },
  {
    title: '26 - Staff Roles & Portal Workspaces',
    content: [
      { type: 'title', text: 'Staff Roles & Portal Workspaces' },
      { type: 'body', text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 18, 2026' },
      { type: 'h1', text: 'Two layers' },
      { type: 'body', text: 'BoardMembers = public /board cards. StaffRoles = system permissions for /staff tools.' },
      { type: 'h1', text: 'Two logins' },
      { type: 'body', text: 'Staff: @shmspto.org → /staff. Family: personal email → /member-portal. Keep them separate.' },
      { type: 'h1', text: 'Assign staff' },
      { type: 'body', text: '1. Person signs in once with @shmspto.org and opens /staff.' },
      { type: 'body', text: '2. An admin signs in → Staff top nav → Staff access. The new person already appears in the list with no roles.' },
      { type: 'body', text: '3. Assign roles and Save.' },
      { type: 'h1', text: 'Workspaces (role-gated)' },
      {
        type: 'body',
        text: 'Home, Inbox, Calendar, Docs, Projects, Members, Staff access, Social, Surveys, Messages, Minutes, Programs, Payments, Events, Store & spirit, Discounts, Memberships, Membership tiers, Page copy, Site settings, Board roster, Nav & footer, FAQs, Volunteer ops, Fundraising, Wellness, Newsletter, Help.',
      },
      { type: 'body', text: 'Map: doc 32. Quick start: doc 30. Inbox/Docs: doc 33. Memberships: doc 34. Newsletter: doc 39. Visitor CMS lists: doc 40.' },
      { type: 'h1', text: 'Social / Surveys / Messages' },
      { type: 'body', text: 'Staff → Social supports Facebook Post/Reel/Story with Media Manager upload, gallery, link preview metadata, scheduling, and optional site-asset promotion. Instagram unlocks after a second Wix social slot. Doc 25.' },
      { type: 'body', text: 'Write the subject and message, target a parent, grade, or program, then Send to inbox. Parents read it without leaving the portal. Doc 16.' },
      { type: 'h1', text: 'Admin act-as' },
      { type: 'body', text: 'Admin searches a parent, clicks Act as, lands in that parent portal view (read-oriented). Exit act-as returns to /staff.' },
    ],
  },
  {
    title: '27 - Member Portal Parent Support Guide',
    content: [
      { type: 'title', text: 'Member Portal Parent Support Guide' },
      { type: 'body', text: 'SHMS PTO — Board Member Guide  |  Last updated: July 18, 2026' },
      { type: 'body', text: 'Helping a parent at shmspto.org/member-portal. Free and paid parents use the same portal; paid unlocks tier badges, store-card credit, and coupons when configured.' },
      { type: 'h1', text: 'Free vs paid at a glance' },
      { type: 'body', text: 'Free: add/edit students, load store card, surveys, Portal help, upgrade CTA.' },
      { type: 'body', text: 'Paid (Reef / Lagoon / Tide): same tools + tier shown on students, membership store-card credit after sync, Spirit coupons when issued.' },
      { type: 'body', text: 'Neither free nor paid parents can archive students — Staff admin only. Checklist: doc 38.' },
      { type: 'h1', text: 'My Account' },
      { type: 'body', text: 'The My Account panel shows the signed-in email, membership summary, student count, payment explanation, and grade WhatsApp links.' },
      { type: 'body', text: 'To update a name or mobile phone: select Edit profile, make the change, then Save. The sign-in email is not editable here.' },
      { type: 'h1', text: 'My Students' },
      { type: 'body', text: 'To fix a student name or grade: open the student card, select Edit student, make the change, then Save.' },
      { type: 'body', text: 'To add another child: Add a student at the bottom of My Students.' },
      { type: 'h1', text: 'Portal help' },
      { type: 'body', text: 'Parents open Help in the member top nav (or #help). FAQ covers account, students, Reef/Lagoon/Tide, store card, coupons, and surveys.' },
      { type: 'h1', text: 'Reload a student store card' },
      { type: 'body', text: 'In Store & Purchases, select Load card, choose the student and $10 / $20 / $25, then enter payment details.' },
      { type: 'h1', text: 'Surveys' },
      { type: 'body', text: 'Active Surveys for you appear below the portal panels. The parent opens and submits the branded survey without leaving the PTO site.' },
    ],
  },
  {
    title: '32 - Staff Workspaces Map (Role Tools)',
    content: [
      { type: 'title', text: 'Staff Workspaces Map (Role Tools)' },
      { type: 'body', text: 'SHMS PTO — Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'body', text: 'Staff top nav shows only the workspaces for your roles. Staging: https://shmspto.vercel.app/staff' },
      { type: 'h1', text: 'Home' },
      { type: 'body', text: 'Everyone on Staff. Role home cards + This Week checklist. Doc 26, 30.' },
      { type: 'h1', text: 'Inbox / My calendar / Docs' },
      { type: 'body', text: 'Everyone after Connect Google. Doc 33.' },
      { type: 'h1', text: 'Projects' },
      { type: 'body', text: 'Everyone. Year board. Doc 29.' },
      { type: 'h1', text: 'Members / Staff access' },
      { type: 'body', text: 'admin. Docs 31, 26.' },
      { type: 'h1', text: 'Social / Surveys / Messages / Minutes / Programs / Payments' },
      { type: 'body', text: 'Role-gated. Docs 25, 23–24, 16, 19, 02/15, 12b.' },
      { type: 'h1', text: 'Events' },
      { type: 'body', text: 'events, secretary, marketing, admin. Create / edit / cancel in Staff. Doc 07.' },
      { type: 'h1', text: 'Store & spirit / Discounts' },
      { type: 'body', text: 'retail (+ membership for discounts). Docs 21, 36.' },
      { type: 'h1', text: 'Memberships / Membership tiers / Newsletter' },
      { type: 'body', text: 'membership, secretary, marketing (newsletter), admin. Docs 34, 35, 39.' },
      { type: 'h1', text: 'Page copy / Site settings / Board / Nav / FAQs / Volunteers / Fundraising / Wellness' },
      { type: 'body', text: 'Visitor CMS content by ownership. Docs 13, 40.' },
      { type: 'h1', text: 'Help' },
      { type: 'body', text: 'Everyone. Pointers into Drive how-tos.' },
    ],
  },
  {
    title: '33 - Staff Inbox, Calendar & Docs',
    content: [
      { type: 'title', text: 'Staff Inbox, Calendar & Docs' },
      { type: 'body', text: 'SHMS PTO — Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'body', text: 'Connect your @shmspto.org Google account once, then use Inbox, My calendar, and Docs inside Staff.' },
      { type: 'h1', text: 'Connect Google' },
      { type: 'body', text: '1. Staff → Inbox (or Calendar / Docs).' },
      { type: 'body', text: '2. Click Connect Google and finish OAuth as your @shmspto.org user.' },
      { type: 'body', text: '3. Return to Staff — mail folders, calendar, and Drive docs load for that account.' },
      { type: 'h1', text: 'Inbox' },
      { type: 'body', text: 'Threaded Gmail, folder sidebar with unread badges, compose / reply / forward, archive, move, attachments, Sapling grammar check when configured.' },
      { type: 'h1', text: 'Calendar & Docs' },
      { type: 'body', text: 'My calendar shows your Workspace calendar. Docs lists Drive files you can open.' },
      { type: 'body', text: 'One-time Workspace admin setup: Connect Google Workspace (setup) in Platform Docs.' },
    ],
  },
  {
    title: '34 - Memberships Workspace',
    content: [
      { type: 'title', text: 'Memberships Workspace' },
      { type: 'body', text: 'SHMS PTO — Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'body', text: 'Roles: membership, secretary, admin.' },
      { type: 'h1', text: 'Roster' },
      { type: 'body', text: '1. Staff → Memberships.' },
      { type: 'body', text: '2. Filter free / paid / Reef / Lagoon / Tide and grade. Search name, email, phone.' },
      { type: 'body', text: '3. Export CSV when needed.' },
      { type: 'h1', text: 'Outreach' },
      { type: 'body', text: '1. Write subject and body. Audience follows the roster filters.' },
      { type: 'body', text: '2. Preview recipients, then Send email (Gmail API) and/or portal inbox.' },
      { type: 'body', text: '3. WhatsApp: Copy + open WhatsApp opens grade group invite links from Site Settings — paste the message in-app.' },
      { type: 'body', text: 'Member newsletter (marketing-friendly send UI): doc 39.' },
    ],
  },
  {
    title: '35 - Membership Tiers Reef · Lagoon · Tide',
    content: [
      { type: 'title', text: 'Membership Tiers — Reef · Lagoon · Tide' },
      { type: 'body', text: 'SHMS PTO — Parent & Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'h1', text: 'For parents' },
      { type: 'body', text: '1. Sign in → Membership (or Upgrade in the portal).' },
      { type: 'body', text: '2. Choose Reef, Lagoon, or Tide and checkout.' },
      { type: 'body', text: '3. Refresh the portal — tier and store-card credit appear after sync.' },
      { type: 'h1', text: 'For staff' },
      { type: 'body', text: '1. Staff → Membership tiers to edit the CMS map (product IDs, sort, popular, discounts).' },
      { type: 'body', text: '2. Paid display name / price / perk bullets come from the Wix Catalog product — edit the product for public copy.' },
      { type: 'body', text: 'Do not change tierId after sales have started.' },
    ],
  },
  {
    title: '36 - Discount Codes & Spirit Coupons',
    content: [
      { type: 'title', text: 'Discount Codes & Spirit Coupons' },
      { type: 'body', text: 'SHMS PTO — Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'body', text: 'Roles: retail, membership, admin (and related).' },
      { type: 'h1', text: 'Create or issue codes' },
      { type: 'body', text: '1. Staff → Discounts.' },
      { type: 'body', text: '2. Create a named code or issue a member discount for checkout / spirit wear.' },
      { type: 'body', text: '3. Paid members may see a coupon bar when signed in — if a code fails, refresh and retry.' },
    ],
  },
  {
    title: '37 - Site Capability Audit & Test Plans',
    content: [
      { type: 'title', text: 'Site Capability Audit & Test Plans' },
      { type: 'body', text: 'SHMS PTO — QA Guide  |  Last updated: July 18, 2026' },
      { type: 'body', text: 'Canonical copy also lives in the repo: docs/SITE-CAPABILITY-AUDIT.md' },
      { type: 'h1', text: 'Audiences' },
      { type: 'body', text: 'Visitor · Free member · Paid member · Staff (by role).' },
      { type: 'h1', text: 'Staff should manage visitor CMS' },
      { type: 'body', text: 'Board, nav, FAQs, volunteers, fundraising CTAs/goals, site settings, page copy, membership tiers map, events create, newsletter send — by role. Remaining: advanced Wix Events ticket tooling; WhatsApp is compose-assist (no Meta group auto-post).' },
      { type: 'h1', text: 'Test plans' },
      { type: 'body', text: 'Run TP-V (visitor), TP-F / TP-P (free/paid portal), TP-S (staff by role) from the repo audit doc before board training.' },
    ],
  },
  {
    title: '38 - Parent Portal Checklist',
    content: [
      { type: 'title', text: 'Parent Portal Checklist (Free & Paid)' },
      { type: 'body', text: 'SHMS PTO — Parent & Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'h1', text: 'Both free and paid' },
      { type: 'body', text: 'Sign in · Edit profile · Add/edit students · Load store card · Save payment method · Complete surveys · Open Portal help' },
      { type: 'h1', text: 'Paid only' },
      { type: 'body', text: 'Tier badge (Reef / Lagoon / Tide) · Membership store-card credit after sync · Spirit/checkout coupons when configured' },
      { type: 'h1', text: 'Staff only' },
      { type: 'body', text: 'Archive / restore students (admin Members workspace)' },
      { type: 'h1', text: 'In-app help' },
      { type: 'body', text: 'Member portal → Help opens the Portal help FAQ for the signed-in parent.' },
    ],
  },
  {
    title: '39 - Member Newsletter (Email & WhatsApp)',
    content: [
      { type: 'title', text: 'Member Newsletter (Email & WhatsApp)' },
      { type: 'body', text: 'SHMS PTO — Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'body', text: 'Roles: marketing, secretary, membership, admin. Audience is free and/or paid member parents — not anonymous newsletter subscribers.' },
      { type: 'h1', text: 'Send' },
      { type: 'body', text: '1. Staff → Newsletter.' },
      { type: 'body', text: '2. Choose All / Free / Paid (or a paid tier) and optional grade.' },
      { type: 'body', text: '3. Write subject and body → Preview recipients → Send email.' },
      { type: 'body', text: '4. Optionally also post to parent portal inbox.' },
      { type: 'h1', text: 'WhatsApp' },
      { type: 'body', text: '1. Choose WhatsApp grade groups (all / 6 / 7 / 8).' },
      { type: 'body', text: '2. Copy + open WhatsApp — paste the copied message into each grade group. Meta has no simple group-post API.' },
      { type: 'body', text: 'Grade invite links live in Site settings (announcement6th/7th/8thLink).' },
    ],
  },
  {
    title: '40 - Visitor Site Content from Staff (CMS by Role)',
    content: [
      { type: 'title', text: 'Visitor Site Content from Staff (CMS by Role)' },
      { type: 'body', text: 'SHMS PTO — Staff Guide  |  Last updated: July 18, 2026' },
      { type: 'body', text: 'Day-to-day visitor content is editable in Staff under the owning role — not only in Wix CMS.' },
      { type: 'h1', text: 'Site settings' },
      { type: 'body', text: '1. Staff → Site settings.' },
      { type: 'body', text: '2. Edit announcement bar, WhatsApp grade links, contact, goals, social URLs, retail allowlists — groups filtered by your roles.' },
      { type: 'h1', text: 'Lists' },
      { type: 'body', text: 'Board roster · Nav & footer · FAQs · Volunteer ops · Fundraising CTAs · Membership tiers — add / edit / deactivate (Active flag).' },
      { type: 'h1', text: 'Wellness' },
      { type: 'body', text: 'Staff → Wellness for classroom wish list and appreciation notes (wellness / events / admin).' },
      { type: 'h1', text: 'Page copy' },
      { type: 'body', text: 'Heroes and marketing blocks: Staff → Page copy (doc 13).' },
    ],
  },
]

async function main() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docs = google.docs({ version: 'v1', auth })
  const wixId = await findFolder(drive, 'Wix Admin Guides', ROOT_FOLDER_ID)
  for (const d of DOCS) {
    await upsertDoc(docs, drive, d.title, wixId, d.content)
  }
  console.log('Done — run: node scripts/insert-doc-screenshots.js')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
