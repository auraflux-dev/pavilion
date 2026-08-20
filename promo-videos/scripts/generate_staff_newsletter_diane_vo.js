#!/usr/bin/env node
'use strict';
/**
 * Staff newsletter Diane VO (BTM voice). one line = one m4a.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/generate_staff_newsletter_diane_vo.js
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const { synthesizeSpeech } = require('/Users/robertgregory/cwn-c0/lib/clip_comp_tts');

const ROOT = path.resolve(__dirname, '..');
const PARTS = path.join(ROOT, 'vo', '_parts');
const VOICE = process.env.SHMS_STAFF_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || 'HipISpBLZRLPyPUfTGkV';
const SCRIPT = 'scripts/staff_newsletter_diane_elevenlabs.txt';

if (!String(process.env.ELEVENLABS_API_KEY || '').startsWith('sk_')) {
  const envText = fs.readFileSync('/Users/robertgregory/cwn-c0/.env', 'utf8');
  const match = [...envText.matchAll(/^ELEVENLABS_API_KEY=(.+)$/gm)]
    .map((m) => m[1].trim().replace(/^["']|["']$/g, ''))
    .find((k) => k.startsWith('sk_'));
  if (match) process.env.ELEVENLABS_API_KEY = match;
}

if (!String(process.env.ELEVENLABS_API_KEY || '').startsWith('sk_')) {
  console.error('ELEVENLABS_API_KEY must start with sk_. Export a key and re-run.');
  process.exit(1);
}

const NAMES = [
  'p01_sign_in',
  'p02_no_html',
  'p03_templates',
  'p04_export_png',
  'p05_test_send',
  'p06_type',
  'p07_scoop',
  'p08_beats',
  'p09_copy_utm',
  'p10_paid_send',
  'p11_schedule',
  'p12_report',
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
  console.log(`[newsletter-diane-vo] voice ${VOICE}`);
  for (let i = 0; i < lines.length; i++) {
    const out = path.join(PARTS, `staff_newsletter_diane_${NAMES[i]}.m4a`);
    console.log(`→ ${path.basename(out)}`);
    const r = await synthesizeSpeech(lines[i], out, {
      voiceId: VOICE,
      log: (m) => console.log(m),
    });
    if (!r) throw new Error(`TTS failed for ${out}`);
    await new Promise((res) => setTimeout(res, 400));
  }
  console.log('[newsletter-diane-vo] DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
