#!/usr/bin/env node
/**
 * Copy COMMONS_PROVISION_SECRET from commons-pto → commons-pto-demo (plaintext).
 * Run: bash scripts/doppler_run.sh node scripts/fix-demo-provision-secret.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const token = process.env.VERCEL_TOKEN
const team = process.env.VERCEL_ORG_ID
if (!token || !team) {
  console.error('Need Doppler Vercel token')
  process.exit(1)
}

function pullMap(project) {
  const id = JSON.parse(
    spawnSync(
      'curl',
      [
        '-sS',
        '-H',
        `Authorization: Bearer ${token}`,
        `https://api.vercel.com/v9/projects/${project}?teamId=${team}`,
      ],
      { encoding: 'utf8' },
    ).stdout,
  ).id
  const tmp = mkdtempSync(path.join(tmpdir(), 'pav-'))
  const r = spawnSync(
    'npx',
    [
      '--yes',
      'vercel@59.5.0',
      'env',
      'pull',
      path.join(tmp, '.env'),
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
      env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: id },
    },
  )
  if (r.status !== 0) throw new Error(r.stderr || r.stdout)
  const map = {}
  for (const line of readFileSync(path.join(tmp, '.env'), 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    let v = line.slice(i + 1)
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    map[line.slice(0, i)] = v
  }
  return map
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(text.slice(0, 400))
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

const secret = pullMap('commons-pto').COMMONS_PROVISION_SECRET
if (!secret || secret.length < 16) throw new Error('bad pto secret len=' + (secret || '').length)
console.log('pto_secret_len', secret.length)

const dest = await api('GET', `https://api.vercel.com/v9/projects/commons-pto-demo/env?teamId=${team}`)
const row = (dest.envs || []).find((e) => e.key === 'COMMONS_PROVISION_SECRET')
if (row) {
  await api('DELETE', `https://api.vercel.com/v9/projects/commons-pto-demo/env/${row.id}?teamId=${team}`)
  console.log('deleted old secret')
}
await api('POST', `https://api.vercel.com/v10/projects/commons-pto-demo/env?teamId=${team}`, {
  key: 'COMMONS_PROVISION_SECRET',
  value: secret,
  type: 'encrypted',
  target: ['production', 'preview', 'development'],
})
console.log('wrote secret')
const demoLen = (pullMap('commons-pto-demo').COMMONS_PROVISION_SECRET || '').length
console.log('demo_secret_len', demoLen)
if (demoLen < 16) process.exit(1)
