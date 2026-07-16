/**
 * create-pto-docs.js
 *
 * Creates the SHMS PTO Platform Docs folder structure and all help articles
 * in treasurer@shmspto.org Google Drive.
 *
 * Idempotent: skips any doc whose title already exists in the target folder.
 *
 * Usage:
 *   node scripts/create-pto-docs.js
 *
 * Auth:
 *   Reads OAuth client from ~/.gdrive-oauth.json
 *   Reads/writes token from ~/.gdrive-credentials.json
 *   Run `npx @modelcontextprotocol/server-gdrive auth` first if token is missing.
 */

const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')

// ─── Auth ────────────────────────────────────────────────────────────────────

function getAuth() {
  const oauthRaw = JSON.parse(fs.readFileSync(OAUTH_PATH))
  const key = Object.keys(oauthRaw)[0]
  const { client_id, client_secret } = oauthRaw[key]

  const oAuth2 = new google.auth.OAuth2(
    client_id,
    client_secret,
    'urn:ietf:wg:oauth:2.0:oob'
  )

  const token = JSON.parse(fs.readFileSync(CREDS_PATH))
  oAuth2.setCredentials(token)

  // Save refreshed token automatically
  oAuth2.on('tokens', (newToken) => {
    const merged = { ...token, ...newToken }
    fs.writeFileSync(CREDS_PATH, JSON.stringify(merged, null, 2))
  })

  return oAuth2
}

// ─── Drive helpers ────────────────────────────────────────────────────────────

async function findOrCreateFolder(drive, name, parentId) {
  const q = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const res = await drive.files.list({ q, fields: 'files(id,name)', spaces: 'drive' })
  if (res.data.files.length > 0) {
    console.log(`  📁 Folder exists: ${name}`)
    return res.data.files[0].id
  }

  const meta = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId && { parents: [parentId] }),
  }
  const created = await drive.files.create({ resource: meta, fields: 'id' })
  console.log(`  📁 Created folder: ${name}`)
  return created.data.id
}

async function docExists(drive, title, folderId) {
  const q = `name='${title}' and mimeType='application/vnd.google-apps.document' and '${folderId}' in parents and trashed=false`
  const res = await drive.files.list({ q, fields: 'files(id,name)', spaces: 'drive' })
  return res.data.files.length > 0 ? res.data.files[0].id : null
}

async function replaceDocContent(docs, docId, content) {
  const doc = await docs.documents.get({ documentId: docId })
  const body = doc.data.body?.content ?? []
  const endIndex = body.length ? body[body.length - 1].endIndex : 1
  const requests = []
  if (endIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex: endIndex - 1 },
      },
    })
  }
  requests.push(...buildRequests(content))
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    })
  }
}

async function createDoc(docs, drive, title, folderId, content, { updateIfExists = false } = {}) {
  const existing = await docExists(drive, title, folderId)
  if (existing) {
    if (updateIfExists) {
      await replaceDocContent(docs, existing, content)
      console.log(`  🔄 Updated: ${title}`)
      console.log(`     https://docs.google.com/document/d/${existing}`)
      return existing
    }
    console.log(`  ✓ Already exists: ${title}`)
    return existing
  }

  // Create empty doc in Drive
  const meta = {
    name: title,
    mimeType: 'application/vnd.google-apps.document',
    parents: [folderId],
  }
  const file = await drive.files.create({ resource: meta, fields: 'id' })
  const docId = file.data.id

  // Write content via Docs API
  const requests = buildRequests(content)
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    })
  }

  console.log(`  ✅ Created: ${title}`)
  console.log(`     https://docs.google.com/document/d/${docId}`)
  return docId
}

// ─── Docs content builder ─────────────────────────────────────────────────────
// Each block: { type: 'title'|'h1'|'h2'|'body'|'code'|'divider', text }

function buildRequests(blocks) {
  const requests = []
  let index = 1 // Google Docs body starts at index 1

  for (const block of blocks) {
    const text = block.text + '\n'

    requests.push({
      insertText: { location: { index }, text },
    })

    const style =
      block.type === 'title' ? 'TITLE' :
      block.type === 'h1'    ? 'HEADING_1' :
      block.type === 'h2'    ? 'HEADING_2' :
      block.type === 'h3'    ? 'HEADING_3' :
                               'NORMAL_TEXT'

    if (style !== 'NORMAL_TEXT' || block.type === 'code') {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: index, endIndex: index + text.length },
          paragraphStyle: { namedStyleType: style },
          fields: 'namedStyleType',
        },
      })
    }

    if (block.type === 'code') {
      requests.push({
        updateTextStyle: {
          range: { startIndex: index, endIndex: index + text.length - 1 },
          textStyle: { weightedFontFamily: { fontFamily: 'Courier New' }, fontSize: { magnitude: 10, unit: 'PT' } },
          fields: 'weightedFontFamily,fontSize',
        },
      })
    }

    index += text.length
  }

  return requests
}

// ─── Doc content definitions ──────────────────────────────────────────────────

