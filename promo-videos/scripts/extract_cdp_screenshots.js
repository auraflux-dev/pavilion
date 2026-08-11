#!/usr/bin/env node
'use strict';
/** Extract Page.captureScreenshot CDP JSON dumps into numbered PNGs. */
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.argv[2] || '');
const files = process.argv.slice(3);
if (!outDir || !files.length) {
  console.error('usage: extract_cdp_screenshots.js <outDir> <json...>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
let i = 0;
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const data = j.data || j.result?.data;
  if (!data) throw new Error('no data in ' + f);
  const n = String(i).padStart(2, '0');
  const out = path.join(outDir, `${n}.png`);
  fs.writeFileSync(out, Buffer.from(data, 'base64'));
  console.log(out);
  i += 1;
}
