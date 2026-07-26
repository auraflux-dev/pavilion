#!/usr/bin/env node
'use strict';
/**
 * One continuous Playwright capture in VO script order.
 * Writes:
 *   assets/parent-tour/video/master_script_tour.mp4
 *   assets/parent-tour/video/master_script_markers.json
 *
 * Scroll policy (Rob):
 *   - Default: settle INTO the content (not race from top during VO)
 *   - Optional scroll takes ~1 second (smooth), not frantic steps
 *   - fromTop: true only when we intentionally show the page hero / top
 *
 * NODE_PATH=~/cwn-c0/node_modules node scripts/capture_script_master.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/parent-tour/video');
const TMP = path.join(OUT, '_pw_master');
const BASE = 'https://www.shmspto.org';
const W = 1920;
const H = 1080;
const FPS = 30;
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';

fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Chapters in VO / assemble beat order.
 * fromTop. show hero/top first (rare)
 * settleY. jump here before hold (default mid-content when not fromTop)
 * scrollPx + scrollMs. optional gentle ~1s scroll after settle/hold start
 * holdMs. dwell so assemble can take settled END of chapter
 */
const CHAPTERS = [
 // Establishing home hero. intentionally from top, then 1s scroll into site
  { id: 'ch01_p01', goto: '/', fromTop: true, holdMs: 7000, scrollPx: 220, scrollMs: 1000 },
 // Nav tour. longer holds for why+what VO (~1 sentence pair per page)
  { id: 'ch01_p02', goto: '/programs', settleY: 80, holdMs: 6500, scrollPx: 100, scrollMs: 1000 },
  { id: 'ch01_p02b', goto: '/events', settleY: 80, holdMs: 6500, scrollPx: 100, scrollMs: 1000 },
  { id: 'ch01_p02c', goto: '/cove', settleY: 80, holdMs: 6500, scrollPx: 120, scrollMs: 1000 },
  { id: 'ch01_p02d', goto: '/volunteer', settleY: 60, holdMs: 6000 },
  { id: 'ch01_p02e', goto: '/fundraising', settleY: 60, holdMs: 6000 },
  { id: 'ch01_p02f', goto: '/board', settleY: 60, holdMs: 6000 },
  { id: 'ch01_p02g', goto: '/meetings', settleY: 60, holdMs: 6000 },
 // Membership. settle on tiers area
  { id: 'ch01_p03', goto: '/membership', settleY: 180, holdMs: 5500, scrollPx: 160, scrollMs: 1000 },
  { id: 'ch02_p01', goto: '/membership', settleY: 280, holdMs: 5000, scrollPx: 160, scrollMs: 1000 },
  { id: 'ch02_p02', settleY: 360, holdMs: 5500 }, // Reef
  { id: 'ch02_p03', settleY: 480, holdMs: 6000 }, // Lagoon
  { id: 'ch02_p04', settleY: 600, holdMs: 6000 }, // Tide
  { id: 'ch02_p05', settleY: 400, holdMs: 4500 }, // bonus callouts on cards
 // Funds / perks. stay on membership (SEE=HEAR)
  { id: 'ch02_p06', goto: '/membership', settleY: 280, holdMs: 7000, scrollPx: 100, scrollMs: 1000 },
 // Login / create account. hold Create Account card only (do not navigate away)
  { id: 'ch02_p07', goto: '/auth/join', fromTop: true, holdMs: 8000 },
  { id: 'ch03_p05', goto: '/cove', settleY: 160, holdMs: 4500, scrollPx: 180, scrollMs: 1000 },
  { id: 'ch03_p06', goto: '/', fromTop: true, holdMs: 5000 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP, size: { width: W, height: H } },
  });
  const page = await context.newPage();
  const markers = [];
  const t0 = Date.now();

  /** Smooth scroll over ~scrollMs (default 1000). */
  async function scrollDownSmooth(px, scrollMs = 1000) {
    const steps = Math.max(12, Math.round(scrollMs / 50));
    const step = px / steps;
    const wait = Math.round(scrollMs / steps);
    for (let i = 0; i < steps; i++) {
      await page.evaluate((s) => window.scrollBy({ top: s, left: 0, behavior: 'instant' }), step);
      await sleep(wait);
    }
  }

  async function land(ch) {
    if (ch.fromTop) {
      await page.evaluate(() => window.scrollTo(0, 0));
      return;
    }
    const y = ch.settleY != null ? ch.settleY : 160;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
  }

  for (const ch of CHAPTERS) {
    const start = (Date.now() - t0) / 1000;
    console.log('chapter', ch.id, 't≈', start.toFixed(2));
    if (ch.goto) {
      await page.goto(BASE + ch.goto, { waitUntil: 'networkidle', timeout: 60000 });
      await sleep(400);
    }
    await land(ch);
    await sleep(350); // settle-in beat before VO-aligned hold
    // Optional gentle 1s scroll early, then hold on settled frame
    if (ch.scrollPx) {
      await scrollDownSmooth(ch.scrollPx, ch.scrollMs || 1000);
    }
    await sleep(ch.holdMs || 2000);
    const end = (Date.now() - t0) / 1000;
    markers.push({ id: ch.id, t0: +start.toFixed(3), t1: +end.toFixed(3) });
  }

  await page.close();
  await context.close();
  await browser.close();

  const webms = fs.readdirSync(TMP).filter((f) => f.endsWith('.webm'));
  if (!webms.length) throw new Error('no Playwright video');
  const raw = path.join(TMP, webms[0]);
  const master = path.join(OUT, 'master_script_tour.mp4');

  execFileSync(ff, [
    '-y', '-i', raw,
    '-vf', `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1f17,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-an', '-movflags', '+faststart', master,
  ], { stdio: 'inherit' });

  const masterDur = parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', master,
  ], { encoding: 'utf8' }).trim());

  const wallEnd = markers[markers.length - 1].t1;
  const scale = masterDur / Math.max(0.1, wallEnd);
  const scaled = markers.map((m) => ({
    id: m.id,
    t0: +(m.t0 * scale).toFixed(3),
    t1: +(m.t1 * scale).toFixed(3),
  }));

  function span(ids) {
    const hits = scaled.filter((m) => ids.includes(m.id));
    return { t0: hits[0].t0, t1: hits[hits.length - 1].t1 };
  }
  const chapters = {
    ch01_p01: span(['ch01_p01']),
    ch01_p02: span(['ch01_p02', 'ch01_p02b', 'ch01_p02c', 'ch01_p02d', 'ch01_p02e', 'ch01_p02f', 'ch01_p02g']),
    ch01_p03: span(['ch01_p03']),
    ch02_p01: span(['ch02_p01']),
    ch02_p02: span(['ch02_p02']),
    ch02_p03: span(['ch02_p03']),
    ch02_p04: span(['ch02_p04']),
    ch02_p05: span(['ch02_p05']),
    ch02_p06: span(['ch02_p06']),
    ch02_p07: span(['ch02_p07']),
    ch03_p05: span(['ch03_p05']),
    ch03_p06: span(['ch03_p06']),
  };

  const meta = {
    master: 'assets/parent-tour/video/master_script_tour.mp4',
    durationSec: masterDur,
    capturedAt: new Date().toISOString(),
    scrollPolicy: 'settle-in; ~1s scrolls; fromTop only when intentional',
    rawMarkers: scaled,
    chapters,
  };
  const metaPath = path.join(OUT, 'master_script_markers.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log('MASTER', master, masterDur.toFixed(2) + 's');
  console.log('MARKERS', metaPath);
  console.log(JSON.stringify(chapters, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
