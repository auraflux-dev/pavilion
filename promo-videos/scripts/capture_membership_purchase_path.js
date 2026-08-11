#!/usr/bin/env node
'use strict';
/**
 * Capture membership purchase path (visitor Join → auth → return checkout URL),
 * timed to VO parts. Paid post-purchase comes from Cursor paid session separately.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/capture_membership_purchase_path.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { captureVoSyncedScroll } = require('./capture_vo_synced_scroll');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://www.shmspto.org';
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
function need(rel) {
  return dur(path.join(ROOT, rel)) + 0.55;
}
function webmToMp4(webmDir, outMp4) {
  const webms = fs.readdirSync(webmDir).filter((f) => f.endsWith('.webm'));
  if (!webms.length) throw new Error('no webm in ' + webmDir);
  execFileSync(ff, [
    '-y', '-i', path.join(webmDir, webms[0]),
    '-vf', `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-an', '-movflags', '+faststart', outMp4,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  return dur(outMp4);
}

async function captureJoinCta(seconds) {
  const out = path.join(ROOT, 'assets/membership-tiers/scrolls/purchase_join_cta.mp4');
  const tmp = path.join(ROOT, 'assets/_pw_purchase_tmp/join_cta');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const prep = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const prepPage = await prep.newPage();
  await prepPage.goto(`${BASE}/membership`, { waitUntil: 'networkidle', timeout: 90000 }).catch(async () => {
    await prepPage.goto(`${BASE}/membership`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  });
  await sleep(600);
  await prepPage.evaluate(() => {
    const articles = [...document.querySelectorAll('article')];
    const lagoon = articles.find((a) => /\bLagoon\b/.test(a.textContent || ''));
    (lagoon || articles[1] || articles[0])?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await prep.close();

  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: { width: W, height: H } },
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/membership`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(500);
  await page.evaluate(() => {
    const articles = [...document.querySelectorAll('article')];
    const lagoon = articles.find((a) => /\bLagoon\b/.test(a.textContent || ''));
    (lagoon || articles[1] || articles[0])?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await sleep(Math.round(seconds * 0.55 * 1000));
  // Gentle nudge toward Join button area
  await page.evaluate(() => window.scrollBy(0, 120));
  await sleep(Math.round(seconds * 0.45 * 1000));
  await ctx.close();
  await browser.close();
  webmToMp4(tmp, out);
  console.log('✓ purchase_join_cta', dur(out).toFixed(1) + 's');
  fs.rmSync(tmp, { recursive: true, force: true });
}

(async () => {
  const joinSec = Math.max(8, need('vo/_parts/membership_tiers_p02_frame.m4a') * 0.45);
  const authSec = Math.max(10, need('vo/_parts/membership_tiers_p02_frame.m4a') * 0.55);

  console.log('\n=== purchase Join CTA ===');
  await captureJoinCta(joinSec);

  console.log('\n=== purchase auth/join ===');
  await captureVoSyncedScroll({
    out: 'assets/membership-tiers/scrolls/purchase_auth_join.mp4',
    url: `${BASE}/auth/join?returnTo=${encodeURIComponent('/membership?checkout=lagoon')}`,
    seconds: authSec,
    holdTop: 4.5,
    holdBottom: 3.0,
    scrollPx: 320,
  });

  // Combo for p02
  const a = path.join(ROOT, 'assets/membership-tiers/scrolls/purchase_join_cta.mp4');
  const b = path.join(ROOT, 'assets/membership-tiers/scrolls/purchase_auth_join.mp4');
  const combo = path.join(ROOT, 'assets/membership-tiers/scrolls/purchase_path_combo.mp4');
  const work = path.join(ROOT, 'out/_work_membership_tiers');
  fs.mkdirSync(work, { recursive: true });
  const aN = path.join(work, 'pur_a.mp4');
  const bN = path.join(work, 'pur_b.mp4');
  const VF = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS}`;
  execFileSync(ff, ['-y', '-i', a, '-vf', VF, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', aN], { stdio: 'inherit' });
  execFileSync(ff, ['-y', '-i', b, '-vf', VF, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', bN], { stdio: 'inherit' });
  const list = path.join(work, 'pur_concat.txt');
  fs.writeFileSync(list, [`file '${aN}'`, `file '${bN}'`].join('\n'));
  execFileSync(ff, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', combo], { stdio: 'inherit' });
  console.log('✓ purchase_path_combo', dur(combo).toFixed(1) + 's');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
