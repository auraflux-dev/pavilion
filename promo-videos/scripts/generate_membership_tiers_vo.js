#!/usr/bin/env node
'use strict';
/**
 * Membership tiers VO — same voice/settings as Member Portal walkthrough.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/generate_membership_tiers_vo.js
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PARTS = path.join(ROOT, 'vo', '_parts');
const VOICE = process.env.SHMS_PARENT_VOICE_ID || 'Cw9uRGud1Qq3szlTqQXG';
const SCRIPT = 'scripts/membership_tiers_elevenlabs.txt';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const PREFIX = 'membership_tiers';

if (!String(process.env.ELEVENLABS_API_KEY || '').startsWith('sk_')) {
  const envText = fs.readFileSync('/Users/robertgregory/cwn-c0/.env', 'utf8');
  const match = [...envText.matchAll(/^ELEVENLABS_API_KEY=(.+)$/gm)]
    .map((m) => m[1].trim().replace(/^["']|["']$/g, ''))
    .find((k) => k.startsWith('sk_'));
  if (match) process.env.ELEVENLABS_API_KEY = match;
}

if (!String(process.env.ELEVENLABS_API_KEY || '').startsWith('sk_')) {
  console.error('ELEVENLABS_API_KEY must start with sk_.');
  process.exit(1);
}

const NAMES = [
  'p01_who',
  'p02_frame',
  'p03_cove_card',
  'p04_enrich_food',
  'p05_swag',
  'p06_reef',
  'p07_lagoon',
  'p08_tide',
  'p09_faculty',
  'p10_purchase',
  'p11_paid_portal',
  'p12_close',
];

// Brighter / clearer than the prior "warm" settings (0.94 speed + low stability
// read as tired, and long dense lines trailed into gibberish).
const VOICE_SETTINGS = {
  stability: 0.48,
  similarity_boost: 0.78,
  style: 0.28,
  use_speaker_boost: true,
  speed: 1.0,
};

function linesOf(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

async function synth(text, outM4a) {
  const tmp = path.join(os.tmpdir(), `${PREFIX}_${Date.now()}.mp3`);
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
    }
  );
  fs.writeFileSync(tmp, Buffer.from(resp.data));
  execFileSync(ff, [
    '-y', '-i', tmp,
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    outM4a,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  try { fs.unlinkSync(tmp); } catch { /* ok */ }
  const dur = parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', outM4a,
  ], { encoding: 'utf8' }).trim());
  return dur;
}

async function main() {
  fs.mkdirSync(PARTS, { recursive: true });
  const lines = linesOf(SCRIPT);
  if (lines.length !== NAMES.length) {
    console.error(`Expected ${NAMES.length} VO lines, got ${lines.length}`);
    process.exit(1);
  }
  const only = new Set(
    String(process.env.PARTS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  console.log('[membership-tiers-vo] settings', VOICE_SETTINGS);
  let total = 0;
  for (let i = 0; i < NAMES.length; i++) {
    if (only.size && ![...only].some((p) => NAMES[i].includes(p) || NAMES[i] === p)) {
      const existing = path.join(PARTS, `${PREFIX}_${NAMES[i]}.m4a`);
      if (fs.existsSync(existing)) {
        const d = parseFloat(execFileSync(fp, [
          '-v', 'error', '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1', existing,
        ], { encoding: 'utf8' }).trim());
        total += d;
        console.log(`skip ${NAMES[i]} (${d.toFixed(1)}s)`);
      } else {
        console.log(`skip ${NAMES[i]} (missing)`);
      }
      continue;
    }
    const out = path.join(PARTS, `${PREFIX}_${NAMES[i]}.m4a`);
    process.stdout.write(`${NAMES[i]}… `);
    const dur = await synth(lines[i], out);
    total += dur;
    console.log(`${dur.toFixed(1)}s → ${path.basename(out)}`);
  }
  console.log(`TOTAL VO ≈ ${total.toFixed(1)}s (${NAMES.length} parts)`);
}

main().catch((e) => {
  console.error(e.response?.data ? Buffer.from(e.response.data).toString() : e);
  process.exit(1);
});
