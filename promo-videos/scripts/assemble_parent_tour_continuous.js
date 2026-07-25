#!/usr/bin/env node
'use strict';
/**
 * SHMSPTO parent tour — PARENT-SHARE assemble
 *
 * Goal: a parent can follow what they hear without hunting the screen.
 * Editorial rules (repeatable for this audience):
 *   1. SEE = HEAR — picture matches the spoken idea (mute-test must roughly tell the story)
 *   2. When VO names pages, SHOW each named page (settled) — never freeze on home for a list,
 *      and never sub-second flip-book (aim ~2s+ per page)
 *   3. Chapter joins: intro → menu pages → membership → portal → CTA
 *   4. Skip white page-load frames; never fade-to-black between sections
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/assemble_parent_tour_continuous.js
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const WORK = path.join(OUT_DIR, '_work_cont');
const W = 1920;
const H = 1080;
const FPS = 30;
const ff = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const COLD = 5.0;
const OUTRO = 4.0;
/** Small picture lag vs VO (parents read captions + hear first). */
const VIDEO_DELAY_SEC = Number(process.env.SHMS_VIDEO_DELAY_SEC || 0.4);
/** Master capture opens on a white page-load — skip into painted homepage. */
const HOME_SKIP_WHITE_SEC = 1.05;

function run(args, quiet = true) {
  execFileSync(ff, args, { stdio: quiet ? 'ignore' : 'inherit' });
}
function dur(file) {
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}
function a(rel) { return path.join(ROOT, rel); }

fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

/** VO parts + parent-facing captions (short, readable on phone).
 *  Indices: 0–1 intro · 2–8 nav (why+what) · 9 bridge · 10–16 membership · 17–22 portal/CTA
 */
const BEATS = [
  { part: 'vo/_parts/ch01_website_p01.m4a', caption: 'Hi Stingray families — new PTO website', padAfter: 1.4 },
  { part: 'vo/_parts/ch01_website_p01b.m4a', caption: 'shmspto.org — every family welcome', padAfter: 1.4 },
  { part: 'vo/_parts/ch01_website_p02_programs.m4a', caption: 'Programs — enrichment for students', padAfter: 1.2 },
  { part: 'vo/_parts/ch01_website_p02_events.m4a', caption: 'Events — family nights & celebrations', padAfter: 1.2 },
  { part: 'vo/_parts/ch01_website_p02_cove.m4a', caption: 'The Cove — snacks & spirit wear', padAfter: 1.2 },
  { part: 'vo/_parts/ch01_website_p02_volunteer.m4a', caption: 'Volunteer — help when you can', padAfter: 1.2 },
  { part: 'vo/_parts/ch01_website_p02_fundraising.m4a', caption: 'Fundraising — how the PTO stays funded', padAfter: 1.2 },
  { part: 'vo/_parts/ch01_website_p02_board.m4a', caption: 'Board — parent volunteers who run it', padAfter: 1.2 },
  { part: 'vo/_parts/ch01_website_p02_meetings.m4a', caption: 'Meetings — agendas & minutes', padAfter: 1.2 },
  { part: 'vo/_parts/ch01_website_p03.m4a', caption: 'Membership — quick tour (more later)', padAfter: 1.6 },
  { part: 'vo/_parts/ch02_membership_p01.m4a', caption: 'Three tiers: Reef · Lagoon · Tide', padAfter: 1.4 },
  { part: 'vo/_parts/ch02_membership_p02.m4a', caption: 'Reef $79', padAfter: 1.4 },
  { part: 'vo/_parts/ch02_membership_p03.m4a', caption: 'Lagoon $149 — most popular', padAfter: 1.6 },
  { part: 'vo/_parts/ch02_membership_p04.m4a', caption: 'Tide $249 — top tier', padAfter: 1.6 },
  { part: 'vo/_parts/ch02_membership_p05.m4a', caption: 'First 30 days: bonus card credit', padAfter: 1.4 },
  { part: 'vo/_parts/ch02_membership_p06.m4a', caption: 'Funds the PTO — no mandatory hours', padAfter: 1.6 },
  { part: 'vo/_parts/ch02_membership_p07.m4a', caption: 'Join or Log in — about 2 minutes', padAfter: 1.8 },
  { part: 'vo/_parts/ch03_cove_card_p01.m4a', caption: 'Member Portal — what every family needs', padAfter: 1.4 },
  { part: 'vo/_parts/ch03_cove_card_p01b_onboarding.m4a', caption: 'Setup checklist unlocks your Cove card', padAfter: 1.2 },
  { part: 'vo/_parts/ch03_cove_card_p02.m4a', caption: 'Cove Digital Card — QR + backup code', padAfter: 1.6 },
  { part: 'vo/_parts/ch03_cove_card_p03.m4a', caption: 'Save QR · paid credit or free load', padAfter: 1.6 },
  { part: 'vo/_parts/ch03_cove_card_p04.m4a', caption: 'At The Cove: show QR or say the code', padAfter: 1.4 },
  { part: 'vo/_parts/ch03_cove_card_p05.m4a', caption: 'More portal features in a later video', padAfter: 1.4 },
  { part: 'vo/_parts/ch03_cove_card_p06.m4a', caption: 'shmspto.org — Go Stingrays!', padAfter: 1.6 },
];

