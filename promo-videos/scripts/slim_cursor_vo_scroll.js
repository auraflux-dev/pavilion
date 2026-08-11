#!/usr/bin/env node
'use strict';
/**
 * Slim in-page VO scroll recorder for Cursor browser (CDN html-to-image + MediaRecorder).
 * Returns an expression string for Runtime.evaluate({ awaitPromise: true }).
 */
function buildSlimRecordExpression(opts) {
  const o = JSON.stringify(opts);
  return `
(async () => {
  const opts = ${o};
  if (typeof htmlToImage === 'undefined' || !htmlToImage.toJpeg) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.js';
      s.onload = res;
      s.onerror = () => rej(new Error('html-to-image CDN failed'));
      document.head.appendChild(s);
    });
  }

  const frameMs = Math.round(1000 / (opts.fps || 6));
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
  await new Promise((r) => setTimeout(r, 300));

  // Hide sticky chrome flicker sources if needed — keep UI honest
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const remaining = Math.max(0, document.documentElement.scrollHeight - vh - window.scrollY);
  const scrollPx = opts.scrollPx != null ? Math.min(opts.scrollPx, remaining) : remaining;

  const canvas = document.createElement('canvas');
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(opts.fps || 6);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm');
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3500000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const paint = async () => {
    // Capture the visual viewport by cloning and clipping via html-to-image
    const dataUrl = await htmlToImage.toJpeg(document.body, {
      quality: 0.85,
      width: vw,
      height: vh,
      style: {
        transform: 'translateY(-' + window.scrollY + 'px)',
        width: document.body.scrollWidth + 'px',
        height: document.body.scrollHeight + 'px',
      },
      filter: (node) => {
        if (!node || !node.tagName) return true;
        const t = node.tagName.toLowerCase();
        return t !== 'script' && t !== 'noscript';
      },
    });
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    ctx.fillStyle = '#0b2a1f';
    ctx.fillRect(0, 0, vw, vh);
    ctx.drawImage(img, 0, 0, vw, vh);
  };

  rec.start(frameMs);
  await paint();

  const holdTopFrames = Math.max(1, Math.round((opts.holdTopSec || 2) * 1000 / frameMs));
  for (let i = 0; i < holdTopFrames; i++) { await sleep(frameMs); await paint(); }

  const scrollFrames = Math.max(1, Math.round((opts.scrollSec || 4) * 1000 / frameMs));
  const step = scrollPx / scrollFrames;
  for (let i = 0; i < scrollFrames; i++) {
    window.scrollBy({ top: step, left: 0, behavior: 'instant' });
    await sleep(frameMs);
    await paint();
  }

  const holdBottomFrames = Math.max(1, Math.round((opts.holdBottomSec || 1.5) * 1000 / frameMs));
  for (let i = 0; i < holdBottomFrames; i++) { await sleep(frameMs); await paint(); }

  await new Promise((res) => { rec.onstop = res; rec.stop(); });
  const blob = new Blob(chunks, { type: mime });
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  const PART = 60000;
  window.__SHMS_WEBM_B64 = b64;
  window.__SHMS_WEBM_META = {
    ok: true,
    filename: opts.filename,
    bytes: blob.size,
    scrollPx,
    frames: holdTopFrames + scrollFrames + holdBottomFrames,
    mime,
    durationApprox: (holdTopFrames + scrollFrames + holdBottomFrames) * frameMs / 1000,
    partSize: PART,
    parts: Math.ceil(b64.length / PART),
    b64Len: b64.length,
  };

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = opts.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (_) {}

  return window.__SHMS_WEBM_META;
})()
`;
}

/** Expression to pull one base64 chunk previously stored by the recorder. */
function buildPullPartExpression(index) {
  return `(() => {
    const b64 = window.__SHMS_WEBM_B64 || '';
    const meta = window.__SHMS_WEBM_META || {};
    const PART = meta.partSize || 60000;
    const i = ${Number(index)};
    return { i, total: meta.parts || 0, chunk: b64.slice(i * PART, (i + 1) * PART) };
  })()`;
}

module.exports = { buildSlimRecordExpression, buildPullPartExpression };

if (require.main === module) {
  const jobs = [
    { filename: 'shms_free_portal_home.webm', holdTopSec: 4.0, scrollSec: 3.8, holdBottomSec: 2.0, scrollPx: 550, fps: 8 },
    { filename: 'shms_free_portal_account.webm', hash: 'account', holdTopSec: 3.2, scrollSec: 2.4, holdBottomSec: 1.5, scrollPx: 400, fps: 8 },
    { filename: 'shms_free_portal_students.webm', hash: 'portal-students', holdTopSec: 4.0, scrollSec: 8.0, holdBottomSec: 3.0, scrollPx: 550, fps: 8 },
    { filename: 'shms_free_portal_cove.webm', hash: 'store', holdTopSec: 4.0, scrollSec: 5.5, holdBottomSec: 2.8, scrollPx: 500, fps: 8 },
    { filename: 'shms_free_portal_help.webm', hash: 'help', holdTopSec: 3.5, scrollSec: 4.5, holdBottomSec: 2.4, scrollPx: 400, fps: 8 },
    { filename: 'shms_paid_portal_home.webm', holdTopSec: 4.0, scrollSec: 4.2, holdBottomSec: 2.2, scrollPx: 650, fps: 8 },
    { filename: 'shms_paid_portal_cove.webm', hash: 'store', holdTopSec: 3.2, scrollSec: 2.4, holdBottomSec: 1.6, scrollPx: 400, fps: 8 },
  ];
  const fs = require('fs');
  for (const j of jobs) {
    fs.writeFileSync('/tmp/' + j.filename.replace('.webm', '_expr.js'), buildSlimRecordExpression(j));
  }
  console.log('wrote', jobs.length, 'expressions');
}
