#!/usr/bin/env node
'use strict';
/**
 * Headed Playwright capture for Member Portal walkthrough stills.
 * Uses a dedicated persistent profile (NOT Chrome-SHMSPortalCapture CDP).
 *
 *   NODE_PATH=~/cwn-c0/node_modules \
 *   PORTAL_LANE=free \
 *   LOGIN_WAIT_MS=180000 \
 *   node scripts/capture_portal_walkthrough_headed.js
 *
 * If URL is /auth: log in as FREE parent in the Playwright window, then press Enter
 * (or wait until URL is /member-portal — default poll up to LOGIN_WAIT_MS).
 *
 * Writes: assets/portal-walkthrough/live/{lane}_*.png
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/portal-walkthrough/live');
const PROFILE = path.join(ROOT, '.pw-portal-profile');
const LANE = process.env.PORTAL_LANE || 'free';
const LOGIN_WAIT_MS = Number(process.env.LOGIN_WAIT_MS || 5 * 60 * 1000);
const PORTAL_URL = 'https://www.shmspto.org/member-portal';

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PROFILE, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isLoggedIn(url) {
  try {
    const u = new URL(url);
    if (u.pathname.includes('/auth')) return false;
    return u.pathname.includes('/member-portal');
  } catch {
    return false;
  }
}

async function waitForLogin(page, maxMs) {
  const deadline = Date.now() + maxMs;
  let enterDone = false;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', () => {
    enterDone = true;
  });

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Log in as FREE parent in THIS window, then press Enter in      ║');
  console.log('║  terminal (or wait — we poll until /member-portal).             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  while (Date.now() < deadline) {
    const url = page.url();
    if (enterDone || isLoggedIn(url)) {
      // After Enter, re-check / navigate if still on auth
      if (!isLoggedIn(page.url())) {
        await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        await sleep(800);
      }
      if (isLoggedIn(page.url())) {
        rl.close();
        return true;
      }
    }
    process.stdout.write(`waiting for login… ${page.url().slice(0, 80)}\n`);
    await sleep(3000);
  }

  rl.close();
  return isLoggedIn(page.url());
}

async function sanitize(page) {
  await page
    .addStyleTag({
      content: `
      [data-testid="member-display-name"],
      header .font-bold, nav .font-bold { }
    `,
    })
    .catch(() => {});
  await page
    .evaluate(() => {
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
    })
    .catch(() => {});
  await sleep(300);
}

async function shot(page, name) {
  const dest = path.join(OUT, `${LANE}_${name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  console.log('✓', path.relative(ROOT, dest));
  return dest;
}

(async () => {
  console.log('profile', PROFILE);
  console.log('lane', LANE, 'loginWaitMs', LOGIN_WAIT_MS);

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    args: ['--window-size=1920,1080'],
  });
  const page = context.pages()[0] || (await context.newPage());

  await page.goto(PORTAL_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(2000);

  if (!isLoggedIn(page.url())) {
    const ok = await waitForLogin(page, LOGIN_WAIT_MS);
    if (!ok) {
      console.error('');
      console.error('NOT LOGGED IN after wait.');
      console.error('Rob must log in as a FREE parent in the Playwright Chromium window that opened');
      console.error('(promo-videos/.pw-portal-profile — NOT Chrome-SHMSPortalCapture / CDP 9222).');
      console.error('Then re-run this script.');
      console.error('');
      await context.close().catch(() => {});
      process.exit(2);
    }
  }

  // Ensure we are on portal home
  if (!page.url().includes('/member-portal') || page.url().includes('/auth')) {
    await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1500);
  }
  if (!isLoggedIn(page.url())) {
    console.error('Still on auth after login wait. Aborting.');
    await context.close().catch(() => {});
    process.exit(2);
  }

  await sanitize(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
  await shot(page, '01_portal_home');

  await page.evaluate(() =>
    document.getElementById('account')?.scrollIntoView({ behavior: 'instant', block: 'start' }),
  );
  await sleep(600);
  await shot(page, '02_my_account');

  const wa = page.getByRole('link', { name: /Join.*(6th|7th|8th)|WhatsApp/i }).first();
  if (await wa.count().catch(() => 0)) {
    await wa.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(400);
    await shot(page, '03_whatsapp');
  }

  await page.evaluate(() =>
    document.getElementById('portal-students')?.scrollIntoView({ behavior: 'instant', block: 'start' }),
  );
  await sleep(600);
  await shot(page, '04_my_students');

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

  await page.evaluate(() =>
    document.getElementById('calendar')?.scrollIntoView({ behavior: 'instant', block: 'start' }),
  );
  await sleep(600);
  await shot(page, '06_calendar');

  await page
    .goto('https://www.shmspto.org/member-portal#store', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    .catch(() => {});
  await sleep(1000);
  await page.evaluate(() =>
    document.getElementById('store')?.scrollIntoView({ behavior: 'instant', block: 'start' }),
  );
  await sleep(800);
  await sanitize(page);
  await shot(page, '07_cove_store');

  const loadBtn = page.getByRole('button', { name: /Load (digital |family )?card|Load funds|Reload/i }).first();
  if (await loadBtn.count().catch(() => 0)) {
    await loadBtn.click({ timeout: 4000 }).catch(() => {});
    await sleep(900);
    await shot(page, '08_reload_modal');
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(400);
  }

  await page
    .goto('https://www.shmspto.org/member-portal/help', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    .catch(async () => {
      await page.goto('https://www.shmspto.org/member-portal#help', { waitUntil: 'domcontentloaded' });
    });
  await sleep(1200);
  await sanitize(page);
  await shot(page, '09_help_hub');

  const art = page.getByRole('link', { name: /Am I free or paid|Cove|Account|Student/i }).first();
  if (await art.count().catch(() => 0)) {
    await art.click({ timeout: 4000 }).catch(() => {});
    await sleep(1000);
    await shot(page, '10_help_article');
  } else {
    const cat = page
      .locator('button, a, [role="button"]')
      .filter({ hasText: /Account|Students|Membership|Cove|Help/i })
      .first();
    if (await cat.count().catch(() => 0)) {
      await cat.click({ timeout: 3000 }).catch(() => {});
      await sleep(800);
      await shot(page, '10_help_article');
    }
  }

  await page.goto('https://www.shmspto.org/cove#shop', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(1500);
  await page.evaluate(() => {
    const h = document.getElementById('cove-shop-heading') || document.getElementById('spirit-wear');
    if (h) h.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await sleep(600);
  await sanitize(page);
  await shot(page, '11_spirit_wear');

  console.log('\nDONE →', OUT);
  await context.close().catch(() => {});
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