const VF = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},format=yuv420p`;

function stillHold(src, dest, seconds) {
  run(['-y', '-loop', '1', '-framerate', String(FPS), '-i', src, '-t', String(seconds),
    '-vf', VF, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-r', String(FPS), '-an', dest]);
}

function makeSilence(dest, seconds) {
  run(['-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(seconds),
    '-c:a', 'aac', '-b:a', '192k', dest]);
}

function concatReencode(files, out) {
  const list = path.join(WORK, `c_${path.basename(out)}.txt`);
  fs.writeFileSync(list, files.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list,
    '-vf', `fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an', out]);
}

/**
 * Take continuous [t0,t1) from source and fit to targetSec at native speed.
 * Always start at t0 so picture tracks VO from the beginning of the section.
 * If short: freeze last frame. If long: play from start for targetSec only.
 */
function continuousFit(src, t0, t1, dest, targetSec) {
  const srcLen = Math.max(0.5, t1 - t0);
  const raw = dest.replace(/\.mp4$/, '_raw.mp4');
  if (srcLen >= targetSec - 0.05) {
    run(['-y', '-ss', String(t0), '-i', src, '-t', String(targetSec),
      '-vf', VF, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS), dest]);
    return;
  }
  run(['-y', '-ss', String(t0), '-i', src, '-t', String(srcLen),
    '-vf', VF, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS), raw]);
  const last = dest.replace(/\.mp4$/, '_last.png');
  run(['-y', '-sseof', '-0.1', '-i', raw, '-frames:v', '1', last]);
  const hold = dest.replace(/\.mp4$/, '_hold.mp4');
  stillHold(last, hold, targetSec - srcLen + 0.05);
  const merged = dest.replace(/\.mp4$/, '_m.mp4');
  concatReencode([raw, hold], merged);
  run(['-y', '-i', merged, '-t', String(targetSec),
    '-vf', `fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an', dest]);
}

/**
 * Hold a settled frame from [t0,t1) for the full VO window.
 * preferEarly: settle near start (marker ends often navigate to the next page).
 */
function holdSettled(src, t0, t1, dest, targetSec, preferEarly = false) {
  const span = Math.max(0.3, t1 - t0);
  const settleAt = preferEarly
    ? Math.min(t1 - 0.25, t0 + Math.min(2.2, span * 0.4))
    : Math.max(t0, t1 - 0.6);
  const frame = dest.replace(/\.mp4$/, '_settle.png');
  run(['-y', '-ss', String(settleAt), '-i', src, '-frames:v', '1', frame]);
  stillHold(frame, dest, targetSec);
}

/**
 * VO-locked holds: each spoken line gets its matching page (settled), duration = that line.
 * opts.preferHold — always settle-hold (membership: capture edges wander).
 * opts.prefix — unique workfile prefix (avoid menu/member collisions).
 */
function voLockedPages(src, rawMarkers, chapters, segments, dest, opts = {}) {
  const preferHold = opts.preferHold === true;
  const prefix = opts.prefix || 'vl';
  const slices = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const raw = (rawMarkers || []).find((m) => m.id === seg.id);
    const chRef = chapters[seg.id];
    const t0 = raw ? raw.t0 : chRef.t0;
    const t1 = raw ? raw.t1 : chRef.t1;
    const slice = path.join(WORK, `${prefix}_${i}_${seg.id}.mp4`);
    const span = Math.max(0.4, t1 - t0);
    const early = seg.preferEarly === true;
    if (!preferHold && !early && span >= Math.min(2.5, seg.sec - 0.2)) {
      continuousFit(src, t0, t1, slice, seg.sec);
    } else {
      holdSettled(src, t0, t1, slice, seg.sec, early);
    }
    slices.push(slice);
  }
  concatReencode(slices, dest);
}

function buildPacedVoMusic(outPath) {
  const music = a('assets/music/es_go_adelyn_paik_instrumental.mp3');
  const segs = [];
  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    const partClip = path.join(WORK, `vo_part_${i}.m4a`);
    run(['-y', '-i', a(b.part), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', partClip]);
    segs.push(partClip);
    if (b.padAfter > 0.05) {
      const sil = path.join(WORK, `vo_pad_${i}.m4a`);
      makeSilence(sil, b.padAfter);
      segs.push(sil);
    }
  }
  const voOnly = path.join(WORK, 'vo_paced_only.m4a');
  const list = path.join(WORK, 'vo_paced_list.txt');
  fs.writeFileSync(list, segs.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', voOnly]);
  const voLen = dur(voOnly);
  run(['-y', '-i', voOnly, '-stream_loop', '-1', '-i', music,
    '-filter_complex',
    `[1:a]volume=-24dB,afade=t=in:st=0:d=1.2,atrim=0:${voLen.toFixed(3)},asetpts=PTS-STARTPTS[m];` +
    `[0:a][m]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[a]`,
    '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    '-t', String(voLen), outPath]);
  return voLen;
}

function writeBeatSrt(srtPath) {
  const pad = (n) => String(n).padStart(2, '0');
  const ts = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const ss = Math.floor(sec % 60);
    const ms = Math.round((sec % 1) * 1000);
    return `${pad(h)}:${pad(m)}:${pad(ss)},${String(ms).padStart(3, '0')}`;
  };
  let t = COLD;
  let body = '';
  let i = 1;
  for (const b of BEATS) {
    const speak = dur(a(b.part));
    body += `${i++}\n${ts(t)} --> ${ts(t + speak)}\n${b.caption}\n\n`;
    t += speak + b.padAfter;
  }
  fs.writeFileSync(srtPath, body, 'utf8');
}

function sectionDur(fromIdx, toIdxInclusive) {
  let t = 0;
  for (let i = fromIdx; i <= toIdxInclusive; i++) {
    t += dur(a(BEATS[i].part)) + BEATS[i].padAfter;
  }
  return t;
}

function fitExact(src, dest, targetSec) {
  const d = dur(src);
  if (Math.abs(d - targetSec) < 0.12) {
    fs.copyFileSync(src, dest);
    return;
  }
  if (d > targetSec) {
    run(['-y', '-i', src, '-t', String(targetSec),
      '-vf', `fps=${FPS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an', dest]);
    return;
  }
  const last = dest.replace(/\.mp4$/, '_pad_last.png');
  run(['-y', '-sseof', '-0.1', '-i', src, '-frames:v', '1', last]);
  const hold = dest.replace(/\.mp4$/, '_pad_hold.mp4');
  stillHold(last, hold, targetSec - d + 0.05);
  const merged = dest.replace(/\.mp4$/, '_pad_m.mp4');
  concatReencode([src, hold], merged);
  run(['-y', '-i', merged, '-t', String(targetSec),
    '-vf', `fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an', dest]);
}

async function main() {
  const markers = JSON.parse(fs.readFileSync(a('assets/parent-tour/video/master_script_markers.json'), 'utf8'));
  const portal = JSON.parse(fs.readFileSync(a('assets/parent-tour/video/portal_logged_in_markers.json'), 'utf8'));
  const MASTER = a('assets/parent-tour/video/master_script_tour.mp4');
  const PORTAL = a('assets/parent-tour/video/portal_logged_in_tour.mp4');

  console.log('Building paced VO+music…');
  const voMusic = path.join(WORK, 'parent_tour_vo_paced.m4a');
  const voDur = buildPacedVoMusic(voMusic);
  fs.copyFileSync(voMusic, a('vo/parent_tour_vo_paced.m4a'));

  // Parent chapters (SEE = HEAR) — each spoken idea gets matching picture
  const introNeed = sectionDur(0, 1);       // welcome + URL on homepage
  const menuNeed = sectionDur(2, 8);        // one VO beat per nav page
  const memberNeed = sectionDur(9, 16);     // bridge → tiers → login
  const portalNeed = sectionDur(17, 22);    // portal + checklist tease + card
  const ctaNeed = sectionDur(23, 23);       // shmspto.org
  console.log({
    introNeed: +introNeed.toFixed(2),
    menuNeed: +menuNeed.toFixed(2),
    memberNeed: +memberNeed.toFixed(2),
    portalNeed: +portalNeed.toFixed(2),
    ctaNeed: +ctaNeed.toFixed(2),
    voDur: +voDur.toFixed(2),
  });

  const ch = markers.chapters;
  const pch = portal.chapters || {};
  const raw = markers.rawMarkers || [];
  const homeT0 = ch.ch01_p01.t0 + HOME_SKIP_WHITE_SEC;
  const homeT1 = ch.ch01_p01.t1;

  const intro = path.join(WORK, 'block_intro.mp4');
  const menu = path.join(WORK, 'block_menu.mp4');
  const member = path.join(WORK, 'block_member.mp4');
  const portalBlock = path.join(WORK, 'block_portal.mp4');
  const cta = path.join(WORK, 'block_cta.mp4');

  // 1) Welcome + URL — homepage
  continuousFit(MASTER, homeT0, homeT1, intro, introNeed);

  // 2) Nav — one why+what VO line per page (no shared list timing)
  const menuSegs = [
    { id: 'ch01_p02', sec: sectionDur(2, 2) },
    { id: 'ch01_p02b', sec: sectionDur(3, 3) },
    { id: 'ch01_p02c', sec: sectionDur(4, 4) },
    { id: 'ch01_p02d', sec: sectionDur(5, 5) },
    { id: 'ch01_p02e', sec: sectionDur(6, 6) },
    { id: 'ch01_p02f', sec: sectionDur(7, 7) },
    { id: 'ch01_p02g', sec: sectionDur(8, 8) },
  ];
  console.log('Menu pages (SEE=HEAR):', menuSegs.map((s) => `${s.id}=${s.sec.toFixed(2)}s`).join(' · '));
  voLockedPages(MASTER, raw, ch, menuSegs, menu, { preferHold: true, prefix: 'menu' });

  // 3) Membership — settle-hold; login beat uses Create Account (preferEarly)
  voLockedPages(MASTER, raw, ch, [
    { id: 'ch01_p03', sec: sectionDur(9, 9) },
    { id: 'ch02_p01', sec: sectionDur(10, 10) },
    { id: 'ch02_p02', sec: sectionDur(11, 11) },
    { id: 'ch02_p03', sec: sectionDur(12, 12) },
    { id: 'ch02_p04', sec: sectionDur(13, 13) },
    { id: 'ch02_p05', sec: sectionDur(14, 14), preferEarly: true },
    { id: 'ch02_p01', sec: sectionDur(15, 15) },
    { id: 'ch02_p07', sec: sectionDur(16, 16), preferEarly: true }, // Join / Log in
  ], member, { preferHold: true, prefix: 'mem' });

  // 4) Portal — brief checklist why/what, then Cove card tease
  const portalSlices = [];
  // land in portal
  {
    const chapter = pch.ch03_p01;
    if (!chapter) throw new Error('Missing portal marker: ch03_p01');
    const slice = path.join(WORK, 'portal_vl_0_land.mp4');
    holdSettled(PORTAL, chapter.t0, chapter.t1, slice, sectionDur(17, 17), true);
    portalSlices.push(slice);
  }
  // onboarding checklist (brief awareness — still, not long dwell)
  {
    const slice = path.join(WORK, 'portal_vl_1_onboarding.mp4');
    stillHold(a('assets/parent-tour/ch3/10_onboarding_checklist.png'), slice, sectionDur(18, 18));
    portalSlices.push(slice);
  }
  // QR / save / show / series tease
  const portalRest = [
    { id: 'ch03_p01', sec: sectionDur(19, 19) },
    { id: 'ch03_p02', sec: sectionDur(20, 20) },
    { id: 'ch03_p01', sec: sectionDur(21, 21) },
    { id: 'ch03_p03', sec: sectionDur(22, 22) },
  ];
  for (let i = 0; i < portalRest.length; i++) {
    const seg = portalRest[i];
    const chapter = pch[seg.id];
    if (!chapter) throw new Error(`Missing portal marker: ${seg.id}`);
    const slice = path.join(WORK, `portal_vl_${i + 2}_${seg.id}.mp4`);
    holdSettled(PORTAL, chapter.t0, chapter.t1, slice, seg.sec, i === 0);
    portalSlices.push(slice);
  }
  concatReencode(portalSlices, portalBlock);

  // 5) Final CTA — homepage
  holdSettled(MASTER, homeT0, homeT1, cta, ctaNeed);

  console.log('Joining parent chapters: intro → menu pages → membership → portal → CTA…');
  const bodyRaw = path.join(WORK, 'body_raw.mp4');
  concatReencode([intro, menu, member, portalBlock, cta], bodyRaw);
  const bodyExact = path.join(WORK, 'body_exact.mp4');
  fitExact(bodyRaw, bodyExact, voDur);

  let bodyForMux = bodyExact;
  if (VIDEO_DELAY_SEC > 0.05) {
    const delayedBody = path.join(WORK, 'body_vdelay.mp4');
    run(['-y', '-i', bodyExact,
      '-vf',
      `tpad=start_duration=${VIDEO_DELAY_SEC.toFixed(3)}:start_mode=clone,` +
      `trim=duration=${voDur.toFixed(3)},setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p`,
      '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), delayedBody]);
    bodyForMux = delayedBody;
    console.log(`Picture delayed ${VIDEO_DELAY_SEC}s vs VO (SHMS_VIDEO_DELAY_SEC)`);
  }

  const coldClip = path.join(WORK, '00_cold.mp4');
  const outroClip = path.join(WORK, '99_outro.mp4');
  stillHold(a('assets/parent-tour/thumbs/cold_open_thumb.png'), coldClip, COLD);
  stillHold(a('assets/parent-tour/thumbs/outro_thank_you.png'), outroClip, OUTRO);

  const videoSilent = path.join(WORK, 'video_silent.mp4');
  concatReencode([coldClip, bodyForMux, outroClip], videoSilent);

  const music = a('assets/music/es_go_adelyn_paik_instrumental.mp3');
  const coldAudio = path.join(WORK, 'cold_a.m4a');
  run(['-y', '-i', music, '-t', String(COLD),
    '-af', 'volume=-22dB,afade=t=in:st=0:d=1.5',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', coldAudio]);
  const outroAudio = path.join(WORK, 'outro_a.m4a');
  run(['-y', '-ss', '25', '-i', music, '-t', String(OUTRO),
    '-af', 'volume=-22dB,afade=t=out:st=' + Math.max(0, OUTRO - 1.2) + ':d=1.2',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', outroAudio]);
  const fullAudio = path.join(WORK, 'full_a.m4a');
  const listA = path.join(WORK, 'audio_concat.txt');
  fs.writeFileSync(listA, [
    `file '${coldAudio.replace(/'/g, "'\\''")}'`,
    `file '${voMusic.replace(/'/g, "'\\''")}'`,
    `file '${outroAudio.replace(/'/g, "'\\''")}'`,
  ].join('\n'));
  run(['-y', '-f', 'concat', '-safe', '0', '-i', listA, '-c', 'copy', fullAudio]);

  const muxed = path.join(WORK, 'muxed.mp4');
  run(['-y', '-i', videoSilent, '-i', fullAudio,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    '-shortest', '-movflags', '+faststart', muxed]);

  const withLogo = path.join(WORK, 'logo.mp4');
  run(['-y', '-i', muxed, '-i', a('assets/parent-tour/ch3/06_logo.png'),
    '-filter_complex',
    `[1:v]scale=120:-1,format=rgba,colorchannelmixer=aa=0.85[lg];[0:v][lg]overlay=W-w-28:H-h-28:enable='between(t\\,${COLD}\\,${COLD + voDur})'`,
    '-c:a', 'copy', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', withLogo]);

  const srt = path.join(OUT_DIR, 'SHMSPTO_parent_tour_regular.srt');
  writeBeatSrt(srt);
  const captioned = path.join(WORK, 'captioned.mp4');
  const escaped = srt.replace(/\\/g, '/').replace(/:/g, '\\:');
  const style = "FontName=Arial,FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,Alignment=2,MarginV=48,Bold=0";
  run(['-y', '-i', withLogo,
    '-vf', `subtitles='${escaped}':force_style='${style}'`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy', '-movflags', '+faststart', captioned]);

  const finalOut = path.join(OUT_DIR, 'SHMSPTO_parent_tour_16x9.mp4');
  const normalized = path.join(WORK, 'normalized.mp4');
  try {
    run(['-y', '-i', captioned, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart', normalized]);
  } catch {
    fs.copyFileSync(captioned, normalized);
  }
  run(['-y', '-i', normalized,
    '-af', `volume=0.28:enable='lte(t\\,${COLD})'`,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', finalOut]);

  const listen = path.join(os.homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_parent_tour_16x9.mp4');
  fs.copyFileSync(finalOut, listen);
  // Do NOT auto-open for Rob — Gemini full-pass must PASS first (gemini_parent_tour_qa.js).
  console.log('Watch file written (do not open for Rob until Gemini PASS):', listen);
  console.log('Next: NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_parent_tour_qa.js');

  // Write chapter map for QA / next explainer
  const mapPath = path.join(OUT_DIR, 'parent_share_chapter_map.json');
  fs.writeFileSync(mapPath, JSON.stringify({
    editorial: 'parent-share SEE=HEAR',
    chapters: [
      { id: 'intro', voBeats: [0, 1], picture: 'homepage', durSec: introNeed },
      {
        id: 'menu',
        voBeats: [2, 3, 4, 5, 6, 7, 8],
        picture: 'Programs→Events→Cove→Volunteer→Fundraising→Board→Meetings (why+what each)',
        pages: menuSegs,
        durSec: menuNeed,
      },
      { id: 'membership', voBeats: [9, 10, 11, 12, 13, 14, 15, 16], picture: 'tiers→login', durSec: memberNeed },
      { id: 'portal', voBeats: [17, 18, 19, 20, 21, 22], picture: 'portal→checklist→Cove QR tease', durSec: portalNeed },
      { id: 'cta', voBeats: [23], picture: 'homepage + series tease', durSec: ctaNeed },
    ],
    voDur,
    watchFile: listen,
  }, null, 2));

  console.log('DONE parent-share', finalOut);
  console.log('ALSO', listen);
  console.log('duration', dur(finalOut).toFixed(2) + 's');
  console.log('Chapters: intro → menu-pages → membership → portal → CTA');
  void pch;
}

main().catch((e) => { console.error(e); process.exit(1); });
