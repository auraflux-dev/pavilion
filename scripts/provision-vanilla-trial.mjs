#!/usr/bin/env node
/**
 * Provision a vanilla trial and optionally attach the host.
 *
 *   node scripts/provision-vanilla-trial.mjs --slug blank-school --school "Blank School PTO"
 *   node scripts/provision-vanilla-trial.mjs --slug blank-school --school "Blank School PTO" --attach
 */
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
function flag(name, fallback = '') {
  const i = args.indexOf(name)
  return i >= 0 ? String(args[i + 1] || '').trim() : fallback
}
const slug = flag('--slug')
const school = flag('--school', 'Blank School PTO')
const email = flag('--email', `trial-${slug || 'blank'}@onpavilion.com`)
const attach = args.includes('--attach')
if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug) || slug === 'riverside') {
  console.error('Usage: node scripts/provision-vanilla-trial.mjs --slug <slug> [--school "..."] [--attach]')
  process.exit(1)
}
const password = randomBytes(12).toString('base64url').slice(0, 16)

function parseEnvFile(filePath) {
  const map = {}
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    const key = line.slice(0, i)
    let value = line.slice(i + 1)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    map[key] = value.replace(/\\n/g, '\n')
  }
  return map
}

const token = process.env.VERCEL_TOKEN
const team = process.env.VERCEL_ORG_ID
if (!token || !team) {
  console.error('Run via: bash scripts/doppler_run.sh node scripts/provision-vanilla-trial.mjs …')
  process.exit(1)
}

const projectRes = spawnSync(
  'curl',
  [
    '-sS',
    '-H',
    `Authorization: Bearer ${token}`,
    `https://api.vercel.com/v9/projects/commons-pto-demo?teamId=${team}`,
  ],
  { encoding: 'utf8' },
)
const projectId = JSON.parse(projectRes.stdout).id
const tmp = mkdtempSync(path.join(tmpdir(), 'pav-env-'))
const pull = spawnSync(
  'npx',
  [
    '--yes',
    'vercel@59.5.0',
    'env',
    'pull',
    path.join(tmp, '.env.demo'),
    '--environment=production',
    '--yes',
    '--token',
    token,
    '--scope',
    'robert-4220s-projects',
  ],
  {
    cwd: tmp,
    encoding: 'utf8',
    env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: projectId },
  },
)
if (pull.status !== 0) {
  console.error(pull.stderr || pull.stdout)
  process.exit(1)
}
const provisionKey = parseEnvFile(path.join(tmp, '.env.demo')).COMMONS_PROVISION_SECRET
if (!provisionKey || provisionKey.length < 16) {
  console.error('COMMONS_PROVISION_SECRET missing after env pull')
  process.exit(1)
}

const start = await fetch('https://demo.onpavilion.com/api/commons/trial/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: 'https://demo.onpavilion.com',
    Referer: 'https://demo.onpavilion.com/trial',
    'x-commons-provision-key': provisionKey,
  },
  body: JSON.stringify({
    schoolName: school,
    slug,
    email,
    password,
    provisionKey,
  }),
})
const body = await start.json()
console.log(
  JSON.stringify(
    {
      http: start.status,
      ok: body.ok,
      error: body.error,
      slug: body.slug,
      tempHost: body.tempHost,
      brandPackSlug: body.brandPackSlug || '(vanilla)',
      trialEndsAt: body.trialEndsAt,
    },
    null,
    2,
  ),
)
if (!body.ok) process.exit(1)

const out = `/tmp/pavilion-trial-${slug}.txt`
writeFileSync(
  out,
  `Login: https://${body.tempHost}/login\nEmail: ${email}\nPassword: ${password}\nBrand: vanilla\nSchool: ${school}\n`,
  { mode: 0o600 },
)
console.log(`creds: ${out}`)

if (attach) {
  const att = spawnSync('node', ['scripts/attach-trial-host.mjs', '--slug', slug], {
    cwd: REPO,
    encoding: 'utf8',
  })
  console.log(att.stdout)
  if (att.stderr) console.error(att.stderr)
  if (att.status !== 0) process.exit(att.status || 1)
}
