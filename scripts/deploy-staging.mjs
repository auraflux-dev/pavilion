#!/usr/bin/env node
/**
 * Deploy Stone Hill to stable staging: https://shmspto.vercel.app
 *
 * Stone Hill builds from auraflux-dev/shmspto (not this monorepo).
 * Prefer: node scripts/deploy-staging.mjs --cwd /path/to/shmspto
 *
 *   node scripts/deploy-staging.mjs --cwd ../shmspto
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const STAGING_HOST = 'shmspto.vercel.app'
const STAGING_URL = `https://${STAGING_HOST}`
const VERCEL_SCOPE = 'robert-4220s-projects'
const VERCEL_PROJECT = 'frontend'

const args = process.argv.slice(2)
let cwd = process.cwd()
const cwdIdx = args.indexOf('--cwd')
if (cwdIdx >= 0 && args[cwdIdx + 1]) cwd = resolve(args[cwdIdx + 1])

const root = cwd.endsWith('/frontend') ? resolve(cwd, '..') : cwd
const frontendDir = resolve(root, 'frontend')

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, {
    cwd: opts.cwd ?? frontendDir,
    encoding: 'utf8',
    shell: false,
    stdio: opts.capture === false ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  })
  if (opts.capture === false) {
    if (res.status !== 0) process.exit(res.status || 1)
    return ''
  }
  const out = `${res.stdout || ''}${res.stderr || ''}`
  if (res.status !== 0) {
    console.error(out)
    throw new Error(`${cmd} failed (${res.status})`)
  }
  return out
}

console.log(`Deploying Preview from ${frontendDir} (scope ${VERCEL_SCOPE}) …`)
run(
  'npx',
  [
    'vercel',
    'link',
    '--yes',
    '--project',
    VERCEL_PROJECT,
    '--scope',
    VERCEL_SCOPE,
  ],
  { cwd: frontendDir },
)

const deployOut = run('npx', [
  'vercel',
  'deploy',
  '--yes',
  '--scope',
  VERCEL_SCOPE,
])

let deploymentUrl = ''
try {
  const start = deployOut.lastIndexOf('{')
  if (start >= 0) {
    const json = JSON.parse(deployOut.slice(start))
    const u = json?.deployment?.url || json?.url || ''
    if (u) deploymentUrl = u.startsWith('http') ? u : `https://${u}`
  }
} catch {
  /* fall through */
}
if (!deploymentUrl) {
  const matches = [...deployOut.matchAll(/https:\/\/frontend-[a-z0-9-]+\.vercel\.app/gi)]
  deploymentUrl = matches.length ? matches[matches.length - 1][0] : ''
}
if (!deploymentUrl) {
  console.error(deployOut)
  throw new Error('Could not parse Preview deployment URL')
}

const hostOnly = deploymentUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
console.log(`Aliasing ${hostOnly} → ${STAGING_HOST} …`)
run(
  'npx',
  ['vercel', 'alias', hostOnly, STAGING_HOST, '--scope', VERCEL_SCOPE],
  { cwd: frontendDir, capture: false },
)

console.log(`\nStaging ready: ${STAGING_URL}`)
console.log('Run: node scripts/check-prod-deploy.mjs --staging (from shmspto repo)')
console.log('Production waits on Rob OK (shmspto: node scripts/deploy-production.mjs).')
