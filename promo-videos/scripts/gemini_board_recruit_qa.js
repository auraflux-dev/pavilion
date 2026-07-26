#!/usr/bin/env node
'use strict';
/**
 * Gemini FULL-PASS QA for SHMSPTO board recruiting video.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_board_recruit_qa.js \
 *     [--video ~/Downloads/SHMSPTO_WATCH_THIS_board_recruit_16x9.mp4]
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
  let video = path.join(os.homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_board_recruit_16x9.mp4');
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
  return `You are FINAL pre-send QA for a Stone Hill Middle School PTO BOARD RECRUITING video.

Watch the ENTIRE video with audio. Duration ≈ ${durationSec.toFixed(1)}s.
NORTH STAR: SEE = HEAR. Role names spoken must match on-screen role cards/pages.

MUST-PASS:
0. STAPLE bookends: cold-open brand card at start (~5s, seal + SHMS PTO) and thank-you / Go Stingrays outro at end (~4s, SAME logo style as intro. no mismatched white-plate seal). Missing either = critical FAIL
1. Mentions five open board roles: Secretary, Treasurer, SEAC Representative, Events Coordinator, Initiatives Coordinator. each role beat should show that role's highlight bullets on a designed slide
2. Initiatives framed as enrichment programs + sponsorships (not jargon "EPS")
3. Board benefits on screen/VO: free Reef (first-tier) membership; 75% off ONE enrichment program per season; plus inside knowledge and/or direct impact (vote on funds). Do NOT require a "donate optional / support initiatives" beat.
4. Board apply path: Board page on the website + president@shmspto.org · urgency ASAP
5. CRITICAL: If someone cannot join the board, video must show Volunteer page/form and invite any contribution of time (shmspto.org/volunteer)
6. No claim that general volunteers get free membership / enrichment discount
7. Thank-you VO must finish on a thank-you slide BEFORE the silent outro bookend (VO must not play early over / into outro)
8. On-screen titles/bullets Title Case; commitment/footer text readable and not sitting in the bottom wave graphics
9. Do NOT replay a "What You Need To Know / Five Roles" slide at the end before thank you

Return ONLY valid JSON:
{
  "watched_full": true,
  "score": 0-100,
  "verdict": "PASS" | "REVIEW" | "FAIL",
  "see_hear_pass": true,
  "summary": "2 sentences max",
  "chapter_notes": [
    { "chapter": "open|roles|benefits|apply_board|volunteer_fallback|close", "ok": true, "note": "short", "approx_time_sec": 0 }
  ],
  "issues": [
    { "severity": "critical|major|minor", "approx_time_sec": 0, "timecode": "M:SS", "problem": "short", "fix": "short" }
  ],
  "send_ready": false
}

PASS only if see_hear_pass, score >= ${PASS_SCORE}, no critical, send_ready true.
Missing volunteer-form fallback = critical FAIL.
Missing staple intro or outro with SHMS PTO under seal = critical FAIL.`;
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
  console.log(`[gemini-board-qa] ${video}`);
  console.log(`[gemini-board-qa] ${(fs.statSync(video).size / 1024 / 1024).toFixed(1)}MB · ${durationSec.toFixed(1)}s`);

  let geminiFile;
  try {
    geminiFile = await waitForGeminiFile(await uploadToGeminiFiles(video));
    console.log('[gemini-board-qa] Upload ACTIVE…');
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
      { headers: { 'Content-Type': 'application/json' }, timeout: 300000 }
    );

    const raw = (resp.data?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || '').join('').trim();
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'gemini_board_recruit_qa_raw.txt'), raw || '');

    let parsed = extractJson(raw) || {
      watched_full: false, score: 0, verdict: 'FAIL', see_hear_pass: false,
      summary: 'unparseable', chapter_notes: [], issues: [{ severity: 'critical', problem: 'parse', fix: 're-run' }],
      send_ready: false,
    };

    const score = Number(parsed.score) || 0;
    const critical = (parsed.issues || []).some((i) => i.severity === 'critical');
    const seeHear = parsed.see_hear_pass === true || (parsed.verdict === 'PASS' && !(parsed.issues || []).length);
    if (parsed.verdict === 'PASS' && seeHear && score >= PASS_SCORE && !critical) parsed.send_ready = true;
    const pass = parsed.verdict === 'PASS' && seeHear && score >= PASS_SCORE && !critical && parsed.send_ready === true;

    const report = { generatedAt: new Date().toISOString(), video, durationSec, model: GEMINI_MODEL, pass, ...parsed, score };
    fs.writeFileSync(path.join(OUT_DIR, 'gemini_board_recruit_qa.json'), JSON.stringify(report, null, 2));
    const md = [
      '# Gemini board-recruit QA',
      '',
      `**Verdict:** ${pass ? 'PASS' : (parsed.verdict || 'FAIL')} · score ${score}/${PASS_SCORE}`,
      `**Send-ready:** ${pass ? 'YES' : 'NO'}`,
      `**Video:** \`${video}\``,
      '',
      '## Summary',
 parsed.summary || '. ',
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
    fs.writeFileSync(path.join(OUT_DIR, 'gemini_board_recruit_qa.md'), md);
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
  console.error('[gemini-board-qa]', e.message || e);
  process.exit(2);
});
