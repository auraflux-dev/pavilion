#!/usr/bin/env node
/**
 * Attach {slug}.onpavilion.com to commons-pto-demo and add SHMS DNS verify TXT.
 *
 *   node scripts/attach-trial-host.mjs --slug oak-street
 *   node scripts/attach-trial-host.mjs --slug oak-street --dry-run
 *
 * Domain zone stays on treasurer (SHMS). Project is robert-4220 commons-pto-demo.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SHMS = path.resolve(REPO, '../shmspto')
const dryRun = process.argv.includes('--dry-run')
const slugIdx = process.argv.indexOf('--slug')
const slug = (slugIdx >= 0 ? process.argv[slugIdx + 1] : '').trim().toLowerCase()
const host = slug ? `${slug}.onpavilion.com` : ''
const PROJECT = 'commons-pto-demo'
const SCOPE = 'robert-4220s-projects'

if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug) || slug === 'riverside') {
  console.error('Usage: node scripts/attach-trial-host.mjs --slug <slug>')
  process.exit(1)
}

function run(cwd, cmd, args) {
  const res = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
  return { ok: res.status === 0, out: (res.stdout || '') + (res.stderr || ''), status: res.status ?? 1 }
}

function pavilionApi(js) {
  return run(REPO, 'bash', [
    'scripts/doppler_run.sh',
    'sh',
    '-c',
    `TOKEN="$VERCEL_TOKEN"; TEAM="$VERCEL_ORG_ID"; ${js}`,
  ])
}

function shmsApi(js) {
  return run(SHMS, 'bash', [
    'scripts/doppler_run.sh',
    'sh',
    '-c',
    `TOKEN="$VERCEL_TOKEN"; TEAM="$VERCEL_ORG_ID"; ${js}`,
  ])
}

console.log(`Attach trial host ${host} → ${PROJECT}`)
if (dryRun) {
  console.log('Dry-run only.')
  process.exit(0)
}

const add = pavilionApi(`
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  "https://api.vercel.com/v10/projects/${PROJECT}/domains?teamId=$TEAM" \\
  -d '{"name":"${host}"}'
`)
console.log(add.out.trim())

let verifyValue = ''
try {
  const parsed = JSON.parse(add.out.trim().split('\n').pop() || '{}')
  if (parsed.verified) {
    console.log('Already verified.')
    process.exit(0)
  }
  verifyValue = parsed.verification?.[0]?.value || ''
} catch {
  // fall through
}

if (!verifyValue) {
  const inspect = pavilionApi(`
curl -sS -H "Authorization: Bearer $TOKEN" \\
  "https://api.vercel.com/v9/projects/${PROJECT}/domains?teamId=$TEAM"
`)
  try {
    const d = JSON.parse(inspect.out)
    const row = (d.domains || []).find((x) => x.name === host)
    verifyValue = row?.verification?.[0]?.value || ''
    console.log(row ? `verified=${row.verified}` : 'domain row missing')
  } catch {
    console.error(inspect.out)
  }
}

if (!verifyValue) {
  console.error('No verify TXT returned. Add the domain in the dashboard and re-run.')
  process.exit(1)
}

console.log(`TXT value: ${verifyValue}`)
const txt = shmsApi(`
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  "https://api.vercel.com/v2/domains/onpavilion.com/records?teamId=$TEAM" \\
  -d '{"type":"TXT","name":"_vercel","value":"${verifyValue}"}'
`)
console.log(txt.out.trim())

spawnSync('sleep', ['4'], { encoding: 'utf8' })

const verify = pavilionApi(`
curl -sS -X POST -H "Authorization: Bearer $TOKEN" \\
  "https://api.vercel.com/v9/projects/${PROJECT}/domains/${host}/verify?teamId=$TEAM"
`)
console.log(verify.out.trim())
console.log(`Done. Login: https://${host}/login`)
