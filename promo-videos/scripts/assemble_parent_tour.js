#!/usr/bin/env node
'use strict';
/**
 * SHMSPTO parent tour assembly (stills + VO/music → captions + logo).
 * Re-run anytime: node scripts/assemble_parent_tour.js
 *
 * From ~/cwn-c0 (for dotenv / OpenAI whisper): 
 *   node /Users/robertgregory/wix-shmspto/promo-videos/scripts/assemble_parent_tour.js
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });
try { require('dotenv').config(); } catch {}

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const WORK = path.join(OUT_DIR, '_work');
const W = 1920;
const H = 1080;
const FPS = 30;
const XF = 0.35; // soft crossfade

const ff = process.env.FFMPEG_PATH || 'ffmpeg';
const fp = process.env.FFPROBE_PATH || 'ffprobe';

function run(bin, args, opts = {}) {
  execFileSync(bin, args, { stdio: opts.quiet ? 'ignore' : 'inherit', ...opts });
}

function dur(file) {
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}

function a(rel) {
  return path.join(ROOT, rel);
}

/** Still timeline aligned to current VO paragraph parts (SEE≈HEAR). */
const BEATS = [
  // Ch1
  { part: 'vo/_parts/ch01_website_p01.m4a', still: 'assets/parent-tour/ch1/01_home.png', overlay: 'STONE HILL MIDDLE SCHOOL PTO' },
  { part: 'vo/_parts/ch01_website_p02.m4a', still: 'assets/parent-tour/ch1/02_programs.png', overlay: 'PROGRAMS · EVENTS · THE COVE', montage: [
    'assets/parent-tour/ch1/02_programs.png',
    'assets/parent-tour/ch1/03_events.png',
    'assets/parent-tour/ch1/04_cove.png',
    'assets/parent-tour/ch1/05_volunteer.png',
    'assets/parent-tour/ch1/07_board.png',
  ]},
  { part: 'vo/_parts/ch01_website_p03.m4a', still: 'assets/parent-tour/ch1/09_membership.png', overlay: 'NEXT · MEMBERSHIP' },
  // Ch2
  { part: 'vo/_parts/ch02_membership_p01.m4a', still: 'assets/parent-tour/ch2/01b_membership_tiers_full.png', overlay: 'REEF · LAGOON · TIDE' },
  { part: 'vo/_parts/ch02_membership_p02.m4a', still: 'assets/parent-tour/ch2/01b_membership_tiers_full.png', overlay: 'REEF · $79' },
  { part: 'vo/_parts/ch02_membership_p03.m4a', still: 'assets/parent-tour/ch2/01b_membership_tiers_full.png', overlay: 'LAGOON · $149' },
  { part: 'vo/_parts/ch02_membership_p04.m4a', still: 'assets/parent-tour/ch2/01b_membership_tiers_full.png', overlay: 'TIDE · $249' },
  { part: 'vo/_parts/ch02_membership_p05.m4a', still: 'assets/parent-tour/ch2/01b_membership_tiers_full.png', overlay: 'FIRST 30 DAYS · +10% CARD' },
  { part: 'vo/_parts/ch02_membership_p06.m4a', still: 'assets/parent-tour/ch1/01_home.png', overlay: 'FUNDS ALL PTO WORK', montage: [
    'assets/parent-tour/ch1/02_programs.png',
    'assets/parent-tour/ch1/03_events.png',
    'assets/parent-tour/ch1/04_cove.png',
    'assets/parent-tour/ch1/05_volunteer.png',
  ]},
  { part: 'vo/_parts/ch02_membership_p07.m4a', still: 'assets/parent-tour/ch2/02_auth_join.png', overlay: 'ABOUT 2 MINUTES · TEE SIZE' },
  // Ch3
  { part: 'vo/_parts/ch03_cove_card_p01.m4a', still: 'assets/parent-tour/ch3/02b_store_cove_code_qr_free.png', overlay: 'QR PRIMARY · 6-DIGIT BACKUP', privacy: true },
  { part: 'vo/_parts/ch03_cove_card_p02.m4a', still: 'assets/parent-tour/ch3/02b_store_cove_code_qr_free.png', overlay: 'PHOTOS · WALLET COMING SOON', privacy: true },
  { part: 'vo/_parts/ch03_cove_card_p03.m4a', still: 'assets/parent-tour/ch3/02_portal_store_card_paid.png', overlay: 'PAID · PRELOADED', privacy: true },
  { part: 'vo/_parts/ch03_cove_card_p04.m4a', still: 'assets/parent-tour/ch3/03b_load_family_card_free.png', overlay: 'FREE · LOAD ANYTIME', privacy: true },
  { part: 'vo/_parts/ch03_cove_card_p05.m4a', still: 'assets/parent-tour/ch3/04_cove_shop.png', overlay: 'SHOW QR OR SAY CODE' },
  { part: 'vo/_parts/ch03_cove_card_p06.m4a', still: 'assets/parent-tour/ch3/05_end_home.png', overlay: 'SHMSPTO.ORG · GO STINGRAYS' },
];

