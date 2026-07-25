#!/usr/bin/env node
'use strict';
/**
 * Assemble board recruiting 16:9 video.
 * STAPLE: matching intro + outro logo cards (staple_brand_bookends.js).
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/assemble_board_recruit.js
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_board_recruit_qa.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const {
  COLD_SEC,
  OUTRO_SEC,
  TEXT_TOP,
  LOGO_W,
  LOGO_X,
  LOGO_Y,
  LOGO_CX,
  LABEL_Y,
  PATHS: STAPLE,
  ensureBoardColdOpen,
  ensureBoardOutro,
  assertStapleAssets,
} = require('./staple_brand_bookends');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const WORK = path.join(OUT_DIR, '_work_board');
const ASSETS = path.join(ROOT, 'assets/board-recruit');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const FONT = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
].find((f) => fs.existsSync(f));
const FONT_REG = [
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/Library/Fonts/Arial.ttf',
  FONT,
].find((f) => f && fs.existsSync(f));

const W = 1920;
const H = 1080;
const FPS = 30;
const VF = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS}`;
const PAD = 0.9;
/** Hold after last VO so thank-you finishes before silent outro */
const TAIL_PAD = 1.2;

/**
 * Universal type scale — same sizes on every slide (no per-slide scaling).
 * Sized so the densest slide (5 bullets) still clears the wave crest.
 */
const TEXT_X = 110;
const BULLET_X = 140;
const TYPE_EYEBROW = 40;
const TYPE_TITLE = 72;
const TYPE_BULLET = 44;
const TYPE_BRAND = 44;
const TYPE_FOOTER = 38;
const STEP_EYEBROW = 56;
const STEP_TITLE = 88;
const STEP_BULLET = 48;
/** Bottom of glyphs must stay above this (wave crest at TEXT_X≈110) */
const WAVE_SAFE_MAX_Y = 540;
const CONTENT_MAX_Y = WAVE_SAFE_MAX_Y;
/** Commitment under seal — dropped for breathing room below SHMS PTO */
const FOOTER_Y = LABEL_Y + 130;

const BEATS = [
  { part: 'vo/_parts/board_p01_open.m4a', still: 'assets/board-recruit/slide_open.png', caption: 'Five Board Seats Open' },
  { part: 'vo/_parts/board_p02_need_asap.m4a', still: 'assets/board-recruit/slide_roles.png', caption: 'Five Roles · ASAP' },
  { part: 'vo/_parts/board_p03_secretary.m4a', still: 'assets/board-recruit/slide_secretary.png', caption: 'Secretary' },
  { part: 'vo/_parts/board_p04_treasurer.m4a', still: 'assets/board-recruit/slide_treasurer.png', caption: 'Treasurer' },
  { part: 'vo/_parts/board_p05_seac.m4a', still: 'assets/board-recruit/slide_seac.png', caption: 'SEAC Representative' },
  { part: 'vo/_parts/board_p06_events.m4a', still: 'assets/board-recruit/slide_events.png', caption: 'Events Coordinator' },
  { part: 'vo/_parts/board_p07_initiatives.m4a', still: 'assets/board-recruit/slide_initiatives.png', caption: 'Initiatives Coordinator' },
  { part: 'vo/_parts/board_p08_benefits.m4a', still: 'assets/board-recruit/slide_benefits.png', caption: 'Board Benefits' },
  { part: 'vo/_parts/board_p10_apply_board.m4a', still: 'assets/board-recruit/slide_apply.png', caption: 'Board Page On Our Website' },
  { part: 'vo/_parts/board_p11_volunteer_fallback.m4a', still: 'assets/board-recruit/slide_volunteer.png', caption: 'Cannot Join The Board? Volunteer' },
  { part: 'vo/_parts/board_p12_volunteer_ways.m4a', still: 'assets/board-recruit/03_volunteer_form.png', caption: 'SHMSPTO.ORG/Volunteer' },
  { part: 'vo/_parts/board_p13_close.m4a', still: 'assets/board-recruit/slide_thanks.png', caption: 'Thank You — Go Stingrays!' },
];

