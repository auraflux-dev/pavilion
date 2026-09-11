#!/usr/bin/env node
/**
 * Smoke-check Pavilion production targets.
 *
 *   node scripts/check-pavilion-deploy.mjs --target commons-pto-demo
 */
import { spawnSync } from 'node:child_process'

export const PAVILION_TARGETS = {
  'commons-pto-demo': {
    label: 'Pavilion demo',
    base: 'https://commons-pto-demo.vercel.app',
    altBase: 'https://demo.onpavilion.com',
    mustInclude: ['Riverside Elementary PTO'],
  },
  'commons-site': {
    label: 'Pavilion marketing',
    base: 'https://www.onpavilion.com',
    altBase: 'https://onpavilion.com',
    mustInclude: [
      'Pavilion',
      'The operating system',
      'for modern PTOs',
      // BR layout markers (sticky blur nav + dark Legal footer)
      'backdrop-blur-md',
      'Privacy Policy',
      'Terms of Service',
    ],
    /** Extra path checks so copy-only ships cannot false-pass on stale homepage alone. */
    pathMustInclude: {
      '/pricing': [
        'PTO Annual Plan',
        'Unlimited parents, volunteers, and chairs',
        'invoice billing via ACH',
        'Questions school leaders ask first',
      ],
      '/contact': ['+1 (571) 600-2835', 'tel:+15716002835', 'Book a demo'],
      '/solutions': ['Solutions by organization type', 'Three parts. One school brand'],
      '/work': [
        'Case study: Stone Hill Middle School PTO',
        'www.shmspto.org',
        'Stone Hill Middle School PTO',
      ],
      '/blog': ['Continuity, launch, and school brand ops'],
      '/api/health': ['"ok":true', 'commons-site'],
      '/.well-known/security.txt': ['hello@onpavilion.com', 'tel:+15716002835'],
    },
  },
  'commons-pto': {
    label: 'Commons PTO legacy',
    base: 'https://commons-pto.vercel.app',
    mustInclude: ['PTO'],
  },
}

const args = process.argv.slice(2)
const targetIdx = args.indexOf('--target')
const target =
  targetIdx >= 0 && args[targetIdx + 1]
    ? args[targetIdx + 1]
    : 'commons-pto-demo'

const cfg = PAVILION_TARGETS[target]
if (!cfg) {
  console.error(`Unknown target "${target}". Use: ${Object.keys(PAVILION_TARGETS).join(', ')}`)
  process.exit(1)
}

function curl(url) {
  const res = spawnSync(
    'curl',
    ['-fsSL', '--max-time', '25', '-A', 'pavilion-deploy-check/1.0', url],
    { encoding: 'utf8' },
  )
  if (res.status !== 0) return { ok: false, status: res.status }
  return { ok: true, body: res.stdout || '' }
}

console.log(`Checking ${cfg.label} at ${cfg.base} …\n`)
const res = curl(`${cfg.base}/`)
const altRes = cfg.altBase ? curl(`${cfg.altBase}/`) : null
const issues = []
if (!res.ok) issues.push(`fetch failed (${cfg.base})`)
else {
  for (const needle of cfg.mustInclude) {
    if (!res.body.toLowerCase().includes(needle.toLowerCase())) {
      issues.push(`missing "${needle}" on ${cfg.base}`)
    }
  }
}
if (cfg.altBase) {
  if (!altRes?.ok) {
    console.log(`WARN  optional host ${cfg.altBase} not reachable yet (DNS pending)`)
  } else {
    for (const needle of cfg.mustInclude) {
      if (!altRes.body.toLowerCase().includes(needle.toLowerCase())) {
        issues.push(`missing "${needle}" on ${cfg.altBase}`)
      }
    }
  }
}

if (cfg.pathMustInclude) {
  for (const [path, needles] of Object.entries(cfg.pathMustInclude)) {
    const pathRes = curl(`${cfg.base}${path}`)
    if (!pathRes.ok) {
      issues.push(`fetch failed (${cfg.base}${path})`)
      continue
    }
    for (const needle of needles) {
      if (!pathRes.body.toLowerCase().includes(needle.toLowerCase())) {
        issues.push(`missing "${needle}" on ${cfg.base}${path}`)
      }
    }
  }
}

if (issues.length) {
  console.log(`FAIL  ${cfg.label}`)
  for (const i of issues) console.log(`  - ${i}`)
  process.exit(1)
}

console.log(`PASS  ${cfg.label}`)
process.exit(0)
