#!/usr/bin/env node
'use strict';
/**
 * Capture Member Portal walkthrough scrolls timed to existing VO parts.
 * Continuous Playwright video — not frame-stitched.
 *
 * Public only:
 *   SKIP_PORTAL=1 NODE_PATH=~/cwn-c0/node_modules \
 *     node scripts/capture_portal_walkthrough_vo_scrolls.js
 *
 * Free portal (headed login once):
 *   SKIP_PUBLIC=1 PORTAL_LANE=free LOGIN_WAIT_MS=600000 NODE_PATH=… \
 *     node scripts/capture_portal_walkthrough_vo_scrolls.js
 *
 * Paid portal:
 *   SKIP_PUBLIC=1 PORTAL_LANE=paid LOGIN_WAIT_MS=600000 NODE_PATH=… \
 *     node scripts/capture_portal_walkthrough_vo_scrolls.js
 */
const path = require('path');
const { execFileSync } = require('child_process');
const { captureVoSyncedScroll } = require('./capture_vo_synced_scroll');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://www.shmspto.org';
const PAD = 0.55;
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const SKIP_PUBLIC = process.env.SKIP_PUBLIC === '1';
const SKIP_PORTAL = process.env.SKIP_PORTAL === '1';
const LANE = process.env.PORTAL_LANE || 'free';

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
    out: 'assets/portal-walkthrough/scrolls/public_home_setup.mp4',
    url: `${BASE}/`,
    seconds: () => need('vo/_parts/portal_wt_p01_setup.m4a'),
    holdTop: 6.0,
    holdBottom: 4.0,
    scrollPx: 700,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/public_cove_card.mp4',
    url: `${BASE}/cove`,
    seconds: () => need('vo/_parts/portal_wt_p02_why_cove.m4a'),
    holdTop: 5.5,
    holdBottom: 3.5,
    scrollPx: 650,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/public_auth_join.mp4',
    url: `${BASE}/auth/join?mode=login`,
    seconds: () => need('vo/_parts/portal_wt_p03_start_free.m4a'),
    holdTop: 3.0,
    holdBottom: 2.2,
    scrollPx: 280,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/public_memberships.mp4',
    url: `${BASE}/membership`,
    seconds: () => need('vo/_parts/portal_wt_p08_memberships.m4a'),
    holdTop: 5.5,
    holdBottom: 3.5,
    scrollPx: 650,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/public_cove_spirit.mp4',
    url: `${BASE}/cove`,
    hash: 'cove-shop-heading',
    seconds: () => need('vo/_parts/portal_wt_p12_shared_spirit.m4a'),
    holdTop: 2.8,
    holdBottom: 2.0,
    scrollPx: 400,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/public_open_house.mp4',
    url: `${BASE}/`,
    hash: 'open-house',
    seconds: () => need('vo/_parts/portal_wt_p13_open_house.m4a'),
    holdTop: 4.0,
    holdBottom: 2.8,
    scrollPx: 350,
  },
];

const FREE_PORTAL = [
  {
    out: 'assets/portal-walkthrough/scrolls/free_portal_home.mp4',
    url: `${BASE}/member-portal`,
    seconds: () => need('vo/_parts/portal_wt_p04_free_home.m4a'),
    holdTop: 4.0,
    holdBottom: 2.0,
    scrollPx: 550,
    sanitize: true,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/free_portal_account.mp4',
    url: `${BASE}/member-portal`,
    hash: 'account',
    seconds: () => need('vo/_parts/portal_wt_p05_free_account.m4a'),
    holdTop: 3.2,
    holdBottom: 1.5,
    scrollPx: 400,
    sanitize: true,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/free_portal_students.mp4',
    url: `${BASE}/member-portal`,
    hash: 'portal-students',
    seconds: () => need('vo/_parts/portal_wt_p06_free_students.m4a'),
    holdTop: 4.0,
    holdBottom: 3.0,
    scrollPx: 550,
    sanitize: true,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/free_portal_cove.mp4',
    url: `${BASE}/member-portal`,
    hash: 'store',
    seconds: () => need('vo/_parts/portal_wt_p07_free_cove.m4a'),
    holdTop: 4.0,
    holdBottom: 2.8,
    scrollPx: 500,
    sanitize: true,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/free_portal_help.mp4',
    url: `${BASE}/member-portal`,
    hash: 'help',
    seconds: () => need('vo/_parts/portal_wt_p11_shared_tools.m4a'),
    holdTop: 3.5,
    holdBottom: 2.4,
    scrollPx: 400,
    sanitize: true,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/free_portal_calendar.mp4',
    url: `${BASE}/member-portal`,
    hash: 'calendar',
    seconds: () => need('vo/_parts/portal_wt_p11_shared_tools.m4a') * 0.55,
    holdTop: 2.5,
    holdBottom: 1.8,
    scrollPx: 280,
    sanitize: true,
  },
];

const PAID_PORTAL = [
  {
    out: 'assets/portal-walkthrough/scrolls/paid_portal_home.mp4',
    url: `${BASE}/member-portal`,
    seconds: () => need('vo/_parts/portal_wt_p09_paid_look.m4a'),
    holdTop: 4.0,
    holdBottom: 2.2,
    scrollPx: 650,
    sanitize: true,
  },
  {
    out: 'assets/portal-walkthrough/scrolls/paid_portal_cove.mp4',
    url: `${BASE}/member-portal`,
    hash: 'store',
    seconds: () => need('vo/_parts/portal_wt_p10_paid_perks.m4a'),
    holdTop: 3.2,
    holdBottom: 1.6,
    scrollPx: 400,
    sanitize: true,
  },
];

async function runJobs(jobs, { profile, headed }) {
  for (const job of jobs) {
    const seconds = typeof job.seconds === 'function' ? job.seconds() : job.seconds;
    await captureVoSyncedScroll({
      out: job.out,
      url: job.url,
      hash: job.hash || null,
      seconds,
      holdTop: job.holdTop,
      holdBottom: job.holdBottom,
      scrollPx: job.scrollPx != null ? job.scrollPx : null,
      sanitize: !!job.sanitize,
      profile: profile || null,
      headed: !!headed,
    });
  }
}

(async () => {
  if (!SKIP_PUBLIC) {
    console.log('\n=== PUBLIC (headless, VO-timed) ===\n');
    await runJobs(PUBLIC, { headed: false });
  }

  if (!SKIP_PORTAL) {
    const jobs = LANE === 'paid' ? PAID_PORTAL : FREE_PORTAL;
    console.log(`\n=== PORTAL lane=${LANE} (headed login) ===\n`);
    await runJobs(jobs, {
      profile: '.pw-portal-profile',
      headed: true,
    });
  }

  console.log('\nDone. Reassemble:\n  node scripts/assemble_portal_walkthrough.js\n');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
