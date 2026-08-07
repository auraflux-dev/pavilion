#!/usr/bin/env node
'use strict';
/**
 * Assemble staff Cove in-person walkthrough (parent-tour style: stills + BTM VO).
 * NEVER HeyGen / avatar pitch.
 *
 * Prereq VO:
 *   ELEVENLABS_API_KEY=sk_... NODE_PATH=~/cwn-c0/node_modules node scripts/generate_staff_cove_vo.js
 *
 * Assemble:
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/assemble_staff_cove_inperson.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const {
  OUTRO_SEC,
  TEXT_TOP,
  LOGO_W,
  LOGO_X,
  LOGO_Y,
  LOGO_CX,
  LABEL_Y,
  PATHS: STAPLE,
  assertStapleAssets,
} = require('./staple_brand_bookends');

/** Staff training: short brand sting, then VO immediately (parent tour uses 5s cold). */
const COLD_SEC = 1.2;

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const WORK = path.join(OUT_DIR, '_work_staff_cove');
const ASSETS = path.join(ROOT, 'assets/staff-cove');
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
const PAD = 0.55;
const TAIL_PAD = 0.9;

const TEXT_X = 280;
const BULLET_X = 310;
const TYPE_EYEBROW = 40;
const TYPE_TITLE = 68;
const TYPE_BULLET = 42;
const TYPE_BRAND = 44;
const TYPE_FOOTER = 36;
const STEP_EYEBROW = 52;
const STEP_TITLE = 82;
const STEP_BULLET = 58;
const STEP_FOOTER = 44;
const WAVE_SAFE_MAX_Y = 680;
const CONTENT_MAX_Y = WAVE_SAFE_MAX_Y;
const FOOTER_Y = LABEL_Y + 120;

