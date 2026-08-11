#!/usr/bin/env node
'use strict';
/**
 * VO-synced continuous scroll capture (reusable for promo videos).
 *
 * Records a smooth, real-time page scroll timed to a target duration
 * (usually VO length + pad). Playwright recordVideo at 30fps with tiny
 * scroll steps — not frame-stitched stills.
 *
 * Prep (goto / login) happens WITHOUT recording so the clip starts on the
 * first hold frame and wall-clock length matches --seconds.
 *
 * Usage (single shot):
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/capture_vo_synced_scroll.js \
 *     --out assets/…/public_home_setup.mp4 \
 *     --url https://www.shmspto.org/ \
 *     --seconds 17.5
 *
 * Portal:
 *   … --profile .pw-portal-profile --headed --sanitize
 *
 * Timing (default fractions of --seconds):
 *   holdTop 35% → scroll 40% → holdBottom 25%
 * Override: --hold-top 3 --hold-bottom 2
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const W = 1920;
const H = 1080;
const FPS = 30;
const FRAME_MS = Math.round(1000 / FPS);
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const LOGIN_WAIT_MS = Number(process.env.LOGIN_WAIT_MS || 5 * 60 * 1000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function dur(file) {
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}

function parseArgs(argv) {
  const out = {
    out: null,
    url: null,
    seconds: null,
    holdTop: null,
    holdBottom: null,
    profile: null,
    headed: false,
    hash: null,
    scrollPx: null,
    sanitize: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--out') out.out = next();
    else if (a === '--url') out.url = next();
    else if (a === '--seconds') out.seconds = Number(next());
    else if (a === '--hold-top') out.holdTop = Number(next());
    else if (a === '--hold-bottom') out.holdBottom = Number(next());
    else if (a === '--profile') out.profile = next();
    else if (a === '--headed') out.headed = true;
    else if (a === '--hash') out.hash = next();
    else if (a === '--scroll-px') out.scrollPx = Number(next());
    else if (a === '--sanitize') out.sanitize = true;
  }
  if (!out.out || !out.url || !out.seconds) {
    console.error('Required: --out --url --seconds');
    process.exit(1);
  }
  return out;
}

function webmToMp4(webmDir, outMp4) {
  const webms = fs.readdirSync(webmDir).filter((f) => f.endsWith('.webm'));
  if (!webms.length) throw new Error('no webm in ' + webmDir);
  const raw = path.join(webmDir, webms[0]);
  execFileSync(ff, [
    '-y', '-i', raw,
    '-vf', `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-an', '-movflags', '+faststart', outMp4,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  return dur(outMp4);
}

async function waitForPortalLogin(page) {
  if (page.url().includes('/member-portal') && !page.url().includes('/auth')) return true;
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Log in in the Playwright window, then wait / press Enter    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let enter = false;
  rl.on('line', () => { enter = true; });
  const deadline = Date.now() + LOGIN_WAIT_MS;
  while (Date.now() < deadline) {
    const u = page.url();
    if (enter || (u.includes('/member-portal') && !u.includes('/auth'))) {
      if (u.includes('/auth')) {
        await page.goto('https://www.shmspto.org/member-portal', {
          waitUntil: 'domcontentloaded', timeout: 60000,
        }).catch(() => {});
        await sleep(800);
      }
      if (page.url().includes('/member-portal') && !page.url().includes('/auth')) {
        rl.close();
        return true;
      }
    }
    process.stdout.write(`waiting… ${u.slice(0, 90)}\n`);
    await sleep(2500);
  }
  rl.close();
  return page.url().includes('/member-portal') && !page.url().includes('/auth');
}

async function sanitizePortal(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('h1, h2, p, span, div, a, button, label')) {
      if (!el || el.children.length > 3) continue;
      const t = (el.textContent || '').trim();
      if (/^SHMS PTO Treasurer$/i.test(t) || /^Treasurer$/i.test(t)) {
        el.textContent = 'Parent Member';
      }
    }
  }).catch(() => {});
}

async function smoothScrollTimed(page, scrollPx, scrollMs) {
  const frames = Math.max(1, Math.round(scrollMs / FRAME_MS));
  const step = scrollPx / frames;
  for (let i = 0; i < frames; i++) {
    await page.evaluate((s) => {
      window.scrollBy({ top: s, left: 0, behavior: 'instant' });
    }, step);
    await sleep(FRAME_MS);
  }
}

async function preparePage(opts) {
  const url = opts.hash && !opts.url.includes('#')
    ? `${opts.url}#${opts.hash}`
    : opts.url;

  let prepBrowser = null;
  let prepContext;
  if (opts.profile) {
    const profilePath = path.resolve(ROOT, opts.profile);
    fs.mkdirSync(profilePath, { recursive: true });
    prepContext = await chromium.launchPersistentContext(profilePath, {
      headless: !opts.headed,
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
    });
  } else {
    prepBrowser = await chromium.launch({ headless: !opts.headed });
    prepContext = await prepBrowser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
    });
  }

  const page = prepContext.pages()[0] || await prepContext.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(500);

  if (opts.profile || /member-portal/.test(url)) {
    if (!(page.url().includes('/member-portal') && !page.url().includes('/auth'))) {
      if (!(await waitForPortalLogin(page))) {
        await prepContext.close();
        if (prepBrowser) await prepBrowser.close();
        throw new Error('Portal login required');
      }
    }
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
    await sleep(700);
  } else {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
    await sleep(400);
  }

  // Warm caches / dismiss obvious banners before recording
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => /dismiss/i.test(el.textContent || ''));
    if (b) b.click();
  }).catch(() => {});

  await prepContext.close();
  if (prepBrowser) await prepBrowser.close();
  // Brief pause so Chromium releases the profile lock before record launch
  await sleep(400);
  return url;
}

async function captureVoSyncedScroll(opts) {
  const outMp4 = path.resolve(ROOT, opts.out);
  fs.mkdirSync(path.dirname(outMp4), { recursive: true });
  const tourTmp = path.join(ROOT, 'assets', '_pw_scroll_tmp', path.basename(outMp4, '.mp4'));
  fs.rmSync(tourTmp, { recursive: true, force: true });
  fs.mkdirSync(tourTmp, { recursive: true });

  const targetSec = opts.seconds;
  const holdTop = opts.holdTop != null ? opts.holdTop : targetSec * 0.35;
  const holdBottom = opts.holdBottom != null ? opts.holdBottom : targetSec * 0.25;
  const scrollSec = Math.max(2.0, targetSec - holdTop - holdBottom);

  console.log(`[vo-scroll] ${path.relative(ROOT, outMp4)}`);
  console.log(`  prep…`);
  const url = await preparePage(opts);

  console.log(`  url=${url}`);
  console.log(`  target=${targetSec.toFixed(1)}s  holdTop=${holdTop.toFixed(1)}s  scroll=${scrollSec.toFixed(1)}s  holdBottom=${holdBottom.toFixed(1)}s`);

  let browser = null;
  let context;
  if (opts.profile) {
    const profilePath = path.resolve(ROOT, opts.profile);
    context = await chromium.launchPersistentContext(profilePath, {
      headless: !opts.headed,
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
      recordVideo: { dir: tourTmp, size: { width: W, height: H } },
    });
  } else {
    browser = await chromium.launch({ headless: !opts.headed });
    context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
      recordVideo: { dir: tourTmp, size: { width: W, height: H } },
    });
  }

  const page = context.pages()[0] || await context.newPage();
  // Fast second load (warmed). Recording starts here.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(350);
  if (opts.sanitize) await sanitizePortal(page);

  if (opts.hash) {
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollTo(0, 0);
    }, opts.hash);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await sleep(200);

  const metrics = await page.evaluate(() => ({
    y: window.scrollY,
    vh: window.innerHeight,
    sh: document.documentElement.scrollHeight,
  }));
  const remaining = Math.max(0, metrics.sh - metrics.vh - metrics.y);
  const scrollPx = opts.scrollPx != null
    ? Math.min(opts.scrollPx, remaining)
    : remaining;

  await sleep(Math.round(holdTop * 1000));
  if (scrollPx > 8) {
    await smoothScrollTimed(page, scrollPx, Math.round(scrollSec * 1000));
  } else {
    await sleep(Math.round(scrollSec * 1000));
  }
  await sleep(Math.round(holdBottom * 1000));

  await page.close();
  await context.close();
  if (browser) await browser.close();

  const d0 = webmToMp4(tourTmp, outMp4);
  // Drop the brief goto/paint at the start of recordVideo so the clip
  // begins on the hold (content already painted).
  const LEAD = 0.45;
  if (d0 > LEAD + 1) {
    const trimmed = outMp4.replace(/\.mp4$/, '._trim.mp4');
    execFileSync(ff, [
      '-y', '-ss', String(LEAD), '-i', outMp4,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-an', '-movflags', '+faststart', trimmed,
    ], { stdio: ['ignore', 'ignore', 'inherit'] });
    fs.renameSync(trimmed, outMp4);
  }
  const d = dur(outMp4);
  console.log(`  ✓ ${d.toFixed(1)}s (wanted ${targetSec.toFixed(1)}s)`);
  return outMp4;
}

module.exports = { captureVoSyncedScroll, parseArgs, dur };

if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2));
  captureVoSyncedScroll(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