const DOCS = [
  // ── Wix Admin Guides v2 (with Quick Links + Wix Help Articles) ──────────
  {
    folder: 'wix',
    title: '01 - How to Manage Board Members v2',
    content: [
      { type: 'title', text: 'How to Manage Board Members' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Board Members' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'Every card on the /board page — photo, name, role, and whether someone appears in the Executive Board section — comes from this collection.' },
      { type: 'h1',   text: 'Fields Explained' },
      { type: 'body',  text: 'name — Full name as it appears on the card' },
      { type: 'body',  text: 'role — Title (e.g. "President", "VP of Events")' },
      { type: 'body',  text: 'bio — Short description (1–2 sentences)' },
      { type: 'body',  text: 'photoUrl — Paste a Wix Media image URL here' },
      { type: 'body',  text: 'isExec — Check for Executive Board members. Unchecked = General Board section.' },
      { type: 'body',  text: 'sortOrder — Controls left-to-right order. Lower number = appears first. Execs and general board are sorted independently.' },
      { type: 'body',  text: 'active — Uncheck to hide someone without deleting them.' },
      { type: 'h1',   text: 'How to Add a New Board Member' },
      { type: 'body',  text: '1. Go to Content Manager → Board Members' },
      { type: 'body',  text: '2. Click "+ New Item"' },
      { type: 'body',  text: '3. Fill in name, role, bio' },
      { type: 'body',  text: '4. Upload their photo: click the photoUrl field → Media Manager → Upload → copy the URL' },
      { type: 'body',  text: '5. Set sortOrder (tip: use 10, 20, 30 so you can insert someone between later)' },
      { type: 'body',  text: '6. Check isExec if they are on the executive board' },
      { type: 'body',  text: '7. Make sure active = checked' },
      { type: 'body',  text: '8. Click Save' },
      { type: 'h1',   text: 'How to Remove a Board Member' },
      { type: 'body',  text: 'To hide temporarily: uncheck the active field.' },
      { type: 'body',  text: 'To delete permanently: select the row → Actions → Delete.' },
      { type: 'h1',   text: 'Photo Tips' },
      { type: 'body',  text: '• Square photos look best (1:1 ratio)' },
      { type: 'body',  text: '• Minimum 300×300px recommended' },
      { type: 'body',  text: '• If no photo is set, the site shows their first initial in a green circle automatically' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes. The site refreshes board data every 5 minutes automatically.' },
      { type: 'h1',   text: 'Quick Link' },
      { type: 'body',  text: 'Direct link to Board Members collection: https://manage.wix.com/dashboard/509fda24-8dbf-43c6-aa74-df9f8b63c388/cms/BoardMembers' },
      { type: 'h1',   text: 'Wix Help Articles' },
      { type: 'body',  text: 'Managing collection content: https://support.wix.com/en/article/cms-formerly-content-manager-managing-your-collections' },
      { type: 'body',  text: 'Uploading media: https://support.wix.com/en/article/wix-media-uploading-media-to-the-media-manager' },
    ],
  },
  {
    folder: 'wix',
    title: '02 - How to Add or Edit Programs v2',
    content: [
      { type: 'title', text: 'How to Add or Edit Programs' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Programs' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The /programs page (full grid) and the Programs Preview section on the homepage (featured programs only).' },
      { type: 'h1',   text: 'Fields Explained' },
      { type: 'body',  text: 'name — Program name' },
      { type: 'body',  text: 'description — Full description shown on the program card' },
      { type: 'body',  text: 'category — Used for filtering. Options: academic | arts | athletics | social | stem | other' },
      { type: 'body',  text: 'grades — e.g. "6–8" or "All grades"' },
      { type: 'body',  text: 'schedule — e.g. "Tuesdays, 3–4pm"' },
      { type: 'body',  text: 'detail — Extra pill label (e.g. "Free", "Registration required")' },
      { type: 'body',  text: 'featured — Check to show on homepage preview (keep to 3–4 max)' },
      { type: 'body',  text: 'sortOrder — Order within the grid. Lower = first.' },
      { type: 'body',  text: 'paymentType — Leave blank for free programs. Options: cheddarup_direct | cheddarup_installment | cheddarup_p2p' },
      { type: 'body',  text: 'cheddarupUrl — Paste the full CheddarUp collection URL (e.g. https://app.cheddarup.com/c/your-collection)' },
      { type: 'body',  text: 'active — Uncheck to hide without deleting' },
      { type: 'h1',   text: 'How to Add a New Program' },
      { type: 'body',  text: '1. Content Manager → Programs → "+ New Item"' },
      { type: 'body',  text: '2. Fill in name, description, category, grades' },
      { type: 'body',  text: '3. If it has a payment: set paymentType and paste cheddarupUrl' },
      { type: 'body',  text: '4. Set featured = checked if it should appear on the homepage' },
      { type: 'body',  text: '5. Set sortOrder' },
      { type: 'body',  text: '6. Save' },
      { type: 'h1',   text: 'Homepage Preview' },
      { type: 'body',  text: 'Only programs with featured = checked appear on the homepage. Best results with 4 or fewer featured programs.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
      { type: 'h1',   text: 'Quick Link' },
      { type: 'body',  text: 'Direct link to Programs collection: https://manage.wix.com/dashboard/509fda24-8dbf-43c6-aa74-df9f8b63c388/cms/Programs' },
      { type: 'h1',   text: 'Wix Help Articles' },
      { type: 'body',  text: 'Managing collection content: https://support.wix.com/en/article/cms-formerly-content-manager-managing-your-collections' },
    ],
  },
  {
    folder: 'wix',
    title: '03 - How to Update Membership Tiers and Perks v2',
    content: [
      { type: 'title', text: 'How to Update Membership Tiers and Perks' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Membership Tiers' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The membership cards on /membership — prices, tier names, perks lists, and the faculty membership section.' },
      { type: 'h1',   text: 'Fields Explained' },
      { type: 'body',  text: 'tierId — Internal ID. Do NOT change. Values: ruby | supreme | faculty' },
      { type: 'body',  text: 'name — Display name (e.g. "Ruby Membership")' },
      { type: 'body',  text: 'price — Price in dollars (number only, no $ sign)' },
      { type: 'body',  text: 'description — Subtitle shown under the price' },
      { type: 'body',  text: 'perks — One perk per line. Each line becomes a bullet on the membership card.' },
      { type: 'body',  text: 'highlighted — Check to show as "Most Popular" / featured card' },
      { type: 'body',  text: 'cheddarupUrl — The CheddarUp payment link for this tier' },
      { type: 'body',  text: 'active — Uncheck to hide a tier' },
      { type: 'h1',   text: 'How to Update Prices' },
      { type: 'body',  text: '1. Content Manager → Membership Tiers' },
      { type: 'body',  text: '2. Click the tier you want to edit' },
      { type: 'body',  text: '3. Change the price field' },
      { type: 'body',  text: '4. Save — new price shows within 5 minutes' },
      { type: 'h1',   text: 'How to Update Perks' },
      { type: 'body',  text: '1. Open the tier' },
      { type: 'body',  text: '2. Edit the perks field — one benefit per line' },
      { type: 'body',  text: '3. Save' },
      { type: 'h1',   text: 'Shared Benefits (All Members Receive section)' },
      { type: 'body',  text: 'These are NOT in the Membership Tiers collection.' },
      { type: 'body',  text: 'Go to: Content Manager → Site Settings → key: membershipSharedBenefits' },
      { type: 'body',  text: 'Edit the value — one benefit per line.' },
      { type: 'h1',   text: 'Faculty Membership' },
      { type: 'body',  text: 'The faculty price and description come from the row with tierId = faculty. It does NOT appear in the main tier grid — only in the Faculty & Staff section lower on the page.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
      { type: 'h1',   text: 'Quick Link' },
      { type: 'body',  text: 'Direct link to Membership Tiers collection: https://manage.wix.com/dashboard/509fda24-8dbf-43c6-aa74-df9f8b63c388/cms/MembershipTiers' },
      { type: 'h1',   text: 'Wix Help Articles' },
      { type: 'body',  text: 'Managing collection content: https://support.wix.com/en/article/cms-formerly-content-manager-managing-your-collections' },
    ],
  },
  {
    folder: 'wix',
    title: '04 - How to Update the Announcement Bar v2',
    content: [
      { type: 'title', text: 'How to Update the Announcement Bar' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Site Settings' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The green banner at the very top of every page on the site.' },
      { type: 'h1',   text: 'Keys to Edit' },
      { type: 'body',  text: 'announcementEnabled — true = bar shows | false = bar hidden' },
      { type: 'body',  text: 'announcementText — The message text' },
      { type: 'body',  text: 'announcementGrade6Url — WhatsApp invite link for Grade 6 families' },
      { type: 'body',  text: 'announcementGrade7Url — WhatsApp invite link for Grade 7 families' },
      { type: 'body',  text: 'announcementGrade8Url — WhatsApp invite link for Grade 8 families' },
      { type: 'h1',   text: 'How to Turn the Bar On or Off' },
      { type: 'body',  text: '1. Content Manager → Site Settings' },
      { type: 'body',  text: '2. Find the row with key = announcementEnabled' },
      { type: 'body',  text: '3. Set value to: true (show) or false (hide)' },
      { type: 'body',  text: '4. Save' },
      { type: 'h1',   text: 'How to Update Grade WhatsApp Links' },
      { type: 'body',  text: '1. Get the permanent invite link from WhatsApp (Group → Invite via Link → Copy Link)' },
      { type: 'body',  text: '2. Find the matching key (announcementGrade6Url, etc.)' },
      { type: 'body',  text: '3. Paste the new link as the value' },
      { type: 'body',  text: '4. Save' },
      { type: 'body',  text: 'Note: If a grade URL is left empty, that grade button is hidden automatically.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
      { type: 'h1',   text: 'Quick Link' },
      { type: 'body',  text: 'Direct link to Site Settings collection: https://manage.wix.com/dashboard/509fda24-8dbf-43c6-aa74-df9f8b63c388/cms/SiteSettings' },
      { type: 'h1',   text: 'Wix Help Articles' },
      { type: 'body',  text: 'Managing collection content: https://support.wix.com/en/article/cms-formerly-content-manager-managing-your-collections' },
    ],
  },
  {
    folder: 'wix',
    title: '05 - How to Update Fundraising Goals v2',
    content: [
      { type: 'title', text: 'How to Update Fundraising Goals' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Site Settings' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The progress bars and goal numbers on the /fundraising page.' },
      { type: 'h1',   text: 'Keys to Edit' },
      { type: 'body',  text: 'fundraisingAnnualGoal — Total dollar goal for the year (number only, e.g. 21667)' },
      { type: 'body',  text: 'allocationPrograms — Enrichment Programs percentage (0–100)' },
      { type: 'body',  text: 'allocationEvents — School Events percentage (0–100)' },
      { type: 'body',  text: 'allocationTeachers — Teacher Support percentage (0–100)' },
      { type: 'body',  text: 'allocationOperations — Operations percentage (0–100)' },
      { type: 'body',  text: 'volunteerHoursGoal — Target volunteer hours for the year (e.g. 500)' },
      { type: 'h1',   text: 'Note on Actual Totals (Money Raised)' },
      { type: 'body',  text: 'Amounts actually raised come from CheddarUp via Zapier and are stored in the Payments collection automatically. You do not need to update those manually.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 1 hour (the fundraising page caches for 1 hour to reduce API calls). To force an immediate refresh, contact Rob.' },
      { type: 'h1',   text: 'Quick Link' },
      { type: 'body',  text: 'Direct link to Site Settings collection: https://manage.wix.com/dashboard/509fda24-8dbf-43c6-aa74-df9f8b63c388/cms/SiteSettings' },
      { type: 'h1',   text: 'Wix Help Articles' },
      { type: 'body',  text: 'Managing collection content: https://support.wix.com/en/article/cms-formerly-content-manager-managing-your-collections' },
    ],
  },
  {
    folder: 'wix',
    title: '06 - How to Manage the FAQ v2',
    content: [
      { type: 'title', text: 'How to Manage the FAQ' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → FAQ Items' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The "Common Questions" section at the bottom of the /membership page.' },
      { type: 'h1',   text: 'Fields Explained' },
      { type: 'body',  text: 'question — The question text' },
      { type: 'body',  text: 'answer — The answer text (plain text)' },
      { type: 'body',  text: 'page — Which page this FAQ appears on. Currently: membership. Leave blank and it won\'t show anywhere.' },
      { type: 'body',  text: 'sortOrder — Controls order. Lower number = appears first.' },
      { type: 'body',  text: 'active — Uncheck to hide without deleting' },
      { type: 'h1',   text: 'How to Add a New FAQ Item' },
      { type: 'body',  text: '1. Content Manager → FAQ Items → "+ New Item"' },
      { type: 'body',  text: '2. Enter question and answer' },
      { type: 'body',  text: '3. Set page = membership' },
      { type: 'body',  text: '4. Set sortOrder (use increments of 10 so you can insert items later)' },
      { type: 'body',  text: '5. Make sure active = checked' },
      { type: 'body',  text: '6. Save' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
      { type: 'h1',   text: 'Quick Link' },
      { type: 'body',  text: 'Direct link to FAQ Items collection: https://manage.wix.com/dashboard/509fda24-8dbf-43c6-aa74-df9f8b63c388/cms/FAQItems' },
      { type: 'h1',   text: 'Wix Help Articles' },
      { type: 'body',  text: 'Managing collection content: https://support.wix.com/en/article/cms-formerly-content-manager-managing-your-collections' },
    ],
  },
  {
    folder: 'wix',
    title: '07 - How to Manage Events v2',
    content: [
      { type: 'title', text: 'How to Manage Events' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Events (left sidebar — NOT Content Manager)' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The "Upcoming Events" section on the homepage and the full /events page.' },
      { type: 'h2',   text: 'Important' },
      { type: 'body',  text: 'Events use the native Wix Events app — they are NOT in Content Manager like other collections.' },
      { type: 'h1',   text: 'How to Add an Event' },
      { type: 'body',  text: '1. Wix Dashboard → Events → "+ Create Event"' },
      { type: 'body',  text: '2. Fill in: event name, date and time, location, description, event image (optional)' },
      { type: 'body',  text: '3. Publish the event' },
      { type: 'h1',   text: 'How to Edit or Cancel an Event' },
      { type: 'body',  text: '1. Dashboard → Events → find the event → click to open → Edit' },
      { type: 'body',  text: '2. Make changes → Save' },
      { type: 'body',  text: 'To cancel: open the event → "Cancel Event"' },
      { type: 'h1',   text: 'How Many Events Show on the Homepage' },
      { type: 'body',  text: 'The homepage shows the next 3 upcoming events automatically. Past events drop off on their own once the date passes.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Immediately — events are fetched live, not cached as long as other content.' },
      { type: 'h1',   text: 'Quick Link' },
      { type: 'body',  text: 'Direct link to Events dashboard: https://manage.wix.com/dashboard/509fda24-8dbf-43c6-aa74-df9f8b63c388/events' },
      { type: 'h1',   text: 'Wix Help Articles' },
      { type: 'body',  text: 'Managing events: https://support.wix.com/en/article/wix-events-managing-your-events' },
    ],
  },
  {
    folder: 'wix',
    update: true,
    title: '08 - How to Manage Spirit Wear v2',
    content: [
      { type: 'title', text: 'How to Manage Spirit Wear' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Store (left sidebar) → Products' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'Name, price, image, and stock for items on /spirit-wear come from Wix Stores. Which products appear is controlled by a Site Settings list (see below) — you do not need Rob for new items.' },
      { type: 'h1',   text: 'How to Add a New Item (two steps)' },
      { type: 'h2',   text: 'Step A — Create the product in Stores' },
      { type: 'body',  text: '1. Dashboard → Store → Products → "+ New Product"' },
      { type: 'body',  text: '2. Fill in: product name, price, description (optional), product image' },
      { type: 'body',  text: '3. Set inventory: "In Stock" or track quantity' },
      { type: 'body',  text: '4. Make sure the product is Published (not Draft)' },
      { type: 'body',  text: '5. Open the product and copy its Product ID (UUID). In Catalog/API views it looks like: 82ee7b02-5b3e-4383-8cd8-fcf089b45370' },
      { type: 'h2',   text: 'Step B — Add the ID to the site allowlist' },
      { type: 'body',  text: '1. Content Manager → Site Settings' },
      { type: 'body',  text: '2. Open the row with key: spiritWearProductIds' },
      { type: 'body',  text: '3. Append a comma and the new Product ID to the value (keep existing IDs)' },
      { type: 'body',  text: '4. Save → wait up to ~5 minutes → hard-refresh https://shmspto.vercel.app/spirit-wear' },
      { type: 'body',  text: 'Full walkthrough: see doc “21 - How to Show a New Store or Spirit Product”.' },
      { type: 'h1',   text: 'How to Mark Something Out of Stock' },
      { type: 'body',  text: 'Open the product → Inventory → set quantity to 0 or toggle to "Out of Stock".' },
      { type: 'body',  text: 'The website shows a grey "Out of Stock" overlay automatically.' },
      { type: 'h1',   text: 'How to Hide or Remove an Item' },
      { type: 'body',  text: 'Temporary hide: remove its UUID from spiritWearProductIds (or set product to Draft).' },
      { type: 'body',  text: 'Delete: only after removing the ID from Site Settings — prefer out-of-stock over delete.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within ~5 minutes (no Vercel deploy).' },
      { type: 'h1',   text: 'Quick Link' },
      { type: 'body',  text: 'Direct link to Store Products: https://manage.wix.com/dashboard/509fda24-8dbf-43c6-aa74-df9f8b63c388/store/products' },
      { type: 'h1',   text: 'Wix Help Articles' },
      { type: 'body',  text: 'Adding a product: https://support.wix.com/en/article/wix-stores-adding-a-physical-product' },
      { type: 'body',  text: 'Inventory management: https://support.wix.com/en/article/wix-stores-about-inventory-management' },
      { type: 'body',  text: 'Uploading media: https://support.wix.com/en/article/wix-media-uploading-media-to-the-media-manager' },
    ],
  },
  {
    folder: 'wix',
    update: true,
    title: '08b - How to Manage the School Store Inventory v2',
    content: [
      { type: 'title', text: 'How to Manage the School Store Inventory' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Store / Catalog → Products' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The candy and snack grid on /store — name, price, image, in-stock status, and "Deal of the Week" badge come from Wix Catalog.' },
      { type: 'h2',   text: 'Important' },
      { type: 'body',  text: 'School store and spirit wear share the same Wix Catalog. The site shows each product only if its UUID is listed in Site Settings (storeProductIds vs spiritWearProductIds). Do NOT delete existing products — mark them out of stock, or remove the ID from the list to hide them.' },
      { type: 'h1',   text: 'How to Update a Product Price' },
      { type: 'body',  text: '1. Wix Dashboard → Catalog → Products' },
      { type: 'body',  text: '2. Click the product name' },
      { type: 'body',  text: '3. Edit the price field' },
      { type: 'body',  text: '4. Save — updates within ~5 minutes' },
      { type: 'h1',   text: 'How to Mark a Product Out of Stock' },
      { type: 'body',  text: '1. Open the product → Inventory tab' },
      { type: 'body',  text: '2. Set quantity to 0 or toggle to "Out of Stock"' },
      { type: 'body',  text: 'The site shows a grey "Out of Stock" overlay automatically.' },
      { type: 'h1',   text: 'How to Set a Deal of the Week' },
      { type: 'body',  text: 'The "Deal of the Week" strip on the store page shows any product that has a Ribbon set.' },
      { type: 'body',  text: '1. Open the product in Catalog' },
      { type: 'body',  text: '2. Find the "Ribbon" field → type any text (e.g. "Deal")' },
      { type: 'body',  text: '3. Save — it appears in the Deals strip automatically' },
      { type: 'body',  text: 'To remove a deal: clear the Ribbon field and save.' },
      { type: 'h1',   text: 'How to Update a Product Image' },
      { type: 'body',  text: '1. Open the product → Media tab' },
      { type: 'body',  text: '2. Upload a new image or replace the existing one' },
      { type: 'body',  text: '3. Save' },
      { type: 'h1',   text: 'Adding a Brand New Product (board can do this)' },
      { type: 'body',  text: '1. Create and publish the product in Catalog (copy the Product ID UUID).' },
      { type: 'body',  text: '2. Content Manager → Site Settings → key storeProductIds' },
      { type: 'body',  text: '3. Append ,YOUR-NEW-UUID to the comma-separated value → Save' },
      { type: 'body',  text: '4. Wait ~5 minutes and check /store — no code deploy needed.' },
      { type: 'body',  text: 'See also: “21 - How to Show a New Store or Spirit Product”.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within ~5 minutes.' },
      { type: 'h1',   text: 'Quick Link' },
      { type: 'body',  text: 'Direct link to Store Products: https://manage.wix.com/dashboard/509fda24-8dbf-43c6-aa74-df9f8b63c388/store/products' },
      { type: 'h1',   text: 'Wix Help Articles' },
      { type: 'body',  text: 'Managing collection content: https://support.wix.com/en/article/cms-formerly-content-manager-managing-your-collections' },
      { type: 'body',  text: 'Adding a product: https://support.wix.com/en/article/wix-stores-adding-a-physical-product' },
      { type: 'body',  text: 'Inventory management: https://support.wix.com/en/article/wix-stores-about-inventory-management' },
      { type: 'body',  text: 'Ribbons (deals): https://support.wix.com/en/article/wix-stores-managing-ribbons' },
      { type: 'body',  text: 'Uploading media: https://support.wix.com/en/article/wix-media-uploading-media-to-the-media-manager' },
    ],
  },
  // ── Wix Admin Guides (originals kept for reference) ───────────────────────
  {
    folder: 'wix',
    title: '01 - How to Manage Board Members',
    content: [
      { type: 'title', text: 'How to Manage Board Members' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Board Members' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'Every card on the /board page — photo, name, role, and whether someone appears in the Executive Board section — comes from this collection.' },
      { type: 'h1',   text: 'Fields Explained' },
      { type: 'body',  text: 'name — Full name as it appears on the card' },
      { type: 'body',  text: 'role — Title (e.g. "President", "VP of Events")' },
      { type: 'body',  text: 'bio — Short description (1–2 sentences)' },
      { type: 'body',  text: 'photoUrl — Paste a Wix Media image URL here' },
      { type: 'body',  text: 'isExec — Check for Executive Board members. Unchecked = General Board section.' },
      { type: 'body',  text: 'sortOrder — Controls left-to-right order. Lower number = appears first. Execs and general board are sorted independently.' },
      { type: 'body',  text: 'active — Uncheck to hide someone without deleting them.' },
      { type: 'h1',   text: 'How to Add a New Board Member' },
      { type: 'body',  text: '1. Go to Content Manager → Board Members' },
      { type: 'body',  text: '2. Click "+ New Item"' },
      { type: 'body',  text: '3. Fill in name, role, bio' },
      { type: 'body',  text: '4. Upload their photo: click the photoUrl field → Media Manager → Upload → copy the URL' },
      { type: 'body',  text: '5. Set sortOrder (tip: use 10, 20, 30 so you can insert someone between later)' },
      { type: 'body',  text: '6. Check isExec if they are on the executive board' },
      { type: 'body',  text: '7. Make sure active = checked' },
      { type: 'body',  text: '8. Click Save' },
      { type: 'h1',   text: 'How to Remove a Board Member' },
      { type: 'body',  text: 'To hide temporarily: uncheck the active field.' },
      { type: 'body',  text: 'To delete permanently: select the row → Actions → Delete.' },
      { type: 'h1',   text: 'Photo Tips' },
      { type: 'body',  text: '• Square photos look best (1:1 ratio)' },
      { type: 'body',  text: '• Minimum 300×300px recommended' },
      { type: 'body',  text: '• If no photo is set, the site shows their first initial in a green circle automatically' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes. The site refreshes board data every 5 minutes automatically.' },
    ],
  },
  {
    folder: 'wix',
    title: '02 - How to Add or Edit Programs',
    content: [
      { type: 'title', text: 'How to Add or Edit Programs' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Programs' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The /programs page (full grid) and the Programs Preview section on the homepage (featured programs only).' },
      { type: 'h1',   text: 'Fields Explained' },
      { type: 'body',  text: 'name — Program name' },
      { type: 'body',  text: 'description — Full description shown on the program card' },
      { type: 'body',  text: 'category — Used for filtering. Options: academic | arts | athletics | social | stem | other' },
      { type: 'body',  text: 'grades — e.g. "6–8" or "All grades"' },
      { type: 'body',  text: 'schedule — e.g. "Tuesdays, 3–4pm"' },
      { type: 'body',  text: 'detail — Extra pill label (e.g. "Free", "Registration required")' },
      { type: 'body',  text: 'featured — Check to show on homepage preview (keep to 3–4 max)' },
      { type: 'body',  text: 'sortOrder — Order within the grid. Lower = first.' },
      { type: 'body',  text: 'paymentType — Leave blank for free programs. Options: cheddarup_direct | cheddarup_installment | cheddarup_p2p' },
      { type: 'body',  text: 'cheddarupUrl — Paste the full CheddarUp collection URL (e.g. https://app.cheddarup.com/c/your-collection)' },
      { type: 'body',  text: 'active — Uncheck to hide without deleting' },
      { type: 'h1',   text: 'How to Add a New Program' },
      { type: 'body',  text: '1. Content Manager → Programs → "+ New Item"' },
      { type: 'body',  text: '2. Fill in name, description, category, grades' },
      { type: 'body',  text: '3. If it has a payment: set paymentType and paste cheddarupUrl' },
      { type: 'body',  text: '4. Set featured = checked if it should appear on the homepage' },
      { type: 'body',  text: '5. Set sortOrder' },
      { type: 'body',  text: '6. Save' },
      { type: 'h1',   text: 'Homepage Preview' },
      { type: 'body',  text: 'Only programs with featured = checked appear on the homepage. Best results with 4 or fewer featured programs.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
    ],
  },
  {
    folder: 'wix',
    title: '03 - How to Update Membership Tiers and Perks',
    content: [
      { type: 'title', text: 'How to Update Membership Tiers and Perks' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Membership Tiers' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The membership cards on /membership — prices, tier names, perks lists, and the faculty membership section.' },
      { type: 'h1',   text: 'Fields Explained' },
      { type: 'body',  text: 'tierId — Internal ID. Do NOT change. Values: ruby | supreme | faculty' },
      { type: 'body',  text: 'name — Display name (e.g. "Ruby Membership")' },
      { type: 'body',  text: 'price — Price in dollars (number only, no $ sign)' },
      { type: 'body',  text: 'description — Subtitle shown under the price' },
      { type: 'body',  text: 'perks — One perk per line. Each line becomes a bullet on the membership card.' },
      { type: 'body',  text: 'highlighted — Check to show as "Most Popular" / featured card' },
      { type: 'body',  text: 'cheddarupUrl — The CheddarUp payment link for this tier' },
      { type: 'body',  text: 'active — Uncheck to hide a tier' },
      { type: 'h1',   text: 'How to Update Prices' },
      { type: 'body',  text: '1. Content Manager → Membership Tiers' },
      { type: 'body',  text: '2. Click the tier you want to edit' },
      { type: 'body',  text: '3. Change the price field' },
      { type: 'body',  text: '4. Save — new price shows within 5 minutes' },
      { type: 'h1',   text: 'How to Update Perks' },
      { type: 'body',  text: '1. Open the tier' },
      { type: 'body',  text: '2. Edit the perks field — one benefit per line' },
      { type: 'body',  text: '3. Save' },
      { type: 'h1',   text: 'Shared Benefits (All Members Receive section)' },
      { type: 'body',  text: 'These are NOT in the Membership Tiers collection.' },
      { type: 'body',  text: 'Go to: Content Manager → Site Settings → key: membershipSharedBenefits' },
      { type: 'body',  text: 'Edit the value — one benefit per line.' },
      { type: 'h1',   text: 'Faculty Membership' },
      { type: 'body',  text: 'The faculty price and description come from the row with tierId = faculty. It does NOT appear in the main tier grid — only in the Faculty & Staff section lower on the page.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
    ],
  },
  {
    folder: 'wix',
    title: '04 - How to Update the Announcement Bar',
    content: [
      { type: 'title', text: 'How to Update the Announcement Bar' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Site Settings' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The green banner at the very top of every page on the site.' },
      { type: 'h1',   text: 'Keys to Edit' },
      { type: 'body',  text: 'announcementEnabled — true = bar shows | false = bar hidden' },
      { type: 'body',  text: 'announcementText — The message text' },
      { type: 'body',  text: 'announcementGrade6Url — WhatsApp invite link for Grade 6 families' },
      { type: 'body',  text: 'announcementGrade7Url — WhatsApp invite link for Grade 7 families' },
      { type: 'body',  text: 'announcementGrade8Url — WhatsApp invite link for Grade 8 families' },
      { type: 'h1',   text: 'How to Turn the Bar On or Off' },
      { type: 'body',  text: '1. Content Manager → Site Settings' },
      { type: 'body',  text: '2. Find the row with key = announcementEnabled' },
      { type: 'body',  text: '3. Set value to: true (show) or false (hide)' },
      { type: 'body',  text: '4. Save' },
      { type: 'h1',   text: 'How to Update Grade WhatsApp Links' },
      { type: 'body',  text: '1. Get the permanent invite link from WhatsApp (Group → Invite via Link → Copy Link)' },
      { type: 'body',  text: '2. Find the matching key (announcementGrade6Url, etc.)' },
      { type: 'body',  text: '3. Paste the new link as the value' },
      { type: 'body',  text: '4. Save' },
      { type: 'body',  text: 'Note: If a grade URL is left empty, that grade button is hidden automatically.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
    ],
  },
  {
    folder: 'wix',
    title: '05 - How to Update Fundraising Goals',
    content: [
      { type: 'title', text: 'How to Update Fundraising Goals' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Site Settings' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The progress bars and goal numbers on the /fundraising page.' },
      { type: 'h1',   text: 'Keys to Edit' },
      { type: 'body',  text: 'fundraisingAnnualGoal — Total dollar goal for the year (number only, e.g. 21667)' },
      { type: 'body',  text: 'allocationPrograms — Enrichment Programs percentage (0–100)' },
      { type: 'body',  text: 'allocationEvents — School Events percentage (0–100)' },
      { type: 'body',  text: 'allocationTeachers — Teacher Support percentage (0–100)' },
      { type: 'body',  text: 'allocationOperations — Operations percentage (0–100)' },
      { type: 'body',  text: 'volunteerHoursGoal — Target volunteer hours for the year (e.g. 500)' },
      { type: 'h1',   text: 'Note on Actual Totals (Money Raised)' },
      { type: 'body',  text: 'Amounts actually raised come from CheddarUp via Zapier and are stored in the Payments collection automatically. You do not need to update those manually.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 1 hour (the fundraising page caches for 1 hour to reduce API calls). To force an immediate refresh, contact Rob.' },
    ],
  },
  {
    folder: 'wix',
    title: '06 - How to Manage the FAQ',
    content: [
      { type: 'title', text: 'How to Manage the FAQ' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → FAQ Items' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The "Common Questions" section at the bottom of the /membership page.' },
      { type: 'h1',   text: 'Fields Explained' },
      { type: 'body',  text: 'question — The question text' },
      { type: 'body',  text: 'answer — The answer text (plain text)' },
      { type: 'body',  text: 'page — Which page this FAQ appears on. Currently: membership. Leave blank and it won\'t show anywhere.' },
      { type: 'body',  text: 'sortOrder — Controls order. Lower number = appears first.' },
      { type: 'body',  text: 'active — Uncheck to hide without deleting' },
      { type: 'h1',   text: 'How to Add a New FAQ Item' },
      { type: 'body',  text: '1. Content Manager → FAQ Items → "+ New Item"' },
      { type: 'body',  text: '2. Enter question and answer' },
      { type: 'body',  text: '3. Set page = membership' },
      { type: 'body',  text: '4. Set sortOrder (use increments of 10 so you can insert items later)' },
      { type: 'body',  text: '5. Make sure active = checked' },
      { type: 'body',  text: '6. Save' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
    ],
  },
  {
    folder: 'wix',
    title: '07 - How to Manage Events',
    content: [
      { type: 'title', text: 'How to Manage Events' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Events (left sidebar — NOT Content Manager)' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The "Upcoming Events" section on the homepage and the full /events page.' },
      { type: 'h2',   text: 'Important' },
      { type: 'body',  text: 'Events use the native Wix Events app — they are NOT in Content Manager like other collections.' },
      { type: 'h1',   text: 'How to Add an Event' },
      { type: 'body',  text: '1. Wix Dashboard → Events → "+ Create Event"' },
      { type: 'body',  text: '2. Fill in: event name, date and time, location, description, event image (optional)' },
      { type: 'body',  text: '3. Publish the event' },
      { type: 'h1',   text: 'How to Edit or Cancel an Event' },
      { type: 'body',  text: '1. Dashboard → Events → find the event → click to open → Edit' },
      { type: 'body',  text: '2. Make changes → Save' },
      { type: 'body',  text: 'To cancel: open the event → "Cancel Event"' },
      { type: 'h1',   text: 'How Many Events Show on the Homepage' },
      { type: 'body',  text: 'The homepage shows the next 3 upcoming events automatically. Past events drop off on their own once the date passes.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Immediately — events are fetched live, not cached as long as other content.' },
    ],
  },
  {
    folder: 'wix',
    title: '08 - How to Manage Spirit Wear',
    content: [
      { type: 'title', text: 'How to Manage Spirit Wear' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Store (left sidebar) → Products' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The product grid on /spirit-wear. Every item — name, price, image, and Buy button — comes from Wix Stores.' },
      { type: 'h1',   text: 'How to Add a New Item' },
      { type: 'body',  text: '1. Dashboard → Store → Products → "+ New Product"' },
      { type: 'body',  text: '2. Fill in: product name, price, description (optional), product image' },
      { type: 'body',  text: '3. Set inventory: "In Stock" or track quantity' },
      { type: 'body',  text: '4. Make sure the product is Published (not Draft)' },
      { type: 'h1',   text: 'How to Mark Something Out of Stock' },
      { type: 'body',  text: 'Open the product → Inventory → set quantity to 0 or toggle to "Out of Stock".' },
      { type: 'body',  text: 'The website shows a grey "Out of Stock" overlay automatically.' },
      { type: 'h1',   text: 'How to Remove an Item' },
      { type: 'body',  text: 'To hide temporarily: set to Draft.' },
      { type: 'body',  text: 'To delete: product settings → Delete.' },
      { type: 'h1',   text: 'Where the Buy Button Goes' },
      { type: 'body',  text: 'The Buy button links to your Wix store product page. The base URL is stored in Site Settings under key: spiritWearBaseUrl. If you ever need to change this, contact Rob at gregory.robert.c@gmail.com.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
    ],
  },

  // ── Tech Ops ──────────────────────────────────────────────────────────────
  {
    folder: 'techops',
    title: '09 - Things That Require a Code Deploy (Rob)',
    content: [
      { type: 'title', text: 'Things That Require a Code Deploy' },
      { type: 'body',  text: 'SHMS PTO Platform — Tech Ops Reference  |  Last updated: June 2026' },
      { type: 'body',  text: 'These changes cannot be made in Wix and require Rob to update the code and redeploy to Vercel.' },
      { type: 'h1',   text: 'Layout & Design' },
      { type: 'body',  text: '• Any change to page layout, colors, fonts, or spacing' },
      { type: 'body',  text: '• Adding or removing sections on a page' },
      { type: 'body',  text: '• Adding a new page to the site' },
      { type: 'body',  text: '• Changing the navigation structure beyond label/order' },
      { type: 'h1',   text: 'New Features' },
      { type: 'body',  text: '• Any new integration (new payment provider, new API, etc.)' },
      { type: 'body',  text: '• Member portal features' },
      { type: 'body',  text: '• New form types' },
      { type: 'body',  text: '• Money Minder sync automation (not yet built)' },
      { type: 'h1',   text: 'CMS Structure' },
      { type: 'body',  text: '• Adding a new CMS collection' },
      { type: 'body',  text: '• Adding a new field to an existing collection' },
      { type: 'body',  text: '• Changing field types' },
      { type: 'h1',   text: 'Vercel Config' },
      { type: 'body',  text: '• Adding new environment variables' },
      { type: 'body',  text: '• Changing cache/revalidation times' },
      { type: 'body',  text: '• Domain configuration changes' },
      { type: 'h1',   text: 'To Request a Change' },
      { type: 'body',  text: 'Email Rob at: gregory.robert.c@gmail.com' },
      { type: 'body',  text: 'Include: (1) what page/section needs to change, (2) what it should look like or do, (3) priority — blocking vs. nice-to-have' },
      { type: 'h1',   text: 'Typical Turnaround' },
      { type: 'body',  text: 'Bug fixes: same day' },
      { type: 'body',  text: 'Layout changes: 1–3 days' },
      { type: 'body',  text: 'New features: scoped separately' },
    ],
  },
  {
    folder: 'techops',
    title: '10 - Environment Variables Reference (Rob)',
    content: [
      { type: 'title', text: 'Environment Variables Reference' },
      { type: 'body',  text: 'SHMS PTO Platform — Tech Ops Reference  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where These Live' },
      { type: 'body',  text: 'Vercel Dashboard → Project: frontend → Settings → Environment Variables' },
      { type: 'h2',   text: 'Important' },
      { type: 'body',  text: 'NEVER commit .env.local to Git — it is gitignored.' },
      { type: 'body',  text: 'ALWAYS use Production deploy (not Preview) — Preview deployments do not receive production env vars.' },
      { type: 'h1',   text: 'Variable Reference' },
      { type: 'body',  text: 'WIX_API_KEY — Server-side key for all Wix CMS REST calls' },
      { type: 'body',  text: 'WIX_SITE_ID — Wix site ID: 509fda24-8dbf-43c6-aa74-df9f8b63c388' },
      { type: 'body',  text: 'NEXT_PUBLIC_WIX_CLIENT_ID — Public OAuth client ID for member login' },
      { type: 'body',  text: 'NEXT_PUBLIC_SITE_URL — Base URL of the site (for OAuth redirects)' },
      { type: 'body',  text: 'CHEDDARUP_WEBHOOK_SECRET — Token to authenticate Zapier → webhook calls' },
      { type: 'h1',   text: 'If the Site Goes Down' },
      { type: 'body',  text: '1. Check Vercel dashboard for build/runtime errors' },
      { type: 'body',  text: '2. Check that env vars are still set (they can be accidentally deleted)' },
      { type: 'body',  text: '3. Check Wix API status: https://www.wixstatus.com' },
      { type: 'body',  text: 'Note: All pages have hardcoded fallback data — a Wix outage will not blank the site, it just shows the last known content.' },
      { type: 'h1',   text: 'Rotating Keys' },
      { type: 'body',  text: 'If WIX_API_KEY is compromised: Wix Dashboard → Settings → API Keys → revoke old key → generate new → update in Vercel env vars → redeploy.' },
    ],
  },
  {
    folder: 'techops',
    title: '11 - Money Minder Manual Sync (Interim)',
    content: [
      { type: 'title', text: 'Money Minder Manual Sync (Interim Process)' },
      { type: 'body',  text: 'SHMS PTO Platform — Tech Ops Reference  |  Last updated: June 2026' },
      { type: 'h2',   text: 'Status' },
      { type: 'body',  text: 'Automated sync is not yet built. This is the manual process until automation is added.' },
      { type: 'h1',   text: 'How Payments Flow Today' },
      { type: 'body',  text: 'CheddarUp → Zapier webhook → Wix Payments CMS collection' },
      { type: 'h1',   text: 'The Manual Sync Process' },
      { type: 'body',  text: '1. Go to Wix Dashboard → Content Manager → Payments' },
      { type: 'body',  text: '2. Filter by syncedToMoneyMinder = false' },
      { type: 'body',  text: '3. Export as CSV: Actions → Export' },
      { type: 'body',  text: '4. Open Money Minder' },
      { type: 'body',  text: '5. Import the CSV using Money Minder\'s import feature' },
      { type: 'body',  text: '6. After successful import, return to Wix and set syncedToMoneyMinder = true on each imported row' },
      { type: 'h1',   text: 'Fields in the Payments Collection' },
      { type: 'body',  text: 'payerName — Name on the CheddarUp payment' },
      { type: 'body',  text: 'payerEmail — Email address' },
      { type: 'body',  text: 'amount — Dollar amount' },
      { type: 'body',  text: 'collectionName — Which CheddarUp collection (program name, etc.)' },
      { type: 'body',  text: 'itemDescription — What was purchased' },
      { type: 'body',  text: 'source — Always "cheddarup"' },
      { type: 'body',  text: 'transactionId — CheddarUp transaction ID' },
      { type: 'body',  text: 'paidAt — Timestamp of payment' },
      { type: 'body',  text: 'syncedToMoneyMinder — Manual flag. Set to true after export.' },
      { type: 'h1',   text: 'Future State' },
      { type: 'body',  text: 'An automated nightly sync will be built post-Render deploy that queries Wix for unsync\'d payments, pushes them to Money Minder, and marks them synced automatically.' },
    ],
  },

  // ── CheddarUp ─────────────────────────────────────────────────────────────
  {
    folder: 'cheddarup',
    title: '12 - CheddarUp Setup Guide (Installments and Peer Fundraising) v2',
    content: [
      { type: 'title', text: 'CheddarUp Setup Guide — Installments and Peer Fundraising' },
      { type: 'body',  text: 'SHMS PTO Platform — CheddarUp Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'What CheddarUp Is Used For' },
      { type: 'body',  text: 'CheddarUp handles two specific payment scenarios for SHMS PTO:' },
      { type: 'body',  text: '1. Program installment plans — families pay for programs in multiple scheduled payments instead of a lump sum.' },
      { type: 'body',  text: '2. Peer-to-peer fundraising campaigns — families create personal fundraising pages and collect donations from their network on behalf of SHMS PTO.' },
      { type: 'body',  text: 'CheddarUp does NOT handle store card loading (that is a Wix Stores product), memberships (TBD), or general one-time program payments (those use direct CheddarUp collections or Wix Stores).' },
      { type: 'h1',   text: 'How the Webhook Works' },
      { type: 'body',  text: 'When a family completes a payment in CheddarUp, the following happens automatically:' },
      { type: 'body',  text: '1. CheddarUp fires a webhook to Zapier.' },
      { type: 'body',  text: '2. Zapier calls the site\'s webhook endpoint: /api/webhooks/cheddarup' },
      { type: 'body',  text: '3. The endpoint validates the CHEDDARUP_WEBHOOK_SECRET token and logs the payment to Wix Content Manager → Payments collection.' },
      { type: 'body',  text: 'You can see all logged payments at: Wix Dashboard → Content Manager → Payments. No manual entry required.' },
      { type: 'h1',   text: 'Setting Up an Installment Plan' },
      { type: 'h2',   text: 'Step 1 — Create the Collection in CheddarUp' },
      { type: 'body',  text: '1. CheddarUp Dashboard → "+ New Collection"' },
      { type: 'body',  text: '2. Add your item (e.g. "NOVA Math Club — Full Year")' },
      { type: 'body',  text: '3. Under "Payment Options" → enable "Payment Plans / Installments"' },
      { type: 'body',  text: '4. Set the schedule (e.g. 3 payments of $X over 3 months)' },
      { type: 'body',  text: '5. Publish the collection and copy the collection URL' },
      { type: 'h2',   text: 'Step 2 — Wire It to the Program in Wix CMS' },
      { type: 'body',  text: '1. Wix Dashboard → Content Manager → Programs' },
      { type: 'body',  text: '2. Open the matching program record' },
      { type: 'body',  text: '3. Set paymentType = cheddarup_installment' },
      { type: 'body',  text: '4. Paste the CheddarUp collection URL into the cheddarupUrl field' },
      { type: 'body',  text: '5. Save — the program card on the website will show an "Installments Available" badge automatically' },
      { type: 'h1',   text: 'Setting Up a Peer-to-Peer (P2P) Campaign' },
      { type: 'h2',   text: 'Step 1 — Create the Campaign in CheddarUp' },
      { type: 'body',  text: '1. CheddarUp Dashboard → "+ New Collection"' },
      { type: 'body',  text: '2. Choose "Peer-to-Peer Fundraiser" template' },
      { type: 'body',  text: '3. Configure your campaign goal, end date, and story' },
      { type: 'body',  text: '4. Invite participants (families can create their own fundraising pages under this campaign)' },
      { type: 'body',  text: '5. Publish and copy the campaign URL' },
      { type: 'h2',   text: 'Step 2 — Wire It to the Website' },
      { type: 'body',  text: '1. Wix Dashboard → Content Manager → Programs (or FundraisingCTAs if it\'s a homepage campaign)' },
      { type: 'body',  text: '2. Set paymentType = cheddarup_p2p' },
      { type: 'body',  text: '3. Paste the campaign URL into the cheddarupUrl field' },
      { type: 'body',  text: '4. Save — the card will show a "Peer Fundraiser" badge' },
      { type: 'h1',   text: 'Viewing Completed Payments' },
      { type: 'body',  text: 'All completed payments from installment plans and P2P campaigns are automatically logged via the Zapier webhook.' },
      { type: 'body',  text: 'To view them: Wix Dashboard → Content Manager → Payments' },
      { type: 'body',  text: 'Filter by source = cheddarup to isolate CheddarUp transactions.' },
      { type: 'h1',   text: 'CheddarUp Support' },
      { type: 'body',  text: 'https://support.cheddarup.com' },
    ],
  },

  // ── Store docs ───────────────────────────────────────────────────────────
  {
    folder: 'wix',
    title: '08b - How to Manage the School Store Inventory',
    content: [
      { type: 'title', text: 'How to Manage the School Store Inventory' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'Where to Go' },
      { type: 'body',  text: 'Wix Dashboard → Catalog → Products' },
      { type: 'h1',   text: 'What This Controls' },
      { type: 'body',  text: 'The candy and snack grid on the /store page — every item name, price, image, in-stock status, and "Deal of the Week" badge comes from Wix Catalog.' },
      { type: 'h2',   text: 'Important' },
      { type: 'body',  text: 'The school store and spirit wear both live in Wix Catalog (Stores). The site separates them automatically using a fixed list of product IDs. Do NOT delete existing products — mark them out of stock instead. If you need to add a genuinely new product, contact Rob so the ID can be added to the site.' },
      { type: 'h1',   text: 'How to Update a Product Price' },
      { type: 'body',  text: '1. Wix Dashboard → Catalog → Products' },
      { type: 'body',  text: '2. Click the product name' },
      { type: 'body',  text: '3. Edit the price field' },
      { type: 'body',  text: '4. Save — updates within 5 minutes' },
      { type: 'h1',   text: 'How to Mark a Product Out of Stock' },
      { type: 'body',  text: '1. Open the product → Inventory tab' },
      { type: 'body',  text: '2. Set quantity to 0 or toggle to "Out of Stock"' },
      { type: 'body',  text: 'The site shows a grey "Out of Stock" overlay automatically.' },
      { type: 'h1',   text: 'How to Set a Deal of the Week' },
      { type: 'body',  text: 'The "Deal of the Week" strip on the store page shows any product that has a Ribbon set.' },
      { type: 'body',  text: '1. Open the product in Catalog' },
      { type: 'body',  text: '2. Find the "Ribbon" field → type any text (e.g. "Deal")' },
      { type: 'body',  text: '3. Save — it appears in the Deals strip automatically' },
      { type: 'body',  text: 'To remove a deal: clear the Ribbon field and save.' },
      { type: 'h1',   text: 'How to Update a Product Image' },
      { type: 'body',  text: '1. Open the product → Media tab' },
      { type: 'body',  text: '2. Upload a new image or replace the existing one' },
      { type: 'body',  text: '3. Save' },
      { type: 'h1',   text: 'Adding a Brand New Product' },
      { type: 'body',  text: 'You can create the product in Wix Catalog, but it will NOT appear on the site until Rob adds its product ID to the codebase. Email gregory.robert.c@gmail.com with the product name after creating it.' },
      { type: 'h1',   text: 'When Changes Go Live' },
      { type: 'body',  text: 'Within 5 minutes.' },
    ],
  },
  {
    folder: 'wix',
    title: '12b - How to Manage the Store Card',
    content: [
      { type: 'title', text: 'How to Manage the Store Card' },
      { type: 'body',  text: 'SHMS PTO Platform — Wix Admin Guide  |  Last updated: June 2026' },
      { type: 'h1',   text: 'What the Store Card Is' },
      { type: 'body',  text: 'The store card is a prepaid balance families load onto their student\'s account. When a student buys something at the store window, the volunteer deducts from their card balance. Families load money through the website\'s /store page → "Load Store Card" button.' },
      { type: 'h1',   text: 'How Loading Works' },
      { type: 'body',  text: 'The "Load Store Card" button on the /store page links to a Wix hosted storefront product page:' },
      { type: 'body',  text: 'URL: https://shmspto.org/store/product/pto-store-card' },
      { type: 'body',  text: 'Product ID: eb2a71dc-7f0f-41b4-85bc-76b0869e5d30' },
      { type: 'body',  text: 'The product has three amount variants: $20, $40, and $50. Families select their load amount and check out through the Wix storefront.' },
      { type: 'h1',   text: 'How to Manage the Product in Wix Catalog' },
      { type: 'h2',   text: 'To Update Price Variants' },
      { type: 'body',  text: '1. Wix Dashboard → Store → Products' },
      { type: 'body',  text: '2. Find "PTO Store Card" (product ID: eb2a71dc-7f0f-41b4-85bc-76b0869e5d30)' },
      { type: 'body',  text: '3. Open the product → Variants tab' },
      { type: 'body',  text: '4. Edit the price for each variant ($20, $40, $50) as needed' },
      { type: 'body',  text: '5. Save' },
      { type: 'h2',   text: 'To Add or Remove Amount Options' },
      { type: 'body',  text: 'Open the product → Variants tab → add a new variant for the new amount, or delete an existing variant.' },
      { type: 'body',  text: 'If you want a custom amount option, contact Rob — that requires a code change to the storefront.' },
      { type: 'h2',   text: 'To Update Stock' },
      { type: 'body',  text: 'The store card is a virtual product — stock tracking should be set to "Unlimited" or "In Stock" at all times unless you want to temporarily block purchases.' },
      { type: 'h1',   text: 'Balance Tracking' },
      { type: 'body',  text: 'Balance tracking is currently manual — maintained in a spreadsheet or Money Minder. The member portal will show live balances in a future update.' },
      { type: 'body',  text: 'Interim process: log card loads from Wix Dashboard → Orders (filter by product = PTO Store Card), then reconcile against your balance ledger.' },
      { type: 'h1',   text: 'Future Update' },
      { type: 'body',  text: 'The member portal (post-launch) will let families see their card balance directly. Until then, balance is maintained manually.' },
    ],
  },

  // ── Pre-launch checklist (Rob only) ──────────────────────────────────────
  {
    folder: 'root',
    title: '00b - Pre-Launch Architecture & Execution Plan (Rob)',
    content: [
      { type: 'title', text: 'Pre-Launch Architecture & Execution Plan' },
      { type: 'body',  text: 'SHMS PTO Platform — For Rob Only  |  Last updated: June 2026' },
      { type: 'body',  text: 'This document lists everything that must be completed before shmspto.org can go live on the custom domain. Each item includes current state and what needs to happen.' },
      { type: 'h1',   text: 'BLOCKING — Must Complete Before Domain Cutover' },
      { type: 'h2',   text: '1. Wix Site Publish' },
      { type: 'body',  text: 'What it is: The Wix site (site ID: 509fda24-8dbf-43c6-aa74-df9f8b63c388) must be published for the member login and OAuth flow to work. Wix Members / OAuth only functions on a published site.' },
      { type: 'body',  text: 'Current state: Site is unpublished.' },
      { type: 'body',  text: 'What needs to happen: Wix Dashboard → Publish Site. Verify Wix Members app is installed and configured.' },
      { type: 'h2',   text: '2. Member Portal End-to-End Auth Validation' },
      { type: 'body',  text: 'What it is: The /member-portal page exists in the Next.js frontend but the Wix OAuth flow (NEXT_PUBLIC_WIX_CLIENT_ID → redirect → session) has not been tested end-to-end against a published Wix site.' },
      { type: 'body',  text: 'Current state: Code written, not tested against live Wix OAuth.' },
      { type: 'body',  text: 'What needs to happen: Publish Wix site (item 1 above), then test full login flow: visit /member-portal → redirected to Wix login → return to site → session established → member data visible. Fix any redirect URI mismatches in Wix OAuth settings.' },
      { type: 'h2',   text: '3. Zapier Zap — CheddarUp Webhook' },
      { type: 'body',  text: 'What it is: The webhook endpoint /api/webhooks/cheddarup exists and validates CHEDDARUP_WEBHOOK_SECRET. But the Zapier zap that connects CheddarUp events to this endpoint must be created and verified.' },
      { type: 'body',  text: 'Current state: Endpoint deployed, Zapier zap not created.' },
      { type: 'body',  text: 'What needs to happen: In Zapier, create a new zap: Trigger = CheddarUp "Payment Completed" → Action = Webhook POST to https://shmspto.org/api/webhooks/cheddarup with Authorization header = Bearer {CHEDDARUP_WEBHOOK_SECRET value}. Test with a real CheddarUp test payment and verify the record appears in Wix Content Manager → Payments.' },
      { type: 'h2',   text: '4. Wix Stores Store Card Product — Variants Confirmed' },
      { type: 'body',  text: 'What it is: The store card Wix Stores product (ID: eb2a71dc-7f0f-41b4-85bc-76b0869e5d30, slug: pto-store-card) needs the $20/$40/$50 variants confirmed in Wix Catalog and the hosted storefront URL verified.' },
      { type: 'body',  text: 'Current state: Product ID is in the code but variants and published state not confirmed.' },
      { type: 'body',  text: 'What needs to happen: Wix Dashboard → Store → Products → find the product → confirm 3 variants ($20, $40, $50) exist, product is Published, and the hosted storefront URL resolves at shmspto.org/store/product/pto-store-card.' },
      { type: 'h2',   text: '5. WhatsApp Permanent Invite Links' },
      { type: 'body',  text: 'What it is: The announcement bar has grade-specific WhatsApp join buttons. The URLs (announcementGrade6Url, announcementGrade7Url, announcementGrade8Url in Site Settings) must be permanent invite links — not temporary ones that expire.' },
      { type: 'body',  text: 'Current state: Placeholder or temporary links in Site Settings.' },
      { type: 'body',  text: 'What needs to happen: For each WhatsApp group → open the group → Group Info → Invite via Link → "Reset Link" if needed → copy the permanent link → paste into the corresponding Site Settings key in Wix Content Manager.' },
      { type: 'h2',   text: '6. CMS Data Population — Programs and Membership Tiers' },
      { type: 'body',  text: 'What it is: Any program that uses CheddarUp installments or P2P must have a real cheddarupUrl populated in Wix Content Manager → Programs. Membership Tiers records also need real cheddarupUrl values if membership is sold through CheddarUp.' },
      { type: 'body',  text: 'Current state: Records may have placeholder or empty cheddarupUrl fields.' },
      { type: 'body',  text: 'What needs to happen: For each paid program, create the CheddarUp collection (see doc 12), copy the URL, and paste it into the program\'s cheddarupUrl field. Set paymentType accordingly. Repeat for any membership tiers using CheddarUp.' },
      { type: 'h2',   text: '7. Production Environment Variables in Vercel' },
      { type: 'body',  text: 'What it is: The site is currently on a Vercel preview URL. All production environment variables must be confirmed set for the production deployment (not just preview).' },
      { type: 'body',  text: 'Current state: Env vars set for preview; production domain not yet added to Vercel.' },
      { type: 'body',  text: 'What needs to happen: Vercel Dashboard → Project: frontend → Settings → Domains → add shmspto.org. Then Settings → Environment Variables → confirm all vars are scoped to Production: WIX_API_KEY, WIX_SITE_ID, NEXT_PUBLIC_WIX_CLIENT_ID, NEXT_PUBLIC_SITE_URL (set to https://shmspto.org), CHEDDARUP_WEBHOOK_SECRET. Redeploy after adding the domain.' },
      { type: 'h2',   text: '8. Spirit Wear Buy Button URLs' },
      { type: 'body',  text: 'What it is: Spirit wear Buy buttons currently point to the Wix subdomain storefront. At launch, spiritWearBaseUrl in Site Settings must be updated to the custom domain.' },
      { type: 'body',  text: 'Current state: spiritWearBaseUrl points to Wix subdomain.' },
      { type: 'body',  text: 'What needs to happen: After domain DNS is live, go to Wix Content Manager → Site Settings → key: spiritWearBaseUrl → update to https://shmspto.org/store/product-page → Save.' },
      { type: 'h2',   text: '9. Domain DNS Cutover' },
      { type: 'body',  text: 'What it is: Point shmspto.org DNS to Vercel.' },
      { type: 'body',  text: 'Current state: DNS pointing elsewhere (or unset).' },
      { type: 'body',  text: 'What needs to happen: (a) Add shmspto.org in Vercel Dashboard → Domains. Vercel will provide DNS records. (b) At your DNS registrar, add: CNAME/ALIAS record for @ → cname.vercel-dns.com, and CNAME for www → cname.vercel-dns.com. (c) SSL is automatic via Vercel. Allow up to 48 hours for full propagation, typically under 1 hour.' },
      { type: 'h2',   text: '10. Money Minder Sync — Interim Process Documented' },
      { type: 'body',  text: 'What it is: There is no automated Money Minder sync. A manual CSV export process is the interim plan (see doc 11).' },
      { type: 'body',  text: 'Current state: Manual process documented in doc 11.' },
      { type: 'body',  text: 'What needs to happen: Confirm the Treasurer has read doc 11 and knows the manual export process before launch.' },
      { type: 'h1',   text: 'POST-LAUNCH — Can Be Done After Go-Live' },
      { type: 'h2',   text: 'Money Minder Automation' },
      { type: 'body',  text: 'What it is: Nightly automated sync from Wix Payments collection to Money Minder, marking records synced.' },
      { type: 'body',  text: 'Current state: Not built. Manual process is the interim.' },
      { type: 'body',  text: 'What needs to happen: Post-launch feature build. Needs a Money Minder API key and a scheduled Vercel cron job.' },
      { type: 'h2',   text: 'Member Portal — Live Store Card Balances' },
      { type: 'body',  text: 'What it is: The member portal will eventually show a family\'s current store card balance.' },
      { type: 'body',  text: 'Current state: Member portal login flow is the launch-blocking item. Balance display is a separate post-launch feature.' },
      { type: 'body',  text: 'What needs to happen: Post-launch feature. Requires a balance ledger API or database integration.' },
      { type: 'h2',   text: 'CheddarUp Installment and P2P CMS Population' },
      { type: 'body',  text: 'What it is: Individual program installment and P2P collections in CheddarUp only need to be created when those programs are actually offered.' },
      { type: 'body',  text: 'What needs to happen: As programs are set up for the year, populate cheddarupUrl per doc 12. No blocking dependency for site launch itself.' },
      { type: 'h2',   text: 'Screenshot Updates for Help Docs' },
      { type: 'body',  text: 'What it is: Board member help docs (01–12) could have screenshots added for clarity.' },
      { type: 'body',  text: 'What needs to happen: After launch, take screenshots from the live Wix Dashboard and embed them in the relevant Google Docs.' },
    ],
  },

  // ── New July 2026 editor guides (portal + PageContent era) ─────────────────
  {
    folder: 'wix',
    update: true,
    title: '13 - How to Edit Page Heroes and Marketing Copy (PageContent)',
    content: [
      { type: 'title', text: 'How to Edit Page Heroes and Marketing Copy' },
      { type: 'body',  text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'body',  text: 'Use this when you need to change the big title, subtitle, eyebrow, or CTA text on public pages — including home sections below the hero — without asking Rob for a code deploy.' },
      { type: 'h1',   text: 'Where to edit' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Page Content' },
      { type: 'h1',   text: 'How it works' },
      { type: 'body',  text: 'Each row is one page (or home block). The "page" field is the slug (must match exactly):' },
      { type: 'body',  text: 'home · home-volunteer · home-community · membership · events · programs · volunteer · board · contact · store · store-how · store-cta · spirit-wear · fundraising · meetings · newsletter · member-portal · portal · portal-hub' },
      { type: 'h1',   text: 'Fields you can change' },
      { type: 'body',  text: 'eyebrow — small label above the title' },
      { type: 'body',  text: 'title — main headline' },
      { type: 'body',  text: 'body — supporting paragraph under the title' },
      { type: 'body',  text: 'sectionTitle / sectionBody — secondary section copy (when the page uses it)' },
      { type: 'body',  text: 'bullets — newline-separated list items (or special formats — see store-how and portal-hub guides)' },
      { type: 'body',  text: 'ctaLabel / ctaHref — button text and link (e.g. Join the PTO → /membership)' },
      { type: 'body',  text: 'active — turn OFF to fall back to built-in defaults (do not delete the row)' },
      { type: 'h1',   text: 'Home page blocks (below the hero)' },
      { type: 'h2',   text: 'home-volunteer' },
      { type: 'body',  text: 'Controls the “Volunteer With Us” section on the homepage.' },
      { type: 'body',  text: 'eyebrow · title · body · bullets (one benefit per line) · ctaLabel / ctaHref' },
      { type: 'body',  text: 'sectionTitle = quote on the photo · sectionBody = attribution (e.g. — SHMS Parent)' },
      { type: 'body',  text: 'Image URL / alt / secondary button label are Site Settings keys: homeVolunteerImageUrl, homeVolunteerImageAlt, homeVolunteerSecondaryCta' },
      { type: 'h2',   text: 'home-community' },
      { type: 'body',  text: 'Controls the wide community photo strip near the bottom of the homepage.' },
      { type: 'body',  text: 'title = overlay headline text' },
      { type: 'body',  text: 'Image: Site Settings homeCommunityImageUrl / homeCommunityImageAlt' },
      { type: 'h1',   text: 'Steps' },
      { type: 'body',  text: '1. Content Manager → Page Content' },
      { type: 'body',  text: '2. Open the row whose page matches the site URL (e.g. programs for /programs, or home-volunteer for the home volunteer block)' },
      { type: 'body',  text: '3. Edit fields → Save' },
      { type: 'body',  text: '4. Wait up to ~5 minutes, then hard-refresh the live site (Cmd+Shift+R)' },
      { type: 'h1',   text: 'Tips' },
      { type: 'body',  text: 'Keep titles short. Do not change the "page" slug value — if it drifts, the site ignores the row.' },
      { type: 'body',  text: 'Staging site: https://shmspto.vercel.app  |  Custom domain after DNS cutover: https://www.shmspto.org' },
    ],
  },
  {
    folder: 'wix',
    title: '14 - How to Edit Member Portal Copy',
    content: [
      { type: 'title', text: 'How to Edit Member Portal Copy' },
      { type: 'body',  text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'body',  text: 'Parents see the member hub after login at /member-portal. Most labels and blurbs are editable in Page Content — no deploy needed.' },
      { type: 'h1',   text: 'Three Page Content rows' },
      { type: 'h2',   text: '1) member-portal — hero' },
      { type: 'body',  text: 'title — "Member Portal"' },
      { type: 'body',  text: 'body — subtitle under the hero' },
      { type: 'h2',   text: '2) portal — account messaging' },
      { type: 'body',  text: 'title / body — free parent account blurb' },
      { type: 'body',  text: 'sectionTitle / sectionBody — paid membership blurb' },
      { type: 'body',  text: 'bullets (3 lines, in order):' },
      { type: 'body',  text: 'Line 1 — empty-students heading' },
      { type: 'body',  text: 'Line 2 — empty-students body' },
      { type: 'body',  text: 'Line 3 — upgrade / paid perks blurb on student cards' },
      { type: 'h2',   text: '3) portal-hub — UI labels' },
      { type: 'body',  text: 'Edit the Bullets field. One key per line, format: key|text' },
      { type: 'body',  text: 'Examples:' },
      { type: 'code',  text: 'calendarTitle|Calendar & Messages\naccountTitle|My Account\nstudentsTitle|My Students\nstoreTitle|Store & Purchases\ncalendarEmptyTitle|No dates yet\nctaLoadCard|Load card\naddStudentCta|Add a student' },
      { type: 'body',  text: 'Unknown keys are ignored. Keep the key on the left of the | exactly as written.' },
      { type: 'h1',   text: 'What parents see (data, not copy)' },
      { type: 'body',  text: 'Students, enrollments, payments, sessions, and instructor messages come from other CMS collections — see docs 15–17.' },
      { type: 'h1',   text: 'Grades list' },
      { type: 'body',  text: 'Site Settings key portalGrades (e.g. 6,7,8) controls which grade buttons appear when adding a student.' },
    ],
  },
  {
    folder: 'wix',
    title: '15 - How to Add Program Session Dates (Calendar)',
    content: [
      { type: 'title', text: 'How to Add Program Session Dates' },
      { type: 'body',  text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'body',  text: 'Program Sessions give the member portal calendar real dates and times. Without them, the calendar may show free-text schedule text from the Programs collection only.' },
      { type: 'h1',   text: 'Where to edit' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Program Sessions' },
      { type: 'h1',   text: 'Fields' },
      { type: 'body',  text: 'programName — must match the program name parents are enrolled in (e.g. NOVA Math)' },
      { type: 'body',  text: 'programId — optional Wix Programs item ID if you have it' },
      { type: 'body',  text: 'title — session label (e.g. Week 3 practice)' },
      { type: 'body',  text: 'startAt / endAt — date and time' },
      { type: 'body',  text: 'location — room or place' },
      { type: 'body',  text: 'instructorName — optional' },
      { type: 'body',  text: 'grades — optional, e.g. 6,7' },
      { type: 'body',  text: 'active — set true to show' },
      { type: 'h1',   text: 'Steps' },
      { type: 'body',  text: '1. Content Manager → Program Sessions → + New Item' },
      { type: 'body',  text: '2. Fill programName, title, startAt, endAt, location' },
      { type: 'body',  text: '3. Set active = true → Save' },
      { type: 'body',  text: '4. Parents only see sessions for programs their students are enrolled in' },
      { type: 'h1',   text: 'Tip' },
      { type: 'body',  text: 'Keep programName spelling consistent with Enrollments / Programs so the portal can match them.' },
    ],
  },
  {
    folder: 'wix',
    title: '16 - How to Send Parent Messages (Portal Inbox)',
    content: [
      { type: 'title', text: 'How to Send Parent Messages' },
      { type: 'body',  text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'body',  text: 'Messages appear in the member portal under Calendar & Messages → Messages.' },
      { type: 'h1',   text: 'Where to edit' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Parent Messages' },
      { type: 'h1',   text: 'Fields' },
      { type: 'body',  text: 'fromName — e.g. Coach Rivera' },
      { type: 'body',  text: 'subject — short headline' },
      { type: 'body',  text: 'body — message text' },
      { type: 'body',  text: 'programName — optional context line' },
      { type: 'body',  text: 'sentAt — when it should sort as sent' },
      { type: 'body',  text: 'active — true to show' },
      { type: 'h2',   text: 'Audience targeting' },
      { type: 'body',  text: 'audience = all → every logged-in parent' },
      { type: 'body',  text: 'audience = grade → use with grade targeting if configured' },
      { type: 'body',  text: 'OR set parentEmail to a specific parent login email' },
      { type: 'body',  text: 'OR set studentId to target one student\'s family' },
      { type: 'h1',   text: 'Steps' },
      { type: 'body',  text: '1. + New Item in Parent Messages' },
      { type: 'body',  text: '2. Write fromName, subject, body; set sentAt and active = true' },
      { type: 'body',  text: '3. Choose audience (start with all for school-wide notes)' },
      { type: 'body',  text: '4. Save → parent refreshes portal Messages tab' },
    ],
  },
  {
    folder: 'wix',
    title: '17 - How to Manage Students, Enrollments, and Payments',
    content: [
      { type: 'title', text: 'How to Manage Students, Enrollments, and Payments' },
      { type: 'body',  text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'body',  text: 'These CMS collections power what parents see in My Students, Calendar, and Store & Purchases. Prefer letting parents add students themselves in the portal when possible.' },
      { type: 'h1',   text: 'Students' },
      { type: 'body',  text: 'Content Manager → Students' },
      { type: 'body',  text: 'Key fields: firstName, lastName, grade, parentEmail (must match the parent\'s login email), membershipTier, storeCardBalance' },
      { type: 'body',  text: 'parentEmail is how the portal finds "my kids." Typos = empty student list.' },
      { type: 'h1',   text: 'Enrollments' },
      { type: 'body',  text: 'Content Manager → Enrollments' },
      { type: 'body',  text: 'Links a student to a program (name/status/amount). Drives calendar placeholders and purchase history.' },
      { type: 'h1',   text: 'Payments' },
      { type: 'body',  text: 'Content Manager → Payments (and related order sync)' },
      { type: 'body',  text: 'Shows recent buys in Store & Purchases. Many rows arrive from CheddarUp / Wix checkout — do not invent duplicate rows unless correcting a known miss.' },
      { type: 'h1',   text: 'Memberships' },
      { type: 'body',  text: 'Paid Ruby/Supreme usually sync from Wix orders (webhook/cron). If a paid parent still shows as free, check Students.membershipTier and Memberships for that email, then ask Rob if sync failed.' },
      { type: 'h1',   text: 'Do not' },
      { type: 'body',  text: 'Delete live student rows casually — recreate carefully with the same parentEmail if needed.' },
    ],
  },
  {
    folder: 'wix',
    title: '18 - How to Edit Nav and Footer Links',
    content: [
      { type: 'title', text: 'How to Edit Nav and Footer Links' },
      { type: 'body',  text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'h1',   text: 'Where to edit' },
      { type: 'body',  text: 'Wix Dashboard → Content Manager → Nav Links (or Navigation Links)' },
      { type: 'h1',   text: 'What you can change' },
      { type: 'body',  text: 'Label text, link URL (href), order, and visibility/active flags for navbar and footer quick links.' },
      { type: 'h1',   text: 'Steps' },
      { type: 'body',  text: '1. Open Nav Links' },
      { type: 'body',  text: '2. Edit label or href, or set inactive to hide' },
      { type: 'body',  text: '3. Adjust sort/order field if present → Save' },
      { type: 'body',  text: '4. Hard-refresh the site after ~5 minutes' },
      { type: 'h1',   text: 'Needs Rob (code deploy)' },
      { type: 'body',  text: 'Adding an entirely new page/route that does not exist yet, or changing layout of the navbar itself.' },
    ],
  },
  {
    folder: 'wix',
    update: true,
    title: '19 - How to Manage Volunteer Opportunities and Meeting Minutes',
    content: [
      { type: 'title', text: 'How to Manage Volunteer Opportunities and Meeting Minutes' },
      { type: 'body',  text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'h1',   text: 'Volunteer Opportunities' },
      { type: 'body',  text: 'Content Manager → Volunteer Opportunities' },
      { type: 'body',  text: 'One collection drives BOTH:' },
      { type: 'body',  text: '• The “Ways to Get Involved” list on /volunteer' },
      { type: 'body',  text: '• The “I’d like to help with” dropdown on the volunteer sign-up form' },
      { type: 'body',  text: 'Fields: title (this is what appears in the dropdown), description, commitment, sortOrder, active = true.' },
      { type: 'h1',   text: 'How to add a new opportunity' },
      { type: 'body',  text: '1. Content Manager → Volunteer Opportunities → + New Item' },
      { type: 'body',  text: '2. Set title (short — parents pick this in the form), description, commitment' },
      { type: 'body',  text: '3. Set sortOrder (lower numbers appear first) and active = true → Save' },
      { type: 'body',  text: '4. After ~5 minutes, confirm it appears in the list AND the form dropdown on /volunteer' },
      { type: 'h1',   text: 'How to hide an opportunity' },
      { type: 'body',  text: 'Set active = false (do not delete if you may reuse it). It disappears from the page and the form.' },
      { type: 'h1',   text: 'Meeting Minutes' },
      { type: 'body',  text: 'Content Manager → Meeting Minutes' },
      { type: 'body',  text: 'Add date, title, link to PDF/Doc, and active. They appear on /meetings.' },
      { type: 'h1',   text: 'Steps (minutes)' },
      { type: 'body',  text: '1. + New Item → fill fields → active = true → Save' },
      { type: 'body',  text: '2. Confirm on staging after a short wait' },
    ],
  },
  {
    folder: 'wix',
    title: '21 - How to Show a New Store or Spirit Product',
    content: [
      { type: 'title', text: 'How to Show a New Store or Spirit Product' },
      { type: 'body',  text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'body',  text: 'Creating a product in Wix Stores is not enough — you must also add its Product ID to Site Settings so the website knows which Catalog items belong on /store vs /spirit-wear. Board members can do both steps. No code deploy.' },
      { type: 'h1',   text: 'Why there is a list' },
      { type: 'body',  text: 'Wix Catalog holds every product (store snacks, spirit wear, memberships, store cards, demos). The site only displays products whose UUIDs are listed in Site Settings.' },
      { type: 'h1',   text: 'Which Site Settings key?' },
      { type: 'body',  text: 'storeProductIds — school store (/store) and fundraising “store” totals' },
      { type: 'body',  text: 'spiritWearProductIds — spirit wear (/spirit-wear) and fundraising “spirit wear” totals' },
      { type: 'h1',   text: 'Steps' },
      { type: 'body',  text: '1. Wix Dashboard → Store → Products → create (or open) the product → Publish' },
      { type: 'body',  text: '2. Copy the Product ID (a UUID like 90ae23f7-51f4-438d-869c-1fbb28afd381). Tip: open the product URL or use Catalog item details / developer info if the ID is not obvious on the edit screen.' },
      { type: 'body',  text: '3. Content Manager → Site Settings → open storeProductIds or spiritWearProductIds' },
      { type: 'body',  text: '4. Paste the UUID at the end of the value, preceded by a comma (no spaces required). Example: …old-id,new-id-here' },
      { type: 'body',  text: '5. Save. Wait up to ~5 minutes. Hard-refresh the store or spirit-wear page.' },
      { type: 'h1',   text: 'To hide a product without deleting it' },
      { type: 'body',  text: 'Remove its UUID from the Site Settings list (or set the product Draft / Out of Stock). Prefer Out of Stock when you still sell it at the window later.' },
      { type: 'h1',   text: 'Checklist' },
      { type: 'body',  text: '☐ Product published in Stores' },
      { type: 'body',  text: '☐ Correct Site Settings key updated' },
      { type: 'body',  text: '☐ Visible on staging after refresh' },
      { type: 'h1',   text: 'Related guides' },
      { type: 'body',  text: '08 / 08b — day-to-day inventory, prices, deals' },
      { type: 'body',  text: '12b — store card amounts (different Site Settings keys)' },
    ],
  },
  {
    folder: 'wix',
    title: '20 - WhatsApp Groups Are Members Only',
    content: [
      { type: 'title', text: 'WhatsApp Groups Are Members Only' },
      { type: 'body',  text: 'SHMS PTO — Wix Admin Guide  |  Last updated: July 2026' },
      { type: 'body',  text: 'Grade WhatsApp invite links are hidden from the public site. They appear only after a parent logs in with a free or paid member account (announcement bar, footer, and member portal).' },
      { type: 'h1',   text: 'Where links are stored' },
      { type: 'body',  text: 'Content Manager → Site Settings' },
      { type: 'body',  text: 'announcement6thLink · announcement7thLink · announcement8thLink' },
      { type: 'body',  text: 'announcementText — bar wording (shown only to logged-in members when WhatsApp links are configured)' },
      { type: 'body',  text: 'announcementEnabled — master on/off' },
      { type: 'h1',   text: 'How to update a group link' },
      { type: 'body',  text: '1. Site Settings → find announcement6thLink (or 7th / 8th)' },
      { type: 'body',  text: '2. Paste the WhatsApp invite URL → Save' },
      { type: 'body',  text: '3. Log in as a test parent on staging and confirm the link appears' },
      { type: 'h1',   text: 'What visitors see' },
      { type: 'body',  text: 'Nothing WhatsApp-related in the header or footer — by design. Do not put invite URLs in public Page Content heroes.' },
    ],
  },
  {
    folder: 'techops',
    update: true,
    title: '09 - Things That Require a Code Deploy (Rob) v3',
    content: [
      { type: 'title', text: 'Things That Require a Code Deploy' },
      { type: 'body',  text: 'SHMS PTO Platform — Tech Ops Reference  |  Last updated: July 2026' },
      { type: 'body',  text: 'Board members can change most marketing, catalog visibility, and portal copy in Wix. Only the items below need Rob + a Vercel deploy.' },
      { type: 'h1',   text: 'Still needs a deploy' },
      { type: 'body',  text: '• Layout, colors, fonts, brand-new page routes that do not exist yet' },
      { type: 'body',  text: '• OAuth / login behavior, cookies, middleware' },
      { type: 'body',  text: '• Checkout glue, webhooks, cron, Square gift-card integration' },
      { type: 'body',  text: '• New CMS collections or new fields the frontend does not read yet' },
      { type: 'body',  text: '• Fundraising school-year date window / dance–NOVA ticket product maps (still in code)' },
      { type: 'body',  text: '• Env vars / domain / DNS cutover' },
      { type: 'h1',   text: 'Does NOT need a deploy anymore' },
      { type: 'body',  text: '• Showing a new store or spirit product (Site Settings storeProductIds / spiritWearProductIds — see doc 21)' },
      { type: 'body',  text: '• Home volunteer + community blocks (Page Content home-volunteer / home-community)' },
      { type: 'body',  text: '• Volunteer form dropdown options (Volunteer Opportunities — same as the ways-to-help list)' },
      { type: 'body',  text: '• Page heroes and marketing copy (Page Content)' },
      { type: 'body',  text: '• Member portal labels and free/paid blurbs (portal + portal-hub)' },
      { type: 'body',  text: '• Program session dates and parent messages' },
      { type: 'body',  text: '• Announcement / WhatsApp URLs, grades, contact details (Site Settings)' },
      { type: 'body',  text: '• Programs, board, FAQ, events, nav labels, volunteer opportunities, minutes' },
      { type: 'h1',   text: 'To request a change' },
      { type: 'body',  text: 'Email Rob: gregory.robert.c@gmail.com — include page, desired change, and priority.' },
    ],
  },

  // ── Index doc ─────────────────────────────────────────────────────────────
  {
    folder: 'root',
    update: true,
    title: '00 - START HERE — Platform Docs Index (July 2026)',
    content: [
      { type: 'title', text: 'SHMS PTO Platform Docs' },
      { type: 'body',  text: 'Last updated: July 15, 2026  |  Questions? Email gregory.robert.c@gmail.com' },
      { type: 'body',  text: 'Staging site: https://shmspto.vercel.app' },
      { type: 'h1',   text: 'Wix Admin Guides (board members)' },
      { type: 'body',  text: '01–08 — Board, Programs, Membership tiers, Announcement, Fundraising, FAQ, Events, Spirit Wear / Store inventory (use latest v2 titles; July 2026 updates cover Site Settings product lists)' },
      { type: 'body',  text: '12b - How to Manage the Store Card' },
      { type: 'body',  text: '13 - How to Edit Page Heroes and Marketing Copy (includes home-volunteer + home-community)' },
      { type: 'body',  text: '14 - How to Edit Member Portal Copy' },
      { type: 'body',  text: '15 - How to Add Program Session Dates (Calendar)' },
      { type: 'body',  text: '16 - How to Send Parent Messages (Portal Inbox)' },
      { type: 'body',  text: '17 - How to Manage Students, Enrollments, and Payments' },
      { type: 'body',  text: '18 - How to Edit Nav and Footer Links' },
      { type: 'body',  text: '19 - How to Manage Volunteer Opportunities and Meeting Minutes (form dropdown included)' },
      { type: 'body',  text: '20 - WhatsApp Groups Are Members Only' },
      { type: 'body',  text: '21 - How to Show a New Store or Spirit Product (Site Settings allowlists)' },
      { type: 'h1',   text: 'Tech Ops (Rob)' },
      { type: 'body',  text: '09 - Things That Require a Code Deploy (use v3 — updated July 2026)' },
      { type: 'body',  text: '10 - Environment Variables Reference' },
      { type: 'body',  text: '11 - Money Minder Manual Sync (Interim)' },
      { type: 'h1',   text: 'CheddarUp' },
      { type: 'body',  text: '12 - CheddarUp Setup Guide' },
      { type: 'h1',   text: 'Who Can Edit What' },
      { type: 'body',  text: 'Board with Wix access: docs 01–08, 12b, 13–21' },
      { type: 'body',  text: 'Rob only (code deploy): doc 09' },
      { type: 'body',  text: 'Treasurer / Rob: docs 10–12' },
      { type: 'h1',   text: 'Rule of thumb' },
      { type: 'body',  text: 'If it is words, links, dates, products, or CMS rows → edit in Wix Content Manager / Site Settings. If it is layout, login plumbing, or Square → ask Rob.' },
    ],
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 SHMS PTO Platform Docs — Google Drive Creator\n')

  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docs  = google.docs({ version: 'v1', auth })

  // Create folder structure
  console.log('📁 Setting up folder structure...')
  const rootId      = await findOrCreateFolder(drive, 'SHMS PTO Platform Docs', null)
  const wixId       = await findOrCreateFolder(drive, 'Wix Admin Guides', rootId)
  const techopsId   = await findOrCreateFolder(drive, 'Tech Ops', rootId)
  const cheddarupId = await findOrCreateFolder(drive, 'CheddarUp', rootId)

  const folderMap = { root: rootId, wix: wixId, techops: techopsId, cheddarup: cheddarupId }

  // Create all docs
  console.log('\n📝 Creating docs...')
  const created = []
  for (const doc of DOCS) {
    const id = await createDoc(docs, drive, doc.title, folderMap[doc.folder], doc.content, {
      updateIfExists: Boolean(doc.update),
    })
    created.push({ title: doc.title, id })
  }

  console.log('\n✅ Done!')
  console.log(`\n📂 Root folder: https://drive.google.com/drive/folders/${rootId}`)
  console.log('\nAll docs:')
  for (const d of created) {
    console.log(`  ${d.title}`)
    console.log(`  https://docs.google.com/document/d/${d.id}\n`)
  }
}

// ─── Cleanup: trash old v1 docs ───────────────────────────────────────────────
// Run with: node scripts/create-pto-docs.js --cleanup

async function cleanupOldDocs() {
  console.log('\n🗑️  Trashing old v1 docs...\n')
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  // Prefer latest v2/v3 titles. Trash superseded copies that still say “email Rob for product IDs”.
  const OLD_TITLES = [
    '01 - How to Manage Board Members',
    '02 - How to Add or Edit Programs',
    '03 - How to Update Membership Tiers and Perks',
    '04 - How to Update the Announcement Bar',
    '05 - How to Update Fundraising Goals',
    '06 - How to Manage the FAQ',
    '07 - How to Manage Events',
    '08 - How to Manage Spirit Wear',
    '08b - How to Manage the School Store Inventory',
    '09 - Things That Require a Code Deploy (Rob)',
    '10 - Environment Variables Reference (Rob)',
    '11 - Money Minder Manual Sync (Interim)',
    '12 - CheddarUp Setup Guide (Installments and Peer Fundraising)',
    '12b - How to Manage the Store Card (CheddarUp)',
  ]

  for (const title of OLD_TITLES) {
    const q = `name='${title}' and mimeType='application/vnd.google-apps.document' and trashed=false`
    const res = await drive.files.list({ q, fields: 'files(id,name)', spaces: 'drive' })
    if (res.data.files.length === 0) {
      console.log(`  – Not found: ${title}`)
      continue
    }
    for (const file of res.data.files) {
      await drive.files.update({ fileId: file.id, requestBody: { trashed: true } })
      console.log(`  🗑️  Trashed: ${file.name}`)
    }
  }
  console.log('\n✅ Cleanup done.')
}

if (process.argv.includes('--cleanup')) {
  cleanupOldDocs().catch(err => { console.error(err.message); process.exit(1) })
} else {
  main().catch(err => { console.error('Error:', err.message); process.exit(1) })
}
