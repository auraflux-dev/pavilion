#!/usr/bin/env node
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const [,, partsDir, outMp4] = process.argv;
const files = fs.readdirSync(partsDir).filter(f => /^\d+\.txt$/.test(f)).sort((a,b)=>Number(a)-Number(b));
let b64 = '';
for (const f of files) b64 += fs.readFileSync(partsDir + '/' + f, 'utf8').trim();
const webm = Buffer.from(b64, 'base64');
const webmPath = outMp4.replace(/\.mp4$/, '.webm');
fs.writeFileSync(webmPath, webm);
execFileSync(ff, ['-y','-i', webmPath, '-c:v','libx264','-pix_fmt','yuv420p','-r','30','-an', outMp4], {stdio:'inherit'});
console.log(JSON.stringify({ out: outMp4, webmBytes: webm.length, parts: files.length }));