/** SEE = HEAR beats — assume zero prior knowledge; name every click */
const BEATS = [
  {
    part: 'vo/_parts/staff_cove_p01_open_staff.m4a',
    still: 'assets/staff-cove/screen_staff_home.png',
    caption: 'Step 1 · Open Staff · Sign In As Cove@',
  },
  {
    part: 'vo/_parts/staff_cove_p02_nav_cove.m4a',
    still: 'assets/staff-cove/slide_nav_cove.png',
    caption: 'Step 2 · Top Nav · Open The Cove',
  },
  {
    part: 'vo/_parts/staff_cove_p03_see_register.m4a',
    still: 'assets/staff-cove/screen_register_overview.png',
    caption: 'Step 3 · Cove Register · Lane A',
  },
  {
    part: 'vo/_parts/staff_cove_p04_ask_code.m4a',
    still: 'assets/staff-cove/slide_ask_code.png',
    caption: 'Step 4 · Ask For Code Or Wallet QR',
  },
  {
    part: 'vo/_parts/staff_cove_p05_lookup.m4a',
    still: 'assets/staff-cove/screen_register_code.png',
    caption: 'Step 5 · Paste Code · Lookup',
  },
  {
    part: 'vo/_parts/staff_cove_p06_confirm.m4a',
    still: 'assets/staff-cove/screen_register_confirm.png',
    caption: 'Step 6 · Confirm Names + Balance',
  },
  {
    part: 'vo/_parts/staff_cove_p07_tap_items.m4a',
    still: 'assets/staff-cove/screen_register_tap.png',
    caption: 'Step 7 · Tap Items · Adjust Qty',
  },
  {
    part: 'vo/_parts/staff_cove_p08_charge.m4a',
    still: 'assets/staff-cove/screen_register_charge.png',
    caption: 'Step 8 · Tap Charge',
  },
  {
    part: 'vo/_parts/staff_cove_p09_low_balance.m4a',
    still: 'assets/staff-cove/slide_low_balance.png',
    caption: 'Step 9 · Low Balance · Do Not Charge',
  },
  {
    part: 'vo/_parts/staff_cove_p10_square_stand.m4a',
    still: 'assets/staff-cove/slide_lane_b.png',
    caption: 'Step 10 · Square Stand · Guests + Spirit',
  },
  {
    part: 'vo/_parts/staff_cove_p11_events_perk.m4a',
    still: 'assets/staff-cove/slide_events_perk.png',
    caption: 'Step 11 · Events · Code Ends In 9',
  },
  {
    part: 'vo/_parts/staff_cove_p12_close.m4a',
    still: 'assets/staff-cove/slide_close.png',
    caption: 'Step 12 · Never Charge Twice · Help',
  },
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

function makeBrandCard(dest, { title, subtitle }) {
  const bg = fs.existsSync(STAPLE.bgSite) ? STAPLE.bgSite : STAPLE.coldOpenDefault;
  const logo = STAPLE.logo;
  const font = FONT.replace(/:/g, '\\:');
  const t = esc(title);
  const s = esc(subtitle);
  const fc = [
    `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg]`,
    `[1:v]scale=${LOGO_W}:-1,format=rgba[lg]`,
    `[bg][lg]overlay=x=${LOGO_X}:y=${LOGO_Y}[v1]`,
    `[v1]drawtext=fontfile=${font}:text='${t}':fontsize=72:fontcolor=white:x=90:y=${TEXT_TOP},` +
      `drawtext=fontfile=${font}:text='${s}':fontsize=40:fontcolor=0x98C818:x=90:y=${TEXT_TOP + 100},` +
      `drawtext=fontfile=${font}:text='SHMS PTO':fontsize=44:fontcolor=0x98C818:x=${LOGO_CX}-text_w/2:y=${LABEL_Y}`,
  ].join(';');
  run(['-y', '-i', bg, '-i', logo, '-filter_complex', fc, '-frames:v', '1', '-update', '1', dest]);
}

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

  let y = TEXT_TOP;
  if (eyebrow) {
    addText(eyebrow, { size: TYPE_EYEBROW, color: '0x98C818', x: TEXT_X, y });
    y += STEP_EYEBROW;
  }
  addText(title, { size: TYPE_TITLE, color: 'white', x: TEXT_X, y });
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

function buildSlides() {
  fs.mkdirSync(ASSETS, { recursive: true });
  makeSlide('slide_nav_cove.png', {
    eyebrow: 'Step 2',
    title: 'Open The Cove',
    bullets: [
      'Dark green Staff top nav',
      'Tap The Cove',
      'Or More → The Cove',
    ],
    footer: 'Cove@ Sees The Cove Workspace',
  });
  makeSlide('slide_ask_code.png', {
    eyebrow: 'Step 4',
    title: 'Get Their ID',
    bullets: [
      'Ask what they want first',
      'Six digit Family Cove code',
      'Or Wallet / Photos QR',
    ],
    footer: 'Do Not Invent A Code',
  });
  makeSlide('slide_low_balance.png', {
    eyebrow: 'Step 9 · Stop Rule',
    title: 'Balance Too Low',
    bullets: [
      'Do not tap Charge',
      'Parent reloads online',
      'Or switch sale to Square Stand',
    ],
    footer: 'No Double Charge',
  });
  makeSlide('slide_lane_b.png', {
    eyebrow: 'Step 10 · Lane B',
    title: 'Square Stand iPad',
    bullets: [
      'Wake Stand · SHMS PTO location',
      'Guests with no digital card',
      'Spirit / event merch · card present',
    ],
    footer: 'Normal Card Sale On Stand',
  });
  makeSlide('slide_events_perk.png', {
    eyebrow: 'Step 11 · Events',
    title: 'Paid Refreshment Perk',
    bullets: [
      'Ask for six digit family code',
      'Paid member codes end in 9',
      'Hand tickets · do not charge perk',
    ],
    footer: 'Extras Still Go On Stand',
  });
  makeSlide('slide_close.png', {
    eyebrow: 'Step 12',
    title: 'Never Charge Twice',
    bullets: [
      'Lane A. Staff register digital card',
      'Lane B. Square Stand guests + extras',
      'Staff Help. In-person sales guide',
    ],
    footer: 'Go Stingrays!',
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
  if (!fs.existsSync(a('assets/staff-cove/screen_register.png'))) {
    throw new Error('Missing assets/staff-cove/screen_register.png (Staff register still)');
  }
  fs.mkdirSync(WORK, { recursive: true });

  const coldImg = path.join(ASSETS, 'cold_open.png');
  const outroImg = path.join(ASSETS, 'outro.png');
  makeBrandCard(coldImg, {
    title: 'IN-PERSON SALES',
    subtitle: 'Step-By-Step · Window + Events',
  });
  makeBrandCard(outroImg, {
    title: 'THANK YOU',
    subtitle: 'Go Stingrays!',
  });
  assertStapleAssets(coldImg, outroImg);

  console.log('Building slides…');
  buildSlides();

  const music = a('assets/music/es_go_adelyn_paik_instrumental.mp3');
  if (!fs.existsSync(music)) throw new Error('Missing music bed');

  for (const b of BEATS) {
    if (!fs.existsSync(a(b.part))) {
      throw new Error(
        `Missing VO ${b.part}\nRun with a valid sk_ key:\n  ELEVENLABS_API_KEY=sk_... NODE_PATH=~/cwn-c0/node_modules node scripts/generate_staff_cove_vo.js`
      );
    }
    if (!fs.existsSync(a(b.still))) {
      throw new Error(`Missing still ${b.still}`);
    }
  }

  const coldA = path.join(WORK, 'cold_a.m4a');
  const coldClip = path.join(WORK, '00_cold.mp4');
  musicBed(music, coldA, COLD_SEC, { fadeOut: false });
  muxSilentStill(coldImg, coldA, coldClip, COLD_SEC);

  const bodyClips = [];
  const srt = [];
  let t = COLD_SEC;
  srt.push(`1\n${tsFmt(0)} --> ${tsFmt(COLD_SEC - 0.05)}\nIn-Person Sales · Step-By-Step Walkthrough\n`);

  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    const vo = a(b.part);
    const img = a(b.still);
    const isLast = i === BEATS.length - 1;
    const d = dur(vo) + PAD + (isLast ? TAIL_PAD : 0);
    const clip = path.join(WORK, `beat_${String(i).padStart(2, '0')}.mp4`);
    stillHold(img, clip, d);
    const muxed = path.join(WORK, `beat_${String(i).padStart(2, '0')}_m.mp4`);
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

  const out = path.join(OUT_DIR, 'SHMSPTO_staff_cove_inperson_16x9.mp4');
  const watch = path.join(os.homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_staff_cove_inperson_16x9.mp4');
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
  fs.writeFileSync(path.join(OUT_DIR, 'SHMSPTO_staff_cove_inperson_captions.srt'), srt.join('\n'));
  console.log('DONE', out);
  console.log('Watch file:', watch);
  console.log('duration', dur(out).toFixed(1) + 's');
}

main();
