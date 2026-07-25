#!/usr/bin/env node
'use strict';
/**
 * Assemble board recruiting 16:9 video (stills + VO + light music).
 * Hard gate after: gemini_parent_tour_qa.js (or board-specific later).
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/assemble_board_recruit.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const WORK = path.join(OUT_DIR, '_work_board');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const FONT = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
].find((f) => fs.existsSync(f));

const W = 1920;
const H = 1080;
const FPS = 30;
const VF = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS}`;
const PAD = 0.9;

const BEATS = [
  { part: 'vo/_parts/board_p01_open.m4a', still: 'assets/board-recruit/01_board.png', caption: '5 board seats open', title: 'OPEN BOARD SEATS' },
  { part: 'vo/_parts/board_p02_need_asap.m4a', still: 'assets/board-recruit/card_roles.png', caption: 'What each role does — ASAP', title: '5 ROLES · ASAP' },
  { part: 'vo/_parts/board_p03_secretary.m4a', still: 'assets/board-recruit/card_secretary.png', caption: 'Secretary — minutes & micro-tasks', title: 'SECRETARY' },
  { part: 'vo/_parts/board_p04_treasurer.m4a', still: 'assets/board-recruit/card_treasurer.png', caption: 'Treasurer — budget & compliance', title: 'TREASURER' },
  { part: 'vo/_parts/board_p05_seac.m4a', still: 'assets/board-recruit/card_seac.png', caption: 'SEAC Representative — LCPS + PTO', title: 'SEAC REPRESENTATIVE' },
  { part: 'vo/_parts/board_p06_events.m4a', still: 'assets/board-recruit/card_events.png', caption: 'Events Coordinator — family events', title: 'EVENTS COORDINATOR' },
  { part: 'vo/_parts/board_p07_initiatives.m4a', still: 'assets/board-recruit/card_initiatives.png', caption: 'Initiatives — enrichment & sponsorships', title: 'INITIATIVES COORDINATOR' },
  { part: 'vo/_parts/board_p08_benefits.m4a', still: 'assets/board-recruit/card_benefits.png', caption: 'Free membership · 75% off enrichment', title: 'BOARD BENEFITS' },
  { part: 'vo/_parts/board_p09_donate_initiatives.m4a', still: 'assets/board-recruit/card_donate.png', caption: 'Optional: support Initiatives', title: 'SUPPORT INITIATIVES' },
  { part: 'vo/_parts/board_p10_apply_board.m4a', still: 'assets/board-recruit/01_board_cta.png', caption: 'Board page · president@shmspto.org', title: 'EMAIL PRESIDENT@' },
  { part: 'vo/_parts/board_p11_volunteer_fallback.m4a', still: 'assets/board-recruit/03_volunteer_form.png', caption: 'Cannot join board? Volunteer form', title: 'VOLUNTEER FORM' },
  { part: 'vo/_parts/board_p12_volunteer_ways.m4a', still: 'assets/board-recruit/02_volunteer_mid.png', caption: 'Any contribution of time', title: 'SHMSPTO.ORG/VOLUNTEER' },
  { part: 'vo/_parts/board_p13_close.m4a', still: 'assets/parent-tour/thumbs/outro_thank_you.png', caption: 'Go Stingrays!', title: 'GO STINGRAYS' },
];

function a(rel) { return path.join(ROOT, rel); }
function dur(file) {
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}
function run(args) {
  execFileSync(ff, args, { stdio: ['ignore', 'ignore', 'inherit'] });
}

function makeCard(outName, title, subtitle) {
  const out = a(`assets/board-recruit/${outName}`);
  const bg = a('assets/parent-tour/thumbs/bg_site_only.png');
  const logo = a('assets/parent-tour/ch3/06_logo.png');
  const src = fs.existsSync(bg) ? bg : a('assets/v2-team-volunteer/v2-01-board.png');
  const t = title.replace(/:/g, '\\:').replace(/'/g, "\\'");
  const s = (subtitle || '').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const filters = [
    `[0:v]${VF}[bg]`,
    `[1:v]scale=280:-1,format=rgba[lg]`,
    `[bg][lg]overlay=x=W-w-80:y=80[v1]`,
    `[v1]drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='${t}':fontsize=64:fontcolor=white:x=80:y=(h-text_h)/2-40`,
  ];
  if (s) {
    filters[filters.length - 1] += `[v2]`;
    filters.push(`[v2]drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='${s}':fontsize=36:fontcolor=0x98C818:x=80:y=(h-text_h)/2+50`);
  }
  const hasLogo = fs.existsSync(logo);
  const inputs = hasLogo ? ['-i', src, '-i', logo] : ['-i', src];
  if (!hasLogo) {
    // no logo overlay
    const simple = [
      `${VF}`,
      `drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='${t}':fontsize=64:fontcolor=white:x=80:y=(h-text_h)/2-40`,
    ];
    if (s) simple.push(`drawtext=fontfile=${FONT.replace(/:/g, '\\:')}:text='${s}':fontsize=36:fontcolor=0x98C818:x=80:y=(h-text_h)/2+50`);
    run(['-y', '-i', src, '-vf', simple.join(','), '-frames:v', '1', '-update', '1', out]);
    return out;
  }
  run(['-y', ...inputs, '-filter_complex', filters.join(';'), '-frames:v', '1', '-update', '1', out]);
  return out;
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

function main() {
  if (!FONT) throw new Error('Arial Bold font missing');
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(a('assets/board-recruit'), { recursive: true });

  makeCard('card_roles.png', '5 ROLES OPEN', 'What you do · how you help');
  makeCard('card_secretary.png', 'SECRETARY', 'Minutes · calendar · micro-tasks');
  makeCard('card_treasurer.png', 'TREASURER', 'Budget · reimbursements · filings');
  makeCard('card_seac.png', 'SEAC REPRESENTATIVE', 'LCPS SEAC · inclusion · bridge');
  makeCard('card_events.png', 'EVENTS COORDINATOR', 'Family events · staff appreciation');
  makeCard('card_initiatives.png', 'INITIATIVES COORDINATOR', 'Enrichment programs · sponsorships');
  makeCard('card_benefits.png', 'BOARD BENEFITS', 'Free membership · 75% off enrichment');
  makeCard('card_donate.png', 'SUPPORT INITIATIVES', 'Optional donation on the site');

  const clips = [];
  const srt = [];
  let t = 0;
  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    const vo = a(b.part);
    if (!fs.existsSync(vo)) throw new Error(`Missing VO ${b.part}`);
    const img = a(b.still);
    if (!fs.existsSync(img)) throw new Error(`Missing still ${b.still}`);
    const d = dur(vo) + PAD;
    const clip = path.join(WORK, `beat_${String(i).padStart(2, '0')}.mp4`);
    stillHold(img, clip, d);
    // mux exact VO under still (replace silence)
    const muxed = path.join(WORK, `beat_${String(i).padStart(2, '0')}_m.mp4`);
    run([
      '-y', '-i', clip, '-i', vo,
      '-filter_complex', `[1:a]apad=pad_dur=${PAD}[a]`,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-shortest',
      muxed,
    ]);
    clips.push(muxed);
    const start = t;
    t += d;
    const ts = (x) => {
      const h = Math.floor(x / 3600);
      const m = Math.floor((x % 3600) / 60);
      const s = Math.floor(x % 60);
      const ms = Math.floor((x % 1) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };
    srt.push(`${i + 1}\n${ts(start)} --> ${ts(t - 0.05)}\n${b.caption}\n`);
  }

  const list = path.join(WORK, 'concat.txt');
  fs.writeFileSync(list, clips.map((c) => `file '${c}'`).join('\n'));
  const joined = path.join(WORK, 'joined.mp4');
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);

  const music = a('assets/music/es_go_adelyn_paik_instrumental.mp3');
  const out = path.join(OUT_DIR, 'SHMSPTO_board_recruit_16x9.mp4');
  const watch = path.join(os.homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_board_recruit_16x9.mp4');
  if (fs.existsSync(music)) {
    run([
      '-y', '-i', joined, '-stream_loop', '-1', '-i', music,
      '-filter_complex',
      `[1:a]volume=0.10,afade=t=in:st=0:d=2[a1];[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2[a]`,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      '-movflags', '+faststart',
      out,
    ]);
  } else {
    fs.copyFileSync(joined, out);
  }
  fs.copyFileSync(out, watch);
  fs.writeFileSync(path.join(OUT_DIR, 'SHMSPTO_board_recruit_captions.srt'), srt.join('\n'));
  console.log('DONE', out);
  console.log('Watch file (Gemini PASS before Rob opens):', watch);
  console.log('duration', dur(out).toFixed(1) + 's');
}

main();
