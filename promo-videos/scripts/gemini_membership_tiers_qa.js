#!/usr/bin/env node
'use strict';
/**
 * Gemini FULL-PASS QA for SHMSPTO membership tiers video.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_membership_tiers_qa.js \
 *     [--video out/SHMSPTO_membership_tiers_16x9.mp4]
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
const DEFAULT_VIDEO = path.join(OUT_DIR, 'SHMSPTO_membership_tiers_16x9.mp4');

function dur(file) {
  return parseFloat(execFileSync('/opt/homebrew/opt/ffmpeg-full/bin/ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let video = process.env.VIDEO || DEFAULT_VIDEO;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--video' && argv[i + 1]) video = path.resolve(argv[++i]);
  }
  return { video: path.resolve(video) };
}

function tryParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function extractJson(raw) {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let body = (fenced ? fenced[1] : raw).trim();
  let parsed = tryParse(body);
  if (parsed) return parsed;
  const start = body.indexOf('{');
  if (start < 0) return null;
  body = body.slice(start);
  parsed = tryParse(body);
  if (parsed) return parsed;
  let salvage = body.replace(/,\s*$/, '');
  if ((salvage.match(/"/g) || []).length % 2 === 1) salvage += '"';
  const opens = (salvage.match(/\{/g) || []).length - (salvage.match(/\}/g) || []).length;
  const openArr = (salvage.match(/\[/g) || []).length - (salvage.match(/\]/g) || []).length;
  salvage += ']'.repeat(Math.max(0, openArr)) + '}'.repeat(Math.max(0, opens));
  return tryParse(salvage);
}

function buildPrompt(durationSec) {
  return `You are FINAL pre-send QA for a Stone Hill Middle School PTO MEMBERSHIP TIERS video for parents who have NEVER seen these memberships.

Watch the ENTIRE video with audio. Duration ≈ ${durationSec.toFixed(1)}s (target ~3 minutes).

NORTH STAR: SEE = HEAR. Editorial FLOW:
  1) Who / free vs paid frame
  2) Explain Cove Digital Card as PTO wallet (in person + online)
  3) Explain enrichment (~$350/season TBD) + free refreshments (~$30/event)
  4) Spirit wear on site + car magnet DESIGN PROOF (shipment coming, ~$10)
  5) Reef / Lagoon / Tide with card credit + discount math
  6) Join + paid portal proof (Paid banner, tier badge, credit, codes end in 9)
  7) Close · SHMSPTO dot org

MUST-PASS:
0. VO is always clearly audible over music — FAIL if speech is mushy, buried, or hard to understand anywhere
1. Runtime roughly ~3 minutes (allow 2:30–3:45); flag if much longer
2. Explains enrichment and free refreshments before assuming parents know them
3. States starter Cove card credits + limited 10% credit bonus (credit only)
4. Magnet presented as design proof / coming soon — not a live store listing
5. Reef $79 / Lagoon $149 / Tide $249 match live site
6. Paid portal proof shows paid chrome when VO says paid
7. Cold open + outro brand cards present
8. Does NOT re-teach full portal setup (may point to portal video)

AUDIO checks (critical):
- VO intelligibility throughout
- Music bed must stay under speech
- No long stretches of unintelligible numbers/math

Return ONLY JSON:
{
  "watched_full": true,
  "score": 0,
  "verdict": "PASS|FAIL",
  "see_hear_pass": false,
  "audio_intelligible": false,
  "runtime_ok": false,
  "summary": "2-4 sentences",
  "chapter_notes": [
    { "chapter": "open|frame|cove|enrich_food|swag|reef|lagoon|tide|join_proof|close", "ok": true, "note": "short", "approx_time_sec": 0 }
  ],
  "issues": [
    { "severity": "critical|major|minor", "approx_time_sec": 0, "timecode": "M:SS", "problem": "short", "fix": "short" }
  ],
  "send_ready": false
}

PASS only if see_hear_pass, audio_intelligible, runtime_ok, score >= ${PASS_SCORE}, no critical issues, send_ready true.
Mushy/buried VO = critical FAIL.`;
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
  const sizeMb = (fs.statSync(video).size / 1024 / 1024).toFixed(1);
  console.log(`[gemini-membership-qa] Watching FULL video: ${video}`);
  console.log(`[gemini-membership-qa] ${sizeMb}MB · ${durationSec.toFixed(1)}s · model ${GEMINI_MODEL}`);

  let geminiFile;
  try {
    geminiFile = await waitForGeminiFile(await uploadToGeminiFiles(video));
    console.log('[gemini-membership-qa] Upload ACTIVE. generating review…');

    const rawPath = path.join(OUT_DIR, 'gemini_membership_tiers_qa_raw.txt');
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
    fs.writeFileSync(rawPath, raw || JSON.stringify(resp.data, null, 2));
    console.log(`[gemini-membership-qa] Raw → ${rawPath} (${(raw || '').length} chars)`);

    let parsed = extractJson(raw);
    if (!parsed) {
      parsed = {
        watched_full: false,
        score: 0,
        verdict: 'FAIL',
        see_hear_pass: false,
        audio_intelligible: false,
        runtime_ok: false,
        summary: 'Gemini response was not parseable JSON',
        chapter_notes: [],
        issues: [{ severity: 'critical', approx_time_sec: 0, timecode: '0:00', problem: 'parse failure', fix: 're-run QA' }],
        send_ready: false,
      };
    }

    const score = Number(parsed.score) || 0;
    const critical = (parsed.issues || []).some((i) => i.severity === 'critical');
    const seeHear = parsed.see_hear_pass === true;
    const audioOk = parsed.audio_intelligible === true;
    const runtimeOk = parsed.runtime_ok === true;
    if (parsed.verdict === 'PASS' && seeHear && audioOk && runtimeOk && score >= PASS_SCORE && !critical) {
      parsed.send_ready = true;
    }
    const pass = parsed.verdict === 'PASS'
      && seeHear
      && audioOk
      && runtimeOk
      && score >= PASS_SCORE
      && !critical
      && parsed.send_ready === true;

    const report = {
      generatedAt: new Date().toISOString(),
      video,
      durationSec,
      model: GEMINI_MODEL,
      passScore: PASS_SCORE,
      pass,
      ...parsed,
      score,
    };

    const jsonPath = path.join(OUT_DIR, 'gemini_membership_tiers_qa.json');
    const mdPath = path.join(OUT_DIR, 'gemini_membership_tiers_qa.md');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    const issues = (report.issues || []).map((i) =>
      `- **${i.severity}** @ ${i.timecode || i.approx_time_sec}s — ${i.problem} → ${i.fix}`
    ).join('\n') || '_none_';
    fs.writeFileSync(mdPath, `# Membership tiers Gemini QA\n\n**Pass:** ${pass}\n**Score:** ${score}\n**Verdict:** ${report.verdict}\n**Audio OK:** ${report.audio_intelligible}\n**Runtime OK:** ${report.runtime_ok}\n**Duration:** ${durationSec.toFixed(1)}s\n\n${report.summary || ''}\n\n## Issues\n${issues}\n`);
    console.log(JSON.stringify({ pass, score, verdict: report.verdict, audio_intelligible: report.audio_intelligible, runtime_ok: report.runtime_ok, send_ready: report.send_ready, durationSec }, null, 2));
    console.log(`[gemini-membership-qa] Report → ${jsonPath}`);
    process.exit(pass ? 0 : 1);
  } finally {
    if (geminiFile?.name) {
      try { await deleteGeminiFile(geminiFile.name); } catch { /* ok */ }
    }
  }
}

main().catch((e) => {
  console.error(e.response?.data || e);
  process.exit(1);
});
