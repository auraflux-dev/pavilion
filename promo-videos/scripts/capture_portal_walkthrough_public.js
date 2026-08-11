#!/usr/bin/env node
'use strict';
/**
 * Capture public (no-login) stills for Member Portal walkthrough.
 * NODE_PATH=~/cwn-c0/node_modules node scripts/capture_portal_walkthrough_public.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/portal-walkthrough/public');
const W = 1920;
const H = 1080;

fs.mkdirSync(OUT, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function settle(page, ms = 1200) {
  await sleep(ms);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // 1. Home
  console.log('home…');
  await page.goto('https://www.shmspto.org/', { waitUntil: 'networkidle', timeout: 90000 });
  await settle(page, 1500);
  await page.screenshot({ path: path.join(OUT, 'home.png'), fullPage: false });

  // 2. Open House section
  console.log('open-house…');
  await page.goto('https://www.shmspto.org/#open-house', { waitUntil: 'networkidle', timeout: 90000 });
  await settle(page, 1000);
  await page.evaluate(() => {
    const el =
      document.getElementById('open-house') ||
      document.querySelector('[id*="open-house" i]') ||
      [...document.querySelectorAll('h1,h2,h3,section')].find((n) =>
        /open\s*house/i.test(n.textContent || ''),
      );
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await settle(page, 1200);
  await page.screenshot({ path: path.join(OUT, 'open_house.png'), fullPage: false });

  // 3. Membership tiers
  console.log('membership…');
  await page.goto('https://www.shmspto.org/membership', { waitUntil: 'networkidle', timeout: 90000 });
  await settle(page, 1500);
  await page.screenshot({ path: path.join(OUT, 'membership_tiers.png'), fullPage: false });

  // 4. Cove / spirit wear
  console.log('cove spirit-wear…');
  await page.goto('https://www.shmspto.org/cove', { waitUntil: 'networkidle', timeout: 90000 });
  await settle(page, 1200);
  await page.evaluate(() => {
    const el =
      document.getElementById('spirit-wear') ||
      document.querySelector('[id*="spirit" i]') ||
      [...document.querySelectorAll('h1,h2,h3,section')].find((n) =>
        /stingrays\s*pride|spirit\s*wear/i.test(n.textContent || ''),
      );
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollBy(0, Math.min(900, document.body.scrollHeight / 3));
  });
  await settle(page, 1200);
  await page.screenshot({ path: path.join(OUT, 'cove_spirit_wear.png'), fullPage: false });

  // Also try auth/login page (public) for join cue
  console.log('auth login…');
  await page.goto('https://www.shmspto.org/auth/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await settle(page, 1000);
  if (!page.url().includes('about:blank')) {
    await page.screenshot({ path: path.join(OUT, 'auth_login.png'), fullPage: false }).catch(() => {});
  }

  // Probe member-portal without login (expect redirect)
  console.log('member-portal probe…');
  await page.goto('https://www.shmspto.org/member-portal', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page, 1500);
  const portalUrl = page.url();
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 800) || '');
  fs.writeFileSync(
    path.join(OUT, '_portal_probe.json'),
    JSON.stringify({ url: portalUrl, snippet: bodyText }, null, 2),
  );
  await page.screenshot({ path: path.join(OUT, 'member_portal_unauth.png'), fullPage: false });

  console.log('DONE public →', OUT);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
