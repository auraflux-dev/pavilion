#!/usr/bin/env node
/**
 * Phone / ops: provision a Business Rocket customer org on Pavilion.
 *
 *   bash scripts/doppler_run.sh node scripts/provision-br-org.mjs \
 *     --slug acme-plumbing --name "Acme Plumbing" --email owner@acme.com
 *
 *   … --attach          # add {slug}.businessrocket.ai on commons-pto-demo
 *   … --custom www.acme.com
 *
 * Writes creds to /tmp/br-org-{slug}.txt (mode 600).
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
const name = flag('--name', flag('--school', 'Business Rocket customer'))
const email = flag('--email', `owner-${slug || 'br'}@businessrocket.ai`)
const customDomain = flag('--custom')
const brandPack = flag('--brand')
const attach = args.includes('--attach')

if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug) || slug === 'riverside') {
  console.error(
    'Usage: node scripts/provision-br-org.mjs --slug <slug> --name "…" --email … [--attach] [--custom www.example.com]',
  )
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
  console.error('Run via: bash scripts/doppler_run.sh node scripts/provision-br-org.mjs …')
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
const tmp = mkdtempSync(path.join(tmpdir(), 'br-env-'))
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

const start = await fetch('https://demo.onpavilion.com/api/commons/provision/br', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: 'https://demo.onpavilion.com',
    Referer: 'https://demo.onpavilion.com/',
    'x-commons-provision-key': provisionKey,
  },
  body: JSON.stringify({
    businessName: name,
    slug,
    email,
    password,
    provisionKey,
    brandPack: brandPack || undefined,
    customDomain: customDomain || undefined,
  }),
})
const body = await start.json()
console.log(
  JSON.stringify(
    {
      http: start.status,
      ok: body.ok,
      error: body.error,
      orgId: body.orgId,
      slug: body.slug,
      tempHost: body.tempHost,
      customDomain: body.customDomain,
      modules: body.modules?.length,
      next: body.next,
    },
    null,
    2,
  ),
)
if (!body.ok) process.exit(1)

const out = `/tmp/br-org-${slug}.txt`
writeFileSync(
  out,
  `Product: businessrocket\nLogin: ${body.next}\nEmail: ${email}\nPassword: ${password}\nOrg: ${body.orgId}\nTemp host: ${body.tempHost}\nCustom: ${body.customDomain || '(none)'}\nName: ${name}\n`,
  { mode: 0o600 },
)
console.log(`creds: ${out}`)

if (attach) {
  const att = spawnSync('node', ['scripts/attach-br-host.mjs', '--slug', slug], {
    cwd: REPO,
    encoding: 'utf8',
  })
  console.log(att.stdout)
  if (att.stderr) console.error(att.stderr)
  if (att.status !== 0) process.exit(att.status || 1)
}
