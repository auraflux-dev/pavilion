#!/usr/bin/env node
/**
 * Upsert platform/trial env on commons-pto-demo from commons-pto provision secret.
 * Does not print secret values.
 *
 *   node scripts/sync-demo-platform-env.mjs
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function dopplerJson(js) {
  const res = spawnSync(
    'bash',
    ['scripts/doppler_run.sh', 'node', '--input-type=module', '-e', js],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 10_000_000 },
  )
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout)
    process.exit(res.status || 1)
  }
  return res.stdout
}

const out = dopplerJson(`
const token = process.env.VERCEL_TOKEN
const team = process.env.VERCEL_ORG_ID
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  if (!res.ok) throw new Error(method + ' ' + url + ' ' + res.status + ' ' + text.slice(0, 300))
  return json
}
const src = await api('GET', 'https://api.vercel.com/v9/projects/commons-pto/env?teamId=' + team + '&decrypt=true')
const prov = (src.envs || []).find((e) => e.key === 'COMMONS_PROVISION_SECRET')?.value
if (!prov || prov.length < 16) throw new Error('COMMONS_PROVISION_SECRET missing on commons-pto')
const upserts = {
  COMMONS_PROVISION_SECRET: prov,
  COMMONS_PLATFORM: 'true',
  NEXT_PUBLIC_COMMONS_PLATFORM: 'true',
  PAVILION_PLATFORM: 'true',
  NEXT_PUBLIC_PAVILION_PLATFORM: 'true',
  PAVILION_TRIAL_DOMAIN_SUFFIX: 'onpavilion.com',
  COMMONS_TEMP_DOMAIN_SUFFIX: 'onpavilion.com',
  PAVILION_DEMO_HOST: 'demo.onpavilion.com',
  NEXT_PUBLIC_PAVILION_DEMO_ORIGIN: 'https://demo.onpavilion.com',
  NEXT_PUBLIC_SITE_URL: 'https://demo.onpavilion.com',
}
const dest = await api('GET', 'https://api.vercel.com/v9/projects/commons-pto-demo/env?teamId=' + team)
const byKey = Object.fromEntries((dest.envs || []).map((e) => [e.key, e]))
const results = []
for (const [key, value] of Object.entries(upserts)) {
  if (byKey[key]) {
    await api('PATCH', 'https://api.vercel.com/v9/projects/commons-pto-demo/env/' + byKey[key].id + '?teamId=' + team, {
      value,
      target: ['production', 'preview', 'development'],
    })
    results.push('updated ' + key)
  } else {
    await api('POST', 'https://api.vercel.com/v10/projects/commons-pto-demo/env?teamId=' + team, {
      key,
      value,
      type: 'encrypted',
      target: ['production', 'preview', 'development'],
    })
    results.push('created ' + key)
  }
}
console.log(results.join('\\n'))
console.log('OK ' + results.length)
`)

console.log(out.trim())
