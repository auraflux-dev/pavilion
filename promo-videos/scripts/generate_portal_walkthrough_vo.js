#!/usr/bin/env node
'use strict';
/**
 * Member Portal walkthrough VO — conversational takes, warmer TTS settings.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/generate_portal_walkthrough_vo.js
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
const SCRIPT = 'scripts/portal_walkthrough_elevenlabs.txt';
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
  console.error('ELEVENLABS_API_KEY must start with sk_.');
  process.exit(1);
}

/** Story VO: setup → Cove why → free → memberships → paid → shared → Open House. */
const NAMES = [
  'p01_setup',
  'p02_why_cove',
  'p03_start_free',
  'p04_free_home',
  'p05_free_account',
  'p06_free_students',
  'p07_free_cove',
  'p08_memberships',
  'p09_paid_look',
  'p10_paid_perks',
  'p11_shared_tools',
  'p12_shared_spirit',
  'p13_open_house',
  'p14_close',
];

/** Warmer / less flat than default multilingual settings. */
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
  const tmp = path.join(os.tmpdir(), `portal_wt_${Date.now()}.mp3`);
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
    throw new Error(`${SCRIPT}: ${lines.length} lines, expected ${NAMES.length}`);
  }
  console.log(`[portal-wt-vo] voice ${VOICE} · model ${MODEL}`);
  console.log(`[portal-wt-vo] settings`, VOICE_SETTINGS);
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    const out = path.join(PARTS, `portal_wt_${NAMES[i]}.m4a`);
    process.stdout.write(`→ ${path.basename(out)} … `);
    const d = await synth(lines[i], out);
    total += d;
    console.log(`${d.toFixed(1)}s`);
    await new Promise((r) => setTimeout(r, 350));
  }
  console.log(`[portal-wt-vo] DONE · ${NAMES.length} parts · ${total.toFixed(1)}s total`);
}

main().catch((e) => {
  console.error(e.response?.data ? Buffer.from(e.response.data).toString().slice(0, 400) : e);
  process.exit(1);
});