function a(rel) { return path.join(ROOT, rel); }
function esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}
function dur(file) {
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}
function run(args) {
  execFileSync(ff, args, { stdio: ['ignore', 'ignore', 'inherit'] });
}

/**
 * Site-green slide: left text aligned to logo top; footer clear of waves.
 */
function makeSlide(outName, { eyebrow, title, bullets = [], footer }) {
  const out = path.join(ASSETS, outName);
  const bg = a('assets/parent-tour/thumbs/bg_site_only.png');
  const logo = a('assets/parent-tour/ch3/06_logo.png');
  const src = fs.existsSync(bg) ? bg : a('assets/v2-team-volunteer/v2-01-board.png');
  const fontB = FONT.replace(/:/g, '\\:');
  const fontR = FONT_REG.replace(/:/g, '\\:');

  const parts = [
    `[0:v]${VF}[bg]`,
    `[1:v]scale=${LOGO_W}:-1,format=rgba[lg]`,
    `[bg][lg]overlay=x=${LOGO_X}:y=${LOGO_Y}[v0]`,
  ];

  let last = 'v0';
  let n = 1;
  const addText = (text, { size, color, x, y, bold = true }) => {
    const tag = `v${n++}`;
    const f = bold ? fontB : fontR;
    parts.push(
      `[${last}]drawtext=fontfile=${f}:text='${esc(text)}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}[${tag}]`
    );
    last = tag;
  };

  addText('SHMS PTO', {
    size: TYPE_BRAND,
    color: '0x98C818',
    x: `${LOGO_CX}-text_w/2`,
    y: LABEL_Y,
  });

  // Left column — universal type, same top as logo
  let y = TEXT_TOP;
  if (eyebrow) {
    addText(eyebrow, { size: TYPE_EYEBROW, color: '0x98C818', x: TEXT_X, y });
    y += STEP_EYEBROW;
  }
  addText(title, {
    size: TYPE_TITLE,
    color: 'white',
    x: TEXT_X,
    y,
  });
  y += STEP_TITLE;

  for (const b of bullets) {
    if (y + TYPE_BULLET > CONTENT_MAX_Y) break;
    addText(`•  ${b}`, { size: TYPE_BULLET, color: 'white', x: BULLET_X, y, bold: false });
    y += STEP_BULLET;
  }
  if (footer) {
    const tag = `v${n++}`;
    parts.push(
      `[${last}]drawtext=fontfile=${fontB}:text='${esc(footer)}':fontsize=${TYPE_FOOTER}:fontcolor=white:` +
      `borderw=3:bordercolor=black@0.8:x=${LOGO_CX}-text_w/2:y=${FOOTER_Y}[${tag}]`
    );
    last = tag;
  }

  run([
    '-y', '-i', src, '-i', logo,
    '-filter_complex', parts.join(';'),
    '-map', `[${last}]`,
    '-frames:v', '1', '-update', '1',
    out,
  ]);
  return out;
}

