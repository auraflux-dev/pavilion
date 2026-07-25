#!/usr/bin/env node
'use strict';
/**
 * Burn "SHMS PTO" under the official seal on cold-open + outro thumbs.
 * Always brands from *_pre_shmspto.png backups (created once from unbranded cards).
 *
 *   node scripts/brand_intro_outro_thumbs.js
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
  '/Library/Fonts/Arial Bold.ttf',
].find((f) => fs.existsSync(f));

if (!FONT) throw new Error('No Arial Bold font found');

function brand(bakName, destName) {
  const src = path.join(THUMBS, bakName);
  const dest = path.join(THUMBS, destName);
  if (!fs.existsSync(src)) throw new Error(`Missing backup ${bakName}`);

  // Lime label centered under the white seal circle (seal cx ≈ 1500 on 1920 cards)
  const SEAL_CX = 1500;
  const vf = [
    `drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:`,
    `text='SHMS PTO':`,
    `fontsize=48:fontcolor=0x98C818:`,
    `x=${SEAL_CX}-text_w/2:`,
    `y=h*0.905`,
  ].join('');

  execFileSync(ff, [
    '-y', '-i', src,
    '-vf', vf,
    '-frames:v', '1',
    '-update', '1',
    dest,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log('Branded →', destName);
}

for (const name of ['cold_open_thumb.png', 'outro_thank_you.png']) {
  const bak = path.join(THUMBS, name.replace('.png', '_pre_shmspto.png'));
  const src = path.join(THUMBS, name);
  if (!fs.existsSync(bak)) {
    if (!fs.existsSync(src)) throw new Error(`Missing ${name}`);
    fs.copyFileSync(src, bak);
    console.log('Backup →', path.basename(bak));
  }
}

brand('cold_open_thumb_pre_shmspto.png', 'cold_open_thumb.png');
brand('outro_thank_you_pre_shmspto.png', 'outro_thank_you.png');
console.log('DONE — SHMS PTO under seal on intro + outro');
