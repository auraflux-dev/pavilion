import type { Program } from '@/lib/api/programs'
import { displayProgramName } from '@/lib/programs/display-name'
import { FALL_2026_EP_CLASSES, matchFall2026EpClass } from '@/lib/programs/fall-2026-ep'
import { matchSpring2027EpClass } from '@/lib/programs/spring-2027-ep'
import {
  CURRENT_FALL_SEASON,
  CURRENT_SPRING_SEASON,
  resolveProgramSeason,
  type CatalogSeasonId,
  type PublicCatalogSeasonId,
} from '@/lib/programs/season'

export const FALL_2026_PROGRAM_SLUGS = FALL_2026_EP_CLASSES.map((c) => c.publicSlug)

function slugify(name: string) {
  return displayProgramName(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function programPublicSlug(program: Pick<Program, 'name' | 'fallEpClassId'>): string {
  const ep =
    matchFall2026EpClass(program.name) ??
    matchSpring2027EpClass(program.name)
  if (ep) return ep.publicSlug
  return slugify(program.name)
}

/** Canonical season-scoped landing URL. Fall and Spring are separate products. */
export function programPublicPath(
  program: Pick<Program, 'name' | 'fallEpClassId' | 'season' | 'tags' | 'startDate' | 'endDate'>,
): string {
  const season = resolveProgramSeason(program)
  const slug = programPublicSlug(program)
  if (season === CURRENT_SPRING_SEASON) return `/programs/spring-2027/${slug}`
  if (season === CURRENT_FALL_SEASON) return `/programs/fall-2026/${slug}`
  return `/programs/fall-2026/${slug}`
}

export function programPublicPathForSeason(
  program: Pick<Program, 'name' | 'fallEpClassId'>,
  season: PublicCatalogSeasonId,
): string {
  const slug = programPublicSlug(program)
  return season === 'spring-2027' ? `/programs/spring-2027/${slug}` : `/programs/fall-2026/${slug}`
}

export function findProgramBySlug(
  programs: Program[],
  slug: string,
  season?: CatalogSeasonId,
): Program | undefined {
  const want = String(slug ?? '').trim().toLowerCase()
  const matches = programs.filter((p) => programPublicSlug(p) === want)
  if (!matches.length) return undefined
  if (season) {
    return matches.find((p) => resolveProgramSeason(p) === season)
  }
  return (
    matches.find((p) => resolveProgramSeason(p) === CURRENT_FALL_SEASON) ??
    matches.find((p) => resolveProgramSeason(p) === CURRENT_SPRING_SEASON) ??
    matches[0]
  )
}

/** Legacy /programs/robotics-spring → season + slug. */
export function parseLegacyProgramSlug(raw: string): {
  slug: string
  season?: PublicCatalogSeasonId
} {
  const slug = String(raw ?? '').trim().toLowerCase()
  if (slug.endsWith('-spring')) {
    return { slug: slug.slice(0, -'-spring'.length), season: 'spring-2027' }
  }
  return { slug }
}
