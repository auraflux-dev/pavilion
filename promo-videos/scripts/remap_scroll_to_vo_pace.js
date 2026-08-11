#!/usr/bin/env node
'use strict';
/**
 * Remap an existing continuous scroll clip to slower VO pacing.
 * holdTop → sample scroll frames slowly → holdBottom (no re-login needed).
 *
 *   node scripts/remap_scroll_to_vo_pace.js \
 *     --in assets/.../free_portal_home.mp4 \
 *     --out assets/.../free_portal_home.mp4 \
 *     --seconds 10.3 \
 *     --hold-top 4 --hold-bottom 2
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const FPS = 30;

function dur(file) {
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}

function parseArgs(argv) {
  const o = { in: null, out: null, seconds: null, holdTop: null, holdBottom: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--in') o.in = next();
    else if (a === '--out') o.out = next();
    else if (a === '--seconds') o.seconds = Number(next());
    else if (a === '--hold-top') o.holdTop = Number(next());
    else if (a === '--hold-bottom') o.holdBottom = Number(next());
  }
  if (!o.in || !o.out || !o.seconds) {
    console.error('Required: --in --out --seconds');
    process.exit(1);
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const src = path.resolve(ROOT, opts.in);
  const dest = path.resolve(ROOT, opts.out);
  const target = opts.seconds;
  const holdTop = opts.holdTop != null ? opts.holdTop : target * 0.38;
  const holdBottom = opts.holdBottom != null ? opts.holdBottom : target * 0.24;
  const scrollSec = Math.max(1.5, target - holdTop - holdBottom);

  const work = path.join(ROOT, 'assets', '_remap_tmp', path.basename(dest, '.mp4'));
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  // Dump source frames in order (ignore broken MediaRecorder timestamps)
  execFileSync(ff, [
    '-y', '-i', src, '-vsync', '0', path.join(work, 's%04d.png'),
  ], { stdio: 'inherit' });

  const srcFrames = fs.readdirSync(work).filter((f) => /^s\d+\.png$/.test(f)).sort();
  if (srcFrames.length < 4) throw new Error('too few source frames: ' + srcFrames.length);

  const first = path.join(work, srcFrames[0]);
  const last = path.join(work, srcFrames[srcFrames.length - 1]);
  // Middle = actual scroll motion (drop first/last ~12% which are holds in original)
  const a = Math.floor(srcFrames.length * 0.12);
  const b = Math.max(a + 2, Math.floor(srcFrames.length * 0.88));
  const mid = srcFrames.slice(a, b);

  const holdTopN = Math.max(1, Math.round(holdTop * FPS));
  const scrollN = Math.max(1, Math.round(scrollSec * FPS));
  const holdBottomN = Math.max(1, Math.round(holdBottom * FPS));

  const outDir = path.join(work, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  let n = 0;
  const copy = (from) => {
    n += 1;
    fs.copyFileSync(from, path.join(outDir, `f${String(n).padStart(5, '0')}.png`));
  };

  for (let i = 0; i < holdTopN; i++) copy(first);
  for (let i = 0; i < scrollN; i++) {
    const idx = Math.min(mid.length - 1, Math.floor((i / Math.max(1, scrollN - 1)) * (mid.length - 1)));
    copy(path.join(work, mid[idx]));
  }
  for (let i = 0; i < holdBottomN; i++) copy(last);

  const tmp = dest.replace(/\.mp4$/, '._remap.mp4');
  execFileSync(ff, [
    '-y', '-framerate', String(FPS), '-i', path.join(outDir, 'f%05d.png'),
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS), '-an',
    '-t', String(target),
    tmp,
  ], { stdio: 'inherit' });
  fs.renameSync(tmp, dest);
  console.log(`✓ ${path.relative(ROOT, dest)}  ${dur(dest).toFixed(2)}s  (hold ${holdTop.toFixed(1)} / scroll ${scrollSec.toFixed(1)} / hold ${holdBottom.toFixed(1)} · ${srcFrames.length}→${n} frames)`);
}

main();
