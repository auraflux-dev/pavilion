/**
 * Load a Google service-account JSON key into Vercel Production env vars.
 *
 * Usage (from repo root):
 *   node scripts/set-google-sa-env.mjs /path/to/your-key.json
 *
 * Optional 2nd arg: Google Drive folder ID
 *   node scripts/set-google-sa-env.mjs ./key.json 1AbCdEfGhIjKlMnOp
 *
 * Never commit the JSON key. Delete it after running.
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const keyPath = process.argv[2]
const folderId = process.argv[3]?.trim()

if (!keyPath) {
  console.error('Usage: node scripts/set-google-sa-env.mjs /path/to/service-account.json [DRIVE_FOLDER_ID]')
  process.exit(1)
}

const abs = path.resolve(keyPath)
const raw = JSON.parse(readFileSync(abs, 'utf8'))
if (raw.type !== 'service_account' || !raw.client_email || !raw.private_key) {
  console.error('File does not look like a Google service account key JSON.')
  process.exit(1)
}

const email = String(raw.client_email).trim()
// Keep PEM newlines as literal \n for Vercel env storage
const privateKey = String(raw.private_key).replace(/\r\n/g, '\n').replace(/\n/g, '\\n')

const frontendDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../frontend')

function setEnv(name, value) {
  console.log(`Setting ${name} (Production)…`)
  // Remove first if exists (ignore failure)
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

setEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', email)
setEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', privateKey)
if (folderId) setEnv('GOOGLE_DRIVE_FOLDER_ID', folderId)

console.log('\nDone. Redeploy Production for the vars to take effect.')
console.log(`Service account: ${email}`)
console.log('Tip: delete or move the JSON key off your Downloads when finished.')
