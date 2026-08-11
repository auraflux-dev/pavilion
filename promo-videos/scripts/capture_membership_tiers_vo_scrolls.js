#!/usr/bin/env node
'use strict';
/**
 * Capture Membership tiers scrolls timed to VO parts (public pages).
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/capture_membership_tiers_vo_scrolls.js
 *
 * Paid portal proof is captured from Cursor browser CDP (not this script).
 */
const path = require('path');
const { execFileSync } = require('child_process');
const { captureVoSyncedScroll } = require('./capture_vo_synced_scroll');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://www.shmspto.org';
const PAD = 0.55;
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';

function voDur(rel) {
  const f = path.join(ROOT, rel);
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', f,
  ], { encoding: 'utf8' }).trim());
}

function need(rel) {
  return voDur(rel) + PAD;
}

const PUBLIC = [
  {
    out: 'assets/membership-tiers/scrolls/public_who.mp4',
    url: `${BASE}/membership`,
    seconds: () => need('vo/_parts/membership_tiers_p01_who.m4a'),
    holdTop: 6.0,
    holdBottom: 4.0,
    scrollPx: 500,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_frame.mp4',
    url: `${BASE}/auth/join?mode=login`,
    seconds: () => need('vo/_parts/membership_tiers_p02_frame.m4a'),
    holdTop: 5.0,
    holdBottom: 3.5,
    scrollPx: 280,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_cove_card.mp4',
    url: `${BASE}/cove`,
    seconds: () => need('vo/_parts/membership_tiers_p03_cove_card.m4a'),
    holdTop: 7.0,
    holdBottom: 5.0,
    scrollPx: 700,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_enrichment.mp4',
    url: `${BASE}/programs`,
    seconds: () => need('vo/_parts/membership_tiers_p04_enrichment.m4a'),
    holdTop: 6.0,
    holdBottom: 4.0,
    scrollPx: 650,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_refreshments.mp4',
    url: `${BASE}/`,
    hash: 'open-house',
    seconds: () => need('vo/_parts/membership_tiers_p05_refreshments.m4a'),
    holdTop: 5.0,
    holdBottom: 3.5,
    scrollPx: 350,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_spiritwear.mp4',
    url: `${BASE}/cove`,
    hash: 'cove-shop-heading',
    seconds: () => need('vo/_parts/membership_tiers_p06_swag.m4a') * 0.55,
    holdTop: 3.5,
    holdBottom: 2.5,
    scrollPx: 450,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_reef.mp4',
    url: `${BASE}/membership`,
    seconds: () => need('vo/_parts/membership_tiers_p07_reef.m4a'),
    holdTop: 10.0,
    holdBottom: 8.0,
    scrollPx: 420,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_lagoon.mp4',
    url: `${BASE}/membership`,
    seconds: () => need('vo/_parts/membership_tiers_p08_lagoon.m4a'),
    holdTop: 9.0,
    holdBottom: 7.0,
    scrollPx: 520,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_tide.mp4',
    url: `${BASE}/membership`,
    seconds: () => need('vo/_parts/membership_tiers_p09_tide.m4a'),
    holdTop: 8.0,
    holdBottom: 6.0,
    scrollPx: 620,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_season.mp4',
    url: `${BASE}/membership`,
    seconds: () => need('vo/_parts/membership_tiers_p10_season.m4a'),
    holdTop: 5.0,
    holdBottom: 4.0,
    scrollPx: 900,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_join.mp4',
    url: `${BASE}/membership`,
    seconds: () => need('vo/_parts/membership_tiers_p12_join.m4a'),
    holdTop: 3.5,
    holdBottom: 2.5,
    scrollPx: 400,
  },
  {
    out: 'assets/membership-tiers/scrolls/public_close.mp4',
    url: `${BASE}/membership`,
    seconds: () => need('vo/_parts/membership_tiers_p13_close.m4a'),
    holdTop: 4.0,
    holdBottom: 3.0,
    scrollPx: 300,
  },
];

(async () => {
  console.log('\n=== MEMBERSHIP TIERS · PUBLIC VO scrolls ===\n');
  for (const job of PUBLIC) {
    const seconds = typeof job.seconds === 'function' ? job.seconds() : job.seconds;
    await captureVoSyncedScroll({
      out: job.out,
      url: job.url,
      hash: job.hash || null,
      seconds,
      holdTop: job.holdTop,
      holdBottom: job.holdBottom,
      scrollPx: job.scrollPx != null ? job.scrollPx : null,
      sanitize: false,
      profile: null,
      headed: false,
    });
  }
  console.log('\nDone public. Paid proof = Cursor CDP. Magnet still = PDF mockup.');
  console.log('Assemble: node scripts/assemble_membership_tiers.js\n');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
