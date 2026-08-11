#!/usr/bin/env node
'use strict';
/**
 * Assemble SHMS PTO Membership tiers walkthrough (VO-synced scrolls + BTM VO).
 *
 * Prereq VO:
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/generate_membership_tiers_vo.js
 *
 * Public scrolls:
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/capture_membership_tiers_vo_scrolls.js
 *
 * Assemble:
 *   FFMPEG=/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg node scripts/assemble_membership_tiers.js
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

const COLD_SEC = 3.8;
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const WORK = path.join(OUT_DIR, '_work_membership_tiers');
const ASSETS = path.join(ROOT, 'assets/membership-tiers');
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
const PAD = 0.55;
const TAIL_PAD = 0.7;

const BEATS = [
  {
    part: 'vo/_parts/membership_tiers_p01_who.m4a',
    clip: 'assets/membership-tiers/scrolls/tiers_all_sidebyside.mp4',
    caption: 'Memberships · What Each Perk Means',
  },
  {
    part: 'vo/_parts/membership_tiers_p02_frame.m4a',
    clip: 'assets/membership-tiers/scrolls/purchase_path_combo.mp4',
    caption: 'Join · Account · Pay · Paid',
  },
  {
    part: 'vo/_parts/membership_tiers_p03_cove_card.m4a',
    clip: 'assets/membership-tiers/scrolls/public_cove_card.mp4',
    caption: 'Cove Digital Card · PTO Wallet',
  },
  {
    part: 'vo/_parts/membership_tiers_p04_enrich_food.m4a',
    clip: 'assets/membership-tiers/scrolls/enrich_food_combo.mp4',
    caption: 'Enrichment · Free Refreshments',
  },
  {
    part: 'vo/_parts/membership_tiers_p05_swag.m4a',
    clip: 'assets/membership-tiers/scrolls/swag_combo.mp4',
    caption: 'Spirit Wear · Car Magnet $10',
  },
  {
    part: 'vo/_parts/membership_tiers_p06_reef.m4a',
    clip: 'assets/membership-tiers/scrolls/tier_zoom_reef.mp4',
    caption: 'Reef · $79',
  },
  {
    part: 'vo/_parts/membership_tiers_p07_lagoon.m4a',
    clip: 'assets/membership-tiers/scrolls/tier_zoom_lagoon.mp4',
    caption: 'Lagoon · $149',
  },
  {
    part: 'vo/_parts/membership_tiers_p08_tide.m4a',
    clip: 'assets/membership-tiers/scrolls/tier_zoom_tide.mp4',
    caption: 'Tide · $249',
  },
  {
    part: 'vo/_parts/membership_tiers_p09_faculty.m4a',
    clip: 'assets/membership-tiers/scrolls/public_faculty.mp4',
    caption: 'Faculty · $20',
  },
  {
    part: 'vo/_parts/membership_tiers_p10_purchase.m4a',
    // Purchase details — Join path + magnet-or-shirt choice (portal is next).
    clip: 'assets/membership-tiers/scrolls/purchase_path_combo.mp4',
    caption: 'Shirt Size · Magnet Included · Pay',
  },
  {
    part: 'vo/_parts/membership_tiers_p11_paid_portal.m4a',
    // Own beat so continuousFit cannot trim portal off the end of a long combo.
    clip: 'assets/membership-tiers/scrolls/paid_portal_post.mp4',
    caption: 'Paid Member Portal',
  },
  {
    part: 'vo/_parts/membership_tiers_p12_close.m4a',
    clip: 'assets/membership-tiers/scrolls/public_close.mp4',
    caption: 'Compare Tiers · SHMSPTO Dot Org',
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

function continuousFit(src, dest, targetSec) {
  const srcLen = Math.max(0.4, dur(src));
  const ratio = targetSec / srcLen;
  const MAX_STRETCH = 1.12;

  if (ratio <= 1.02) {
    run([
      '-y', '-i', src, '-t', String(targetSec),
      '-vf', VF, '-an',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
      dest,
    ]);
    return;
  }

  if (ratio <= MAX_STRETCH) {
    const setpts = `setpts=${ratio.toFixed(6)}*PTS`;
    run([
      '-y', '-i', src,
      '-vf', `${VF},${setpts}`,
      '-an', '-t', String(targetSec),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
      dest,
    ]);
    return;
  }

  const raw = dest.replace(/\.mp4$/, '_raw.mp4');
  const last = dest.replace(/\.mp4$/, '_last.png');
  const hold = dest.replace(/\.mp4$/, '_hold.mp4');
  run([
    '-y', '-i', src,
    '-vf', VF, '-an',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
    raw,
  ]);
  run(['-y', '-sseof', '-0.05', '-i', raw, '-frames:v', '1', last]);
  stillHold(last, hold, targetSec - srcLen + 0.1);
  const list = dest.replace(/\.mp4$/, '_concat.txt');
  fs.writeFileSync(list, [`file '${raw}'`, `file '${hold}'`].join('\n'));
  const merged = dest.replace(/\.mp4$/, '_mrg.mp4');
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', merged]);
  run([
    '-y', '-i', merged, '-t', String(targetSec),
    '-vf', `fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an',
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

function buildEnrichFoodCombo() {
  const enrich = a('assets/membership-tiers/scrolls/public_enrichment.mp4');
  const food = a('assets/membership-tiers/scrolls/public_refreshments.mp4');
  const out = a('assets/membership-tiers/scrolls/enrich_food_combo.mp4');
  if (!fs.existsSync(enrich) || !fs.existsSync(food)) {
    throw new Error('Missing enrichment or refreshments scroll');
  }
  const eNorm = path.join(WORK, 'enrich_norm.mp4');
  const fNorm = path.join(WORK, 'food_norm.mp4');
  run([
    '-y', '-i', enrich, '-vf', VF, '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), eNorm,
  ]);
  run([
    '-y', '-i', food, '-vf', VF, '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), fNorm,
  ]);
  const list = path.join(WORK, 'enrich_food_concat.txt');
  fs.writeFileSync(list, [`file '${eNorm}'`, `file '${fNorm}'`].join('\n'));
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
  console.log('enrich+food combo', dur(out).toFixed(1) + 's');
  return out;
}

function buildJoinProofCombo() {
  const join = a('assets/membership-tiers/scrolls/public_join.mp4');
  const paid = a('assets/membership-tiers/scrolls/paid_portal_proof.mp4');
  const out = a('assets/membership-tiers/scrolls/join_proof_combo.mp4');
  if (!fs.existsSync(join) || !fs.existsSync(paid)) {
    throw new Error('Missing join or paid proof scroll');
  }
  const jNorm = path.join(WORK, 'join_norm.mp4');
  const pNorm = path.join(WORK, 'paid_norm.mp4');
  run([
    '-y', '-i', join, '-vf', VF, '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), jNorm,
  ]);
  run([
    '-y', '-i', paid, '-vf', VF, '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), pNorm,
  ]);
  const list = path.join(WORK, 'join_proof_concat.txt');
  fs.writeFileSync(list, [`file '${jNorm}'`, `file '${pNorm}'`].join('\n'));
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
  console.log('join+proof combo', dur(out).toFixed(1) + 's');
  return out;
}

function buildSwagCombo() {
  const spirit = a('assets/membership-tiers/scrolls/public_spiritwear.mp4');
  const magnet = a('assets/membership-tiers/scrolls/magnet_proof_hold.mp4');
  const out = a('assets/membership-tiers/scrolls/swag_combo.mp4');
  if (!fs.existsSync(spirit)) throw new Error('Missing spiritwear scroll');
  if (!fs.existsSync(magnet)) throw new Error('Missing magnet hold clip');
  const sNorm = path.join(WORK, 'swag_spirit.mp4');
  const mNorm = path.join(WORK, 'swag_magnet.mp4');
  run([
    '-y', '-i', spirit, '-vf', VF, '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), sNorm,
  ]);
  run([
    '-y', '-i', magnet, '-vf', VF, '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), mNorm,
  ]);
  const list = path.join(WORK, 'swag_concat.txt');
  fs.writeFileSync(list, [`file '${sNorm}'`, `file '${mNorm}'`].join('\n'));
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
  console.log('swag combo', dur(out).toFixed(1) + 's');
  return out;
}

function main() {
  if (!FONT) throw new Error('Arial Bold font missing');
  if (!fs.existsSync(ff)) throw new Error(`ffmpeg not found at ${ff}`);
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(ASSETS, { recursive: true });

  const coldImg = path.join(ASSETS, 'cold_open.png');
  const outroImg = path.join(ASSETS, 'outro.png');
  makeBrandCard(coldImg, {
    title: 'MEMBERSHIP TIERS',
    subtitle: 'Reef · Lagoon · Tide · Real Value',
  });
  makeBrandCard(outroImg, {
    title: 'THANK YOU',
    subtitle: 'Go Stingrays!',
  });
  assertStapleAssets(coldImg, outroImg);

  buildSwagCombo();
  buildEnrichFoodCombo();
  buildJoinProofCombo();

  const music = a('assets/music/es_go_adelyn_paik_instrumental.mp3');
  if (!fs.existsSync(music)) throw new Error('Missing music bed');

  for (const b of BEATS) {
    if (!fs.existsSync(a(b.part))) {
      throw new Error(`Missing VO ${b.part}`);
    }
    if (!fs.existsSync(a(b.clip))) {
      throw new Error(`Missing clip ${b.clip}`);
    }
  }

  const coldA = path.join(WORK, 'cold_a.m4a');
  const coldClip = path.join(WORK, '00_cold.mp4');
  musicBed(music, coldA, COLD_SEC, { fadeOut: false });
  muxSilentStill(coldImg, coldA, coldClip, COLD_SEC);

  const bodyClips = [];
  const srt = [];
  let t = COLD_SEC;
  srt.push(`1\n${tsFmt(0)} --> ${tsFmt(COLD_SEC - 0.05)}\nMembership Tiers · Families\n`);

  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    const vo = a(b.part);
    const isLast = i === BEATS.length - 1;
    const d = dur(vo) + PAD + (isLast ? TAIL_PAD : 0);
    const clip = path.join(WORK, `beat_${String(i).padStart(2, '0')}.mp4`);
    continuousFit(a(b.clip), clip, d);
    const muxed = path.join(WORK, `beat_${String(i).padStart(2, '0')}_m.mp4`);
    const padDur = PAD + (isLast ? TAIL_PAD : 0);
    // Normalize VO louder so bed music can't bury speech (mush around dense tier math).
    run([
      '-y', '-i', clip, '-i', vo,
      '-filter_complex',
      `[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=${padDur}[a]`,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-t', String(d),
      muxed,
    ]);
    bodyClips.push(muxed);
    const start = t;
    t += d;
    srt.push(`${i + 2}\n${tsFmt(start)} --> ${tsFmt(start + dur(vo))}\n${b.caption}\n`);
    console.log(`  clip p${String(i + 1).padStart(2, '0')}: ${b.caption} ← ${b.clip}`);
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

  const out = path.join(OUT_DIR, 'SHMSPTO_membership_tiers_16x9.mp4');
  const watch = path.join(os.homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_membership_tiers_16x9.mp4');
  run([
    '-y', '-i', joined, '-stream_loop', '-1', '-i', music,
    '-filter_complex',
    // Keep music well under VO (was burying speech ~2:35 on long Reef math).
    `[1:a]volume=0.035,afade=t=in:st=0:d=0.5[a1];` +
      `[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2:normalize=0:weights=1 0.18[a]`,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    '-movflags', '+faststart',
    out,
  ]);

  fs.copyFileSync(out, watch);
  fs.writeFileSync(path.join(OUT_DIR, 'SHMSPTO_membership_tiers_captions.srt'), srt.join('\n'));

  console.log('DONE', out);
  console.log('Watch file:', watch);
  console.log('duration', dur(out).toFixed(1) + 's');
  console.log('BEATS', BEATS.length);
}

if (require.main === module) {
  main();
}
