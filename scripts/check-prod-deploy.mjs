#!/usr/bin/env node
/**
 * Smoke-check that Stone Hill deploy markers are live (not just pushed to GitHub).
 *
 *   node scripts/check-prod-deploy.mjs
 *   node scripts/check-prod-deploy.mjs --staging
 *   node scripts/check-prod-deploy.mjs --base https://shmspto.vercel.app
 *
 * Checks decode HTML entities and ignore Next.js RSC notFound templates embedded
 * in successful page payloads (those always contain "This page could not be found").
 */
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const staging = args.includes('--staging')
const baseIdx = args.indexOf('--base')
const base =
  baseIdx >= 0 && args[baseIdx + 1]
    ? args[baseIdx + 1].replace(/\/$/, '')
    : staging
      ? 'https://shmspto.vercel.app'
      : 'https://www.shmspto.org'

const checks = [
  {
    name: 'Programs catalog',
    path: '/programs',
    mustInclude: ['Enrichment programs', 'Fall 2026'],
  },
  {
    name: 'Fall schedule share page',
    path: '/programs/fall-2026',
    mustInclude: ['Enrichment schedule', 'Fall 2026'],
  },
  {
    name: 'Curriculum index',
    path: '/programs/curriculum',
    mustInclude: ['Program curricula', 'Curriculum only'],
    rejectDocumentTitle404: true,
  },
  {
    name: 'Competitive Math curriculum (Fall)',
    path: '/programs/curriculum/fall-2026/competitive-math',
    mustInclude: ['Competitive Math Prep', 'Week 1:', 'Foundations & speed mechanics'],
    rejectDocumentTitle404: true,
  },
  {
    name: 'Robotics curriculum (Fall)',
    path: '/programs/curriculum/fall-2026/robotics',
    mustInclude: ['Robotics', 'Week 1:', 'Hardware assembly'],
    rejectDocumentTitle404: true,
  },
]

function curl(url) {
  const res = spawnSync(
    'curl',
    ['-fsSL', '--max-time', '25', '-A', 'shmspto-deploy-check/1.0', url],
    { encoding: 'utf8' },
  )
  if (res.status !== 0) {
    return { ok: false, status: res.status, body: res.stderr || res.stdout || '' }
  }
  return { ok: true, status: 200, body: res.stdout || '' }
}

function head(url) {
  const res = spawnSync('curl', ['-fsSI', '--max-time', '15', url], { encoding: 'utf8' })
  const text = `${res.stdout || ''}${res.stderr || ''}`
  const status = text.match(/^HTTP\/\S+\s+(\d+)/m)?.[1] ?? '?'
  const age = text.match(/^age:\s*(\d+)/im)?.[1]
  const cache = text.match(/^x-vercel-cache:\s*(\S+)/im)?.[1]
  return { status, age, cache }
}

/** Decode common entities so "Foundations &amp; speed" matches "Foundations & speed". */
function decodeEntities(html) {
  return html
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, ' ')
}

function documentTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return m ? decodeEntities(m[1]).trim() : ''
}

/**
 * Text used for mustInclude. Prefer visible markup; drop script/style so Next
 * flight payloads do not invent false hits or force us to scan 404 templates.
 */
function searchableText(html) {
  let s = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  s = decodeEntities(s)
  return s
}

function includesInsensitive(haystack, needle) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

console.log(`Checking ${base} …\n`)

let failed = 0
for (const check of checks) {
  const url = `${base}${check.path}`
  const meta = head(url)
  const res = curl(url)
  const issues = []

  if (!res.ok) issues.push(`fetch failed (${res.status})`)
  else {
    const title = documentTitle(res.body)
    const text = searchableText(res.body)

    if (check.rejectDocumentTitle404) {
      if (/^404\b/i.test(title) || /could not be found/i.test(title)) {
        issues.push(`document title looks like 404 (${title || 'empty'})`)
      }
    }

    for (const needle of check.mustInclude ?? []) {
      if (!includesInsensitive(text, needle)) issues.push(`missing "${needle}"`)
    }
    for (const needle of check.mustNotInclude ?? []) {
      if (includesInsensitive(text, needle)) issues.push(`still contains "${needle}"`)
    }
  }

  const pass = issues.length === 0
  if (!pass) failed += 1

  console.log(`${pass ? 'PASS' : 'FAIL'}  ${check.name}`)
  console.log(`      ${url}`)
  console.log(
    `      HTTP ${meta.status}${meta.cache ? ` · cache ${meta.cache}` : ''}${meta.age ? ` · age ${meta.age}s` : ''}`,
  )
  if (issues.length) {
    for (const issue of issues) console.log(`      - ${issue}`)
  }
  console.log('')
}

if (failed) {
  console.log(`${failed} check(s) failed on ${base}.`)
  console.log('Git push alone does not mean www is live. Redeploy Vercel project frontend, then re-run this script.')
  process.exit(1)
}

console.log(`All checks passed on ${base}.`)
process.exit(0)
