#!/usr/bin/env node
'use strict';
/**
 * Staff Cove in-person VO (BTM voice). one line = one m4a.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/generate_staff_cove_vo.js
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const { synthesizeSpeech } = require('/Users/robertgregory/cwn-c0/lib/clip_comp_tts');

const ROOT = path.resolve(__dirname, '..');
const PARTS = path.join(ROOT, 'vo', '_parts');
const VOICE = process.env.SHMS_STAFF_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || 'HipISpBLZRLPyPUfTGkV';
const SCRIPT = 'scripts/staff_cove_inperson_elevenlabs.txt';

if (!String(process.env.ELEVENLABS_API_KEY || '').startsWith('sk_')) {
  console.error(
    'ELEVENLABS_API_KEY must be a real key starting with sk_.\n' +
      'CWN .env currently stores an API key ID (rejected by ElevenLabs).\n' +
      'Export a fresh key, then re-run:\n' +
      '  ELEVENLABS_API_KEY=sk_... NODE_PATH=~/cwn-c0/node_modules node scripts/generate_staff_cove_vo.js'
  );
  process.exit(1);
}

const NAMES = [
  'p01_two_devices',
  'p02_before_bell',
  'p03_lane_a',
  'p04_low_balance',
  'p05_lane_b',
  'p06_close',
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
  console.log(`[staff-cove-vo] voice ${VOICE}`);
  for (let i = 0; i < lines.length; i++) {
    const out = path.join(PARTS, `staff_cove_${NAMES[i]}.m4a`);
    console.log(`→ ${path.basename(out)}`);
    const r = await synthesizeSpeech(lines[i], out, {
      voiceId: VOICE,
      log: (m) => console.log(m),
    });
    if (!r) throw new Error(`TTS failed for ${out}`);
    await new Promise((res) => setTimeout(res, 400));
  }
  console.log('[staff-cove-vo] DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
