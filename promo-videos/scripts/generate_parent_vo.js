#!/usr/bin/env node
'use strict';
/**
 * Generate parent-tour VO parts from *_elevenlabs.txt (one line = one m4a).
 * Voice: BTM ElevenLabs Cw9uRGud1Qq3szlTqQXG
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/generate_parent_vo.js
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const { synthesizeSpeech } = require('/Users/robertgregory/cwn-c0/lib/clip_comp_tts');

const ROOT = path.resolve(__dirname, '..');
const PARTS = path.join(ROOT, 'vo', '_parts');
const VOICE = process.env.SHMS_PARENT_VOICE_ID || 'Cw9uRGud1Qq3szlTqQXG';

const CHAPTERS = [
  {
    script: 'scripts/short01_website_elevenlabs.txt',
    prefix: 'ch01_website',
    names: [
      'p01', 'p01b',
      'p02_programs', 'p02_events', 'p02_cove', 'p02_volunteer',
      'p02_fundraising', 'p02_board', 'p02_meetings',
      'p03',
    ],
  },
  {
    script: 'scripts/short02_membership_elevenlabs.txt',
    prefix: 'ch02_membership',
    names: ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07'],
  },
  {
    script: 'scripts/short03_cove_card_elevenlabs.txt',
    prefix: 'ch03_cove_card',
    names: ['p01', 'p01b_onboarding', 'p02', 'p03', 'p04', 'p05', 'p06'],
  },
];

function linesOf(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

async function main() {
  fs.mkdirSync(PARTS, { recursive: true });
  console.log(`[parent-vo] voice ${VOICE}`);

  for (const ch of CHAPTERS) {
    const lines = linesOf(ch.script);
    if (lines.length !== ch.names.length) {
      throw new Error(`${ch.script}: ${lines.length} lines, expected ${ch.names.length}`);
    }
    for (let i = 0; i < lines.length; i++) {
      const out = path.join(PARTS, `${ch.prefix}_${ch.names[i]}.m4a`);
      console.log(`→ ${path.basename(out)}`);
      const r = await synthesizeSpeech(lines[i], out, {
        voiceId: VOICE,
        log: (m) => console.log(m),
      });
      if (!r) throw new Error(`TTS failed for ${out}`);
      // small pause between API calls
      await new Promise((res) => setTimeout(res, 400));
    }
  }

  // Remove obsolete single-list menu part if present
  const obsolete = path.join(PARTS, 'ch01_website_p02.m4a');
  if (fs.existsSync(obsolete)) {
    fs.renameSync(obsolete, path.join(PARTS, 'ch01_website_p02_LEGACY.m4a'));
    console.log('Renamed legacy ch01_website_p02.m4a → *_LEGACY.m4a');
  }

  console.log('[parent-vo] DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
