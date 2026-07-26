#!/usr/bin/env node
'use strict';
/**
 * SHMSPTO parent tour. cut one long script-order capture to VO beats.
 *
 * Method (Rob):
 *   1) capture_script_master.js → master_script_tour.mp4 + markers
 *   2) For each VO part: take that chapter slice from the master
 *   3) Trim fat / gentle slow so visualDur === speak + linger pad
 *   4) Prefer video motion; portal QR beats stay stills until logged-in capture
 *
 * Re-run:
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/capture_script_master.js
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/assemble_parent_tour_v2.js
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const WORK = path.join(OUT_DIR, '_work_v2');
const W = 1920;
const H = 1080;
const FPS = 30;
const ff = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';

const COLD = 5.0;
const OUTRO = 4.0;
const PAD_DEFAULT = 1.5;

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

const MARKERS_PATH = a('assets/parent-tour/video/master_script_markers.json');
const MASTER_PATH = a('assets/parent-tour/video/master_script_tour.mp4');
const PORTAL_MARKERS_PATH = a('assets/parent-tour/video/portal_logged_in_markers.json');
const PORTAL_MASTER_PATH = a('assets/parent-tour/video/portal_logged_in_tour.mp4');

/**
 * VO beats → chapter id in master markers (or still for portal).
 * padAfter = linger on last frame after speak (read time), music-only.
 */
/**
 * fitMode when chapter raw > VO speak:
 * end. take last speakSec (settled view; default)
 * pages. soft tour of settled ends of each sub-page (no speed-warp flash)
 * start. take first speakSec (rare)
 */
const BEATS = [
  { part: 'vo/_parts/ch01_website_p01.m4a', caption: 'Hi Stingray families · new PTO website', padAfter: 1.8, chapter: 'ch01_p01', fitMode: 'end' },
  {
    part: 'vo/_parts/ch01_website_p02.m4a',
    caption: 'Programs · Events · Cove · Volunteer · Board',
    padAfter: 2.0,
    chapter: 'ch01_p02',
    fitMode: 'pages',
    pageIds: ['ch01_p02', 'ch01_p02b', 'ch01_p02c', 'ch01_p02d', 'ch01_p02e', 'ch01_p02f', 'ch01_p02g'],
  },
  { part: 'vo/_parts/ch01_website_p03.m4a', caption: 'Membership is how you join', padAfter: 1.8, chapter: 'ch01_p03', fitMode: 'end' },
  { part: 'vo/_parts/ch02_membership_p01.m4a', caption: 'Reef · Lagoon · Tide', padAfter: 1.8, chapter: 'ch02_p01', fitMode: 'end' },
 { part: 'vo/_parts/ch02_membership_p02.m4a', caption: 'Reef $79. $20 card · 10% off', padAfter: 2.0, chapter: 'ch02_p02', fitMode: 'end' },
 { part: 'vo/_parts/ch02_membership_p03.m4a', caption: 'Lagoon $149. most popular', padAfter: 2.2, chapter: 'ch02_p03', fitMode: 'end' },
 { part: 'vo/_parts/ch02_membership_p04.m4a', caption: 'Tide $249. top tier benefits', padAfter: 2.8, chapter: 'ch02_p04', fitMode: 'end', sectionExit: true },
  { part: 'vo/_parts/ch02_membership_p05.m4a', caption: 'First 30 days: +10% card credit', padAfter: 2.2, chapter: 'ch02_p05', fitMode: 'end' },
  {
    part: 'vo/_parts/ch02_membership_p06.m4a',
    caption: 'Funds all SHMS PTO work · no mandatory hours',
    padAfter: 2.0,
    chapter: 'ch02_p06',
    fitMode: 'pages',
    pageIds: ['ch02_p06', 'ch02_p06b', 'ch02_p06c', 'ch02_p06d'],
  },
  { part: 'vo/_parts/ch02_membership_p07.m4a', caption: 'Join in ~2 minutes · tee size at checkout', padAfter: 3.0, chapter: 'ch02_p07', fitMode: 'end', sectionExit: true },
  {
    part: 'vo/_parts/ch03_cove_card_p01.m4a',
    caption: 'Cove Digital Card: QR + backup code',
    padAfter: 2.4,
    chapter: 'ch03_p01',
    portal: true,
    fitMode: 'end',
    still: 'assets/parent-tour/ch3/07_portal_qr_live.png',
    stillFallback: 'assets/parent-tour/ch3/02b_store_cove_code_qr_free.png',
    privacy: true,
  },
  {
    part: 'vo/_parts/ch03_cove_card_p02.m4a',
    caption: 'Save to Photos · Wallet coming soon',
    padAfter: 2.2,
    chapter: 'ch03_p02',
    portal: true,
    fitMode: 'end',
    still: 'assets/parent-tour/ch3/08_portal_photos_wallet.png',
    stillFallback: 'assets/parent-tour/ch3/07_portal_qr_live.png',
    privacy: true,
  },
  {
    part: 'vo/_parts/ch03_cove_card_p03.m4a',
    caption: 'Paid: credit preloaded',
    padAfter: 2.0,
    chapter: 'ch03_p03',
    portal: true,
    fitMode: 'end',
    still: 'assets/parent-tour/ch3/02_portal_store_card_paid.png',
    privacy: true,
  },
  {
    part: 'vo/_parts/ch03_cove_card_p04.m4a',
    caption: 'Free: load anytime',
    padAfter: 3.0,
    chapter: 'ch03_p04',
    portal: true,
    fitMode: 'end',
    still: 'assets/parent-tour/ch3/03b_load_family_card_free.png',
    privacy: true,
    sectionExit: true,
  },
  { part: 'vo/_parts/ch03_cove_card_p05.m4a', caption: 'Show QR or say the code', padAfter: 2.0, chapter: 'ch03_p05', fitMode: 'end' },
  { part: 'vo/_parts/ch03_cove_card_p06.m4a', caption: 'shmspto.org · Go Stingrays!', padAfter: 2.0, chapter: 'ch03_p06', fitMode: 'end' },
];

