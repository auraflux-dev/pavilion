/**
 * Capture Staff → Newsletter help screenshots (action crops).
 *
 * Default (Cursor browser logged in):
 *   node scripts/capture-staff-newsletter-shots.mjs --cursor
 *
 * Or saved Playwright session:
 *   node scripts/capture-staff-newsletter-shots.mjs --login
 *   node scripts/capture-staff-newsletter-shots.mjs
 *
 * Output:
 *   frontend/public/help/staff-newsletter/*.png
 *   scripts/shots/39-staff-newsletter-*.png (Drive doc parity)
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SESSION_PATH = path.join(process.env.HOME || '', '.shms-staff-session')
const BASE_URL = (process.env.SHOT_BASE_URL || 'https://www.shmspto.org').replace(/\/$/, '')
const OUT_PUBLIC = path.join(ROOT, 'frontend/public/help/staff-newsletter')
const OUT_SHOTS = path.join(ROOT, 'scripts/shots')

const SHOTS = [
  {
    file: '01-templates-canva.png',
    shotFile: '39-staff-newsletter-templates.png',
    selector: '#newsletter-templates',
    prepare: async (page) => {
      await page.locator('#newsletter-templates').scrollIntoViewIfNeeded()
    },
  },
  {
    file: '02-test-send.png',
    shotFile: '39-staff-newsletter-test-send.png',
    selector: '[data-help-shot="test-send"]',
    fallback: '#member-newsletter div.rounded-lg:has(p:text-is("Test send (board preview)"))',
  },
  {
    file: '03-newsletter-type.png',
    shotFile: '39-staff-newsletter-type.png',
    selector: '[data-help-shot="newsletter-type"]',
    fallback: '#member-newsletter label:has-text("Who this is for")',
  },
  {
    file: '04-weekly-scoop.png',
    shotFile: '39-staff-newsletter-scoop.png',
    selector: '[data-help-shot="weekly-scoop"]',
    fallback: '#member-newsletter div.rounded-lg:has(label:text("Scoop link"))',
    prepare: async (page) => {
      const typeSelect = page.locator(
        '[data-help-shot="newsletter-type"] select, #member-newsletter label:has-text("Who this is for") select',
      ).first()
      await typeSelect.selectOption('scoop')
      await page.waitForTimeout(400)
    },
  },
  {
    file: '05-beats.png',
    shotFile: '39-staff-newsletter-beats.png',
    selector: '[data-help-shot="beats"]',
    fallback: '#member-newsletter div.rounded-lg:has(label:text("Intro"))',
    prepare: async (page) => {
      const typeSelect = page.locator(
        '[data-help-shot="newsletter-type"] select, #member-newsletter label:has-text("Who this is for") select',
      ).first()
      await typeSelect.selectOption('paid')
      const box = page.locator(
        '[data-help-shot="copy-tracking"] input[type="checkbox"], #member-newsletter label:has-text("Write in beats") input[type="checkbox"]',
      ).first()
      if (!(await box.isChecked())) await box.check()
      await page.waitForTimeout(400)
    },
  },
  {
    file: '06-copy-tracking.png',
    shotFile: '39-staff-newsletter-copy.png',
    selector: '[data-help-shot="copy-tracking"]',
    fallback: '#member-newsletter input[placeholder*="Subject"], #member-newsletter input[placeholder*="headline"]',
  },
  {
    file: '07-schedule-approval.png',
    shotFile: '39-staff-newsletter-schedule.png',
    selector: '[data-help-shot="schedule-approval"]',
    fallback: '#member-newsletter div.rounded-lg:has(p:text-is("Schedule / approval"))',
  },
  {
    file: '08-send-actions.png',
    shotFile: '39-staff-newsletter-actions.png',
    selector: '[data-help-shot="send-actions"]',
    fallback: '#member-newsletter div.flex.flex-wrap.gap-2:has(button:text("Send email now"), button:text("Preview recipients"))',
  },
  {
    file: '09-send-report.png',
    shotFile: '39-staff-newsletter-report.png',
    selector: '#newsletter-send-stats',
  },
]

async function locateShot(page, shot) {
  const primary = page.locator(shot.selector).first()
  if (await primary.count()) return primary
  if (shot.fallback) {
    const fb = page.locator(shot.fallback).first()
    if (await fb.count()) return fb
  }
  throw new Error(`Could not find ${shot.file} (${shot.selector})`)
}

async function loginFlow() {
  fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true })
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  console.log(`\n1. Sign in at ${BASE_URL}/staff`)
  await page.goto(`${BASE_URL}/staff?view=newsletter`, { waitUntil: 'domcontentloaded' })
  console.log('2. Complete Google sign-in, then open Staff → Newsletter.')
  console.log('3. Waiting up to 3 minutes for #newsletter-templates …\n')
  await page.waitForSelector('#newsletter-templates', { timeout: 180_000 })
  await context.storageState({ path: SESSION_PATH })
  console.log(`✅ Session saved: ${SESSION_PATH}`)
  await browser.close()
}

async function loadCursorBrowserCookies() {
  const cookieDb = path.join(
    process.env.HOME || '',
    'Library/Application Support/Cursor/Partitions/cursor-browser/Cookies',
  )
  if (!fs.existsSync(cookieDb)) {
    throw new Error(`Cursor browser cookies not found at ${cookieDb}`)
  }
  const tmp = path.join('/tmp', `shms-cursor-cookies-${process.pid}.json`)
  execFileSync(
    'python3',
    [
      '-c',
      `
import json, sqlite3, sys
db = sys.argv[1]
out = sys.argv[2]
conn = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
rows = conn.execute(
  "SELECT name, value, host_key, path, expires_utc, is_secure, is_httponly, samesite FROM cookies WHERE host_key LIKE '%shmspto%'"
).fetchall()
conn.close()
cookies = []
for name, value, host_key, path, expires_utc, is_secure, is_httponly, samesite in rows:
    exp = -1
    if expires_utc and expires_utc > 0:
        exp = int(expires_utc / 1000000 - 11644473600)
    cookies.append({
        'name': name,
        'value': value,
        'domain': host_key,
        'path': path or '/',
        'expires': exp,
        'secure': bool(is_secure),
        'httpOnly': bool(is_httponly),
        'sameSite': 'Strict' if samesite == 1 else 'Lax' if samesite == 2 else 'None',
    })
open(out, 'w').write(json.dumps(cookies))
print(len(cookies))
`,
      cookieDb,
      tmp,
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  )
  const cookies = JSON.parse(fs.readFileSync(tmp, 'utf8'))
  fs.unlinkSync(tmp)
  if (!cookies.length) {
    throw new Error('No shmspto.org cookies in Cursor browser. Sign in via Cursor browser first.')
  }
  return cookies
}

async function captureWithCursorCookies() {
  fs.mkdirSync(OUT_PUBLIC, { recursive: true })
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  const cookies = await loadCursorBrowserCookies()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addCookies(cookies)
  const page = await context.newPage()
  await page.goto(`${BASE_URL}/staff?view=newsletter`, { waitUntil: 'networkidle', timeout: 90_000 })
  if (page.url().includes('/auth/')) {
    console.error('❌ Cursor browser cookies expired. Re-sign in via Cursor browser, then re-run --cursor')
    await browser.close()
    process.exit(1)
  }
  await captureFromPage(page)
  await browser.close()
  console.log(`\nDone. Help images: ${OUT_PUBLIC}`)
}

async function captureWithCdp() {
  fs.mkdirSync(OUT_PUBLIC, { recursive: true })
  fs.mkdirSync(OUT_SHOTS, { recursive: true })

  const cdpUrl = process.env.CHROME_CDP_URL || 'http://127.0.0.1:9222'
  const browser = await chromium.connectOverCDP(cdpUrl)
  const context = browser.contexts()[0] ?? (await browser.newContext())
  const page =
    context.pages().find((p) => p.url().includes('shmspto.org/staff')) ??
    context.pages()[0] ??
    (await context.newPage())

  await page.goto(`${BASE_URL}/staff?view=newsletter`, { waitUntil: 'networkidle', timeout: 90_000 })
  if (page.url().includes('/auth/')) {
    console.error('❌ CDP tab is not signed in to Staff. Open Staff → Newsletter in Chrome first.')
    await browser.close()
    process.exit(1)
  }
  await captureFromPage(page)
  await browser.close()
  console.log(`\nDone. Help images: ${OUT_PUBLIC}`)
}

async function captureFromPage(page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForSelector('#newsletter-templates', { timeout: 60_000 })

  for (const shot of SHOTS) {
    if (shot.prepare) await shot.prepare(page)
    const el = await locateShot(page, shot)
    await el.scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    const pubPath = path.join(OUT_PUBLIC, shot.file)
    const shotsPath = path.join(OUT_SHOTS, shot.shotFile)
    await el.screenshot({ path: pubPath })
    fs.copyFileSync(pubPath, shotsPath)
    console.log(`✅ ${shot.file}`)
  }
}

async function capture() {
  if (process.argv.includes('--cursor')) {
    await captureWithCursorCookies()
    return
  }
  if (process.argv.includes('--cdp')) {
    await captureWithCdp()
    return
  }
  if (!fs.existsSync(SESSION_PATH)) {
    console.error(`❌ No session at ${SESSION_PATH}.`)
    console.error('Sign in via Cursor browser and run: node scripts/capture-staff-newsletter-shots.mjs --cursor')
    console.error('Or: node scripts/capture-staff-newsletter-shots.mjs --login')
    process.exit(1)
  }
  fs.mkdirSync(OUT_PUBLIC, { recursive: true })
  fs.mkdirSync(OUT_SHOTS, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    storageState: SESSION_PATH,
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  await page.goto(`${BASE_URL}/staff?view=newsletter`, { waitUntil: 'networkidle', timeout: 60_000 })

  if (page.url().includes('/auth/')) {
    console.error('❌ Session expired. Re-run with --login')
    await browser.close()
    process.exit(1)
  }

  await captureFromPage(page)
  await browser.close()
  console.log(`\nDone. Help images: ${OUT_PUBLIC}`)
}

const mode = process.argv[2]
if (mode === '--login') {
  await loginFlow()
} else {
  await capture()
}
