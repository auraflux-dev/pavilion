#!/usr/bin/env node
'use strict';
/**
 * Capture membership tier visuals:
 *   - all three cards side-by-side
 *   - zoomed Reef / Lagoon / Tide for benefit VO
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/capture_membership_tier_zooms.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/membership-tiers/scrolls');
const BASE = 'https://www.shmspto.org/membership';
const W = 1920;
const H = 1080;
const FPS = 30;
const FRAME_MS = Math.round(1000 / FPS);
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function dur(file) {
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}

function voNeed(rel) {
  return dur(path.join(ROOT, rel)) + 0.55;
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

async function dismiss(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => /dismiss/i.test(el.textContent || ''));
    if (b) b.click();
  }).catch(() => {});
}

/** Scroll tier grid into view (all three side-by-side on desktop). */
async function showAllTiers(page) {
  await page.evaluate(() => {
    const articles = [...document.querySelectorAll('article')];
    const reef = articles.find((a) => /\bReef\b/.test(a.textContent || ''));
    const grid = reef?.parentElement || reef;
    if (grid) grid.scrollIntoView({ behavior: 'instant', block: 'center' });
    document.documentElement.style.transform = '';
    document.documentElement.style.transformOrigin = '';
    document.body.style.transform = '';
  });
  await sleep(400);
}

/**
 * Isolate one tier card and enlarge it so benefits fill the 16:9 frame.
 * (CSS page-scale was unreliable in Playwright recordVideo.)
 */
async function zoomTier(page, tierName) {
  const ok = await page.evaluate((name) => {
    const articles = [...document.querySelectorAll('article')];
    const card = articles.find((a) => new RegExp(`\\b${name}\\b`, 'i').test(a.textContent || ''));
    if (!card) return { ok: false, reason: 'not found' };

    // Hide every other membership card
    for (const a of articles) {
      if (a === card) continue;
      if (/\bReef\b|\bLagoon\b|\bTide\b/i.test(a.textContent || '')) {
        a.style.display = 'none';
      }
    }

    const grid = card.parentElement;
    if (grid) {
      grid.style.display = 'flex';
      grid.style.justifyContent = 'center';
      grid.style.alignItems = 'flex-start';
      grid.style.maxWidth = '100%';
      grid.style.padding = '12px 24px 40px';
    }

    card.style.display = 'flex';
    card.style.width = '640px';
    card.style.maxWidth = '70vw';
    card.style.margin = '0 auto';
    card.style.transform = 'scale(1.28)';
    card.style.transformOrigin = 'top center';
    card.style.zIndex = '5';
    card.style.boxShadow = '0 18px 50px rgba(8,85,8,0.18)';

    // Kill sticky header overlap for the zoom shot
    for (const h of document.querySelectorAll('header, [class*="sticky"], nav')) {
      const st = window.getComputedStyle(h);
      if (st.position === 'sticky' || st.position === 'fixed') {
        h.style.visibility = 'hidden';
      }
    }

    card.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'center' });
    window.scrollBy(0, -12);
    return { ok: true, text: (card.innerText || '').slice(0, 80) };
  }, tierName);

  if (!ok || !ok.ok) throw new Error('zoom failed for ' + tierName + ' ' + JSON.stringify(ok));
  await sleep(450);
}

async function recordHoldPan(page, { seconds, holdTop, panPx }) {
  const holdMs = Math.round(holdTop * 1000);
  const panMs = Math.max(400, Math.round((seconds - holdTop) * 1000 * 0.55));
  const holdBottomMs = Math.max(300, Math.round(seconds * 1000) - holdMs - panMs);

  await sleep(holdMs);

  if (panPx > 0 && panMs > 0) {
    const frames = Math.max(1, Math.round(panMs / FRAME_MS));
    const step = panPx / frames;
    for (let i = 0; i < frames; i++) {
      await page.evaluate((s) => {
        window.scrollBy({ top: s, left: 0, behavior: 'instant' });
      }, step);
      await sleep(FRAME_MS);
    }
  }

  await sleep(holdBottomMs);
}

async function captureJob(browser, job) {
  const tmp = path.join(ROOT, 'assets', '_pw_tier_zoom_tmp', job.name);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  // Prep without recording so clip starts on the composed frame (not a white flash / goto).
  const prep = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const prepPage = await prep.newPage();
  console.log(`[tier-zoom] ${job.out}`);
  console.log(`  prep ${job.mode}…`);
  await prepPage.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 }).catch(async () => {
    await prepPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  });
  await sleep(700);
  await dismiss(prepPage);
  if (job.mode === 'all') await showAllTiers(prepPage);
  else await zoomTier(prepPage, job.tier);
  await prep.close();

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: { width: W, height: H } },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(500);
  await dismiss(page);
  if (job.mode === 'all') await showAllTiers(page);
  else await zoomTier(page, job.tier);
  await sleep(200);

  const t0 = Date.now();
  await recordHoldPan(page, {
    seconds: job.seconds,
    holdTop: job.holdTop,
    panPx: job.panPx,
  });
  console.log(`  recorded ~${((Date.now() - t0) / 1000).toFixed(1)}s (wanted ${job.seconds.toFixed(1)}s)`);

  await context.close();
  const outAbs = path.join(ROOT, job.out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  webmToMp4(tmp, outAbs);
  const got = dur(outAbs);
  if (got > job.seconds + 0.5) {
    const trim = outAbs.replace(/\.mp4$/, '._trim.mp4');
    execFileSync(ff, [
      '-y', '-ss', '0.35', '-i', outAbs, '-t', String(job.seconds),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-an', trim,
    ], { stdio: ['ignore', 'ignore', 'inherit'] });
    fs.renameSync(trim, outAbs);
  }
  console.log(`  ✓ ${dur(outAbs).toFixed(1)}s → ${job.out}`);
  fs.rmSync(tmp, { recursive: true, force: true });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const jobs = [
    {
      name: 'all_tiers',
      mode: 'all',
      out: 'assets/membership-tiers/scrolls/tiers_all_sidebyside.mp4',
      seconds: Math.max(voNeed('vo/_parts/membership_tiers_p01_who.m4a'), 14),
      holdTop: 6.5,
      panPx: 80,
    },
    {
      name: 'reef',
      mode: 'zoom',
      tier: 'Reef',
      out: 'assets/membership-tiers/scrolls/tier_zoom_reef.mp4',
      seconds: voNeed('vo/_parts/membership_tiers_p06_reef.m4a'),
      holdTop: 4.0,
      panPx: 220,
    },
    {
      name: 'lagoon',
      mode: 'zoom',
      tier: 'Lagoon',
      out: 'assets/membership-tiers/scrolls/tier_zoom_lagoon.mp4',
      seconds: voNeed('vo/_parts/membership_tiers_p07_lagoon.m4a'),
      holdTop: 4.0,
      panPx: 260,
    },
    {
      name: 'tide',
      mode: 'zoom',
      tier: 'Tide',
      out: 'assets/membership-tiers/scrolls/tier_zoom_tide.mp4',
      seconds: voNeed('vo/_parts/membership_tiers_p08_tide.m4a'),
      holdTop: 4.0,
      panPx: 280,
    },
  ];

  const browser = await chromium.launch({ headless: true });
  try {
    for (const job of jobs) {
      await captureJob(browser, job);
    }
  } finally {
    await browser.close();
  }
  console.log('\nDone tier zooms.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
