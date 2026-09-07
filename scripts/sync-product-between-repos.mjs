#!/usr/bin/env node
/**
 * Product sync between Pavilion (product) and SHMS (customer #1).
 *
 * Expected direction — promote product to customer:
 *   node scripts/sync-product-between-repos.mjs --to-shms --dry-run
 *   node scripts/sync-product-between-repos.mjs --to-shms --apply
 *   node scripts/promote-to-shms.mjs              # dry-run wrapper
 *   node scripts/promote-to-shms.mjs --apply
 *
 * Emergency — port SHMS hotfix back into product (same day):
 *   node scripts/sync-product-between-repos.mjs --from-shms --apply
 *
 * Weekly VIP intake (accept/deny buckets + board):
 *   node scripts/shms-weekly-intake.mjs
 *
 * --to-shms / --promote-shms  pavilion → shmspto (expected)
 * --from-shms                 shmspto → pavilion (hotfix port-back only)
 *
 * Skips Pavilion-only fixtures/demo and thin SHMS marketing wrappers by default.
 * Applying --to-shms does NOT deploy www; ship-stone-hill.mjs does (production).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collect, isProductPath } from './lib/shms-frontend-trees.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const MONO =
  process.env.MONO_ROOT?.trim() ||
  (existsSync(join(repoRoot, 'frontend', 'app')) ? repoRoot : join(homedir(), 'pavilion'))
const SHMS = process.env.SHMS_ROOT?.trim() || join(homedir(), 'shmspto')

const args = new Set(process.argv.slice(2))
const fromShms = args.has('--from-shms')
const toShms = args.has('--to-shms') || args.has('--promote-shms')
const apply = args.has('--apply')
const dryRun = args.has('--dry-run') || !apply
const includeMarketing = args.has('--include-marketing')
const onlyDiffs = args.has('--diffs-only')

if (fromShms === toShms) {
  console.error('Pick exactly one of --to-shms / --promote-shms (expected) or --from-shms (hotfix port-back)')
  process.exit(2)
}

if (fromShms) {
  console.warn('NOTE: --from-shms is emergency hotfix port-back (SHMS → product). Prefer authoring in pavilion.\n')
  console.warn('For weekly accept/deny: node scripts/shms-weekly-intake.mjs\n')
}

const srcRoot = fromShms ? join(SHMS, 'frontend') : join(MONO, 'frontend')
const dstRoot = fromShms ? join(MONO, 'frontend') : join(SHMS, 'frontend')
const direction = fromShms ? 'shmspto → pavilion' : 'pavilion → shmspto'

if (!existsSync(srcRoot) || !existsSync(dstRoot)) {
  console.error('Missing frontend trees.')
  console.error(`  SRC: ${srcRoot} (${existsSync(srcRoot) ? 'ok' : 'missing'})`)
  console.error(`  DST: ${dstRoot} (${existsSync(dstRoot) ? 'ok' : 'missing'})`)
  process.exit(2)
}

const src = collect(srcRoot)
const candidates = [...src].filter((f) => isProductPath(f, { includeMarketing })).sort()

const planned = []
for (const f of candidates) {
  const from = join(srcRoot, f)
  const to = join(dstRoot, f)
  const srcBuf = readFileSync(from)
  if (!existsSync(to)) {
    planned.push({ f, action: 'add' })
    continue
  }
  const dstBuf = readFileSync(to)
  if (!srcBuf.equals(dstBuf)) {
    planned.push({ f, action: 'update' })
  } else if (!onlyDiffs) {
    // identical: skip
  }
}

console.log(`Product sync (${direction})${dryRun ? ' · dry-run' : ' · APPLY'}`)
console.log(`  src: ${srcRoot}`)
console.log(`  dst: ${dstRoot}`)
console.log(`  files: ${planned.length}`)

for (const row of planned) {
  console.log(`  ${row.action.padEnd(6)} ${row.f}`)
  if (dryRun) continue
  const from = join(srcRoot, row.f)
  const to = join(dstRoot, row.f)
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
}

if (dryRun) {
  console.log('\nRe-run with --apply to write files. Then commit in the destination repo.')
  if (!fromShms) {
    console.log('SHMS customer ship (updates LIVE www — production-sensitive):')
    console.log('  cd ~/shmspto && node scripts/ship-stone-hill.mjs')
  } else {
    console.log('After hotfix port-back: commit pavilion + ship-pavilion if demo should match.')
    console.log('Or use weekly intake buckets: node scripts/shms-weekly-intake.mjs')
  }
} else {
  const stamp = {
    at: new Date().toISOString(),
    direction,
    count: planned.length,
    files: planned.map((p) => p.f),
  }
  const stampPath = join(repoRoot, 'tmp', 'last-product-sync.json')
  mkdirSync(dirname(stampPath), { recursive: true })
  writeFileSync(stampPath, JSON.stringify(stamp, null, 2))
  console.log(`\nWrote ${planned.length} files. Stamp: ${stampPath}`)
}
