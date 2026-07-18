/**
 * Load a Web OAuth client JSON into Vercel Production for Staff Connect Google.
 *
 * Usage:
 *   node scripts/set-google-oauth-env.mjs /path/to/client_secret_….json
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const keyPath = process.argv[2]
if (!keyPath) {
  console.error('Usage: node scripts/set-google-oauth-env.mjs /path/to/oauth-client.json')
  process.exit(1)
}

const abs = path.resolve(keyPath)
const raw = JSON.parse(readFileSync(abs, 'utf8'))
const cfg = raw.web || raw.installed || raw
const clientId = String(cfg.client_id || '').trim()
const clientSecret = String(cfg.client_secret || '').trim()
if (!clientId || !clientSecret) {
  console.error('JSON missing client_id / client_secret')
  process.exit(1)
}

if (!raw.web) {
  console.warn(
    'Warning: this looks like an Installed/Desktop client. Prefer a Web client with redirect:\n  https://shmspto.vercel.app/api/staff/workspace/connect/callback\n',
  )
}

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend')

function setEnv(name, value) {
  console.log(`Setting ${name} (Production)…`)
  spawnSync('npx', ['vercel', 'env', 'rm', name, 'production', '-y'], {
    cwd: frontendDir,
    stdio: 'ignore',
  })
  const r = spawnSync('npx', ['vercel', 'env', 'add', name, 'production'], {
    cwd: frontendDir,
    input: `${value}\n`,
    encoding: 'utf8',
  })
  if (r.status !== 0) {
    console.error(r.stdout || '')
    console.error(r.stderr || '')
    throw new Error(`Failed to set ${name}`)
  }
  console.log(`OK ${name}`)
}

setEnv('GOOGLE_OAUTH_CLIENT_ID', clientId)
setEnv('GOOGLE_OAUTH_CLIENT_SECRET', clientSecret)

console.log('\nDone. Redeploy Production.')
console.log('Redirect URI must be authorized on this client:')
console.log('  https://shmspto.vercel.app/api/staff/workspace/connect/callback')
