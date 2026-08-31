#!/usr/bin/env node
/**
 * Attach Pavilion product domains to commons-pto-demo on robert-4220.
 *
 *   node scripts/setup-pavilion-domains.mjs --dry-run
 *   node scripts/setup-pavilion-domains.mjs --apply
 *
 * Requires Doppler pavilion/dev (VERCEL_TOKEN). Does not touch treasurer / SHMS.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VERCEL_SH = path.join(REPO_ROOT, 'scripts', 'vercel-robert4220.sh')
const PROJECT = process.env.PAVILION_DEMO_PROJECT || 'commons-pto-demo'
const SCOPE = 'robert-4220s-projects'

const DOMAINS = [
  'demo.onpavilion.com',
  '*.onpavilion.com',
]

const apply = process.argv.includes('--apply')
const dryRun = process.argv.includes('--dry-run') || !apply

function run(cmd, args) {
  const res = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return { ok: res.status === 0, out: (res.stdout || '') + (res.stderr || ''), status: res.status ?? 1 }
}

function vercel(args) {
  return run('bash', [VERCEL_SH, ...args, '--scope', SCOPE])
}

console.log(`Pavilion domain setup — project "${PROJECT}" (${SCOPE})`)
console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}\n`)

for (const domain of DOMAINS) {
  console.log(`Domain: ${domain}`)
  if (dryRun) {
    console.log(`  would run: vercel domains add ${domain} ${PROJECT}`)
    continue
  }
  const link = vercel(['domains', 'add', domain, PROJECT])
  if (link.ok) {
    console.log(`  added: ${domain}`)
    if (link.out.trim()) console.log(link.out.trim())
  } else {
    console.log(`  note: ${domain} — ${link.out.trim() || `exit ${link.status}`}`)
  }
}

if (dryRun) {
  console.log('\nDry-run only. Re-run with --apply after DNS is ready at your registrar.')
  console.log('Also set Vercel env on commons-pto-demo (see docs/PAVILION-DEMO-TRIAL-HOSTS.md).')
} else {
  console.log('\nDone. Confirm in Vercel → commons-pto-demo → Domains.')
  console.log('Registrar: point demo.onpavilion.com and wildcard *.onpavilion.com to Vercel DNS.')
}
