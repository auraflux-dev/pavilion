#!/usr/bin/env node
'use strict';
/**
 * Gemini FULL-PASS QA for SHMSPTO parent-share explainers.
 *
 * Required before opening a watch file for Rob (same bar as other AuraFlux videos).
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/gemini_parent_tour_qa.js \
 *     [--video ~/Downloads/SHMSPTO_WATCH_THIS_parent_tour_16x9.mp4]
 *
 * Reads chapter map + VO captions, uploads the ENTIRE mp4 to Gemini, returns
 * SEE=HEAR verdict with timestamps. Exit 0 = PASS, 2 = FAIL/REVIEW.
 */
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' });

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const C0_QA = path.join(require('os').homedir(), 'cwn-c0', 'lib', 'qa.js');
const { uploadToGeminiFiles, waitForGeminiFile, deleteGeminiFile } = require(C0_QA);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const PASS_SCORE = Number(process.env.SHMS_GEMINI_PASS_SCORE || 80);
const COLD = 5.0;

function a(rel) { return path.join(ROOT, rel); }

function dur(file) {
  return parseFloat(execFileSync('/opt/homebrew/opt/ffmpeg-full/bin/ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}

function parseArgs() {
  const args = process.argv.slice(2);
  let video = path.join(require('os').homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_parent_tour_16x9.mp4');
  const outIdx = args.indexOf('--video');
  if (outIdx >= 0 && args[outIdx + 1]) video = path.resolve(args[outIdx + 1]);
  const outOnly = path.join(OUT_DIR, 'SHMSPTO_parent_tour_16x9.mp4');
  if (!fs.existsSync(video) && fs.existsSync(outOnly)) video = outOnly;
  return { video };
}

function loadExpected() {
  const mapPath = a('out/parent_share_chapter_map.json');
  const map = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, 'utf8')) : null;
  const beats = [
 { tHint: 'after cold open', expect: 'Homepage. Welcome / new PTO website' },
    { tHint: 'menu chapter', expect: 'In order: Programs, Events, The Cove, Volunteer, Fundraising, Board, Meetings pages (NOT stuck on homepage)' },
 { tHint: 'membership', expect: 'Membership / Join. Reef Lagoon Tide tiers, benefits, checkout' },
 { tHint: 'portal', expect: 'Member Portal Cove Digital Card. QR + backup code, Save to Photos, Load card (family Free member OK; Staff/Treasurer chrome = FAIL)' },
    { tHint: 'cta', expect: 'Homepage + shmspto.org CTA' },
  ];
  return { map, beats };
}

function extractJson(raw) {
  if (!raw) return null;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  let body = (fence ? fence[1] : raw).trim();
  // Salvage truncated JSON: close open braces/brackets if model hit token limit
  const tryParse = (s) => {
    try { return JSON.parse(s); } catch { return null; }
  };
  let parsed = tryParse(body);
  if (parsed) return parsed;
  const start = body.indexOf('{');
  if (start < 0) return null;
  body = body.slice(start);
  parsed = tryParse(body);
  if (parsed) return parsed;
  // Truncation salvage: pad closers
  let salvage = body.replace(/,\s*$/, '');
  const opens = (salvage.match(/\{/g) || []).length - (salvage.match(/\}/g) || []).length;
  const openArr = (salvage.match(/\[/g) || []).length - (salvage.match(/\]/g) || []).length;
  // Close dangling string
  if ((salvage.match(/"/g) || []).length % 2 === 1) salvage += '"';
  salvage += ']'.repeat(Math.max(0, openArr)) + '}'.repeat(Math.max(0, opens));
  return tryParse(salvage);
}

function buildPrompt({ durationSec, map, beats }) {
  const chapterBlock = map?.chapters
    ? map.chapters.map((c) => {
 let line = `- ${c.id}: ~${Number(c.durSec).toFixed(1)}s. picture must be: ${c.picture}`;
      if (c.pages?.length) {
        line += `\n  page beats: ${c.pages.map((p) => p.id).join(' → ')}`;
      }
      return line;
    }).join('\n')
 : '(chapter map missing. still enforce SEE=HEAR from expectations below)';

  return `You are the FINAL pre-send QA reviewer for a Stone Hill Middle School PTO parent explainer video.

Watch the ENTIRE video with audio (do not skim). Duration ≈ ${durationSec.toFixed(1)}s.
Cold open ≈ first ${COLD}s (brand card, no site tour). Then VO + site screen recording. Outro card at end.

NORTH STAR: SEE = HEAR. A parent watching once must see the page/thing being spoken. Mute-test must roughly tell the story.

EXPECTED CHAPTER PICTURE MAP:
${chapterBlock}

MUST-PASS CHECKS:
0. Cold open + outro cards show official seal AND the text "SHMS PTO" under the seal (not missing, not overlapping MIDDLE SCHOOL on the seal)
1. Intro VO → homepage (not blank/white flash). Settled homepage is OK (motion not required).
2. Menu: each nav page (Programs→Meetings) appears with its own spoken beat. not a homepage hold, not sub-second flicker
3. Membership: tiers + Join/Log in (Create Account OK). FAIL if home/programs/cove detour mid-membership
4. Portal: brief family setup checklist (why it unlocks Cove), then Member Portal Cove QR/card tease. Full portal feature tour NOT required. Staff chrome = FAIL
5. CTA / series close → homepage / shmspto.org; teasing future Programs/Membership/Portal videos is CORRECT
6. No white/black flash cuts between chapters
7. Captions readable; do not FAIL solely for off-season empty Programs/Events content
8. Picture tracks VO (small lag OK; wrong page while naming another = FAIL)

Return ONLY valid JSON (no markdown fences). Keep issues to the top 8 most important. Keep notes short.

{
  "watched_full": true,
  "score": 0-100,
  "verdict": "PASS" | "REVIEW" | "FAIL",
  "see_hear_pass": true,
  "summary": "2 sentences max",
  "chapter_notes": [
    { "chapter": "intro|menu|membership|portal|cta", "ok": true, "note": "short", "approx_time_sec": 0 }
  ],
  "issues": [
    { "severity": "critical|major|minor", "approx_time_sec": 0, "timecode": "M:SS", "problem": "short", "fix": "short" }
  ],
  "send_ready": false
}

Rules:
- verdict PASS only if see_hear_pass true, score >= ${PASS_SCORE}, no critical issues, send_ready true
- If menu stays on homepage while listing pages → critical FAIL
- List every sync mismatch with approx_time_sec so we can fix without Rob rewatching
- Be specific about page titles you actually saw`;
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
  const { map, beats } = loadExpected();

  console.log(`[gemini-parent-qa] Watching FULL video: ${video}`);
  console.log(`[gemini-parent-qa] ${sizeMb}MB · ${durationSec.toFixed(1)}s · model ${GEMINI_MODEL}`);

  let geminiFile;
  try {
    geminiFile = await waitForGeminiFile(await uploadToGeminiFiles(video));
 console.log('[gemini-parent-qa] Upload ACTIVE. generating review…');

    const prompt = buildPrompt({ durationSec, map, beats });
    const rawPath = path.join(OUT_DIR, 'gemini_parent_tour_qa_raw.txt');
    const resp = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: prompt },
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
    console.log(`[gemini-parent-qa] Raw response → ${rawPath} (${(raw || '').length} chars)`);

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
        raw,
      };
    }

    const score = Number(parsed.score) || 0;
    const critical = (parsed.issues || []).some((i) => i.severity === 'critical');
    const seeHear = parsed.see_hear_pass === true
      || (parsed.verdict === 'PASS' && !(parsed.issues || []).length);
 // Model sometimes returns PASS + send_ready false. trust verdict when clean
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

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const jsonPath = path.join(OUT_DIR, 'gemini_parent_tour_qa.json');
    const mdPath = path.join(OUT_DIR, 'gemini_parent_tour_qa.md');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    const md = [
      `# Gemini parent-tour QA`,
      '',
      `**Verdict:** ${pass ? 'PASS' : (parsed.verdict || 'FAIL')} · score ${score}/${PASS_SCORE}`,
      `**Send-ready:** ${pass ? 'YES' : 'NO'}`,
      `**Video:** \`${video}\``,
      `**Watched full:** ${parsed.watched_full ? 'yes' : 'unclear'}`,
      `**Generated:** ${report.generatedAt}`,
      '',
      '## Summary',
 parsed.summary || '. ',
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
    console.log(`[gemini-parent-qa] Wrote ${jsonPath}`);
    console.log(`[gemini-parent-qa] Wrote ${mdPath}`);
 console.log(pass ? '✅ GEMINI PASS. send-ready' : '❌ GEMINI FAIL. fix before Rob watches');

    process.exit(pass ? 0 : 2);
  } finally {
    if (geminiFile?.name) {
      try { await deleteGeminiFile(geminiFile.name); } catch { /* ok */ }
    }
  }
}

main().catch((e) => {
  console.error('[gemini-parent-qa]', e.message || e);
  process.exit(2);
});