function escDrawtext(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

/** Blur email / student name zones on portal stills (approximate for current captures). */
function privacyStill(src, dest) {
  // Fit first so crop coords are in 1920x1080 space, then soften PII bands
  const vf = [
    `scale=${W}:${H}:force_original_aspect_ratio=decrease`,
    `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`,
    `split[base][tmp]`,
    // left profile / email band
    `[tmp]crop=560:80:80:420,boxblur=14:2[b1]`,
    `[base][b1]overlay=80:420[v1]`,
    `[v1]split[b2][t2]`,
    // right calendar / student names
    `[t2]crop=700:120:1120:640,boxblur=12:2[b2b]`,
    `[b2][b2b]overlay=1120:640`,
  ].join(';');
  try {
    run(ff, ['-y', '-i', src, '-vf', vf, dest], { quiet: true });
  } catch {
    // Fallback: just fit without blur
    run(ff, [
      '-y', '-i', src,
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`,
      dest,
    ], { quiet: true });
  }
}

function fitStill(src, dest, { privacy = false } = {}) {
  let input = src;
  if (privacy) {
    const blurred = dest.replace(/\.png$/, '_priv.png');
    privacyStill(src, blurred);
    input = blurred;
  }
  // Static fit — Ken Burns skipped for crisp UI screenshots
  run(ff, [
    '-y', '-i', input,
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1f17,format=rgb24`,
    dest,
  ], { quiet: true });
}

function stillToClip(stillPng, outMp4, seconds, overlayText) {
  const font = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
  const fontExists = fs.existsSync(font);
  const dt = fontExists
    ? `,drawtext=fontfile=${font}:text='${escDrawtext(overlayText)}':fontsize=36:fontcolor=white:borderw=3:bordercolor=black@0.7:x=(w-text_w)/2:y=h-90:box=1:boxcolor=0x0b1f17@0.55:boxborderw=14`
    : '';
  run(ff, [
    '-y', '-loop', '1', '-i', stillPng,
    '-t', String(Math.max(0.4, seconds)),
    '-r', String(FPS),
    '-vf', `format=yuv420p${dt}`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-an', outMp4,
  ], { quiet: true });
}

function montageClip(stills, outMp4, totalSec, overlayText) {
  // Hard cuts through nav stills — keeps timing exact to VO part
  const slice = Math.max(0.5, totalSec / stills.length);
  const clips = [];
  stills.forEach((s, i) => {
    const fitted = path.join(WORK, `mont_${path.basename(outMp4, '.mp4')}_${i}.png`);
    fitStill(a(s), fitted);
    const hold = i === stills.length - 1
      ? Math.max(0.4, totalSec - slice * (stills.length - 1))
      : slice;
    const c = path.join(WORK, `mont_${path.basename(outMp4, '.mp4')}_${i}.mp4`);
    stillToClip(fitted, c, hold, i === 0 ? overlayText : overlayText);
    clips.push(c);
  });
  concatClips(clips, outMp4);
}

function concatClips(clips, outPath) {
  const list = path.join(WORK, 'concat.txt');
  fs.writeFileSync(list, clips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  run(ff, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', outPath], { quiet: true });
}

async function whisperSrt(audioOrVideoPath, srtPath) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing — captions skipped');
  const mp3 = path.join(WORK, 'whisper_audio.mp3');
  run(ff, ['-y', '-i', audioOrVideoPath, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k', mp3], { quiet: true });
  const form = new FormData();
  form.append('file', fs.createReadStream(mp3), { filename: 'audio.mp3' });
  form.append('model', 'whisper-1');
  form.append('response_format', 'srt');
  form.append('prompt', 'Stone Hill Middle School PTO, SHMSPTO, Stingrays, Reef, Lagoon, Tide, The Cove, Member Portal, Go Stingrays');
  const resp = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${key}` },
    maxBodyLength: Infinity,
    timeout: 300000,
  });
  fs.writeFileSync(srtPath, resp.data, 'utf8');
}

function burnCaptions(videoIn, srtPath, videoOut) {
  const escaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const style = "FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=70";
  run(ff, [
    '-y', '-i', videoIn,
    '-vf', `subtitles='${escaped}':force_style='${style}'`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    videoOut,
  ], { quiet: true });
}

function loudnorm(videoIn, videoOut) {
  run(ff, [
    '-y', '-i', videoIn,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart',
    videoOut,
  ], { quiet: true });
}

async function main() {
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('SHMSPTO parent tour assembly');

  const beatClips = [];
  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    const partPath = a(b.part);
    if (!fs.existsSync(partPath)) throw new Error('Missing VO part: ' + b.part);
    const d = dur(partPath);
    const clip = path.join(WORK, `beat_${String(i + 1).padStart(2, '0')}.mp4`);
    console.log(`beat ${i + 1}/${BEATS.length} ${d.toFixed(2)}s  ${b.overlay}`);
    if (b.montage && b.montage.length > 1) {
      montageClip(b.montage, clip, d, b.overlay);
    } else {
      const fitted = path.join(WORK, `still_${i}.png`);
      fitStill(a(b.still), fitted, { privacy: !!b.privacy });
      stillToClip(fitted, clip, d, b.overlay);
    }
    // Force exact duration trim
    const trimmed = path.join(WORK, `beat_${String(i + 1).padStart(2, '0')}_t.mp4`);
    run(ff, ['-y', '-i', clip, '-t', String(d), '-c', 'copy', trimmed], { quiet: true });
    beatClips.push(trimmed);
  }

  const videoSilent = path.join(WORK, 'video_silent.mp4');
  concatClips(beatClips, videoSilent);

  const audio = a('vo/parent_tour_vo_music.m4a');
  const muxed = path.join(WORK, 'muxed.mp4');
  const vDur = dur(videoSilent);
  const aDur = dur(audio);
  console.log(`mux video=${vDur.toFixed(2)}s audio=${aDur.toFixed(2)}s`);
  run(ff, [
    '-y', '-i', videoSilent, '-i', audio,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    muxed,
  ], { quiet: true });

  // Corner logo bug
  const logo = a('assets/parent-tour/ch3/06_logo.png');
  const withLogo = path.join(WORK, 'with_logo.mp4');
  run(ff, [
    '-y', '-i', muxed, '-i', logo,
    '-filter_complex',
    `[1:v]scale=160:-1,format=rgba,colorchannelmixer=aa=0.92[lg];[0:v][lg]overlay=W-w-36:H-h-36:format=auto`,
    '-c:a', 'copy',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    withLogo,
  ], { quiet: true });

  const srt = path.join(OUT_DIR, 'SHMSPTO_parent_tour_captions.srt');
  let captioned = withLogo;
  try {
    console.log('Whisper captions…');
    await whisperSrt(audio, srt);
    const capOut = path.join(WORK, 'captioned.mp4');
    burnCaptions(withLogo, srt, capOut);
    captioned = capOut;
    console.log('captions OK', srt);
  } catch (e) {
    console.warn('captions skipped:', e.message);
  }

  const finalOut = path.join(OUT_DIR, 'SHMSPTO_parent_tour_16x9.mp4');
  const loudOut = path.join(WORK, 'loud.mp4');
  try {
    console.log('loudnorm…');
    loudnorm(captioned, loudOut);
    fs.copyFileSync(loudOut, finalOut);
  } catch (e) {
    console.warn('loudnorm failed, copying captioned:', e.message);
    fs.copyFileSync(captioned, finalOut);
  }

  const listen = path.join(require('os').homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_parent_tour_16x9.mp4');
  fs.copyFileSync(finalOut, listen);
  try { run('open', [listen]); } catch {}
  console.log('DONE', finalOut);
  console.log('ALSO', listen);
  console.log(`duration ${dur(finalOut).toFixed(2)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
