/**
 * update-image-guide.js
 *
 * Rewrites the "SHMS PTO — Image Upload Guide" Google Doc with specs verified
 * against the current frontend code (July 2026). Covers every image on the
 * site, who can change it (Wix vs dev), exact upload sizes, and how the site
 * crops each one.
 *
 * Run: node scripts/update-image-guide.js
 */

const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')
const DOC_TITLE = 'SHMS PTO — Image Upload Guide'

const CONTENT = [
  { type: 'title', text: 'SHMS PTO — Image Upload Guide' },
  { type: 'body', text: 'Last updated: July 2026 — verified against the live site code.' },
  { type: 'body', text: 'This document lists every image on the site, what size to upload, and how to change it. Most images are board-manageable through the Wix dashboard. Images marked DEV ONLY are hardcoded — you cannot add these through the Wix dashboard; ask Rob.' },

  { type: 'h1', text: 'General Rules (all images)' },
  { type: 'body', text: '• File format: JPG or PNG. Keep files under 10MB (Wix accepts larger, but smaller loads faster for parents on phones).' },
  { type: 'body', text: '• Every image on the site uses "cover" cropping: your photo fills its box and any overflow is cropped from the edges, centered. Nothing gets stretched or distorted — but keep the subject centered so crops look right.' },
  { type: 'body', text: '• Don\'t bake text into photos — titles and captions come from the CMS and stay readable on all screen sizes.' },
  { type: 'body', text: '• Upload photos to Wix Media Manager first when a CMS field needs a URL: Wix Dashboard → Media (or the upload icon inside any image field) → Upload → click the file → copy the URL.' },

  { type: 'h1', text: '1. Store Product Image (grid + Deals Strip) — Wix Stores' },
  { type: 'body', text: 'What it is: Product photos in the School Store on /store — the main grid and the "Deal of the Week" strip use the same photo.' },
  { type: 'body', text: 'Upload size: 500 × 500 px minimum, 800 × 800 px recommended (crisp on retina screens). 1:1 square.' },
  { type: 'body', text: 'How it displays: thumbnails are short and wide — 96px tall in the grid, 112px tall in the deals strip, full card width. A square upload is center-cropped top and bottom, so keep the product centered in the frame. A non-square image also works; it just crops from the center.' },
  { type: 'body', text: 'Tip: for candy/snack packaging, a clean white or light background at 800×800 looks the most consistent across the grid.' },
  { type: 'body', text: 'How to change in Wix:' },
  { type: 'body', text: '    1. Wix Dashboard → Store → Products' },
  { type: 'body', text: '    2. Open the store product' },
  { type: 'body', text: '    3. Click Add Media and upload or replace the photo' },
  { type: 'body', text: '    4. Save — live within ~5 minutes' },
  { type: 'body', text: 'If no image is set, a category emoji shows instead. To feature a product in the Deals Strip, set a Ribbon on the product (see doc 08b).' },

  { type: 'h1', text: '2. Spirit Wear Product Image — Wix Stores' },
  { type: 'body', text: 'What it is: The product photo on /spirit-wear. Shows the item clearly — shirt, hoodie, etc. If no image is set, a shirt emoji appears.' },
  { type: 'body', text: 'Upload size: 1080 × 1080 px (1:1 square).' },
  { type: 'body', text: 'How it displays: 192px tall, full card width (2–4 cards per row) — wider than tall, center-cropped. Center the garment.' },
  { type: 'body', text: 'How to change in Wix:' },
  { type: 'body', text: '    1. Wix Dashboard → Store → Products' },
  { type: 'body', text: '    2. Open the spirit wear product' },
  { type: 'body', text: '    3. Click Add Media and upload the product photo' },
  { type: 'body', text: '    4. Save' },

  { type: 'h1', text: '3. Board Member Photo — Content Manager' },
  { type: 'body', text: 'What it is: Headshot on each /board card. Shows as a true square. Initials appear if no photo is set.' },
  { type: 'body', text: 'Upload size: 800 × 800 px (1:1 square). 500 × 500 minimum.' },
  { type: 'body', text: 'How to change in Wix:' },
  { type: 'body', text: '    1. Wix Dashboard → Content Manager → BoardMembers collection' },
  { type: 'body', text: '    2. Open the board member record' },
  { type: 'body', text: '    3. Upload to Media Manager, copy the URL, paste into the photoUrl field' },
  { type: 'body', text: '    4. Save' },

  { type: 'h1', text: '4. Program Card Image — Content Manager' },
  { type: 'body', text: 'What it is: Optional photo at the top of each program card on /programs. A green accent bar shows if no image is set.' },
  { type: 'body', text: 'Upload size: 1280 × 720 px (16:9).' },
  { type: 'body', text: 'How it displays: 192px tall, full card width (about 2:1) — a 16:9 upload loses a little top and bottom.' },
  { type: 'body', text: 'How to change in Wix:' },
  { type: 'body', text: '    1. Wix Dashboard → Content Manager → Programs collection' },
  { type: 'body', text: '    2. Open the program → upload into the image field' },
  { type: 'body', text: '    3. Save' },

  { type: 'h1', text: '5. Event Card Image — Wix Events' },
  { type: 'body', text: 'What it is: Optional photo at the top of each event card on /events and the homepage events preview. Green accent bar if not set.' },
  { type: 'body', text: 'Upload size: 1280 × 720 px (16:9). Same display crop as program cards.' },
  { type: 'body', text: 'How to change in Wix:' },
  { type: 'body', text: '    1. Wix Dashboard → Events' },
  { type: 'body', text: '    2. Open the event → Media section → upload the photo' },
  { type: 'body', text: '    3. Save' },

  { type: 'h1', text: '6. Home Volunteer Section Photo — Site Settings (board-manageable)' },
  { type: 'body', text: 'What it is: The photo next to the "Volunteer With Us" text on the homepage, with the parent quote overlaid at the bottom.' },
  { type: 'body', text: 'Upload size: 1200 × 900 px (4:3). 600 × 450 minimum. Displays at exactly 4:3, so a 4:3 upload is never cropped.' },
  { type: 'body', text: 'How to change in Wix (no code deploy):' },
  { type: 'body', text: '    1. Upload the photo to Wix Media Manager and copy its URL' },
  { type: 'body', text: '    2. Content Manager → Site Settings → key homeVolunteerImageUrl → paste the URL as the value' },
  { type: 'body', text: '    3. Also update homeVolunteerImageAlt with a short description (accessibility)' },
  { type: 'body', text: '    4. Save — live within ~5 minutes' },
  { type: 'body', text: 'The quote text on the photo is edited separately in Page Content, row home-volunteer (see doc 13).' },

  { type: 'h1', text: '7. Community Banner Photo — Site Settings (board-manageable)' },
  { type: 'body', text: 'What it is: The wide full-width photo band near the bottom of the homepage with a dark overlay and headline on top.' },
  { type: 'body', text: 'Upload size: 1440 × 400 px minimum (very wide and short — about 3.6:1). Wider crops like 1920 × 500 also work.' },
  { type: 'body', text: 'How it displays: full browser width, 192–288px tall depending on screen size. Faces and subjects should sit in the vertical middle of the photo.' },
  { type: 'body', text: 'How to change in Wix (no code deploy):' },
  { type: 'body', text: '    1. Upload the photo to Wix Media Manager and copy its URL' },
  { type: 'body', text: '    2. Content Manager → Site Settings → key homeCommunityImageUrl → paste the URL' },
  { type: 'body', text: '    3. Update homeCommunityImageAlt with a short description' },
  { type: 'body', text: '    4. Save — live within ~5 minutes' },
  { type: 'body', text: 'The overlay headline is edited in Page Content, row home-community (title field).' },

  { type: 'h1', text: '8. Hero Images (top + bottom) — ⚠️ DEV ONLY' },
  { type: 'body', text: 'What they are: The two stacked photos on the right side of the homepage hero. Currently stock Unsplash photos.' },
  { type: 'body', text: 'Sizes: top 600 × 400 px (3:2), bottom 600 × 300 px (2:1).' },
  { type: 'body', text: '⚠️ DEV ONLY — hardcoded in hero.tsx. Send Rob the photos and he will update and deploy.' },

  { type: 'h1', text: '9. Site Logo — ⚠️ DEV ONLY' },
  { type: 'body', text: 'What it is: The SHMS stingray logo in the navbar and footer on every page.' },
  { type: 'body', text: 'Size: 256 × 256 px minimum, square PNG with transparent background.' },
  { type: 'body', text: '⚠️ DEV ONLY — static file at /public/shms-logo.png. A developer must replace the file and deploy. Only change if rebranding.' },

  { type: 'h1', text: '10. Member Profile Photo — parents manage their own' },
  { type: 'body', text: 'What it is: The small circle photo in the member portal. Parents set it on their own Wix member account; the board does not manage these. Initials show automatically if unset.' },

  { type: 'h1', text: 'Quick Reference Table' },
  { type: 'body', text: 'Store product — 800×800 square — Store → Products → Add Media' },
  { type: 'body', text: 'Spirit wear — 1080×1080 square — Store → Products → Add Media' },
  { type: 'body', text: 'Board headshot — 800×800 square — Content Manager → BoardMembers → photoUrl' },
  { type: 'body', text: 'Program card — 1280×720 (16:9) — Content Manager → Programs → image field' },
  { type: 'body', text: 'Event card — 1280×720 (16:9) — Events → Media' },
  { type: 'body', text: 'Home volunteer photo — 1200×900 (4:3) — Site Settings → homeVolunteerImageUrl' },
  { type: 'body', text: 'Community banner — 1440×400 (wide) — Site Settings → homeCommunityImageUrl' },
  { type: 'body', text: 'Hero photos — 600×400 / 600×300 — DEV ONLY (Rob)' },
  { type: 'body', text: 'Logo — 256×256 PNG — DEV ONLY (Rob)' },

  { type: 'h1', text: 'Wix Help Articles' },
  { type: 'body', text: 'Uploading media: https://support.wix.com/en/article/wix-media-uploading-media-to-the-media-manager' },
  { type: 'body', text: 'About the Media Manager: https://support.wix.com/en/article/wix-media-about-the-media-manager' },
  { type: 'body', text: 'Adding a product (media step): https://support.wix.com/en/article/wix-stores-adding-a-physical-product' },
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

function buildRequests(blocks) {
  const requests = []
  let index = 1
  for (const block of blocks) {
    const text = block.text + '\n'
    requests.push({ insertText: { location: { index }, text } })
    const style =
      block.type === 'title' ? 'TITLE' :
      block.type === 'h1' ? 'HEADING_1' :
      block.type === 'h2' ? 'HEADING_2' : 'NORMAL_TEXT'
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

async function main() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docs = google.docs({ version: 'v1', auth })

  const res = await drive.files.list({
    q: `name='${DOC_TITLE}' and mimeType='application/vnd.google-apps.document' and trashed=false`,
    fields: 'files(id,name)', spaces: 'drive',
  })
  if (!res.data.files.length) throw new Error('Doc not found: ' + DOC_TITLE)
  const docId = res.data.files[0].id

  const doc = await docs.documents.get({ documentId: docId })
  const body = doc.data.body?.content ?? []
  const endIndex = body.length ? body[body.length - 1].endIndex : 1
  const requests = []
  if (endIndex > 2) {
    requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } })
  }
  requests.push(...buildRequests(CONTENT))
  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } })

  console.log('Updated:', DOC_TITLE)
  console.log('  https://docs.google.com/document/d/' + docId)
}

main().catch((err) => {
  console.error('Error:', err.errors ?? err.message ?? err)
  process.exit(1)
})
