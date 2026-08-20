#!/usr/bin/env node
/**
 * Gemini SHMS-leak audit for a Commons private trial (public + member + staff HTML).
 *
 *   NODE_PATH=~/cwn-c0/node_modules node scripts/sales/gemini-commons-trial-audit.mjs
 *
 * Expects scraped HTML at /tmp/commons-audit_*.html (run tmp/audit-commons-trial.sh first)
 * or pass --rescrape to sign in and pull pages.
 *
 * Exit 0 = PASS, 2 = FAIL.
 */
'use strict'

import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
require('dotenv').config({ path: '/Users/robertgregory/cwn-c0/.env' })
const axios = require('axios')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const OUT = path.join(__dirname, '../../tmp/gemini-commons-trial-audit.md')
const JSON_OUT = path.join(__dirname, '../../tmp/gemini-commons-trial-audit.json')

const PAGES = [
  '/',
  '/membership',
  '/events',
  '/newsletter',
  '/board',
  '/volunteer',
  '/member-portal',
  '/member-portal/videos',
  '/staff',
  '/login',
]

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function rescrape() {
  execFileSync('/bin/bash', [path.join(__dirname, '../../tmp/audit-commons-trial.sh')], {
    stdio: 'inherit',
  })
}

function loadPages() {
  const out = []
  for (const p of PAGES) {
    const safe = p.replace(/\//g, '_')
    const file = `/tmp/commons-audit${safe}.html`
    if (!fs.existsSync(file)) continue
    const html = fs.readFileSync(file, 'utf8')
    const text = stripHtml(html).slice(0, 12000)
    const media = [...html.matchAll(/(?:src|poster|href)="([^"]*(?:logo|video|mp4|shms|cove|wix)[^"]*)"/gi)]
      .map((m) => m[1])
      .slice(0, 40)
    out.push({ path: p, text, media, dataPto: (html.match(/data-pto="([^"]+)"/) || [])[1] || '' })
  }
  return out
}

async function askGemini(pages) {
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are auditing a PRIVATE sales trial of Commons (PTO OS) skinned as Spring Hill Elementary PTO (McLean, VA).

HARD FAIL if anything looks like Stone Hill Middle School / SHMS / Stingrays / The Cove / Reef-Lagoon-Tide membership / Ashburn / Loudoun / Diane SHMS training / shmspto.org / SHMS parent explainer videos.

ALLOWED: Spring Hill, Champion, Scoop, $25 membership, McLean, private trial, Commons platform chrome.

For each page, list concrete leaks (quote short snippets). Then overall verdict PASS or FAIL with score 0-100.

Return ONLY JSON:
{
  "verdict": "PASS"|"FAIL",
  "score": number,
  "summary": "one paragraph",
  "pages": [{"path":"","leaks":["..."],"notes":""}],
  "must_fix": ["ordered list of code/product fixes"]
}

PAGES:
${JSON.stringify(pages, null, 2)}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  const { data } = await axios.post(url, payload, { timeout: 120000 })
  const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '{}'
  const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned)
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY missing (cwn-c0/.env)')
    process.exit(2)
  }
  if (process.argv.includes('--rescrape')) rescrape()

  const pages = loadPages()
  if (!pages.length) {
    console.error('No /tmp/commons-audit_*.html — run with --rescrape')
    process.exit(2)
  }

  console.log(`Auditing ${pages.length} pages with ${GEMINI_MODEL}…`)
  const result = await askGemini(pages)
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(JSON_OUT, JSON.stringify(result, null, 2))
  const md = [
    `# Commons trial Gemini audit`,
    ``,
    `**Verdict:** ${result.verdict} (score ${result.score})`,
    ``,
    result.summary || '',
    ``,
    `## Must fix`,
    ...(result.must_fix || []).map((x) => `- ${x}`),
    ``,
    `## Pages`,
    ...(result.pages || []).flatMap((p) => [
      `### ${p.path}`,
      ...(p.leaks || []).map((l) => `- LEAK: ${l}`),
      p.notes ? `- Note: ${p.notes}` : '',
      '',
    ]),
  ]
    .filter(Boolean)
    .join('\n')
  fs.writeFileSync(OUT, md)
  console.log(md)
  console.log(`\nWrote ${OUT}`)
  process.exit(result.verdict === 'PASS' ? 0 : 2)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
