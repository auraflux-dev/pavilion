#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const [,, cdpJson, outMp4, fpsArg] = process.argv;
const fps = Number(fpsArg || 8);
if (!cdpJson || !outMp4) {
  console.error('Usage: import_cursor_webm_cdp.js <cdp.json> <out.mp4> [captureFps=8]');
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(cdpJson, 'utf8'));
function findChunks(obj, depth = 0) {
  if (!obj || depth > 10) return null;
  if (Array.isArray(obj.chunks)) return obj;
  if (obj.value) return findChunks(obj.value, depth + 1);
  if (obj.result) return findChunks(obj.result, depth + 1);
  if (typeof obj === 'object') {
    for (const v of Object.values(obj)) {
      const r = findChunks(v, depth + 1);
      if (r) return r;
    }
  }
  return null;
}
const val = findChunks(j);
if (!val) { console.error('no chunks'); process.exit(2); }
const webm = Buffer.from(val.chunks.join(''), 'base64');
const outAbs = path.resolve(outMp4);
const webmPath = outAbs.replace(/\.mp4$/, '.webm');
const frameDir = path.join(path.dirname(outAbs), '_frames', path.basename(outAbs, '.mp4') + '_cont');
fs.mkdirSync(frameDir, { recursive: true });
fs.writeFileSync(webmPath, webm);
execFileSync(ff, ['-y', '-i', webmPath, '-vsync', '0', path.join(frameDir, 'f%04d.png')], { stdio: 'inherit' });
const n = fs.readdirSync(frameDir).filter((f) => f.endsWith('.png')).length;
execFileSync(ff, [
  '-y', '-framerate', String(fps), '-i', path.join(frameDir, 'f%04d.png'),
  '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', outAbs,
], { stdio: 'inherit' });
const info = execFileSync(fp, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration,nb_frames,r_frame_rate', '-of', 'default=nw=1', outAbs], { encoding: 'utf8' });
console.log(JSON.stringify({ out: outAbs, webmBytes: webm.length, pngFrames: n, info: info.trim() }, null, 2));
