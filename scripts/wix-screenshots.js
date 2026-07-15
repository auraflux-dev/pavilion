/**
 * wix-screenshots.js
 *
 * Takes screenshots of each Wix dashboard page needed for the help docs.
 * Uses the saved session from wix-login.js — no credentials needed.
 *
 * Usage: node scripts/wix-screenshots.js
 *
 * Output: screenshots saved to scripts/screenshots/
 * Then run: node scripts/insert-screenshots.js to upload + insert into Google Docs
 */

const { chromium } = require('playwright')
const path = require('path')
const os = require('os')
const fs = require('fs')

const SESSION_PATH = path.join(os.homedir(), '.wix-session')
const OUT_DIR = path.join(__dirname, 'screenshots')
const SITE_ID = '509fda24-8dbf-43c6-aa74-df9f8b63c388'
const BASE = `https://manage.wix.com/dashboard/${SITE_ID}`

const PAGES = [
  { name: '01-board-members',     url: `${BASE}/cms/BoardMembers`,    waitFor: 'Board Members',    doc: '01 - How to Manage Board Members v2' },
  { name: '02-programs',          url: `${BASE}/cms/Programs`,         waitFor: 'Programs',         doc: '02 - How to Add or Edit Programs v2' },
  { name: '03-membership-tiers',  url: `${BASE}/cms/MembershipTiers`,  waitFor: 'Membership',       doc: '03 - How to Update Membership Tiers and Perks v2' },
  { name: '04-site-settings',     url: `${BASE}/cms/SiteSettings`,     waitFor: 'Site',             doc: '04 - How to Update the Announcement Bar v2' },
  { name: '05-site-settings',     url: `${BASE}/cms/SiteSettings`,     waitFor: 'Site',             doc: '05 - How to Update Fundraising Goals v2' },
  { name: '06-faq-items',         url: `${BASE}/cms/FAQItems`,         waitFor: 'FAQ',              doc: '06 - How to Manage the FAQ v2' },
  { name: '07-events',            url: `${BASE}/events`,               waitFor: 'Event',            doc: '07 - How to Manage Events v2' },
  { name: '08-spirit-wear',       url: `${BASE}/store/products`,       waitFor: 'Product',          doc: '08 - How to Manage Spirit Wear v2' },
  { name: '08b-store-inventory',  url: `${BASE}/store/products`,       waitFor: 'Product',          doc: '08b - How to Manage the School Store Inventory v2' },
  { name: '12b-store-card',       url: `${BASE}/store/products`,       waitFor: 'Product',          doc: '12b - How to Manage the Store Card' },
]

async function main() {
  if (!fs.existsSync(SESSION_PATH)) {
    console.error('❌ No session found. Run: node scripts/wix-login.js first')
    process.exit(1)
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('\n📸 Taking Wix dashboard screenshots...\n')

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const context = await browser.newContext({
    storageState: SESSION_PATH,
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  const page = await context.newPage()

  const results = []

  for (const p of PAGES) {
    const filePath = path.join(OUT_DIR, `${p.name}.png`)

    // Skip if already captured (same URL = same screenshot for 04/05 and 08/08b/12b)
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ Already captured: ${p.name}`)
      results.push({ ...p, filePath })
      continue
    }

    try {
      console.log(`  📸 Capturing: ${p.name}`)
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000) // let dashboard render

      // Check if we got redirected to login
      if (page.url().includes('signin') || page.url().includes('login')) {
        console.log(`  ⚠️  Session expired — re-run wix-login.js`)
        break
      }

      await page.screenshot({ path: filePath, fullPage: false })
      console.log(`  ✅ Saved: ${filePath}`)
      results.push({ ...p, filePath })
    } catch (err) {
      console.log(`  ⚠️  Failed: ${p.name} — ${err.message}`)
      results.push({ ...p, filePath: null, error: err.message })
    }
  }

  await browser.close()

  // Save results manifest for insert-screenshots.js
  const manifest = path.join(OUT_DIR, 'manifest.json')
  fs.writeFileSync(manifest, JSON.stringify(results, null, 2))
  console.log(`\n✅ Done. Manifest saved to ${manifest}`)
  console.log(`\nNext step: node scripts/insert-screenshots.js\n`)
}

main().catch(err => { console.error(err.message); process.exit(1) })