function buildAllSlides() {
  fs.mkdirSync(ASSETS, { recursive: true });

  makeSlide('slide_open.png', {
    eyebrow: 'SHMS PTO Board',
    title: 'Five Seats Open',
    bullets: [
      'Secretary',
      'Treasurer',
      'SEAC Representative',
      'Events Coordinator',
      'Initiatives Coordinator',
    ],
    footer: 'Parent Volunteers · Join This Year',
  });

  makeSlide('slide_roles.png', {
    eyebrow: 'What You Need To Know',
    title: 'Five Roles · ASAP',
    bullets: [
      'What Each Role Does',
      'How You Help Month To Month',
      'How To Raise Your Hand',
    ],
    footer: 'No Prior PTO Experience Required',
  });

  makeSlide('slide_secretary.png', {
    eyebrow: 'Board Role',
    title: 'Secretary',
    bullets: [
      'Meeting Minutes & Records',
      'Calendar & Communications',
      'Match Parents To Micro-Tasks',
    ],
    footer: '~3–5 Hours / Month · Plus Board Meetings',
  });

  makeSlide('slide_treasurer.png', {
    eyebrow: 'Board Role',
    title: 'Treasurer',
    bullets: [
      'Budget & Bank Accounts',
      'Payments & Reimbursements',
      'Insurance & Tax Filings',
    ],
    footer: '~4–6 Hours / Month · Plus Board Meetings',
  });

  makeSlide('slide_seac.png', {
    eyebrow: 'Board Role · Liaison',
    title: 'SEAC Representative',
    bullets: [
      'Monthly District SEAC Meetings',
      'Bridge For Special Education Families',
      'Keep SHMS Events Inclusive',
    ],
    footer: 'LCPS-Appointed · Also Email The President',
  });

  makeSlide('slide_events.png', {
    eyebrow: 'Supports VP Of Events',
    title: 'Events Coordinator',
    bullets: [
      'Inclusive Family Events',
      'Staff Appreciation',
      'Bite-Sized Volunteer Tasks',
    ],
    footer: '~2–4 Hours / Month',
  });

  makeSlide('slide_initiatives.png', {
    eyebrow: 'Supports Fundraising & Programs',
    title: 'Initiatives Coordinator',
    bullets: [
      'Enrichment Program Logistics',
      'Tournaments & Academic Events',
      'Local Business Sponsorships',
    ],
    footer: '~2–4 Hours / Month',
  });

  makeSlide('slide_benefits.png', {
    eyebrow: 'Board Positions Only',
    title: 'Board Benefits',
    bullets: [
      'Free Reef Membership (First Tier)',
      '75 Percent Off 1 Enrichment Program Per Season',
      'Inside Knowledge — School Updates First',
      'Direct Impact — Vote On How Funds Are Spent',
    ],
    footer: 'For These Open Board Seats',
  });

  makeSlide('slide_apply.png', {
    eyebrow: 'Ready For A Board Seat?',
    title: 'Board Page On Our Website',
    bullets: [
      'Visit The Board Page At SHMSPTO.ORG',
      'Email President@SHMSPTO.ORG',
      'Tell Us Which Role You Want',
    ],
    footer: 'We Need You ASAP',
  });

  makeSlide('slide_volunteer.png', {
    eyebrow: 'Cannot Join The Board?',
    title: 'Volunteer With Us',
    bullets: [
      'Visit The Volunteer Page',
      'Fill Out The Form',
      'Offer Any Contribution Of Time',
    ],
    footer: 'SHMSPTO.ORG/Volunteer',
  });

  // Same branding language as intro/outro bookends
  makeSlide('slide_thanks.png', {
    eyebrow: 'SHMS PTO',
    title: 'Thank You',
    bullets: [
      'Stingray Families',
      'Go Stingrays!',
    ],
    footer: 'SHMSPTO.ORG',
  });
}

function stillHold(img, outMp4, seconds) {
  run([
    '-y', '-loop', '1', '-i', img,
    '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`,
    '-vf', VF,
    '-t', String(seconds),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-shortest',
    outMp4,
  ]);
}

