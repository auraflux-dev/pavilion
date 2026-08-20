#!/usr/bin/env node
'use strict';
/**
 * Staff newsletter Diane VO — conversational coach, warmer TTS (portal-walkthrough style).
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/generate_staff_newsletter_diane_vo.js
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PARTS = path.join(ROOT, 'vo', '_parts');
/** Same warmer voice as parent/portal walkthroughs — less flat checklist read. */
const VOICE = process.env.SHMS_STAFF_VOICE_ID || process.env.SHMS_PARENT_VOICE_ID || 'Cw9uRGud1Qq3szlTqQXG';
const SCRIPT = 'scripts/staff_newsletter_diane_elevenlabs.txt';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';

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

/** Warmer / less robotic than default multilingual flat settings. */
const VOICE_SETTINGS = {
  stability: 0.32,
  similarity_boost: 0.78,
  style: 0.45,
  use_speaker_boost: true,
  speed: 0.94,
};

function linesOf(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

async function synth(text, outM4a) {
  const tmp = path.join(os.tmpdir(), `newsletter_diane_${Date.now()}.mp3`);
  const resp = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`,
    {
      text,
      model_id: MODEL,
      voice_settings: VOICE_SETTINGS,
    },
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 120000,
    },
  );
  fs.writeFileSync(tmp, Buffer.from(resp.data));
  execFileSync(ff, [
    '-y', '-i', tmp,
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    outM4a,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  try { fs.unlinkSync(tmp); } catch { /* ok */ }
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', outM4a,
  ], { encoding: 'utf8' }).trim());
}

async function main() {
  fs.mkdirSync(PARTS, { recursive: true });
  const lines = linesOf(SCRIPT);
  if (lines.length !== NAMES.length) {
    throw new Error(`${SCRIPT}: ${lines.length} lines, expected ${NAMES.length}`);
  }
  console.log(`[newsletter-diane-vo] voice ${VOICE}`);
  console.log('[newsletter-diane-vo] settings', VOICE_SETTINGS);
  for (let i = 0; i < lines.length; i++) {
    const out = path.join(PARTS, `staff_newsletter_diane_${NAMES[i]}.m4a`);
    console.log(`→ ${path.basename(out)}`);
    const dur = await synth(lines[i], out);
    console.log(`  ${dur.toFixed(1)}s`);
    await new Promise((res) => setTimeout(res, 400));
  }
  console.log('[newsletter-diane-vo] DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
