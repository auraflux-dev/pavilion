#!/usr/bin/env node
'use strict';
/**
 * Agent-side smoothness QA. Rob doesn't need to scrub every cut.
 *
 * Scores scene-change density and flags snappy clusters.
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/qa_tour_smoothness.js [video]
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ff = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const vid = process.argv[2] || path.join(os.homedir(), 'Downloads/SHMSPTO_WATCH_THIS_parent_tour_16x9.mp4');
const THRESH = 0.22;

const dur = parseFloat(execFileSync(fp, [
  '-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=noprint_wrappers=1:nokey=1', vid,
], { encoding: 'utf8' }).trim());

const { spawnSync } = require('child_process');
const probed = spawnSync(ff, [
  '-i', vid, '-filter:v', `select='gt(scene\\,${THRESH})',showinfo`, '-f', 'null', '-',
], { encoding: 'utf8', maxBuffer: 20e6 });
const err = `${probed.stderr || ''}`;
const times = [...err.matchAll(/pts_time:([0-9.]+)/g)].map((m) => +m[1]);
const windows = [];
for (let t = 0; t < dur; t += 10) {
  const n = times.filter((x) => x >= t && x < t + 10).length;
  windows.push({ from: t, to: Math.min(dur, t + 10), cuts: n, snappy: n >= 4 });
}

const report = {
  video: vid,
  durationSec: +dur.toFixed(2),
  sceneThreshold: THRESH,
  totalHardCuts: times.length,
  cutsPerMinute: +((times.length / dur) * 60).toFixed(1),
  snappyWindows: windows.filter((w) => w.snappy),
  allWindows: windows,
  guidance: [
 'snappyWindows = ≥4 hard scene cuts in 10s. usually page-tour or section exits',
    'Membership/portal CONTENT can look great while EXIT cuts still score snappy',
 'Fix: longer padAfter + fade out/in (sectionExit). not more speed-compress',
  ],
};

const out = path.join(__dirname, '../out/qa_smoothness_report.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  durationSec: report.durationSec,
  totalHardCuts: report.totalHardCuts,
  cutsPerMinute: report.cutsPerMinute,
  snappyWindows: report.snappyWindows,
}, null, 2));
console.log('Wrote', out);
