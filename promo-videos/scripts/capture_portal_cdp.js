#!/usr/bin/env node
'use strict';
/**
 * Capture logged-in Member Portal (Cove Digital Card QR + store) via Chrome CDP.
 * Expects Chrome on --remote-debugging-port=9222 (already logged in, or log in when prompted).
 *
 * NODE_PATH=~/cwn-c0/node_modules node scripts/capture_portal_cdp.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/parent-tour/video');
const STILL = path.join(ROOT, 'assets/parent-tour/ch3');
const TMP = path.join(OUT, '_pw_portal');
const W = 1440; // portal looks better slightly narrower? keep 1920 for assemble
const H = 1080;
const FPS = 30;
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(STILL, { recursive: true });
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  console.log('Connecting to Chrome CDP', CDP);
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();

  await page.setViewportSize({ width: 1920, height: 1080 }).catch(() => {});
  // CDP: also force Emulation.setDeviceMetricsOverride so screenshots aren't window-sized
  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false,
    });
  } catch (e) {
    console.warn('CDP viewport override skipped:', e.message);
  }
  await page.goto('https://www.shmspto.org/member-portal#store', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(1500);

  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const url = page.url();
    console.log('url', url);
    if (url.includes('/member-portal') && !url.includes('/auth')) {
      // Confirm store / QR UI present
      const hasStore = await page.locator('#store, text=Cove Digital Card, text=Family Cove').count().catch(() => 0);
      const hasQr = await page.locator('img[alt*="QR" i], canvas, svg').count().catch(() => 0);
      console.log('on portal · store-ish', hasStore, 'qr-ish', hasQr);
      if (hasStore > 0 || hasQr > 0 || url.includes('#store')) break;
    }
    console.log('Waiting for Member Portal login in the Chrome window (up to 3 min)…');
    await sleep(4000);
    await page.goto('https://www.shmspto.org/member-portal#store', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(() => {});
  }

  if (page.url().includes('/auth')) {
 throw new Error('Still on login page. log into Member Portal in the Chrome window, then re-run.');
  }

 // Start recording via a new context page with recordVideo. CDP pages may not support recordVideo.
  // Fallback: screenshot burst → ffmpeg, plus a few key stills.
  console.log('Capturing portal store / Cove Digital Card…');
  await page.goto('https://www.shmspto.org/member-portal#store', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await sleep(1200);

  // Click Store & Cove Digital Card nav if present
  try {
    await page.getByRole('button', { name: /Store.*Cove/i }).click({ timeout: 3000 });
  } catch {
    try {
      await page.getByText(/Store & Cove Digital Card/i).first().click({ timeout: 3000 });
    } catch { /* already on store */ }
  }
  await sleep(1000);

  // Scroll store into view
  await page.evaluate(() => {
    const el = document.getElementById('store');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await sleep(800);

  const frameDir = path.join(TMP, 'frames');
  fs.mkdirSync(frameDir, { recursive: true });
  let frame = 0;
  const tStart = Date.now();
  const markers = {};

  async function snapBurst(label, seconds, scrollPx = 0) {
    markers[label] = { t0: (Date.now() - tStart) / 1000 };
    const end = Date.now() + seconds * 1000;
    let scrolled = 0;
    while (Date.now() < end) {
      const file = path.join(frameDir, `f${String(frame).padStart(5, '0')}.png`);
      await page.screenshot({ path: file, fullPage: false });
      frame += 1;
      if (scrollPx && scrolled < scrollPx) {
        await page.evaluate((s) => window.scrollBy(0, s), 40);
        scrolled += 40;
      }
      await sleep(Math.round(1000 / 12)); // ~12fps capture
    }
    markers[label].t1 = (Date.now() - tStart) / 1000;
  }

  // Fresh stills for assemble fallbacks
  await page.screenshot({ path: path.join(STILL, '07_portal_qr_live.png'), fullPage: false });
  await snapBurst('ch03_p01', 9, 120); // QR primary
  await snapBurst('ch03_p02', 11, 80); // Photos / wallet
 // Paid / free panels if visible. stay on store
  await snapBurst('ch03_p03', 5, 60);
  await page.evaluate(() => window.scrollBy(0, 280));
  await sleep(500);
  await page.screenshot({ path: path.join(STILL, '02_portal_store_card_paid.png'), fullPage: false });
  await snapBurst('ch03_p04', 7, 100);
  await page.screenshot({ path: path.join(STILL, '03b_load_family_card_free.png'), fullPage: false });

  const outMp4 = path.join(OUT, 'portal_logged_in_tour.mp4');
 // Full-bleed 16:9. never letterbox with green pads (looks like "crazy borders")
  execFileSync(ff, [
    '-y',
    '-framerate', '12',
    '-i', path.join(frameDir, 'f%05d.png'),
    '-vf', `fps=${FPS},scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-an', '-movflags', '+faststart', outMp4,
  ], { stdio: 'inherit' });

  const dur = parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', outMp4,
  ], { encoding: 'utf8' }).trim());

  const wallEnd = Math.max(...Object.values(markers).map((m) => m.t1));
  const scale = dur / Math.max(0.1, wallEnd);
  const chapters = {};
  for (const [id, m] of Object.entries(markers)) {
    chapters[id] = { t0: +(m.t0 * scale).toFixed(3), t1: +(m.t1 * scale).toFixed(3) };
  }

  const meta = {
    master: 'assets/parent-tour/video/portal_logged_in_tour.mp4',
    durationSec: dur,
    capturedAt: new Date().toISOString(),
    chapters,
  };
  fs.writeFileSync(path.join(OUT, 'portal_logged_in_markers.json'), JSON.stringify(meta, null, 2));
  console.log('PORTAL VIDEO', outMp4, dur.toFixed(2) + 's');
  console.log('MARKERS', chapters);

  // Don't close user's Chrome
  await browser.close().catch(() => {});
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
