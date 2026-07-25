#!/usr/bin/env node
'use strict';
/**
 * STAPLE brand bookends for every SHMSPTO promo video.
 *
 * Every assemble MUST:
 *   1. Open with cold-open card (~5s, music bed, no VO)
 *   2. Close with thank-you / Go Stingrays card (~4s, music fade, no VO)
 *   3. Show official seal + lime "SHMS PTO" under the seal
 *
 * Shared assets live in assets/parent-tour/thumbs/ (branded via brand_intro_outro_thumbs.js).
 * Per-video cold opens may override the TITLE card but keep the same seal treatment.
 *
 *   node scripts/staple_brand_bookends.js          # print paths + regenerate board cold open
 *   require('./staple_brand_bookends') from assemble_*
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const THUMBS = path.join(ROOT, 'assets/parent-tour/thumbs');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const FONT = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
].find((f) => fs.existsSync(f));

/** Fixed timings — do not change without updating all assemblers + Gemini QA */
const COLD_SEC = 5.0;
const OUTRO_SEC = 4.0;

const PATHS = {
  /** Parent-tour / default cold open (NEW PTO WEBSITE) */
  coldOpenDefault: path.join(THUMBS, 'cold_open_thumb.png'),
  /** Board recruiting cold open (OPEN BOARD SEATS) */
  coldOpenBoard: path.join(THUMBS, 'cold_open_board_recruit.png'),
  outro: path.join(THUMBS, 'outro_thank_you.png'),
  bgSite: path.join(THUMBS, 'bg_site_only.png'),
  logo: path.join(ROOT, 'assets/parent-tour/ch3/06_logo.png'),
};

function ensureBoardColdOpen() {
  if (!FONT) throw new Error('Arial Bold font missing');
  const bg = fs.existsSync(PATHS.bgSite) ? PATHS.bgSite : PATHS.coldOpenDefault;
  const logo = PATHS.logo;
  if (!fs.existsSync(logo)) throw new Error(`Missing logo ${logo}`);

  // Same visual language as parent cold open: site green plate + seal + title + SHMS PTO under seal
  const vf = [
    `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg]`,
    `[1:v]scale=520:-1,format=rgba[lg]`,
    `[bg][lg]overlay=x=1920-w-160:y=(1080-h)/2-20[v1]`,
    `drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='OPEN BOARD SEATS':fontsize=72:fontcolor=white:x=90:y=340`,
    `drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='Serve your SHMS PTO':fontsize=40:fontcolor=0x98C818:x=90:y=440`,
    `drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='SHMS PTO':fontsize=48:fontcolor=0x98C818:x=1920*0.745-text_w/2:y=1080*0.905`,
  ];
  // filter_complex for overlay + drawtext on result
  const fc = [
    `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg]`,
    `[1:v]scale=520:-1,format=rgba[lg]`,
    `[bg][lg]overlay=x=1920-w-160:y=(1080-h)/2-20[v1]`,
    `[v1]drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='OPEN BOARD SEATS':fontsize=72:fontcolor=white:x=90:y=340,` +
      `drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='Serve your SHMS PTO':fontsize=40:fontcolor=0x98C818:x=90:y=440,` +
      `drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='SHMS PTO':fontsize=48:fontcolor=0x98C818:x=1920*0.745-text_w/2:y=1080*0.905`,
  ].join(';');

  execFileSync(ff, [
    '-y', '-i', bg, '-i', logo,
    '-filter_complex', fc,
    '-frames:v', '1', '-update', '1',
    PATHS.coldOpenBoard,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  return PATHS.coldOpenBoard;
}

function assertStapleAssets(coldPath) {
  const cold = coldPath || PATHS.coldOpenDefault;
  for (const [label, p] of [['cold-open', cold], ['outro', PATHS.outro]]) {
    if (!fs.existsSync(p)) throw new Error(`STAPLE missing ${label}: ${p}`);
  }
}

if (require.main === module) {
  ensureBoardColdOpen();
  assertStapleAssets(PATHS.coldOpenBoard);
  console.log('STAPLE timings: cold', COLD_SEC, 's · outro', OUTRO_SEC, 's');
  console.log('cold default →', PATHS.coldOpenDefault);
  console.log('cold board   →', PATHS.coldOpenBoard);
  console.log('outro        →', PATHS.outro);
}

module.exports = {
  COLD_SEC,
  OUTRO_SEC,
  PATHS,
  ensureBoardColdOpen,
  assertStapleAssets,
};
