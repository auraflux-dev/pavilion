#!/usr/bin/env node
'use strict';
/**
 * Evergreen cold-open title: YOUR PTO WEBSITE (covers old NEW PTO WEBSITE).
 * Then re-applies SHMS PTO under the seal.
 *
 *   node scripts/evergreen_cold_open_thumb.js
 *   node scripts/brand_intro_outro_thumbs.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const THUMBS = path.resolve(__dirname, '../assets/parent-tour/thumbs');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const FONT = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
].find((f) => fs.existsSync(f));

if (!FONT) throw new Error('No Arial Bold font');

const src = path.join(THUMBS, 'cold_open_thumb_pre_shmspto.png');
const mid = path.join(THUMBS, 'cold_open_thumb_evergreen_base.png');
if (!fs.existsSync(src)) throw new Error('Missing cold_open_thumb_pre_shmspto.png');

// Cover old "NEW PTO WEBSITE" block (left title area) with site green, draw evergreen title
const vf = [
  `drawbox=x=70:y=340:w=920:h=120:color=0x085508:t=fill`,
  `drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='YOUR PTO WEBSITE':fontsize=72:fontcolor=white:x=90:y=365`,
].join(',');

execFileSync(ff, [
  '-y', '-i', src,
  '-vf', vf,
  '-frames:v', '1', '-update', '1',
  mid,
], { stdio: 'inherit' });

// Use evergreen base as the new pre_shmspto so brand script stays consistent
fs.copyFileSync(mid, src);
fs.copyFileSync(mid, path.join(THUMBS, 'cold_open_thumb.png'));
console.log('Evergreen cold open base →', mid);
console.log('Next: node scripts/brand_intro_outro_thumbs.js');
