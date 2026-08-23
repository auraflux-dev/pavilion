#!/usr/bin/env node
/**
 * Sync SHMS R2 credentials from ~/.shmspto/prod.env to Vercel `frontend`.
 *
 *   ./scripts/with-prod-env.sh node scripts/ops/shms-r2-vercel-env.mjs
 *   ./scripts/with-prod-env.sh node scripts/ops/shms-r2-vercel-env.mjs --redeploy
 */
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const TEAM = 'team_RXhJ9wjn7h5OcGCE86ILmftT'
const FRONTEND_PROJECT = 'prj_zYYjrqLzcZ4imfYWLo8Iv8coavqG'
const KEYS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BACKUP_BUCKET']

function vercelToken() {
  if (process.env.VERCEL_TOKEN?.trim()) return process.env.VERCEL_TOKEN.trim()
  const candidates = [
    join(homedir(), 'Library/Application Support/com.vercel.cli/auth.json'),
    join(homedir(), '.local/share/com.vercel.cli/auth.json'),
    join(homedir(), '.config/vercel/auth.json'),
    '/tmp/vercel-robert4220.token',
  ]
  for (const path of candidates) {
    if (!existsSync(path)) continue
    if (path.endsWith('.token')) return readFileSync(path, 'utf8').trim()
    try {
      const json = JSON.parse(readFileSync(path, 'utf8'))
      const token = json.token || json.accessToken || json.authToken
      if (typeof token === 'string' && token) return token
    } catch {
      // next
    }
  }
  throw new Error('No Vercel token. Set VERCEL_TOKEN or log in with vercel CLI.')
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
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 300)}`)
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
  console.log('OK', key)
}

async function main() {
  const missing = KEYS.filter((k) => !String(process.env[k] ?? '').trim())
  if (missing.length) {
    throw new Error(`Missing in prod.env: ${missing.join(', ')}`)
  }

  const token = vercelToken()
  const bucket = process.env.R2_BACKUP_BUCKET.trim()
  console.log(`Syncing R2 to Vercel frontend (bucket: ${bucket})…`)

  for (const key of KEYS) {
    await upsertEnv(token, FRONTEND_PROJECT, key, process.env[key].trim())
  }

  console.log('Vercel env updated for production, preview, and development.')

  if (process.argv.includes('--redeploy')) {
    console.log('Redeploying production…')
    const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
    const res = spawnSync('npx', ['vercel', '--prod', '--yes'], {
      cwd: root,
      encoding: 'utf8',
      stdio: 'inherit',
    })
    if (res.status !== 0) process.exit(res.status || 1)
    console.log('Production redeploy triggered.')
  } else {
    console.log('Run with --redeploy to pick up env on production now.')
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
