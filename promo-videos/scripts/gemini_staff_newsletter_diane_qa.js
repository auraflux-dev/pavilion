#!/usr/bin/env node
'use strict';
/**
 * Gemini FULL-PASS QA for Diane Staff newsletter training video.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_staff_newsletter_diane_qa.js \
 *     [--video ~/Downloads/SHMSPTO_WATCH_THIS_staff_newsletter_diane_16x9.mp4]
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFileSync } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const C0_QA = path.join(os.homedir(), 'cwn-c0', 'lib', 'qa.js');
const { uploadToGeminiFiles, waitForGeminiFile, deleteGeminiFile } = require(C0_QA);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const PASS_SCORE = Number(process.env.SHMS_GEMINI_PASS_SCORE || 80);

function dur(file) {
  return parseFloat(execFileSync('/opt/homebrew/opt/ffmpeg-full/bin/ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let video = path.join(os.homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_staff_newsletter_diane_16x9.mp4');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--video' && argv[i + 1]) video = path.resolve(argv[++i]);
  }
  return { video };
}

function tryParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function extractJson(raw) {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const direct = tryParse(body.trim());
  if (direct) return direct;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start >= 0 && end > start) return tryParse(body.slice(start, end + 1));
  return null;
}

function buildPrompt(durationSec) {
  return `You are FINAL pre-send QA for a Stone Hill Middle School PTO STAFF TRAINING video for Diane (Member Newsletter).

Watch the ENTIRE video with audio. Duration ≈ ${durationSec.toFixed(1)}s.
NORTH STAR: SEE = HEAR. When VO names a UI section, that section must be clearly readable on screen.

This is a how-to for Staff → Newsletter. Audience: board volunteer Diane. Tone: calm training, not a promo ad.

MUST-PASS:
0. STAPLE bookends: cold-open brand card at start (seal + SHMS PTO) and thank-you / Go Stingrays outro at end. Missing either = critical FAIL
1. VISUAL READABILITY (critical for this video): Staff UI screenshots must be sharp and fully readable at 1080p. Fail if stills are blurry, pixelated, over-zoomed crops, empty white bars, or text cut off at edges so Diane cannot see the control being taught
2. Prefer letterboxed / padded full UI panels over extreme close-up crops of single form rows
3. SEE=HEAR beats should roughly cover: open Newsletter / Canva+plain text (no HTML); templates & attach Canva PNG; test send; paid vs Weekly Scoop; write in beats; subject/body/UTM; schedule/approval; send/preview; send report
4. No HTML-editor claim; Diane uses Canva PNGs + plain text only
5. Captions or on-screen step labels should match VO when present; blank or mismatched UI for a spoken step = major/critical
6. Thank-you VO finishes before silent outro bookend (VO must not bleed into outro)

Return ONLY valid JSON:
{
  "watched_full": true,
  "score": 0-100,
  "verdict": "PASS" | "REVIEW" | "FAIL",
  "see_hear_pass": true,
  "visual_pass": true,
  "summary": "2 sentences max",
  "chapter_notes": [
    { "chapter": "open|canva|test|type|scoop|beats|copy|schedule|send|report|close", "ok": true, "note": "short", "approx_time_sec": 0 }
  ],
  "issues": [
    { "severity": "critical|major|minor", "approx_time_sec": 0, "timecode": "M:SS", "problem": "short", "fix": "short" }
  ],
  "send_ready": false
}

PASS only if see_hear_pass, visual_pass, score >= ${PASS_SCORE}, no critical, send_ready true.
Blurry / over-cropped / empty UI stills = critical FAIL on visual_pass.`;
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('FAIL: GEMINI_API_KEY missing');
    process.exit(2);
  }
  const { video } = parseArgs();
  if (!fs.existsSync(video)) {
    console.error('FAIL: video not found:', video);
    process.exit(2);
  }

  const durationSec = dur(video);
  console.log(`[gemini-newsletter-qa] ${video}`);
  console.log(`[gemini-newsletter-qa] ${(fs.statSync(video).size / 1024 / 1024).toFixed(1)}MB · ${durationSec.toFixed(1)}s`);

  let geminiFile;
  try {
    geminiFile = await waitForGeminiFile(await uploadToGeminiFiles(video));
    console.log('[gemini-newsletter-qa] Upload ACTIVE…');
    const resp = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: buildPrompt(durationSec) },
            { file_data: { mime_type: 'video/mp4', file_uri: geminiFile.uri } },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 300000 },
    );

    const raw = (resp.data?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || '').join('').trim();
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'gemini_staff_newsletter_diane_qa_raw.txt'), raw || '');

    let parsed = extractJson(raw) || {
      watched_full: false, score: 0, verdict: 'FAIL', see_hear_pass: false, visual_pass: false,
      summary: 'unparseable', chapter_notes: [], issues: [{ severity: 'critical', problem: 'parse', fix: 're-run' }],
      send_ready: false,
    };

    const score = Number(parsed.score) || 0;
    const critical = (parsed.issues || []).some((i) => i.severity === 'critical');
    const seeHear = parsed.see_hear_pass === true;
    const visual = parsed.visual_pass === true;
    if (parsed.verdict === 'PASS' && seeHear && visual && score >= PASS_SCORE && !critical) {
      parsed.send_ready = true;
    }
    const pass = parsed.verdict === 'PASS' && seeHear && visual && score >= PASS_SCORE && !critical && parsed.send_ready === true;

    const report = {
      generatedAt: new Date().toISOString(), video, durationSec, model: GEMINI_MODEL, pass, ...parsed, score,
    };
    fs.writeFileSync(path.join(OUT_DIR, 'gemini_staff_newsletter_diane_qa.json'), JSON.stringify(report, null, 2));
    const md = [
      '# Gemini staff-newsletter-diane QA',
      '',
      `**Verdict:** ${pass ? 'PASS' : (parsed.verdict || 'FAIL')} · score ${score}/${PASS_SCORE}`,
      `**Send-ready:** ${pass ? 'YES' : 'NO'}`,
      `**Visual pass:** ${visual ? 'YES' : 'NO'} · **SEE=HEAR:** ${seeHear ? 'YES' : 'NO'}`,
      `**Video:** \`${video}\``,
      '',
      '## Summary',
      parsed.summary || '.',
      '',
      '## Notes',
      ...(parsed.chapter_notes || []).map((c) => `- **${c.chapter}** (~${c.approx_time_sec}s) ${c.ok ? 'OK' : 'ISSUE'}: ${c.note}`),
      '',
      '## Issues',
      ...((parsed.issues || []).length
        ? parsed.issues.map((i) => `- **${i.severity}** @ ${i.timecode || i.approx_time_sec + 's'}: ${i.problem} → ${i.fix}`)
        : ['- none']),
      '',
      pass ? '## Next\nOpen watch file for Rob.' : '## Next\nFix and reassemble before Rob watches.',
    ].join('\n');
    fs.writeFileSync(path.join(OUT_DIR, 'gemini_staff_newsletter_diane_qa.md'), md);
    console.log('\n' + md + '\n');
    console.log(pass ? '✅ GEMINI PASS. send-ready' : '❌ GEMINI FAIL');
    process.exit(pass ? 0 : 2);
  } finally {
    if (geminiFile?.name) {
      try { await deleteGeminiFile(geminiFile.name); } catch { /* ok */ }
    }
  }
}

main().catch((e) => {
  console.error('[gemini-newsletter-qa]', e.message || e);
  process.exit(2);
});
