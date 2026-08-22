/**
 * Enrichment catalog seasons.
 *
 * Locked product rules:
 * - Public catalog is Fall / Spring (no Full year tab).
 * - Spring stays hidden on www until SPRING_CATALOG_ENABLED is flipped.
 *   Staging / Preview review hosts can list Spring earlier for dry runs.
 * - Full-year buy stays dark until RFPs clear (FULL_YEAR_CATALOG_ENABLED).
 * - Checkout consents for programs stay enrichment-waiver + medical + photo
 *   (see checkout-consent.ts). requiresWaiver on a CMS row is separate.
 */

export type CatalogSeasonId = 'fall-2026' | 'spring-2027' | 'full-year'

/**
 * Flip when Spring classes should list on www (production).
 * Staging / Preview review hosts can show Spring earlier via `reviewHost`.
 */
export const SPRING_CATALOG_ENABLED = false

export type SeasonCatalogVisibilityOpts = {
  /** True on shmspto.vercel.app and Vercel Preview hosts. */
  reviewHost?: boolean
}

/** Spring tab + Spring CMS rows on the public catalog. */
export function isSpringCatalogListed(opts?: SeasonCatalogVisibilityOpts): boolean {
  return SPRING_CATALOG_ENABLED || Boolean(opts?.reviewHost)
}

/** Flip when full-year SKUs may appear / sell. Stay dark until then. */
export const FULL_YEAR_CATALOG_ENABLED = false

/**
 * Public enrichment unlock (America/New_York).
 * Visitors stay dark until Sunday 2026-08-23 at 4:00 PM Eastern
 * (school newsletter goes out Sunday evening).
 * Staff + preview-secret bypass: see `canViewProgramsCatalogNow`.
 */
export const PROGRAMS_PUBLIC_OPENS_AT_MS = Date.parse('2026-08-23T16:00:00-04:00')

export const PROGRAMS_PREVIEW_COOKIE = 'shms_programs_preview'

/** Calendar / demo gate only. Does not include staff bypass. */
export function isPublicProgramsCatalogOpen(now: Date = new Date()): boolean {
  if (process.env.COMMONS_PLATFORM === 'true') return true
  if (process.env.DEMO_INSTANCE === 'true' || process.env.NEXT_PUBLIC_DEMO_INSTANCE === 'true') return true
  return now.getTime() >= PROGRAMS_PUBLIC_OPENS_AT_MS
}

export type PublicCatalogSeasonId = Exclude<CatalogSeasonId, 'full-year'>

export const CURRENT_FALL_SEASON: PublicCatalogSeasonId = 'fall-2026'
export const CURRENT_SPRING_SEASON: PublicCatalogSeasonId = 'spring-2027'

export const CATALOG_SEASON_LABELS: Record<CatalogSeasonId, string> = {
  'fall-2026': 'Fall 2026',
  'spring-2027': 'Spring 2027',
  'full-year': 'Full year',
}

export type SeasonAwareProgram = {
  season?: string
  tags?: string
  name?: string
  startDate?: string
  endDate?: string
  fallEpClassId?: string
}

function normalizeSeason(raw: string): CatalogSeasonId | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '-')
  if (!s) return null
  if (s === 'fall' || s === 'fall-2026' || s === 'fall2026') return 'fall-2026'
  if (s === 'spring' || s === 'spring-2027' || s === 'spring2027') return 'spring-2027'
  if (s === 'full-year' || s === 'fullyear' || s === 'full') return 'full-year'
  return null
}

function seasonFromTags(tags: string | undefined): CatalogSeasonId | null {
  const parts = String(tags ?? '')
    .split(/[,;\n]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  for (const p of parts) {
    const hit = normalizeSeason(p)
    if (hit) return hit
  }
  if (parts.some((p) => p.includes('spring-2027') || p === 'spring')) return 'spring-2027'
  if (parts.some((p) => p.includes('fall-2026') || p === 'fall')) return 'fall-2026'
  if (parts.some((p) => p.includes('full-year') || p === 'full year')) return 'full-year'
  return null
}

function seasonFromDates(program: SeasonAwareProgram): CatalogSeasonId | null {
  const start = String(program.startDate ?? '').slice(0, 10)
  if (!start) return null
  // Fall enrichment: Aug 2026 through Dec 2026 (Jan spill still Fall packet).
  if (start >= '2026-08-01' && start < '2027-01-15') return 'fall-2026'
  // Spring enrichment: mid-Jan through June 2027.
  if (start >= '2027-01-15' && start < '2027-07-01') return 'spring-2027'
  return null
}

/** Resolve which catalog season a program belongs to. */
export function resolveProgramSeason(program: SeasonAwareProgram): CatalogSeasonId {
  const explicit = normalizeSeason(String(program.season ?? ''))
  if (explicit) return explicit
  const fromTags = seasonFromTags(program.tags)
  if (fromTags) return fromTags
  if (String(program.fallEpClassId ?? '').trim()) return 'fall-2026'
  const fromDates = seasonFromDates(program)
  if (fromDates) return fromDates
  const name = String(program.name ?? '').toLowerCase()
  if (/\bspring\b/.test(name) && !/\bfall\b/.test(name)) return 'spring-2027'
  // Default current catalog season for undated featured/open rows.
  return CURRENT_FALL_SEASON
}

/** Seasons parents can switch between on /programs (no Full year tab). */
export function visibleCatalogSeasonTabs(
  opts?: SeasonCatalogVisibilityOpts,
): PublicCatalogSeasonId[] {
  const tabs: PublicCatalogSeasonId[] = [CURRENT_FALL_SEASON]
  if (isSpringCatalogListed(opts)) tabs.push(CURRENT_SPRING_SEASON)
  return tabs
}

export function isSeasonPubliclyListed(
  season: CatalogSeasonId,
  opts?: SeasonCatalogVisibilityOpts,
): boolean {
  if (season === 'full-year') return FULL_YEAR_CATALOG_ENABLED
  if (season === 'spring-2027') return isSpringCatalogListed(opts)
  return true
}

/** Season gates only (no date gate). Date/staff visibility is page-level. */
export function filterProgramsForPublicCatalog<
  T extends SeasonAwareProgram,
>(programs: T[], opts?: SeasonCatalogVisibilityOpts): T[] {
  return programs.filter((p) => isSeasonPubliclyListed(resolveProgramSeason(p), opts))
}

export function filterProgramsBySeason<T extends SeasonAwareProgram>(
  programs: T[],
  season: CatalogSeasonId,
): T[] {
  return programs.filter((p) => resolveProgramSeason(p) === season)
}

/** Staff season options (includes full-year stub for later). */
export const STAFF_SEASON_OPTIONS: Array<{ value: CatalogSeasonId; label: string; note?: string }> = [
  { value: 'fall-2026', label: 'Fall 2026' },
  {
    value: 'spring-2027',
    label: 'Spring 2027',
    note: SPRING_CATALOG_ENABLED
      ? undefined
      : 'Hidden on www until SPRING_CATALOG_ENABLED. Staging / Preview can preview Spring now.',
  },
  {
    value: 'full-year',
    label: 'Full year',
    note: 'Dark until RFPs clear. Not a catalog tab.',
  },
]
