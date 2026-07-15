/**
 * wix-login.js
 *
 * Opens a visible browser, lets you log in manually, then automatically
 * takes all dashboard screenshots in the SAME browser session (no restore needed).
 *
 * Usage: node scripts/wix-login.js
 */

const { chromium } = require('playwright')
const path = require('path')
const os = require('os')
const fs = require('fs')
const readline = require('readline')

const SESSION_PATH = path.join(os.homedir(), '.wix-session')
const OUT_DIR = path.join(__dirname, 'screenshots')
const SITE_ID = '509fda24-8dbf-43c6-aa74-df9f8b63c388'
const BASE = `https://manage.wix.com/dashboard/${SITE_ID}`

const PAGES = [
  { name: '01-board-members',    url: `${BASE}/cms/BoardMembers`,   doc: '01 - How to Manage Board Members v2' },
  { name: '02-programs',         url: `${BASE}/cms/Programs`,        doc: '02 - How to Add or Edit Programs v2' },
  { name: '03-membership-tiers', url: `${BASE}/cms/MembershipTiers`, doc: '03 - How to Update Membership Tiers and Perks v2' },
  { name: '04-site-settings',    url: `${BASE}/cms/SiteSettings`,    doc: '04 - How to Update the Announcement Bar v2' },
  { name: '05-site-settings',    url: `${BASE}/cms/SiteSettings`,    doc: '05 - How to Update Fundraising Goals v2' },
  { name: '06-faq-items',        url: `${BASE}/cms/FAQItems`,        doc: '06 - How to Manage the FAQ v2' },
  { name: '07-events',           url: `${BASE}/events`,              doc: '07 - How to Manage Events v2' },
  { name: '08-spirit-wear',      url: `${BASE}/store/products`,      doc: '08 - How to Manage Spirit Wear v2' },
  { name: '08b-store-inventory', url: `${BASE}/store/products`,      doc: '08b - How to Manage the School Store Inventory v2' },
  { name: '12b-store-card',      url: `${BASE}/store/products`,      doc: '12b - How to Manage the Store Card' },
]

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('\n🌐 Opening browser for Wix login...\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ['--disable-blink-features=AutomationControlled'],
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  })

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  const page = await context.newPage()
  await page.goto(`https://manage.wix.com/dashboard/${SITE_ID}/home`)

  console.log('👉 Log in to Wix in the browser window that just opened.')
  console.log('   Make sure you land on the dashboard home page before pressing Enter.')
  console.log('\nPress ENTER here when you are fully logged in...')

  await new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('', () => { rl.close(); resolve() })
  })

  // Save session for reference (not used for screenshots — same context)
  await context.storageState({ path: SESSION_PATH })
  console.log(`\n✅ Session saved to ${SESSION_PATH}`)

  // Take screenshots in the same live browser session
  console.log('\n📸 Taking screenshots in the same session...\n')
  const results = []

  for (const p of PAGES) {
    const filePath = path.join(OUT_DIR, `${p.name}.png`)

    if (fs.existsSync(filePath)) {
      console.log(`  ✓ Already captured: ${p.name}`)
      results.push({ ...p, filePath })
      continue
    }

    try {
      console.log(`  📸 Capturing: ${p.name}`)
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2500)

      if (page.url().includes('signin') || page.url().includes('login')) {
        console.log(`  ⚠️  Got redirected to login — stopping`)
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

  const manifest = path.join(OUT_DIR, 'manifest.json')
  fs.writeFileSync(manifest, JSON.stringify(results, null, 2))
  console.log(`\n✅ All done. Manifest saved to ${manifest}`)
  console.log(`\nNext step: node scripts/insert-screenshots.js\n`)
}

main().catch(err => { console.error(err.message); process.exit(1) })
