#!/usr/bin/env node
/**
 * CLI production deploy for a Pavilion Vercel project (robert-4220).
 * Agents: use ship-pavilion.mjs --cli-fallback, not this directly.
 */
import { resolve } from 'node:path'
import { runVercelRobert4220, VERCEL_SCOPE } from './vercel-robert4220-run.mjs'

const TARGETS = {
  'commons-pto-demo': { project: 'commons-pto-demo', cwd: '.' },
  'commons-site': { project: 'commons-site', cwd: 'commons-site' },
  'commons-pto': { project: 'commons-pto', cwd: '.' },
}

const args = process.argv.slice(2)
const forceDirect = args.includes('--force')
const targetIdx = args.indexOf('--target')
const target =
  targetIdx >= 0 && args[targetIdx + 1] ? args[targetIdx + 1] : 'commons-pto-demo'

if (!forceDirect && process.env.PAVILION_SHIP_CLI_FALLBACK !== '1') {
  console.error(`
Pavilion production deploy is not run directly.

Use:
  node scripts/ship-pavilion.mjs --target ${target}

CLI fallback:
  node scripts/ship-pavilion.mjs --target ${target} --skip-push --cli-fallback
`)
  process.exit(1)
}

const cfg = TARGETS[target]
if (!cfg) {
  console.error(`Unknown target. Use: ${Object.keys(TARGETS).join(', ')}`)
  process.exit(1)
}

const root = resolve(process.cwd(), cfg.cwd)

console.log(`Deploying ${target} → ${cfg.project} (${VERCEL_SCOPE}) …\n`)

runVercelRobert4220(
  ['link', '--yes', '--project', cfg.project, '--scope', VERCEL_SCOPE],
  { cwd: root },
)
runVercelRobert4220(['deploy', '--prod', '--yes', '--scope', VERCEL_SCOPE], {
  cwd: root,
  inherit: true,
})

console.log(`\nVerify: node scripts/check-pavilion-deploy.mjs --target ${target}`)
