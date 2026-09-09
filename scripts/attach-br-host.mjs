#!/usr/bin/env node
/**
 * Attach {slug}.businessrocket.ai to commons-pto-demo (robert-4220).
 *
 * Prefers verified wildcard *.businessrocket.ai on the project.
 * If wildcard is not verified yet, adds the single hostname.
 *
 *   bash scripts/doppler_run.sh node scripts/attach-br-host.mjs --slug acme-plumbing
 *
 * DNS for the zone is Cloudflare (businessrocket.ai). Apex/www stay on WP until cutover.
 * See ~/businessrocket/docs/DNS-WILDCARD.md.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')
const slugIdx = process.argv.indexOf('--slug')
const slug = (slugIdx >= 0 ? process.argv[slugIdx + 1] : '').trim().toLowerCase()
const host = slug ? `${slug}.businessrocket.ai` : ''
const PROJECT = 'commons-pto-demo'
const SCOPE = 'robert-4220s-projects'

if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug) || slug === 'riverside') {
  console.error('Usage: node scripts/attach-br-host.mjs --slug <slug>')
  process.exit(1)
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8' })
  return { ok: res.status === 0, out: (res.stdout || '') + (res.stderr || ''), status: res.status ?? 1 }
}

function pavilionApi(js) {
  return run('bash', [
    'scripts/doppler_run.sh',
    'sh',
    '-c',
    `TOKEN="$VERCEL_TOKEN"; TEAM="$VERCEL_ORG_ID"; ${js}`,
  ])
}

console.log(`Attach BR host ${host} → ${PROJECT}`)
if (dryRun) {
  console.log('Dry-run only.')
  process.exit(0)
}

const add = pavilionApi(`
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  "https://api.vercel.com/v10/projects/${PROJECT}/domains?teamId=$TEAM" \\
  -d '{"name":"${host}"}'
`)
console.log(add.out)
if (!add.ok && !/already|conflict|exists/i.test(add.out)) {
  process.exit(add.status || 1)
}

console.log(`Done. Expect https://${host} once Cloudflare *.businessrocket.ai → Vercel is live.`)
console.log('Apex/www stay on WordPress until cutover.')
