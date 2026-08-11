#!/usr/bin/env node
'use strict';
/**
 * Capture FULL-PAGE scroll clips for Member Portal walkthrough.
 * Prefer these over cropped stills so parents see the whole section.
 *
 * Public pages: headless Playwright recordVideo.
 * Portal pages: persistent profile (.pw-portal-profile) — must already be
 * logged in as FREE parent, or set LOGIN_WAIT_MS and sign in when prompted.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/capture_portal_walkthrough_scrolls.js
 *   PORTAL_LANE=free NODE_PATH=… node scripts/capture_portal_walkthrough_scrolls.js
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/portal-walkthrough/scrolls');
const TMP = path.join(OUT, '_pw');
const PROFILE = path.join(ROOT, '.pw-portal-profile');
const BASE = 'https://www.shmspto.org';
const W = 1920;
const H = 1080;
const FPS = 30;
const LANE = process.env.PORTAL_LANE || 'free';
const LOGIN_WAIT_MS = Number(process.env.LOGIN_WAIT_MS || 3 * 60 * 1000);
const SKIP_PORTAL = process.env.SKIP_PORTAL === '1';
const SKIP_PUBLIC = process.env.SKIP_PUBLIC === '1';
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function dur(file) {
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}

function webmToMp4(webmDir, outMp4) {
  const webms = fs.readdirSync(webmDir).filter((f) => f.endsWith('.webm'));
  if (!webms.length) throw new Error('no webm in ' + webmDir);
  const raw = path.join(webmDir, webms[0]);
  // Full-bleed crop (no letterbox) — matches portal assemble VF.
  execFileSync(ff, [
    '-y', '-i', raw,
    '-vf', `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-an', '-movflags', '+faststart', outMp4,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  return dur(outMp4);
}

async function scrollDown(page, px, stepsN = 16) {
  const step = px / stepsN;
  for (let i = 0; i < stepsN; i++) {
    await page.evaluate((s) => window.scrollBy({ top: s, left: 0, behavior: 'instant' }), step);
    await sleep(100);
  }
}

async function scrollToId(page, id) {
  await page.evaluate((elId) => {
    const el = document.getElementById(elId);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, id);
  await sleep(700);
}

async function sanitizePortal(page) {
  await page.evaluate(() => {
    const walk = (root) => {
      for (const el of root.querySelectorAll('h1, h2, p, span, div, a, button, label')) {
        if (!el || el.children.length > 3) continue;
        const t = (el.textContent || '').trim();
        if (/^SHMS PTO Treasurer$/i.test(t) || /^Treasurer$/i.test(t)) {
          el.textContent = 'Parent Member';
        }
      }
    };
    walk(document);
  }).catch(() => {});
}

async function recordPublic({ name, steps, holdMs = 2000 }) {
  const tourTmp = path.join(TMP, name);
  fs.rmSync(tourTmp, { recursive: true, force: true });
  fs.mkdirSync(tourTmp, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: tourTmp, size: { width: W, height: H } },
  });
  const page = await context.newPage();

  console.log('public', name);
  for (const step of steps) {
    if (step.goto) {
      await page.goto(BASE + step.goto, { waitUntil: 'networkidle', timeout: 90000 });
      await sleep(800);
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(step.holdMs || holdMs);
    }
    if (step.scrollTo) {
      await scrollToId(page, step.scrollTo);
      await sleep(step.holdMs || 1600);
    }
    if (step.scroll) {
      await scrollDown(page, step.scroll, step.scrollSteps || 18);
      await sleep(step.afterScrollHold || 1200);
    }
    if (step.holdMs && !step.goto && !step.scrollTo) await sleep(step.holdMs);
  }

  await page.close();
  await context.close();
  await browser.close();

  const out = path.join(OUT, `${name}.mp4`);
  const d = webmToMp4(tourTmp, out);
  console.log('  ✓', path.relative(ROOT, out), d.toFixed(1) + 's');
  return out;
}

async function waitForPortalLogin(page) {
  if (page.url().includes('/member-portal') && !page.url().includes('/auth')) return true;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Log in as FREE parent in the Playwright window, then Enter  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let enter = false;
  rl.on('line', () => { enter = true; });

  const deadline = Date.now() + LOGIN_WAIT_MS;
  while (Date.now() < deadline) {
    if (enter || (page.url().includes('/member-portal') && !page.url().includes('/auth'))) {
      if (page.url().includes('/auth')) {
        await page.goto(BASE + '/member-portal', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        await sleep(1000);
      }
      if (page.url().includes('/member-portal') && !page.url().includes('/auth')) {
        rl.close();
        return true;
      }
    }
    process.stdout.write(`waiting… ${page.url().slice(0, 90)}\n`);
    await sleep(3000);
  }
  rl.close();
  return page.url().includes('/member-portal') && !page.url().includes('/auth');
}

async function ensurePortalSession() {
  fs.mkdirSync(PROFILE, { recursive: true });
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto(`${BASE}/member-portal`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(800);
  const ok = await waitForPortalLogin(page);
  await context.close();
  if (!ok) throw new Error('Not logged into Member Portal — re-run after login');
  console.log('portal session ready');
}

async function recordPortalSection({ name, hash, scrollPx = 900, holdTop = 2200, extra }) {
  const tourTmp = path.join(TMP, name);
  fs.rmSync(tourTmp, { recursive: true, force: true });
  fs.mkdirSync(tourTmp, { recursive: true });
  fs.mkdirSync(PROFILE, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: tourTmp, size: { width: W, height: H } },
  });
  const page = context.pages()[0] || await context.newPage();

  const url = hash ? `${BASE}/member-portal#${hash}` : `${BASE}/member-portal`;
  console.log('portal', name, url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(1200);

  if (!(page.url().includes('/member-portal') && !page.url().includes('/auth'))) {
    await context.close();
    throw new Error(`Session lost before ${name} — log in again and re-run`);
  }

  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await sleep(1000);
  await sanitizePortal(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  if (hash) await scrollToId(page, hash);
  await sleep(holdTop);
  if (scrollPx > 0) await scrollDown(page, scrollPx, Math.max(14, Math.round(scrollPx / 50)));
  await sleep(1400);
  if (typeof extra === 'function') await extra(page);

  await page.close();
  await context.close();

  const out = path.join(OUT, `${LANE}_${name}.mp4`);
  const d = webmToMp4(tourTmp, out);
  console.log('  ✓', path.relative(ROOT, out), d.toFixed(1) + 's');
  return out;
}

(async () => {
  // —— Public (no login) ——
  if (!SKIP_PUBLIC) {
    await recordPublic({
      name: 'public_home_setup',
      holdMs: 2400,
      steps: [
        { goto: '/', holdMs: 3200 },
        { scroll: 420, scrollSteps: 16, afterScrollHold: 1600 },
        { holdMs: 1200 },
      ],
    });

    await recordPublic({
      name: 'public_auth_join',
      steps: [
        { goto: '/auth/join?mode=login', holdMs: 3500 },
        { scroll: 280, scrollSteps: 12, afterScrollHold: 1400 },
      ],
    });

    await recordPublic({
      name: 'public_memberships',
      steps: [
        { goto: '/membership', holdMs: 2800 },
        { scroll: 700, scrollSteps: 20, afterScrollHold: 1600 },
      ],
    });

    await recordPublic({
      name: 'public_cove_spirit',
      steps: [
        { goto: '/cove', holdMs: 2000 },
        { scrollTo: 'cove-shop-heading', holdMs: 2200 },
        { scroll: 500, scrollSteps: 16, afterScrollHold: 1500 },
      ],
    });

    await recordPublic({
      name: 'public_open_house',
      steps: [
        { goto: '/#open-house', holdMs: 1800 },
        { scrollTo: 'open-house', holdMs: 2800 },
        { scroll: 450, scrollSteps: 14, afterScrollHold: 1600 },
      ],
    });
  } else {
    console.log('SKIP_PUBLIC=1 — portal scrolls only');
  }

  if (SKIP_PORTAL) {
    console.log('SKIP_PORTAL=1 — public scrolls only');
    return;
  }

  // Login once (not recorded), then capture each section.
  await ensurePortalSession();

  // —— Logged-in portal (free lane by default) ——
  // Extra hold at top of home so family setup checklist is readable.
  await recordPortalSection({ name: 'portal_home', hash: '', scrollPx: 900, holdTop: 5200 });
  await recordPortalSection({ name: 'portal_account', hash: 'account', scrollPx: 650, holdTop: 2400 });
  await recordPortalSection({ name: 'portal_students', hash: 'portal-students', scrollPx: 700, holdTop: 2400 });
  await recordPortalSection({
    name: 'portal_safety',
    hash: 'portal-students',
    scrollPx: 200,
    holdTop: 1200,
    extra: async (page) => {
      // Open first Edit student if present
      const edit = page.getByRole('button', { name: /edit/i }).first();
      if (await edit.count()) {
        await edit.click({ timeout: 4000 }).catch(() => {});
        await sleep(1500);
        await scrollDown(page, 500, 14);
        await sleep(1200);
      }
    },
  });
  await recordPortalSection({ name: 'portal_calendar', hash: 'calendar', scrollPx: 500, holdTop: 2200 });
  await recordPortalSection({ name: 'portal_help', hash: 'help', scrollPx: 800, holdTop: 2400 });
  await recordPortalSection({ name: 'portal_cove', hash: 'store', scrollPx: 750, holdTop: 2600 });

  console.log('\nScroll clips in', OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
