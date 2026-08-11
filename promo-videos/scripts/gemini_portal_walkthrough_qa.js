#!/usr/bin/env node
'use strict';
/**
 * Gemini FULL-PASS QA for SHMSPTO member portal walkthrough.
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_portal_walkthrough_qa.js \
 *     [--video out/SHMSPTO_member_portal_walkthrough_16x9.mp4]
 *
 * Env VIDEO overrides default path.
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
const DEFAULT_VIDEO = path.join(OUT_DIR, 'SHMSPTO_member_portal_walkthrough_16x9.mp4');

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
  return `You are FINAL pre-send QA for a Stone Hill Middle School PTO MEMBER PORTAL walkthrough video for parents who have never opened the portal.

Watch the ENTIRE video with audio. Duration ≈ ${durationSec.toFixed(1)}s.
NORTH STAR: SEE = HEAR. Editorial FLOW must be:
  1) FREE parent portal tour first
  2) brief MEMBERSHIPS (Reef/Lagoon/Tide tease — not a full tier sales pitch)
  3) PAID member look (banner, tier badge, Cove credit / code ends in 9, paid perks)
  4) SHARED tools that work the same free or paid (Calendar/Messages, Member Help, spirit wear)
  5) Open House close

MUST-PASS:
0. Cold open + outro brand cards: official seal AND "SHMS PTO" under the seal (not missing / overlapping MIDDLE SCHOOL)
1. Orient: site → Join/Log in → free Member Portal
2. FREE act: portal home, My Account (Free banner), students/safety (safety unlocks Cove), Cove card as free (load own money) — FAIL if paid chrome appears while VO is still in the free act
3. MEMBERSHIPS brief: tiers page or equivalent; deep-dive may be teased as next video
4. PAID act: Paid banner / membership active, students badge and/or Cove credit / code ends in 9, brief paid perks — FAIL if free chrome held while VO says paid
5. SHARED act: Calendar & Messages and/or Member Help and spirit wear presented as same for everyone
6. Member Help: knowledge-base hub with categories — show hub, not just a flash
7. Cove Digital Card: QR and/or backup code + reload/load path; staff chrome = FAIL
8. Close toward Open House / in-person learn-more (Thu 8/13 cafeteria OK if shown) or clear CTA
9. No long white/black flash cuts; captions readable if present
10. Flow must not ping-pong free↔paid mid-feature (old interleaved style = FAIL)

Return ONLY valid JSON (no markdown fences):
{
  "watched_full": true,
  "score": 0-100,
  "verdict": "PASS" | "REVIEW" | "FAIL",
  "see_hear_pass": true,
  "summary": "2 sentences max",
  "chapter_notes": [
    { "chapter": "open|orient|free_tour|memberships|paid_look|shared_tools|close", "ok": true, "note": "short", "approx_time_sec": 0 }
  ],
  "issues": [
    { "severity": "critical|major|minor", "approx_time_sec": 0, "timecode": "M:SS", "problem": "short", "fix": "short" }
  ],
  "send_ready": false
}

PASS only if see_hear_pass, score >= ${PASS_SCORE}, no critical issues, send_ready true.
Staff/Treasurer portal chrome while claiming family parent = critical FAIL.
Free/paid lane mismatch while naming the other = critical FAIL.
Wrong act order (paid before free tour, or shared tools before free tour) = major/critical FAIL.`;
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
  console.log(`[gemini-portal-qa] Watching FULL video: ${video}`);
  console.log(`[gemini-portal-qa] ${sizeMb}MB · ${durationSec.toFixed(1)}s · model ${GEMINI_MODEL}`);

  let geminiFile;
  try {
    geminiFile = await waitForGeminiFile(await uploadToGeminiFiles(video));
    console.log('[gemini-portal-qa] Upload ACTIVE. generating review…');

    const rawPath = path.join(OUT_DIR, 'gemini_portal_walkthrough_qa_raw.txt');
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
    console.log(`[gemini-portal-qa] Raw → ${rawPath} (${(raw || '').length} chars)`);

    let parsed = extractJson(raw);
    if (!parsed) {
      parsed = {
        watched_full: false,
        score: 0,
        verdict: 'FAIL',
        see_hear_pass: false,
        summary: 'Gemini response was not parseable JSON',
        chapter_notes: [],
        issues: [{ severity: 'critical', approx_time_sec: 0, timecode: '0:00', problem: 'parse failure', fix: 're-run QA' }],
        send_ready: false,
      };
    }

    const score = Number(parsed.score) || 0;
    const critical = (parsed.issues || []).some((i) => i.severity === 'critical');
    const seeHear = parsed.see_hear_pass === true
      || (parsed.verdict === 'PASS' && !(parsed.issues || []).length);
    if (parsed.verdict === 'PASS' && seeHear && score >= PASS_SCORE && !critical) {
      parsed.send_ready = true;
    }
    const pass = parsed.verdict === 'PASS'
      && seeHear
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

    const jsonPath = path.join(OUT_DIR, 'gemini_portal_walkthrough_qa.json');
    const mdPath = path.join(OUT_DIR, 'gemini_portal_walkthrough_qa.md');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    const md = [
      `# Gemini portal-walkthrough QA`,
      '',
      `**Verdict:** ${pass ? 'PASS' : (parsed.verdict || 'FAIL')} · score ${score}/${PASS_SCORE}`,
      `**Send-ready:** ${pass ? 'YES' : 'NO'}`,
      `**Video:** \`${video}\``,
      `**Watched full:** ${parsed.watched_full ? 'yes' : 'unclear'}`,
      `**Generated:** ${report.generatedAt}`,
      '',
      '## Summary',
      parsed.summary || '—',
      '',
      '## Chapter notes',
      ...(parsed.chapter_notes || []).map((c) =>
        `- **${c.chapter}** (~${c.approx_time_sec}s) ${c.ok ? 'OK' : 'ISSUE'}: ${c.note}`),
      '',
      '## Issues',
      ...((parsed.issues || []).length
        ? parsed.issues.map((i) =>
          `- **${i.severity}** @ ${i.timecode || i.approx_time_sec + 's'}: ${i.problem} → ${i.fix}`)
        : ['- none']),
      '',
      pass
        ? '## Next\nOpen watch file for Rob.'
        : '## Next\nFix issues and reassemble. do **not** ask Rob to rewatch until PASS.',
    ].join('\n');
    fs.writeFileSync(mdPath, md);

    console.log('\n' + md + '\n');
    console.log(`[gemini-portal-qa] Wrote ${jsonPath}`);
    console.log(`[gemini-portal-qa] Wrote ${mdPath}`);
    console.log(pass ? '✅ GEMINI PASS. send-ready' : '❌ GEMINI FAIL/REVIEW. fix before treating as final');

    process.exit(pass ? 0 : 2);
  } finally {
    if (geminiFile?.name) {
      try { await deleteGeminiFile(geminiFile.name); } catch { /* ok */ }
    }
  }
}

main().catch((e) => {
  console.error('[gemini-portal-qa]', e.message || e);
  process.exit(2);
});
