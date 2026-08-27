/**
 * Run Vercel CLI against robert-4220 (HSKRG / Pavilion) using Doppler pavilion/dev token.
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOPPLER_RUN = resolve(__dirname, 'doppler_run.sh')

export const VERCEL_SCOPE = 'robert-4220s-projects'

export function runVercelRobert4220(args, opts = {}) {
  const res = spawnSync(
    'bash',
    [DOPPLER_RUN, 'env', '-u', 'VERCEL_ORG_ID', 'npx', 'vercel', ...args],
    {
      cwd: opts.cwd ?? process.cwd(),
      encoding: 'utf8',
      shell: false,
      stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...(opts.env ?? {}) },
    },
  )
  if (opts.inherit) {
    if (res.status !== 0) process.exit(res.status || 1)
    return ''
  }
  const out = `${res.stdout || ''}${res.stderr || ''}`
  if (res.status !== 0) {
    if (!opts.quiet) console.error(out)
    throw new Error(`vercel ${args.join(' ')} failed (${res.status})`)
  }
  return out
}
