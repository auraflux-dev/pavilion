#!/usr/bin/env node
'use strict';
/**
 * Stitch ordered PNG frames into a 1920x1080 scroll clip for portal assemble.
 *
 *   node scripts/stitch_portal_scroll_frames.js <framesDir> <outMp4> [fps=6]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const framesDir = path.resolve(process.argv[2] || '');
const outMp4 = path.resolve(process.argv[3] || '');
const fps = Number(process.env.FPS || process.argv[4] || 4);
const W = 1920;
const H = 1080;

if (!framesDir || !outMp4) {
  console.error('usage: stitch_portal_scroll_frames.js <framesDir> <outMp4> [fps]');
  process.exit(1);
}

const frames = fs.readdirSync(framesDir)
  .filter((f) => /\.png$/i.test(f))
  .sort();
if (!frames.length) throw new Error('no png frames in ' + framesDir);

const list = path.join(framesDir, '_list.txt');
fs.writeFileSync(
  list,
  frames.map((f) => `file '${path.join(framesDir, f).replace(/'/g, "'\\''")}'\nduration ${1 / fps}`).join('\n')
    + `\nfile '${path.join(framesDir, frames[frames.length - 1]).replace(/'/g, "'\\''")}'\n`,
);

execFileSync(ff, [
  '-y', '-f', 'concat', '-safe', '0', '-i', list,
  '-vf', `fps=${fps},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
  '-an', '-movflags', '+faststart', outMp4,
], { stdio: ['ignore', 'ignore', 'inherit'] });

const d = parseFloat(execFileSync(fp, [
  '-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=noprint_wrappers=1:nokey=1', outMp4,
], { encoding: 'utf8' }).trim());
console.log('✓', outMp4, d.toFixed(1) + 's', `(${frames.length} frames @ ${fps}fps)`);
