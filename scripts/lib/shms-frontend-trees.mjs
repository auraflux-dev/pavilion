/**
 * Shared Pavilion ↔ SHMS frontend tree helpers (parity / sync / weekly intake).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export const ROOTS = ['app', 'components', 'lib']
export const SKIP_DIR = new Set(['node_modules', '.next', 'dist', 'coverage'])
export const SKIP_FILE = new Set(['tsconfig.tsbuildinfo', 'next-env.d.ts'])
export const EXT = /\.(ts|tsx|js|jsx|mjs|css)$/

/** Shared product paths (not Pavilion-only fixtures). */
export const SCHOOL_PATH_RE =
  /^(app\/(?!api\/commons)|components\/(?!demo\/)|lib\/(?!demo\/|fixtures\/))/

/**
 * Thin SHMS marketing shells. Stay school-only unless --include-marketing.
 * Weekly intake: Deny forever (unless Rob explicitly productizes one).
 */
export const MARKETING_WRAPPER_RE =
  /^(components\/events\/events-page-copy|components\/fundraising\/fundraising-page-copy|components\/home\/community-banner-headline|components\/home\/volunteer-cms-copy|components\/legal\/legal-article-client|components\/membership\/membership-section-copy|components\/newsletter\/newsletter-perks|components\/surveys\/survey-eyebrow|components\/member-portal\/payment-methods-page-header)\.tsx$/

/** Paths that must not be overwritten by SHMS → pavilion (product architecture). */
export const PAVILION_AHEAD_PATHS = new Set(['app/layout.tsx'])

/** Content markers that mean pavilion is ahead of SHMS on that file. */
export const PAVILION_AHEAD_MARKERS = [
  'BrandPackShell',
  'getActiveBrandPack',
  'resolveCmsLayoutBrand',
  'isDemoRequestSurface',
  'isTrialRequestSurface',
]

export function walk(absRoot, base, out = []) {
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

export function collect(frontendRoot) {
  const set = new Set()
  for (const r of ROOTS) {
    for (const f of walk(join(frontendRoot, r), frontendRoot)) set.add(f)
  }
  return set
}

export function isProductPath(path, { includeMarketing = false } = {}) {
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

export function isMarketingWrapper(path) {
  return MARKETING_WRAPPER_RE.test(path)
}

export function isPavilionAhead(path, pavilionText, shmsText) {
  if (PAVILION_AHEAD_PATHS.has(path)) return true
  if (!pavilionText) return false
  const p = pavilionText
  const s = shmsText || ''
  return PAVILION_AHEAD_MARKERS.some((m) => p.includes(m) && !s.includes(m))
}

export function readText(abs) {
  if (!existsSync(abs)) return ''
  return readFileSync(abs, 'utf8')
}
