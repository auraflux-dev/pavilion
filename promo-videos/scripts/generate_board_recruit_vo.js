#!/usr/bin/env node
'use strict';
/**
 * Generate board-recruit VO parts from board_recruit_elevenlabs.txt (one line = one m4a).
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/generate_board_recruit_vo.js
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const { synthesizeSpeech } = require('/Users/robertgregory/cwn-c0/lib/clip_comp_tts');

const ROOT = path.resolve(__dirname, '..');
const PARTS = path.join(ROOT, 'vo', '_parts');
const VOICE = process.env.SHMS_PARENT_VOICE_ID || 'Cw9uRGud1Qq3szlTqQXG';
const SCRIPT = 'scripts/board_recruit_elevenlabs.txt';

const NAMES = [
  'p01_open',
  'p02_need_asap',
  'p03_secretary',
  'p04_treasurer',
  'p05_seac',
  'p06_events',
  'p07_initiatives',
  'p08_benefits',
  'p09_donate_initiatives',
  'p10_apply_board',
  'p11_volunteer_fallback',
  'p12_volunteer_ways',
  'p13_close',
];

function linesOf(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

async function main() {
  fs.mkdirSync(PARTS, { recursive: true });
  const lines = linesOf(SCRIPT);
  if (lines.length !== NAMES.length) {
    throw new Error(`${SCRIPT}: ${lines.length} lines, expected ${NAMES.length}`);
  }
  console.log(`[board-vo] voice ${VOICE}`);
  for (let i = 0; i < lines.length; i++) {
    const out = path.join(PARTS, `board_${NAMES[i]}.m4a`);
    console.log(`→ ${path.basename(out)}`);
    const r = await synthesizeSpeech(lines[i], out, {
      voiceId: VOICE,
      log: (m) => console.log(m),
    });
    if (!r) throw new Error(`TTS failed for ${out}`);
    await new Promise((res) => setTimeout(res, 400));
  }
  console.log('[board-vo] DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
