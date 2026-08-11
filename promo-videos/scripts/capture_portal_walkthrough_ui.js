#!/usr/bin/env node
'use strict';
/**
 * Capture real Member Portal UI for the walkthrough (CDP Chrome already logged in).
 *
 * 1. Chrome with --remote-debugging-port=9222
 * 2. Log in as a FREE or PAID parent (family account — not Staff/Treasurer)
 * 3. Run:
 *      NODE_PATH=~/cwn-c0/node_modules node scripts/capture_portal_walkthrough_ui.js
 *
 * Writes to assets/portal-walkthrough/live/
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/portal-walkthrough/live');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const LANE = process.env.PORTAL_LANE || 'paid'; // free | paid — for filenames

fs.mkdirSync(OUT, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shot(page, name) {
  const dest = path.join(OUT, `${LANE}_${name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  console.log('✓', path.relative(ROOT, dest));
  return dest;
}

(async () => {
  console.log('CDP', CDP, 'lane', LANE);
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
  } catch (e) {
    console.warn('viewport override:', e.message);
  }

  await page.goto('https://www.shmspto.org/member-portal', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(2000);

  if (page.url().includes('/auth')) {
    console.error('\nNOT LOGGED IN. In the Chrome window:');
    console.error('  1. Sign in as a parent (free or paid family account)');
    console.error('  2. Land on /member-portal');
    console.error('  3. Re-run this script\n');
    process.exit(2);
  }

  // Family-video sanitize: hide Staff / Treasurer display name in chrome.
  await page.addStyleTag({
    content: `
      [data-testid="member-display-name"],
      header .font-bold, nav .font-bold { }
    `,
  }).catch(() => {});
  await page.evaluate(() => {
    const walk = (root) => {
      const nodes = root.querySelectorAll('h1, h2, p, span, div, a, button');
      for (const el of nodes) {
        if (!el || el.children.length > 3) continue;
        const t = (el.textContent || '').trim();
        if (/^SHMS PTO Treasurer$/i.test(t) || /^Treasurer$/i.test(t)) {
          el.textContent = 'Parent Member';
        }
        if (/^Staff$/i.test(t) && el.closest('header, nav, a')) {
          el.style.visibility = 'hidden';
        }
      }
    };
    walk(document.body);
  }).catch(() => {});
  await sleep(300);

  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
  await shot(page, '01_portal_home');

  // Jump / account
  await page.evaluate(() => document.getElementById('account')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(600);
  await shot(page, '02_my_account');

  // WhatsApp buttons if visible
  const wa = page.getByRole('link', { name: /Join.*(6th|7th|8th)|WhatsApp/i }).first();
  if (await wa.count().catch(() => 0)) {
    await wa.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(400);
    await shot(page, '03_whatsapp');
  }

  // Students
  await page.evaluate(() => document.getElementById('portal-students')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(600);
  await shot(page, '04_my_students');

  // Try open edit / safety on first student
  const editBtn = page.getByRole('button', { name: /Edit|Safety|Complete/i }).first();
  if (await editBtn.count().catch(() => 0)) {
    await editBtn.click({ timeout: 3000 }).catch(() => {});
    await sleep(800);
    await shot(page, '05_safety_edit');
    await page.keyboard.press('Escape').catch(() => {});
    const close = page.getByRole('button', { name: /Close|Cancel|Done/i }).first();
    if (await close.count().catch(() => 0)) await close.click({ timeout: 2000 }).catch(() => {});
    await sleep(400);
  }

  // Calendar
  await page.evaluate(() => document.getElementById('calendar')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(600);
  await shot(page, '06_calendar');

  // Store / Cove card
  await page.goto('https://www.shmspto.org/member-portal#store', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(1000);
  await page.evaluate(() => document.getElementById('store')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(800);
  await shot(page, '07_cove_store');

  // Reload modal
  const loadBtn = page.getByRole('button', { name: /Load (digital |family )?card|Load funds|Reload/i }).first();
  if (await loadBtn.count().catch(() => 0)) {
    await loadBtn.click({ timeout: 4000 }).catch(() => {});
    await sleep(900);
    await shot(page, '08_reload_modal');
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(400);
  }

  // Help hub
  await page.goto('https://www.shmspto.org/member-portal/help', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  }).catch(async () => {
    await page.goto('https://www.shmspto.org/member-portal#help', { waitUntil: 'domcontentloaded' });
  });
  await sleep(1200);
  await shot(page, '09_help_hub');

  // Open first help article / category if present
  const art = page.getByRole('link', { name: /Am I free or paid|Cove|Account|Student/i }).first();
  if (await art.count().catch(() => 0)) {
    await art.click({ timeout: 4000 }).catch(() => {});
    await sleep(1000);
    await shot(page, '10_help_article');
  } else {
    const cat = page.locator('button, a, [role="button"]').filter({ hasText: /Account|Students|Membership|Cove|Help/i }).first();
    if (await cat.count().catch(() => 0)) {
      await cat.click({ timeout: 3000 }).catch(() => {});
      await sleep(800);
      await shot(page, '10_help_article');
    }
  }

  // Spirit wear signed-in
  await page.goto('https://www.shmspto.org/cove#shop', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1500);
  await page.evaluate(() => {
    const h = document.getElementById('cove-shop-heading') || document.getElementById('spirit-wear');
    if (h) h.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await sleep(600);
  await shot(page, '11_spirit_wear');

  console.log('\nDONE →', OUT);
  console.log('Re-run assemble after copying preferred stills into assemble BEATS.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
