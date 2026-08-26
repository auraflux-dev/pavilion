#!/usr/bin/env node
/**
 * Sync shared product frontend files between Pavilion and Stone Hill.
 *
 * Agent home is **pavilion**. You do not need treasurer Vercel for this.
 * Stone Hill www ships by git push on ~/shmspto (treasurer auto-deploys).
 * Pavilion demo/trial ships on robert-4220 only.
 *
 * Usage:
 *   node scripts/sync-product-between-repos.mjs --from-shms --dry-run
 *   node scripts/sync-product-between-repos.mjs --from-shms --apply
 *   node scripts/sync-product-between-repos.mjs --to-shms --dry-run
 *   node scripts/sync-product-between-repos.mjs --to-shms --apply
 *
 * --from-shms  Copy school product from ~/shmspto → pavilion (demo/trial catch-up)
 * --to-shms    Copy school product from pavilion → ~/shmspto (school ship prep)
 *
 * Skips Pavilion-only fixtures/demo and thin SHMS marketing wrappers by default.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const MONO =
  process.env.MONO_ROOT?.trim() ||
  (existsSync(join(repoRoot, 'frontend', 'app')) ? repoRoot : join(homedir(), 'pavilion'))
const SHMS = process.env.SHMS_ROOT?.trim() || join(homedir(), 'shmspto')

const ROOTS = ['app', 'components', 'lib']
const SKIP_DIR = new Set(['node_modules', '.next', 'dist', 'coverage'])
const SKIP_FILE = new Set(['tsconfig.tsbuildinfo', 'next-env.d.ts'])
const EXT = /\.(ts|tsx|js|jsx|mjs|css)$/

/** Shared product paths (not Pavilion-only fixtures). */
const SCHOOL_PATH_RE =
  /^(app\/(?!api\/commons)|components\/(?!demo\/)|lib\/(?!demo\/|fixtures\/))/

/** Thin SHMS marketing shells. Skip unless --include-marketing. */
const MARKETING_WRAPPER_RE =
  /^(components\/events\/events-page-copy|components\/fundraising\/fundraising-page-copy|components\/home\/community-banner-headline|components\/home\/volunteer-cms-copy|components\/legal\/legal-article-client|components\/membership\/membership-section-copy|components\/newsletter\/newsletter-perks|components\/surveys\/survey-eyebrow|components\/member-portal\/payment-methods-page-header)\.tsx$/

const args = new Set(process.argv.slice(2))
const fromShms = args.has('--from-shms')
const toShms = args.has('--to-shms')
const apply = args.has('--apply')
const dryRun = args.has('--dry-run') || !apply
const includeMarketing = args.has('--include-marketing')
const onlyDiffs = args.has('--diffs-only')

if (fromShms === toShms) {
  console.error('Pick exactly one of --from-shms or --to-shms')
  process.exit(2)
}

function walk(absRoot, base, out = []) {
  if (!existsSync(absRoot)) return out
  for (const name of readdirSync(absRoot)) {
    if (SKIP_DIR.has(name) || SKIP_FILE.has(name)) continue
    const p = join(absRoot, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, base, out)
    else if (EXT.test(name)) out.push(relative(base, p).split('\\').join('/'))
  }
  return out
}

function collect(frontendRoot) {
  const set = new Set()
  for (const r of ROOTS) {
    for (const f of walk(join(frontendRoot, r), frontendRoot)) set.add(f)
  }
  return set
}

function isProductPath(path) {
  if (!SCHOOL_PATH_RE.test(path)) return false
  if (path.includes('loadtest') || path.includes('preview-handoff') || path.includes('preview-unlock')) {
    return false
  }
  if (path.includes('staff-demo-banner') || path.includes('staff-coach-tour')) return false
  if (path.startsWith('lib/fixtures/') || path.startsWith('lib/demo/')) return false
  if (path.startsWith('components/demo/')) return false
  if (!includeMarketing && MARKETING_WRAPPER_RE.test(path)) return false
  return true
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
const dst = collect(dstRoot)
const candidates = [...src].filter(isProductPath).sort()

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
  console.log('Stone Hill ship: commit + git push origin main on ~/shmspto (no treasurer Vercel CLI).')
  console.log('Pavilion ship: robert-4220 only (commons-pto-demo / commons-pto).')
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
