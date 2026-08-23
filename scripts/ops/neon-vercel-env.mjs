#!/usr/bin/env node
/**
 * Point robert-4220 Vercel projects at Neon DATABASE_URLs.
 *
 *   /tmp/vercel-robert4220.token
 *   /tmp/neon-pavilion.url
 *   /tmp/neon-hskrg.url
 *   /tmp/robert4220-projects.json  (optional; defaults by name lookup)
 *
 *   node scripts/ops/neon-vercel-env.mjs
 */
import { readFileSync, existsSync } from 'node:fs'

const TEAM = 'team_Uqf65YPnvqis36qNRfjOqRGr'

function read(path) {
  let u = readFileSync(path, 'utf8').trim()
  if (path.endsWith('.url') && !u.includes('sslmode=')) {
    u += (u.includes('?') ? '&' : '?') + 'sslmode=require'
  }
  return u
}

async function api(token, method, path, body) {
  const url = `https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${TEAM}`
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 200)}`)
  return data
}

async function upsertEnv(token, projectId, key, value) {
  const { envs = [] } = await api(token, 'GET', `/v9/projects/${projectId}/env`)
  for (const e of envs) {
    if (e.key === key) {
      await api(token, 'DELETE', `/v9/projects/${projectId}/env/${e.id}`)
    }
  }
  await api(token, 'POST', `/v10/projects/${projectId}/env`, {
    key,
    value,
    type: 'encrypted',
    target: ['production', 'preview', 'development'],
  })
  console.log('OK', key, 'on', projectId.slice(0, 12))
}

async function projectId(token, name) {
  if (existsSync('/tmp/robert4220-projects.json')) {
    const map = JSON.parse(readFileSync('/tmp/robert4220-projects.json', 'utf8'))
    if (map[name]) return map[name]
  }
  const { projects = [] } = await api(token, 'GET', '/v9/projects?limit=50')
  const p = projects.find((x) => x.name === name)
  if (!p) throw new Error(`Project ${name} not found`)
  return p.id
}

async function main() {
  const token = read('/tmp/vercel-robert4220.token')
  const pavilionUrl = read('/tmp/neon-pavilion.url')
  const hskrgUrl = read('/tmp/neon-hskrg.url')

  const pto = await projectId(token, 'commons-pto')
  const demo = await projectId(token, 'commons-pto-demo')
  const site = await projectId(token, 'commons-site')
  const hq = await projectId(token, 'hskrg-work')

  for (const pid of [pto, demo]) {
    await upsertEnv(token, pid, 'DATABASE_URL', pavilionUrl)
  }
  await upsertEnv(token, site, 'COMMONS_PROD_DATABASE_URL', pavilionUrl)
  await upsertEnv(token, hq, 'DATABASE_URL', hskrgUrl)

  console.log('Vercel env updated — redeploy commons-pto, commons-pto-demo, commons-site, hskrg-work')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
