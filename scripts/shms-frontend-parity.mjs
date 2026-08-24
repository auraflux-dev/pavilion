#!/usr/bin/env node
/**
 * Compare Stone Hill frontend source trees:
 *   auraflux-dev/wix-shmspto/frontend  (Pavilion monorepo)
 *   auraflux-dev/shmspto/frontend      (www.shmspto.org — source of truth for school)
 *
 * Why this exists: agents often edit the open Cursor workspace (monorepo) while
 * production ships from ~/shmspto. Features then "were in staff" but vanish from
 * www, or land on www and never return to the monorepo for Pavilion.
 *
 * Usage:
 *   node scripts/shms-frontend-parity.mjs
 *   node scripts/shms-frontend-parity.mjs --json
 *   SHMS_ROOT=~/shmspto MONO_ROOT=~/wix-shmspto node scripts/shms-frontend-parity.mjs
 *
 * Exit 1 when school-facing paths exist only in the monorepo (missing from live ship repo).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const MONO =
  process.env.MONO_ROOT?.trim() ||
  (existsSync(join(repoRoot, 'frontend', 'app')) ? repoRoot : join(homedir(), 'wix-shmspto'))
const SHMS =
  process.env.SHMS_ROOT?.trim() ||
  (existsSync(join(repoRoot, 'HANDOFF.md')) && !existsSync(join(repoRoot, 'commons-site'))
    ? repoRoot
    : join(homedir(), 'shmspto'))

const ROOTS = ['app', 'components', 'lib']
const SKIP_DIR = new Set(['node_modules', '.next', 'dist', 'coverage'])
const SKIP_FILE = new Set(['tsconfig.tsbuildinfo', 'next-env.d.ts'])
const EXT = /\.(ts|tsx|js|jsx|mjs|css)$/

/** Paths that belong on www when present in either tree (not Pavilion-only fixtures). */
const SCHOOL_PATH_RE =
  /^(app\/(?!api\/commons)|components\/(?!demo\/)|lib\/(?!demo\/|fixtures\/))/

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

function area(path) {
  if (path.includes('/staff') || path.startsWith('app/staff') || path.includes('components/staff')) {
    return 'staff'
  }
  if (path.includes('member-portal') || path.includes('/portal/')) return 'portal'
  if (path.startsWith('app/api/')) return 'api'
  if (path.startsWith('app/')) return 'site'
  return 'other'
}

function summarize(list) {
  const c = { staff: 0, portal: 0, site: 0, api: 0, other: 0 }
  for (const f of list) c[area(f)] += 1
  return c
}

function isSchoolFacing(path) {
  if (!SCHOOL_PATH_RE.test(path)) return false
  // Pavilion / demo / loadtest helpers stay monorepo-only.
  if (path.includes('loadtest') || path.includes('preview-handoff') || path.includes('preview-unlock')) {
    return false
  }
  if (path.includes('staff-demo-banner') || path.includes('staff-coach-tour')) return false
  if (path.startsWith('lib/fixtures/') || path.startsWith('lib/demo/')) return false
  if (path.startsWith('components/demo/') || path.startsWith('components/cart/')) return false
  if (path === 'app/cart/page.tsx') return false
  return true
}

const wantJson = process.argv.includes('--json')
const monoFront = join(MONO, 'frontend')
const shmsFront = join(SHMS, 'frontend')

if (!existsSync(monoFront) || !existsSync(shmsFront)) {
  console.error('Missing frontend trees.')
  console.error(`  MONO: ${monoFront} (${existsSync(monoFront) ? 'ok' : 'missing'})`)
  console.error(`  SHMS: ${shmsFront} (${existsSync(shmsFront) ? 'ok' : 'missing'})`)
  process.exit(2)
}

const mono = collect(monoFront)
const shms = collect(shmsFront)
const onlyMono = [...mono].filter((f) => !shms.has(f)).sort()
const onlyShms = [...shms].filter((f) => !mono.has(f)).sort()
const both = [...mono].filter((f) => shms.has(f)).sort()
const contentDiff = []
for (const f of both) {
  const a = readFileSync(join(monoFront, f))
  const b = readFileSync(join(shmsFront, f))
  if (!a.equals(b)) contentDiff.push(f)
}

const onlyMonoSchool = onlyMono.filter(isSchoolFacing)
const onlyShmsSchool = onlyShms.filter(isSchoolFacing)
const contentDiffSchool = contentDiff.filter(isSchoolFacing)

const report = {
  monoRoot: MONO,
  shmsRoot: SHMS,
  counts: {
    mono: mono.size,
    shms: shms.size,
    onlyMono: onlyMono.length,
    onlyShms: onlyShms.length,
    contentDiff: contentDiff.length,
    onlyMonoSchool: onlyMonoSchool.length,
    onlyShmsSchool: onlyShmsSchool.length,
    contentDiffSchool: contentDiffSchool.length,
  },
  onlyMonoSchoolByArea: summarize(onlyMonoSchool),
  onlyShmsSchoolByArea: summarize(onlyShmsSchool),
  contentDiffSchoolByArea: summarize(contentDiffSchool),
  onlyMonoSchool,
  onlyShmsSchool,
  contentDiffSchoolSample: contentDiffSchool.slice(0, 60),
}

if (wantJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log('SHMS frontend parity')
  console.log(`  monorepo: ${MONO}`)
  console.log(`  shmspto:  ${SHMS}`)
  console.log('')
  console.log(
    `Files: mono ${report.counts.mono} · shms ${report.counts.shms} · content diffs ${report.counts.contentDiff}`,
  )
  console.log('')
  console.log(
    `School-facing missing from shmspto (will not ship to www): ${report.counts.onlyMonoSchool}`,
  )
  console.log(`  by area: ${JSON.stringify(report.onlyMonoSchoolByArea)}`)
  for (const f of onlyMonoSchool.slice(0, 40)) console.log(`  - ${f}`)
  if (onlyMonoSchool.length > 40) console.log(`  … +${onlyMonoSchool.length - 40} more`)
  console.log('')
  console.log(
    `School-facing only in shmspto (monorepo/Pavilion lag): ${report.counts.onlyShmsSchool}`,
  )
  console.log(`  by area: ${JSON.stringify(report.onlyShmsSchoolByArea)}`)
  for (const f of onlyShmsSchool.slice(0, 40)) console.log(`  - ${f}`)
  if (onlyShmsSchool.length > 40) console.log(`  … +${onlyShmsSchool.length - 40} more`)
  console.log('')
  console.log(
    `School-facing content diffs (sample ${Math.min(60, contentDiffSchool.length)} of ${contentDiffSchool.length}):`,
  )
  console.log(`  by area: ${JSON.stringify(report.contentDiffSchoolByArea)}`)
  for (const f of contentDiffSchool.slice(0, 30)) console.log(`  ~ ${f}`)
  if (contentDiffSchool.length > 30) console.log(`  … +${contentDiffSchool.length - 30} more`)
  console.log('')
  if (onlyMonoSchool.length) {
    console.log('FAIL: port school-facing files into ~/shmspto before calling Stone Hill shipped.')
  } else {
    console.log('OK: no school-facing files exist only in the monorepo.')
  }
}

process.exit(onlyMonoSchool.length ? 1 : 0)
