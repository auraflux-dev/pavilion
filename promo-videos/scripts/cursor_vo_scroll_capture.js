#!/usr/bin/env node
'use strict';
/**
 * Build an in-page VO-scroll recorder (MediaRecorder + html-to-image)
 * and a decoder that turns the downloaded .webm into a 1920x1080 mp4.
 *
 * The agent injects recordFn into Cursor browser via CDP, runs it, then
 * converts ~/Downloads/<name>.webm → assets/.../scrolls/<name>.mp4
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LIB = fs.readFileSync(
  '/tmp/hto-install/node_modules/html-to-image/dist/html-to-image.js',
  'utf8',
);
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const W = 1920;
const H = 1080;

/** Expression string for Runtime.evaluate — returns a Promise. */
function buildRecordExpression({
  filename,
  holdTopSec,
  scrollSec,
  holdBottomSec,
  scrollPx,
  hash,
  fps = 8,
}) {
  // filename without path; downloaded to browser default Downloads
  const opts = JSON.stringify({
    filename,
    holdTopSec,
    scrollSec,
    holdBottomSec,
    scrollPx: scrollPx == null ? null : scrollPx,
    hash: hash || null,
    fps,
  });

  // LIB is UMD; exposes htmlToImage on global when evaluated as script body.
  return `
(async () => {
  if (!globalThis.htmlToImage) {
    (function () {
      ${LIB}
    }).call(globalThis);
    globalThis.htmlToImage = globalThis.htmlToImage
      || (typeof self !== 'undefined' && self.htmlToImage)
      || (typeof window !== 'undefined' && window.htmlToImage);
  }
  if (!globalThis.htmlToImage || !globalThis.htmlToImage.toJpeg) {
    throw new Error('html-to-image failed to load: ' + typeof globalThis.htmlToImage);
  }

  const opts = ${opts};
  const frameMs = Math.round(1000 / opts.fps);

  // Dismiss banners
  const dismiss = [...document.querySelectorAll('button')]
    .find((el) => /dismiss/i.test(el.textContent || ''));
  if (dismiss) dismiss.click();

  if (opts.hash) {
    const el = document.getElementById(opts.hash);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, 0);
  }
  await new Promise((r) => setTimeout(r, 250));

  const metrics = {
    y: window.scrollY,
    vh: window.innerHeight,
    sh: document.documentElement.scrollHeight,
    vw: window.innerWidth,
  };
  const remaining = Math.max(0, metrics.sh - metrics.vh - metrics.y);
  const scrollPx = opts.scrollPx != null
    ? Math.min(opts.scrollPx, remaining)
    : remaining;

  const canvas = document.createElement('canvas');
  canvas.width = metrics.vw;
  canvas.height = metrics.vh;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(opts.fps);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm');
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  const paint = async () => {
    const dataUrl = await globalThis.htmlToImage.toJpeg(document.documentElement, {
      quality: 0.82,
      width: metrics.vw,
      height: metrics.vh,
      style: {
        width: metrics.vw + 'px',
        height: metrics.vh + 'px',
        margin: '0',
        overflow: 'hidden',
      },
      filter: (node) => {
        if (!node || !node.tagName) return true;
        const t = node.tagName.toLowerCase();
        return t !== 'script' && t !== 'noscript';
      },
    });
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = dataUrl;
    });
    ctx.fillStyle = '#0b2a1f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  rec.start(frameMs);
  await paint();

  // Hold top
  const holdTopFrames = Math.max(1, Math.round(opts.holdTopSec * 1000 / frameMs));
  for (let i = 0; i < holdTopFrames; i++) {
    await sleep(frameMs);
    await paint();
  }

  // Smooth scroll across scrollSec
  const scrollFrames = Math.max(1, Math.round(opts.scrollSec * 1000 / frameMs));
  const step = scrollPx / scrollFrames;
  for (let i = 0; i < scrollFrames; i++) {
    window.scrollBy({ top: step, left: 0, behavior: 'instant' });
    await sleep(frameMs);
    await paint();
  }

  // Hold bottom
  const holdBottomFrames = Math.max(1, Math.round(opts.holdBottomSec * 1000 / frameMs));
  for (let i = 0; i < holdBottomFrames; i++) {
    await sleep(frameMs);
    await paint();
  }

  await new Promise((res) => {
    rec.onstop = res;
    rec.stop();
  });

  const blob = new Blob(chunks, { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return {
    ok: true,
    filename: opts.filename,
    bytes: blob.size,
    scrollPx,
    frames: holdTopFrames + scrollFrames + holdBottomFrames,
    mime,
  };
})()
`;
}

function webmToMp4(webmPath, outMp4) {
  fs.mkdirSync(path.dirname(outMp4), { recursive: true });
  execFileSync(ff, [
    '-y', '-i', webmPath,
    '-vf', `fps=30,scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-an', '-movflags', '+faststart', outMp4,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  const d = parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', outMp4,
  ], { encoding: 'utf8' }).trim());
  return d;
}

function waitForDownload(filename, timeoutMs = 180000) {
  const dest = path.join(require('os').homedir(), 'Downloads', filename);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      // wait until size stable
      const s1 = fs.statSync(dest).size;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
      const s2 = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
      if (s1 === s2) return dest;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
  }
  throw new Error('download timeout: ' + filename);
}

module.exports = {
  buildRecordExpression,
  webmToMp4,
  waitForDownload,
  ROOT,
};

if (require.main === module) {
  // smoke: print expression length
  const e = buildRecordExpression({
    filename: 'test.webm',
    holdTopSec: 1,
    scrollSec: 2,
    holdBottomSec: 1,
    scrollPx: 400,
  });
  console.log('expression chars', e.length);
}
