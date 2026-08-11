#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const [,, cdpJson, outMp4] = process.argv;
if (!cdpJson || !outMp4) {
  console.error('Usage: decode_cdp_webm.js <cdp-response.json> <out.mp4>');
  process.exit(1);
}
const raw = fs.readFileSync(cdpJson, 'utf8');
const j = JSON.parse(raw);
// Find b64 in nested result
function findB64(obj, depth=0) {
  if (!obj || depth > 8) return null;
  if (typeof obj === 'object') {
    if (obj.b64 && typeof obj.b64 === 'string' && obj.b64.length > 100) return obj;
    if (obj.value) return findB64(obj.value, depth+1);
    if (obj.result) return findB64(obj.result, depth+1);
    for (const v of Object.values(obj)) {
      const r = findB64(v, depth+1);
      if (r) return r;
    }
  }
  return null;
}
const meta = findB64(j);
if (!meta) {
  // Maybe the whole file is the evaluate result wrapper from MCP
  const m = raw.match(/"b64"\s*:\s*"([A-Za-z0-9+\/=]+)"/);
  if (!m) { console.error('no b64 found'); process.exit(2); }
  const webm = Buffer.from(m[1], 'base64');
  const webmPath = outMp4.replace(/\.mp4$/, '.webm');
  fs.writeFileSync(webmPath, webm);
  execFileSync(ff, ['-y','-i', webmPath, '-c:v','libx264','-pix_fmt','yuv420p','-an', outMp4], {stdio:'inherit'});
  console.log('wrote', outMp4, 'from regex', webm.length);
  process.exit(0);
}
const webm = Buffer.from(meta.b64, 'base64');
const webmPath = outMp4.replace(/\.mp4$/, '.webm');
fs.writeFileSync(webmPath, webm);
execFileSync(ff, ['-y','-i', webmPath, '-c:v','libx264','-pix_fmt','yuv420p','-an', outMp4], {stdio:'inherit'});
console.log(JSON.stringify({ out: outMp4, bytes: webm.length, frames: meta.frames, durationApprox: meta.durationApprox, scrollPx: meta.scrollPx }));
