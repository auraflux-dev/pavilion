#!/usr/bin/env node
'use strict';
/**
 * Capture public shmspto.org screen tours with Playwright continuous video
 * (not sparse screenshots → no 6fps chop).
 * Outputs MP4s under assets/parent-tour/video/
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/parent-tour/video');
const TMP = path.join(OUT, '_pw_video');
const BASE = 'https://www.shmspto.org';
const W = 1920;
const H = 1080;
const FPS = 30;
const ff = process.env.FFMPEG || 'ffmpeg';
const fp = process.env.FFPROBE || 'ffprobe';

fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runFf(args) {
  execFileSync(ff, args, { stdio: 'inherit' });
}

async function recordTour({ name, steps, holdMs = 2200 }) {
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

  async function hold(ms) {
    await sleep(ms);
  }

  async function scrollDown(px, stepsN = 12) {
    const step = px / stepsN;
    for (let i = 0; i < stepsN; i++) {
      await page.evaluate((s) => window.scrollBy({ top: s, left: 0, behavior: 'instant' }), step);
      await sleep(90); // ~11fps scroll samples → smooth when recorded continuously
    }
  }

  console.log('recording', name);
  for (const step of steps) {
    if (step.goto) {
      await page.goto(BASE + step.goto, { waitUntil: 'networkidle', timeout: 60000 });
      await sleep(600);
      await page.evaluate(() => window.scrollTo(0, 0));
      await hold(step.holdMs || holdMs);
    }
    if (step.scroll) await scrollDown(step.scroll, step.scrollSteps || 14);
    if (step.holdMs && !step.goto) await hold(step.holdMs);
    if (step.click) {
      try {
        await page.click(step.click, { timeout: 5000 });
        await sleep(500);
        await hold(step.afterClickHold || 1500);
      } catch (e) {
        console.warn('click miss', step.click, e.message.slice(0, 80));
      }
    }
  }

  await page.close();
  await context.close();
  await browser.close();

  const webms = fs.readdirSync(tourTmp).filter((f) => f.endsWith('.webm'));
  if (!webms.length) throw new Error('no Playwright video for ' + name);
  const raw = path.join(tourTmp, webms[0]);
  const outMp4 = path.join(OUT, `${name}.mp4`);

  // Normalize to CFR 30fps H.264 (Playwright webm can be VFR)
  runFf([
    '-y', '-i', raw,
    '-vf', `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1f17,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-an', '-movflags', '+faststart',
    outMp4,
  ]);

  const dur = execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', outMp4,
  ], { encoding: 'utf8' }).trim();
  console.log('OK', name, dur + 's');
  return outMp4;
}

(async () => {
  await recordTour({
    name: 'ch1_website_tour',
    holdMs: 2800,
    steps: [
      { goto: '/', holdMs: 4000 },
      { scroll: 350, scrollSteps: 14 },
      { holdMs: 1500 },
      { goto: '/programs', holdMs: 4500 },
      { scroll: 500, scrollSteps: 16 },
      { holdMs: 2000 },
      { goto: '/events', holdMs: 4000 },
      { scroll: 400, scrollSteps: 14 },
      { goto: '/cove', holdMs: 4500 },
      { scroll: 400, scrollSteps: 14 },
      { goto: '/volunteer', holdMs: 3200 },
      { goto: '/fundraising', holdMs: 2800 },
      { goto: '/board', holdMs: 3000 },
      { goto: '/meetings', holdMs: 2800 },
      { goto: '/membership', holdMs: 4000 },
    ],
  });

  await recordTour({
    name: 'ch2_membership_tour',
    holdMs: 3000,
    steps: [
      { goto: '/membership', holdMs: 8000 },
      { scroll: 280, scrollSteps: 16 },
      { holdMs: 10000 }, // linger on intro copy
      { scroll: 480, scrollSteps: 20 },
      { holdMs: 14000 }, // tiers / cards
      { scroll: 400, scrollSteps: 18 },
      { holdMs: 10000 },
      { scroll: 300, scrollSteps: 12 },
      { holdMs: 8000 },
    ],
  });

  await recordTour({
    name: 'ch3_cove_public_tour',
    holdMs: 3000,
    steps: [
      { goto: '/cove', holdMs: 7000 },
      { scroll: 400, scrollSteps: 18 },
      { holdMs: 8000 },
      { scroll: 350, scrollSteps: 16 },
      { holdMs: 7000 },
      { scroll: 250, scrollSteps: 12 },
      { holdMs: 5000 },
    ],
  });

  console.log('ALL CAPTURES DONE');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
