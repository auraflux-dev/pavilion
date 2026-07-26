#!/usr/bin/env node
'use strict';
/**
 * STAPLE brand bookends. same logo treatment for intro AND outro.
 *
 *   node scripts/staple_brand_bookends.js
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

const COLD_SEC = 5.0;
const OUTRO_SEC = 4.0;

/** Shared logo geometry (matches assemble slides) */
const LOGO_W = 480;
const LOGO_RIGHT = 140;
const LOGO_X = 1920 - LOGO_W - LOGO_RIGHT;
const LOGO_CX = LOGO_X + LOGO_W / 2;
const TEXT_TOP = 160; // logo top aligns with left text
const LOGO_Y = TEXT_TOP;
const LABEL_Y = LOGO_Y + LOGO_W + 18;

const PATHS = {
  coldOpenDefault: path.join(THUMBS, 'cold_open_thumb.png'),
  coldOpenBoard: path.join(THUMBS, 'cold_open_board_recruit.png'),
 /** Board outro. SAME logo style as board intro (no white-plate variant) */
  outroBoard: path.join(THUMBS, 'outro_board_recruit.png'),
  /** Legacy parent-tour outro (kept for parent assembler) */
  outro: path.join(THUMBS, 'outro_thank_you.png'),
  bgSite: path.join(THUMBS, 'bg_site_only.png'),
  logo: path.join(ROOT, 'assets/parent-tour/ch3/06_logo.png'),
};

function makeBrandCard(dest, { title, subtitle }) {
  if (!FONT) throw new Error('Arial Bold font missing');
  const bg = fs.existsSync(PATHS.bgSite) ? PATHS.bgSite : PATHS.coldOpenDefault;
  if (!fs.existsSync(PATHS.logo)) throw new Error(`Missing logo ${PATHS.logo}`);
  const font = FONT.replace(/:/g, '\\:');
  const t = title.replace(/:/g, '\\:').replace(/'/g, "\\'");
  const s = subtitle.replace(/:/g, '\\:').replace(/'/g, "\\'");

  const fc = [
    `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg]`,
    `[1:v]scale=${LOGO_W}:-1,format=rgba[lg]`,
    `[bg][lg]overlay=x=${LOGO_X}:y=${LOGO_Y}[v1]`,
    `[v1]drawtext=fontfile=${font}:text='${t}':fontsize=72:fontcolor=white:x=90:y=${TEXT_TOP},` +
      `drawtext=fontfile=${font}:text='${s}':fontsize=40:fontcolor=0x98C818:x=90:y=${TEXT_TOP + 100},` +
      `drawtext=fontfile=${font}:text='SHMS PTO':fontsize=44:fontcolor=0x98C818:x=${LOGO_CX}-text_w/2:y=${LABEL_Y}`,
  ].join(';');

  execFileSync(ff, [
    '-y', '-i', bg, '-i', PATHS.logo,
    '-filter_complex', fc,
    '-frames:v', '1', '-update', '1',
    dest,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  return dest;
}

function ensureBoardColdOpen() {
  return makeBrandCard(PATHS.coldOpenBoard, {
    title: 'OPEN BOARD SEATS',
    subtitle: 'Join The SHMS PTO',
  });
}

function ensureBoardOutro() {
  return makeBrandCard(PATHS.outroBoard, {
    title: 'THANK YOU',
    subtitle: 'Go Stingrays!',
  });
}

function assertStapleAssets(coldPath, outroPath) {
  const cold = coldPath || PATHS.coldOpenBoard;
  const outro = outroPath || PATHS.outroBoard;
  for (const [label, p] of [['cold-open', cold], ['outro', outro]]) {
    if (!fs.existsSync(p)) throw new Error(`STAPLE missing ${label}: ${p}`);
  }
}

if (require.main === module) {
  ensureBoardColdOpen();
  ensureBoardOutro();
  assertStapleAssets();
  console.log('STAPLE timings: cold', COLD_SEC, 's · outro', OUTRO_SEC, 's');
  console.log('cold board →', PATHS.coldOpenBoard);
  console.log('outro board→', PATHS.outroBoard);
}

module.exports = {
  COLD_SEC,
  OUTRO_SEC,
  TEXT_TOP,
  LOGO_W,
  LOGO_X,
  LOGO_Y,
  LOGO_CX,
  LABEL_Y,
  PATHS,
  ensureBoardColdOpen,
  ensureBoardOutro,
  assertStapleAssets,
};
