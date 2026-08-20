#!/usr/bin/env node
'use strict';
/**
 * Assemble Staff newsletter Diane walkthrough (parent-tour style: stills + BTM VO).
 *
 * Prereq stills (from repo root):
 *   node scripts/capture-staff-newsletter-shots.mjs
 *
 * Prereq VO:
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/generate_staff_newsletter_diane_vo.js
 *
 * Assemble + copy to Staff Help:
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/assemble_staff_newsletter_diane.js
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

const COLD_SEC = 1.2;
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const OUT_DIR = path.join(ROOT, 'out');
const WORK = path.join(OUT_DIR, '_work_staff_newsletter_diane');
const ASSETS = path.join(ROOT, 'assets/staff-newsletter');
const HELP_PUBLIC = path.join(REPO, 'frontend/public/help/staff-newsletter');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const FONT = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
].find((f) => fs.existsSync(f));

const W = 1920;
const H = 1080;
const FPS = 30;
// Fit UI stills without empty green header bars. Pad with staff cream, top-aligned
// so leftover space sits at the bottom — never a blank dark panel with no copy.
const BG = '0xFAFCF9';
const VF_FIT = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:0:color=${BG},setsar=1,fps=${FPS}`;
const VF_BOOKEND = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS}`;

const V_ENCODE = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18', '-r', String(FPS)];
const PAD = 0.55;
const TAIL_PAD = 0.9;

/** SEE = HEAR — one help screenshot per VO beat */
/** Bottom-bar copy only — short coach lines, never Step 1/2/3. Empty caption = no bar. */
const BEATS = [
  {
    part: 'vo/_parts/staff_newsletter_diane_p01_sign_in.m4a',
    still: 'assets/staff-newsletter/00-nav-newsletter.png',
    caption: 'Sign in · open Newsletter',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p02_no_html.m4a',
    still: 'assets/staff-newsletter/01-templates-canva.png',
    caption: 'Canva for design · plain text for words',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p03_templates.m4a',
    still: 'assets/staff-newsletter/01-templates-canva.png',
    caption: 'Templates · Canva plus copy',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p04_export_png.m4a',
    still: 'assets/staff-newsletter/01-templates-canva.png',
    caption: 'Export PNG for email',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p05_test_send.m4a',
    still: 'assets/staff-newsletter/02-test-send.png',
    caption: 'Test send before parents see it',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p06_type.m4a',
    still: 'assets/staff-newsletter/03-newsletter-type.png',
    caption: 'Paid email · Weekly Scoop · footer signups',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p07_scoop.m4a',
    still: 'assets/staff-newsletter/04-weekly-scoop.png',
    caption: 'Scoop link · attach PNG in WhatsApp',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p08_beats.m4a',
    still: 'assets/staff-newsletter/05-beats.png',
    caption: 'Write in beats · still plain text',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p09_copy_utm.m4a',
    still: 'assets/staff-newsletter/06-copy-tracking.png',
    caption: 'Subject · body · UTM · tracking',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p10_paid_send.m4a',
    still: 'assets/staff-newsletter/08-send-actions.png',
    caption: 'Preview · then Send email now',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p11_schedule.m4a',
    still: 'assets/staff-newsletter/07-schedule-approval.png',
    caption: 'Schedule · approval when needed',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p12_report.m4a',
    still: 'assets/staff-newsletter/09-send-report.png',
    caption: 'Send report · opens and clicks',
  },
  {
    part: 'vo/_parts/staff_newsletter_diane_p13_close.m4a',
    still: 'assets/staff-newsletter/08-send-actions.png',
    caption: 'Staff Help has the full walkthrough',
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

function syncHelpStills() {
  fs.mkdirSync(ASSETS, { recursive: true });
  if (!fs.existsSync(HELP_PUBLIC)) {
    throw new Error(`Missing ${HELP_PUBLIC}. Run: node scripts/capture-staff-newsletter-shots.mjs`);
  }
  for (const f of fs.readdirSync(HELP_PUBLIC).filter((n) => n.endsWith('.png'))) {
    fs.copyFileSync(path.join(HELP_PUBLIC, f), path.join(ASSETS, f));
  }
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

function muxStillVo(img, vo, dest, seconds, { caption = '', bookend = false } = {}) {
  const font = FONT.replace(/:/g, '\\:');
  const base = bookend ? VF_BOOKEND : VF_FIT;
  // Bottom bar carries the copy — never leave an empty brand strip with no text.
  const vf = caption
    ? `${base},drawbox=x=0:y=ih-110:w=iw:h=110:color=0x0b1f17@0.92:t=fill,` +
      `drawtext=fontfile=${font}:text='${esc(caption)}':fontsize=40:fontcolor=white:` +
      `x=(w-text_w)/2:y=h-68`
    : base;
  run([
    '-y', '-loop', '1', '-i', img, '-i', vo,
    '-vf', vf, '-t', String(seconds),
    ...V_ENCODE,
    '-c:a', 'aac', '-b:a', '192k', '-shortest',
    dest,
  ]);
}

function tsFmt(x) {
  const h = Math.floor(x / 3600);
  const m = Math.floor((x % 3600) / 60);
  const s = Math.floor(x % 60);
  const ms = Math.floor((x % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function musicBed(srcMusic, outAac, seconds) {
  run([
    '-y', '-i', srcMusic, '-t', String(seconds),
    '-af', `volume=-20dB,afade=t=in:st=0:d=0.6,afade=t=out:st=${Math.max(0, seconds - 1.2)}:d=1.2`,
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', outAac,
  ]);
}

function main() {
  if (!FONT) throw new Error('Arial Bold font missing');
  syncHelpStills();
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(HELP_PUBLIC, { recursive: true });

  const coldImg = path.join(ASSETS, 'cold_open.png');
  const outroImg = path.join(ASSETS, 'outro.png');
  makeBrandCard(coldImg, {
    title: 'MEMBER NEWSLETTER',
    subtitle: 'For Diane · Canva + Plain Text',
  });
  makeBrandCard(outroImg, {
    title: 'THANK YOU',
    subtitle: 'Staff Help · Go Stingrays!',
  });
  assertStapleAssets(coldImg, outroImg);

  const music = a('assets/music/es_go_adelyn_paik_instrumental.mp3');
  if (!fs.existsSync(music)) throw new Error('Missing music bed');

  for (const b of BEATS) {
    if (!fs.existsSync(a(b.part))) {
      throw new Error(`Missing VO ${b.part}\nRun generate_staff_newsletter_diane_vo.js first`);
    }
    if (!fs.existsSync(a(b.still))) {
      throw new Error(`Missing still ${b.still}\nRun capture-staff-newsletter-shots.mjs first`);
    }
  }

  const coldA = path.join(WORK, 'cold_a.m4a');
  musicBed(music, coldA, COLD_SEC);
  const coldClip = path.join(WORK, '00_cold.mp4');
  muxStillVo(coldImg, coldA, coldClip, COLD_SEC, { bookend: true });

  const bodyClips = [];
  const srt = [`1\n00:00:00,000 --> ${tsFmt(COLD_SEC - 0.05)}\nMember Newsletter · SHMS PTO\n`];
  let t = COLD_SEC;

  BEATS.forEach((b, i) => {
    const vo = a(b.part);
    const d = dur(vo) + PAD + TAIL_PAD;
    const clip = path.join(WORK, `${String(i + 1).padStart(2, '0')}.mp4`);
    muxStillVo(a(b.still), vo, clip, d, { caption: b.caption });
    bodyClips.push(clip);
    if (b.caption) {
      srt.push(`${i + 2}\n${tsFmt(t)} --> ${tsFmt(t + dur(vo))}\n${b.caption}\n`);
    }
    t += d;
  });

  const outroA = path.join(WORK, 'outro_a.m4a');
  musicBed(music, outroA, OUTRO_SEC);
  const outroClip = path.join(WORK, '99_outro.mp4');
  muxStillVo(outroImg, outroA, outroClip, OUTRO_SEC, { bookend: true });
  srt.push(`${BEATS.length + 2}\n${tsFmt(t)} --> ${tsFmt(t + OUTRO_SEC - 0.05)}\nThank You · Go Stingrays · SHMS PTO\n`);

  const list = path.join(WORK, 'concat.txt');
  const all = [coldClip, ...bodyClips, outroClip];
  fs.writeFileSync(list, all.map((c) => `file '${c}'`).join('\n'));
  const joined = path.join(WORK, 'joined.mp4');
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);

  const out = path.join(OUT_DIR, 'SHMSPTO_staff_newsletter_diane_16x9.mp4');
  const watch = path.join(os.homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_staff_newsletter_diane_16x9.mp4');
  const helpMp4 = path.join(HELP_PUBLIC, 'newsletter-diane.mp4');
  const helpPoster = path.join(HELP_PUBLIC, 'newsletter-diane-poster.jpg');

  run([
    '-y', '-i', joined, '-stream_loop', '-1', '-i', music,
    '-filter_complex',
    `[1:a]volume=0.08,afade=t=in:st=0:d=0.5[a1];` +
      `[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2:weights=1 0.35[a]`,
    '-map', '0:v', '-map', '[a]',
    ...V_ENCODE,
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    out,
  ]);

  fs.copyFileSync(out, watch);
  fs.copyFileSync(out, helpMp4);
  run(['-y', '-i', out, '-frames:v', '1', '-q:v', '2', helpPoster]);
  fs.writeFileSync(path.join(OUT_DIR, 'SHMSPTO_staff_newsletter_diane_captions.srt'), srt.join('\n'));
  console.log('DONE', out);
  console.log('Staff Help video:', helpMp4);
  console.log('Watch file:', watch);
  console.log('duration', dur(out).toFixed(1) + 's');
}

main();