function tsFmt(x) {
  const h = Math.floor(x / 3600);
  const m = Math.floor((x % 3600) / 60);
  const s = Math.floor(x % 60);
  const ms = Math.floor((x % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function musicBed(srcMusic, outAac, seconds, { fadeOut = true, startAt = 0 } = {}) {
  const fade = fadeOut
    ? `,afade=t=out:st=${Math.max(0, seconds - 1.2)}:d=1.2`
    : '';
  run([
    '-y', '-ss', String(startAt), '-i', srcMusic, '-t', String(seconds),
    '-af', `volume=-20dB,afade=t=in:st=0:d=0.6${fade}`,
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', outAac,
  ]);
}

function muxSilentStill(img, audio, dest, seconds) {
  run([
    '-y', '-loop', '1', '-i', img, '-i', audio,
    '-vf', VF, '-t', String(seconds),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-shortest',
    dest,
  ]);
}

function main() {
  if (!FONT) throw new Error('Arial Bold font missing');
  fs.mkdirSync(WORK, { recursive: true });

  const coldImg = ensureBoardColdOpen();
  const outroImg = ensureBoardOutro();
  assertStapleAssets(coldImg, outroImg);
  console.log(`STAPLE: matching intro + outro logo cards (${COLD_SEC}s / ${OUTRO_SEC}s)`);
  console.log('Building designed slides…');
  buildAllSlides();

  const music = a('assets/music/es_go_adelyn_paik_instrumental.mp3');
  if (!fs.existsSync(music)) throw new Error('Missing music bed');

  const coldA = path.join(WORK, 'cold_a.m4a');
  const coldClip = path.join(WORK, '00_cold.mp4');
  musicBed(music, coldA, COLD_SEC, { fadeOut: false });
  muxSilentStill(coldImg, coldA, coldClip, COLD_SEC);

  const bodyClips = [];
  const srt = [];
  let t = COLD_SEC;
  srt.push(`1\n${tsFmt(0)} --> ${tsFmt(COLD_SEC - 0.05)}\nOpen Board Seats · Join The SHMS PTO\n`);

  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    const vo = a(b.part);
    if (!fs.existsSync(vo)) throw new Error(`Missing VO ${b.part}`);
    const img = a(b.still);
    if (!fs.existsSync(img)) throw new Error(`Missing still ${b.still}`);
    const isLast = i === BEATS.length - 1;
    const d = dur(vo) + PAD + (isLast ? TAIL_PAD : 0);
    const clip = path.join(WORK, `beat_${String(i).padStart(2, '0')}.mp4`);
    stillHold(img, clip, d);
    const muxed = path.join(WORK, `beat_${String(i).padStart(2, '0')}_m.mp4`);
    // Pad VO with silence so thank-you finishes before outro bookend
    const padDur = PAD + (isLast ? TAIL_PAD : 0);
    run([
      '-y', '-i', clip, '-i', vo,
      '-filter_complex', `[1:a]apad=pad_dur=${padDur}[a]`,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-t', String(d),
      muxed,
    ]);
    bodyClips.push(muxed);
    const start = t;
    t += d;
    srt.push(`${i + 2}\n${tsFmt(start)} --> ${tsFmt(start + dur(vo))}\n${b.caption}\n`);
  }

  // Silent matching outro — music only, AFTER thank-you VO fully ends
  const outroA = path.join(WORK, 'outro_a.m4a');
  const outroClip = path.join(WORK, '99_outro.mp4');
  musicBed(music, outroA, OUTRO_SEC, { fadeOut: true, startAt: 28 });
  muxSilentStill(outroImg, outroA, outroClip, OUTRO_SEC);
  srt.push(`${BEATS.length + 2}\n${tsFmt(t)} --> ${tsFmt(t + OUTRO_SEC - 0.05)}\nThank You · Go Stingrays · SHMS PTO\n`);

  const list = path.join(WORK, 'concat.txt');
  const all = [coldClip, ...bodyClips, outroClip];
  fs.writeFileSync(list, all.map((c) => `file '${c}'`).join('\n'));
  const joined = path.join(WORK, 'joined.mp4');
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);

  const out = path.join(OUT_DIR, 'SHMSPTO_board_recruit_16x9.mp4');
  const watch = path.join(os.homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_board_recruit_16x9.mp4');
  run([
    '-y', '-i', joined, '-stream_loop', '-1', '-i', music,
    '-filter_complex',
    `[1:a]volume=0.08,afade=t=in:st=0:d=0.5[a1];` +
      `[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2:weights=1 0.35[a]`,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    '-movflags', '+faststart',
    out,
  ]);

  fs.copyFileSync(out, watch);
  fs.writeFileSync(path.join(OUT_DIR, 'SHMSPTO_board_recruit_captions.srt'), srt.join('\n'));
  console.log('DONE', out);
  console.log('Watch file (Gemini PASS before Rob opens):', watch);
  console.log('duration', dur(out).toFixed(1) + 's');
}

main();
