#!/usr/bin/env node
/**
 * Promote Pavilion product → SHMS customer tree (does NOT deploy www).
 *
 * Default is dry-run (safe during school hours). Pass --apply to write files.
 *
 *   node scripts/promote-to-shms.mjs
 *   node scripts/promote-to-shms.mjs --apply
 *
 * After --apply: commit in ~/shmspto, then only when ready to update live school:
 *   cd ~/shmspto && node scripts/ship-stone-hill.mjs
 *
 * www.shmspto.org is production — avoid ship during school hours unless hotfix.
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const apply = process.argv.includes('--apply')
const extra = process.argv.slice(2).filter((a) => a !== '--apply' && a !== '--dry-run')

console.log('Promote Pavilion → SHMS customer tree')
console.log('  This does NOT deploy www.shmspto.org.')
console.log('  Default: dry-run. Use --apply to write into ~/shmspto.\n')

const syncArgs = [
  'scripts/sync-product-between-repos.mjs',
  '--to-shms',
  ...(apply ? ['--apply'] : ['--dry-run']),
  ...extra,
]

const res = spawnSync('node', syncArgs, { cwd: root, stdio: 'inherit' })
if (res.status !== 0) process.exit(res.status || 1)

if (!apply) {
  console.log(`
Next (when you intend to update the customer tree on disk):
  node scripts/promote-to-shms.mjs --apply

Then commit in ~/shmspto. To update LIVE www (production-sensitive):
  cd ~/shmspto && node scripts/ship-stone-hill.mjs

Prefer off-peak / non-school-hours for www ships unless hotfix.
`)
} else {
  console.log(`
Wrote files into ~/shmspto (working tree). Review, commit there, then ship only when ready:
  cd ~/shmspto && git status
  cd ~/shmspto && node scripts/ship-stone-hill.mjs

WARNING: ship-stone-hill updates www.shmspto.org (live production).
`)
}