const XF = 0.28; // soft crossfade between pages inside a tour
const SECTION_BRIDGE = 0.55; // dissolve out of “good” sections (membership / portal)

function padOf(b) {
  return b.padAfter != null ? b.padAfter : PAD_DEFAULT;
}

function loadPortalMarkers() {
  if (!fs.existsSync(PORTAL_MARKERS_PATH) || !fs.existsSync(PORTAL_MASTER_PATH)) return null;
  return JSON.parse(fs.readFileSync(PORTAL_MARKERS_PATH, 'utf8'));
}

function loadMarkers() {
  if (!fs.existsSync(MARKERS_PATH) || !fs.existsSync(MASTER_PATH)) {
    throw new Error(
      'Missing master capture. Run first:\n' +
      '  NODE_PATH=~/cwn-c0/node_modules node scripts/capture_script_master.js'
    );
  }
  return JSON.parse(fs.readFileSync(MARKERS_PATH, 'utf8'));
}

function privacyStill(src, dest) {
  try {
    run(['-y', '-i', src,
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,split[base][tmp];[tmp]crop=560:80:80:420,boxblur=14:2[b1];[base][b1]overlay=80:420`,
      dest]);
  } catch {
    run(['-y', '-i', src,
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`,
      dest]);
  }
}

function fitStillPng(src, dest, privacy = false) {
  let input = src;
  if (privacy) {
    const priv = dest.replace(/\.png$/, '_priv.png');
    privacyStill(src, priv);
    input = priv;
  }
  run(['-y', '-i', input,
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1f17,format=rgb24`,
    dest]);
}

function stillHold(srcPngOrPath, dest, seconds) {
  run(['-y', '-loop', '1', '-framerate', String(FPS), '-i', srcPngOrPath, '-t', String(seconds),
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1f17,fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-r', String(FPS), '-an', dest]);
}

function concat(files, out) {
  // Re-encode (not -c copy) so hard cuts don't flash from keyframe mismatch
  const list = path.join(WORK, `c_${path.basename(out)}.txt`);
  fs.writeFileSync(list, files.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list,
    '-vf', `fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an', out]);
}

/** Soft-dissolve concat. removes flashy hard cuts between pages/beats. */
function concatXfade(files, out, xfade = XF) {
  if (files.length === 1) {
    fs.copyFileSync(files[0], out);
    return;
  }
  if (files.length === 2) {
    const d0 = dur(files[0]);
    const off = Math.max(0.05, d0 - xfade);
    run(['-y', '-i', files[0], '-i', files[1],
      '-filter_complex',
      `[0:v][1:v]xfade=transition=fade:duration=${xfade}:offset=${off.toFixed(3)},fps=${FPS},format=yuv420p[v]`,
      '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), out]);
    return;
  }
  // Chain pairwise
  let cur = files[0];
  for (let i = 1; i < files.length; i++) {
    const nextOut = path.join(WORK, `xf_${path.basename(out)}_${i}.mp4`);
    concatXfade([cur, files[i]], nextOut, xfade);
    cur = nextOut;
  }
  fs.copyFileSync(cur, out);
}

function resolveStill(b) {
  if (b.still && fs.existsSync(a(b.still))) return a(b.still);
  if (b.stillFallback && fs.existsSync(a(b.stillFallback))) return a(b.stillFallback);
  throw new Error('Missing still for beat ' + b.part);
}

const VF_FIT = () =>
  `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1f17,fps=${FPS},format=yuv420p`;

/**
 * Multi-page VO lines: settled end of each page + soft xfade (no speed-warp flash).
 */
function cutPagesTour(master, rawMarkers, pageIds, dest, speakSec, padSec) {
  const vf = VF_FIT();
  const pages = pageIds
    .map((id) => rawMarkers.find((m) => m.id === id))
    .filter(Boolean);
  if (!pages.length) throw new Error('No page markers for tour');

  const n = pages.length;
  const xfadeBudget = Math.max(0, (n - 1) * XF);
  let each = (speakSec + xfadeBudget) / n;
  each = Math.max(0.85, Math.min(2.2, each));

  const slices = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const plen = Math.max(0.4, p.t1 - p.t0);
    const take = Math.min(each, plen);
    const ss = Math.max(p.t0, p.t1 - take);
    const slice = path.join(WORK, `page_${path.basename(dest)}_${i}.mp4`);
    run(['-y', '-ss', String(ss), '-i', master, '-t', String(take),
      '-vf', vf,
      '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), slice]);
    slices.push(slice);
  }

  const tour = dest.replace(/\.mp4$/, '_tour.mp4');
  concatXfade(slices, tour, XF);
  let tourDur = dur(tour);
  const rawSlice = dest.replace(/\.mp4$/, '_raw.mp4');
  if (tourDur > speakSec + 0.08) {
    run(['-y', '-i', tour, '-t', String(speakSec),
      '-vf', `fps=${FPS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an', rawSlice]);
  } else if (tourDur < speakSec - 0.08) {
    const lastFrame = dest.replace(/\.mp4$/, '_tour_last.png');
    run(['-y', '-sseof', '-0.1', '-i', tour, '-frames:v', '1', lastFrame]);
    const holdFill = dest.replace(/\.mp4$/, '_tour_fill.mp4');
    stillHold(lastFrame, holdFill, speakSec - tourDur);
    const merged = dest.replace(/\.mp4$/, '_tour_merged.mp4');
    concat([tour, holdFill], merged);
    run(['-y', '-i', merged, '-t', String(speakSec),
      '-vf', `fps=${FPS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an', rawSlice]);
  } else {
    fs.copyFileSync(tour, rawSlice);
  }

  if (padSec <= 0.05) {
    fs.copyFileSync(rawSlice, dest);
    return;
  }
  const lastFrame = dest.replace(/\.mp4$/, '_last.png');
  run(['-y', '-sseof', '-0.1', '-i', rawSlice, '-frames:v', '1', lastFrame]);
  const hold = dest.replace(/\.mp4$/, '_hold.mp4');
  stillHold(lastFrame, hold, padSec);
  concatXfade([rawSlice, hold], dest, 0.12);
  run(['-y', '-i', dest, '-t', String(speakSec + padSec), '-c', 'copy', dest + '.t.mp4']);
  fs.renameSync(dest + '.t.mp4', dest);
}

/**
 * Cut [t0,t1) from master, fit to speakSec, then freeze last frame for padSec.
 * fitMode: end | pages | start
 */
function cutChapterToBeat(master, t0, t1, dest, speakSec, padSec, fitMode = 'end') {
  const rawSlice = dest.replace(/\.mp4$/, '_raw.mp4');
  const srcLen = Math.max(0.35, t1 - t0);
  const vf = VF_FIT();
  const mode = fitMode || 'end';

  if (srcLen >= speakSec - 0.05) {
    if (mode === 'start') {
      run(['-y', '-ss', String(t0), '-i', master, '-t', String(speakSec),
        '-vf', vf,
        '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS), rawSlice]);
    } else {
 // end. settled view (skip early scroll fat). Never speed-warp (that flashes).
      const ss = Math.max(t0, t1 - speakSec);
      run(['-y', '-ss', String(ss), '-i', master, '-t', String(speakSec),
        '-vf', vf,
        '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS), rawSlice]);
    }
  } else {
    // Short chapter: native speed + freeze last frame to fill speak (no speed-warp flash)
    const base = dest.replace(/\.mp4$/, '_base.mp4');
    run(['-y', '-ss', String(t0), '-i', master, '-t', String(srcLen),
      '-vf', vf,
      '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS), base]);
    const lastFrame = dest.replace(/\.mp4$/, '_s_last.png');
    run(['-y', '-sseof', '-0.1', '-i', base, '-frames:v', '1', lastFrame]);
    const holdFill = dest.replace(/\.mp4$/, '_s_fill.mp4');
    stillHold(lastFrame, holdFill, Math.max(0.1, speakSec - srcLen + 0.05));
    const merged = dest.replace(/\.mp4$/, '_merged.mp4');
    concat([base, holdFill], merged);
    run(['-y', '-i', merged, '-t', String(speakSec),
      '-vf', `fps=${FPS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an', rawSlice]);
  }

  if (padSec <= 0.05) {
    fs.copyFileSync(rawSlice, dest);
    return;
  }
  const lastFrame = dest.replace(/\.mp4$/, '_last.png');
  run(['-y', '-sseof', '-0.1', '-i', rawSlice, '-frames:v', '1', lastFrame]);
  const hold = dest.replace(/\.mp4$/, '_hold.mp4');
  stillHold(lastFrame, hold, padSec);
  concatXfade([rawSlice, hold], dest, 0.12);
  const trimmed = dest + '.t.mp4';
  run(['-y', '-i', dest, '-t', String(speakSec + padSec), '-c', 'copy', trimmed]);
  fs.renameSync(trimmed, dest);
}

function softEdge(clip, dest, { fadeIn = 0, fadeOut = 0 } = {}) {
  const d = dur(clip);
  const parts = [`fps=${FPS}`, 'format=yuv420p'];
  if (fadeIn > 0.05) parts.push(`fade=t=in:st=0:d=${fadeIn.toFixed(3)}`);
  if (fadeOut > 0.05) {
    const st = Math.max(0, d - fadeOut);
    parts.push(`fade=t=out:st=${st.toFixed(3)}:d=${fadeOut.toFixed(3)}`);
  }
  run(['-y', '-i', clip,
    '-vf', parts.join(','),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an',
    '-t', String(d), dest]);
}

function makeSilence(dest, seconds) {
  run(['-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(seconds),
    '-c:a', 'aac', '-b:a', '192k', dest]);
}

function buildPacedVoMusic(outPath) {
  const music = a('assets/music/es_go_adelyn_paik_instrumental.mp3');
  const segs = [];
  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    const partClip = path.join(WORK, `vo_part_${i}.m4a`);
    run(['-y', '-i', a(b.part), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', partClip]);
    segs.push(partClip);
    const pad = padOf(b);
    if (pad > 0.05) {
      const sil = path.join(WORK, `vo_pad_${i}.m4a`);
      makeSilence(sil, pad);
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
    t += speak + padOf(b);
  }
  fs.writeFileSync(srtPath, body, 'utf8');
}

async function main() {
  const markers = loadMarkers();
  const portalMarkers = loadPortalMarkers();
  if (portalMarkers) console.log("Portal capture", portalMarkers.durationSec, "s");
  console.log('Master', markers.durationSec.toFixed?.(2) || markers.durationSec, 's · chapters', Object.keys(markers.chapters).length);

  console.log('Building paced VO+music…');
  const voMusic = path.join(WORK, 'parent_tour_vo_paced.m4a');
  const voDur = buildPacedVoMusic(voMusic);
  fs.copyFileSync(voMusic, a('vo/parent_tour_vo_paced.m4a'));
  console.log({ voDur: +voDur.toFixed(2) });

  const coldClip = path.join(WORK, '00_cold.mp4');
  const outroClip = path.join(WORK, '99_outro.mp4');
  stillHold(a('assets/parent-tour/thumbs/cold_open_thumb.png'), coldClip, COLD);
  stillHold(a('assets/parent-tour/thumbs/outro_thank_you.png'), outroClip, OUTRO);

  const beatClips = [];
  let visualSum = 0;
  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    const speak = dur(a(b.part));
    const pad = padOf(b);
    const d = speak + pad;
    visualSum += d;
    const clip = path.join(WORK, `beat_${String(i + 1).padStart(2, '0')}.mp4`);
    console.log(`beat ${i + 1}/${BEATS.length} ${d.toFixed(2)}s  ${b.caption}`);

    if (b.chapter && b.portal && portalMarkers?.chapters?.[b.chapter]) {
      const ch = portalMarkers.chapters[b.chapter];
      console.log(`  cut PORTAL ${ch.t0.toFixed(2)}→${ch.t1.toFixed(2)} → speak ${speak.toFixed(2)}s · ${b.fitMode || 'end'}`);
      cutChapterToBeat(PORTAL_MASTER_PATH, ch.t0, ch.t1, clip, speak, pad, b.fitMode);
    } else if (b.fitMode === 'pages' && b.pageIds?.length && markers.rawMarkers?.length) {
      console.log(`  pages tour [${b.pageIds.join(', ')}] → speak ${speak.toFixed(2)}s · soft xfade`);
      cutPagesTour(MASTER_PATH, markers.rawMarkers, b.pageIds, clip, speak, pad);
    } else if (b.chapter && markers.chapters[b.chapter]) {
      const ch = markers.chapters[b.chapter];
      console.log(`  cut master ${ch.t0.toFixed(2)}→${ch.t1.toFixed(2)} (${(ch.t1 - ch.t0).toFixed(2)}s raw) → speak ${speak.toFixed(2)}s · ${b.fitMode || 'end'}`);
      cutChapterToBeat(MASTER_PATH, ch.t0, ch.t1, clip, speak, pad, b.fitMode);
    } else if (b.still || b.stillFallback) {
      const fitted = path.join(WORK, `still_${i}.png`);
      fitStillPng(resolveStill(b), fitted, !!b.privacy);
      stillHold(fitted, clip, d);
    }
    const trimmed = path.join(WORK, `beat_${String(i + 1).padStart(2, '0')}_t.mp4`);
    run(['-y', '-i', clip, '-t', String(d),
      '-vf', `fps=${FPS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an', trimmed]);

 // Soft breathe out of membership / portal (fade keeps duration. no VO desync)
    const fadeOut = b.sectionExit ? SECTION_BRIDGE : 0;
    const fadeIn = (i > 0 && BEATS[i - 1].sectionExit) ? SECTION_BRIDGE : (i === 0 ? 0.25 : 0);
    if (fadeOut > 0 || fadeIn > 0) {
      const edged = path.join(WORK, `beat_${String(i + 1).padStart(2, '0')}_edge.mp4`);
      softEdge(trimmed, edged, { fadeIn, fadeOut });
      beatClips.push(edged);
    } else {
      beatClips.push(trimmed);
    }
  }
  console.log({ visualSum: +visualSum.toFixed(2), voDur: +voDur.toFixed(2), delta: +(visualSum - voDur).toFixed(3) });

  const bodyVideo = path.join(WORK, 'body.mp4');
 concat(beatClips, bodyVideo); // re-encode join (no flash); no xfade here. would shorten vs VO
  const videoSilent = path.join(WORK, 'video_silent.mp4');
  concat([coldClip, bodyVideo, outroClip], videoSilent);

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

  const listen = path.join(require('os').homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_parent_tour_16x9.mp4');
  fs.copyFileSync(finalOut, listen);
  try { execFileSync('open', [listen]); } catch {}
  console.log('DONE', finalOut);
  console.log('ALSO', listen);
  console.log('duration', dur(finalOut).toFixed(2) + 's');
}

main().catch((e) => { console.error(e); process.exit(1); });
