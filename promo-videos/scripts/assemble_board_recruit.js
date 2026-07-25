#!/usr/bin/env node
'use strict';
/**
 * Assemble board recruiting 16:9 video (designed slides + site stills + VO).
 * STAPLE: cold open (~5s) + outro (~4s) via staple_brand_bookends.js.
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
  PATHS: STAPLE,
  ensureBoardColdOpen,
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

/** Seal placement — SHMS PTO must center under this logo */
const LOGO_W = 480;
const LOGO_RIGHT = 140;
const LOGO_X = W - LOGO_W - LOGO_RIGHT; // 1300
/** Visual center of circular seal (nudge left — stingray tail pulls bbox right) */
const LOGO_CX = LOGO_X + LOGO_W / 2 - 55;
const LOGO_Y = Math.round((H - LOGO_W) / 2 - 30); // ~270
const LABEL_Y = LOGO_Y + LOGO_W + 18; // just under seal

const BEATS = [
  { part: 'vo/_parts/board_p01_open.m4a', still: 'assets/board-recruit/slide_open.png', caption: 'Five Board Seats Open' },
  { part: 'vo/_parts/board_p02_need_asap.m4a', still: 'assets/board-recruit/slide_roles.png', caption: 'Five Roles · ASAP' },
  { part: 'vo/_parts/board_p03_secretary.m4a', still: 'assets/board-recruit/slide_secretary.png', caption: 'Secretary' },
  { part: 'vo/_parts/board_p04_treasurer.m4a', still: 'assets/board-recruit/slide_treasurer.png', caption: 'Treasurer' },
  { part: 'vo/_parts/board_p05_seac.m4a', still: 'assets/board-recruit/slide_seac.png', caption: 'SEAC Representative' },
  { part: 'vo/_parts/board_p06_events.m4a', still: 'assets/board-recruit/slide_events.png', caption: 'Events Coordinator' },
  { part: 'vo/_parts/board_p07_initiatives.m4a', still: 'assets/board-recruit/slide_initiatives.png', caption: 'Initiatives Coordinator' },
  { part: 'vo/_parts/board_p08_benefits.m4a', still: 'assets/board-recruit/slide_benefits.png', caption: 'Board Benefits' },
  { part: 'vo/_parts/board_p09_donate_initiatives.m4a', still: 'assets/board-recruit/slide_donate.png', caption: 'Support Initiatives' },
  { part: 'vo/_parts/board_p10_apply_board.m4a', still: 'assets/board-recruit/slide_apply.png', caption: 'Email President@SHMSPTO.ORG' },
  { part: 'vo/_parts/board_p11_volunteer_fallback.m4a', still: 'assets/board-recruit/slide_volunteer.png', caption: 'Cannot Join the Board? Volunteer' },
  { part: 'vo/_parts/board_p12_volunteer_ways.m4a', still: 'assets/board-recruit/03_volunteer_form.png', caption: 'SHMSPTO.ORG/Volunteer' },
  { part: 'vo/_parts/board_p13_close.m4a', still: 'assets/board-recruit/slide_roles.png', caption: 'Thank You — Go Stingrays!' },
];

function a(rel) { return path.join(ROOT, rel); }
function esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%') // ffmpeg drawtext expansion
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
 * Designed slide on site-green bg + seal + centered SHMS PTO under seal.
 * Left column: eyebrow, title, bullets, footer.
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

  // SHMS PTO centered under seal
  addText('SHMS PTO', {
    size: 44,
    color: '0x98C818',
    x: `${LOGO_CX}-text_w/2`,
    y: LABEL_Y,
  });

  if (eyebrow) {
    addText(eyebrow, { size: 28, color: '0x98C818', x: 90, y: 160 });
  }
  addText(title, { size: title.length > 22 ? 56 : 64, color: 'white', x: 90, y: eyebrow ? 210 : 180 });

  let y = eyebrow ? 320 : 300;
  for (const b of bullets) {
    addText(`•  ${b}`, { size: 36, color: 'white', x: 110, y, bold: false });
    y += 62;
  }
  if (footer) {
    addText(footer, { size: 30, color: '0x98C818', x: 90, y: Math.max(y + 24, 920) });
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
      'Free PTO Membership',
      '75 Percent Off Enrichment Programs',
    ],
    footer: 'This Year — For These Open Seats',
  });

  makeSlide('slide_donate.png', {
    eyebrow: 'Optional',
    title: 'Support Initiatives',
    bullets: [
      'Donate On The Site If You Can',
      'Funds Enrichment & Sponsorships',
      'Not A Condition Of Serving',
    ],
    footer: 'Every Gift Helps Students',
  });

  makeSlide('slide_apply.png', {
    eyebrow: 'Ready For A Board Seat?',
    title: 'How To Apply',
    bullets: [
      'Go To The Board Page',
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
  assertStapleAssets(coldImg);
  console.log(`STAPLE bookends: cold ${COLD_SEC}s + outro ${OUTRO_SEC}s`);
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
    const d = dur(vo) + PAD;
    const clip = path.join(WORK, `beat_${String(i).padStart(2, '0')}.mp4`);
    stillHold(img, clip, d);
    const muxed = path.join(WORK, `beat_${String(i).padStart(2, '0')}_m.mp4`);
    run([
      '-y', '-i', clip, '-i', vo,
      '-filter_complex', `[1:a]apad=pad_dur=${PAD}[a]`,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-shortest',
      muxed,
    ]);
    bodyClips.push(muxed);
    const start = t;
    t += d;
    srt.push(`${i + 2}\n${tsFmt(start)} --> ${tsFmt(t - 0.05)}\n${b.caption}\n`);
  }

  const outroA = path.join(WORK, 'outro_a.m4a');
  const outroClip = path.join(WORK, '99_outro.mp4');
  musicBed(music, outroA, OUTRO_SEC, { fadeOut: true, startAt: 28 });
  muxSilentStill(STAPLE.outro, outroA, outroClip, OUTRO_SEC);
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
  console.log('duration', dur(out).toFixed(1) + 's', `(incl. staple cold ${COLD_SEC}s + outro ${OUTRO_SEC}s)`);
}

main();
