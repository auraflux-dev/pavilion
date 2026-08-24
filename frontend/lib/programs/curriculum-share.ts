import { FALL_2026_EP_CLASSES } from '@/lib/programs/fall-2026-ep'
import { programLandingCopy, type ProgramLandingCopy } from '@/lib/programs/landing-copy'
import { resolveProgramLandingCopy } from '@/lib/programs/resolve-landing-copy'
import { findProgramBySlug } from '@/lib/programs/public-path'
import { getAllPrograms } from '@/lib/api/programs'
import { SPRING_2027_EP_CLASSES } from '@/lib/programs/spring-2027-ep'

export type CurriculumShareSeason = 'fall-2026' | 'spring-2027'

export type CurriculumShareEntry = {
  season: CurriculumShareSeason
  seasonLabel: string
  epId: string
  slug: string
  programName: string
  vendor: string
  dayOfWeek: string
  classTime: string
}

export type CurriculumShareDoc = CurriculumShareEntry & {
  copy: ProgramLandingCopy
}

const SEASON_LABEL: Record<CurriculumShareSeason, string> = {
  'fall-2026': 'Fall 2026',
  'spring-2027': 'Spring 2027',
}

function entryFromFall() {
  return FALL_2026_EP_CLASSES.map((c) => ({
    season: 'fall-2026' as const,
    seasonLabel: SEASON_LABEL['fall-2026'],
    epId: c.id,
    slug: c.publicSlug,
    programName: c.name,
    vendor: c.vendor,
    dayOfWeek: c.dayOfWeek,
    classTime: c.classTime,
  }))
}

function entryFromSpring() {
  return SPRING_2027_EP_CLASSES.map((c) => ({
    season: 'spring-2027' as const,
    seasonLabel: SEASON_LABEL['spring-2027'],
    epId: c.id,
    slug: c.publicSlug,
    programName: c.name,
    vendor: c.vendor,
    dayOfWeek: c.dayOfWeek,
    classTime: c.classTime,
  }))
}

export function curriculumShareEntries(): CurriculumShareEntry[] {
  return [...entryFromFall(), ...entryFromSpring()]
}

export function isCurriculumShareSeason(value: string): value is CurriculumShareSeason {
  return value === 'fall-2026' || value === 'spring-2027'
}

function landingForEntry(
  entry: CurriculumShareEntry,
  programs: Awaited<ReturnType<typeof getAllPrograms>>,
): ProgramLandingCopy | null {
  const program = findProgramBySlug(programs, entry.slug)
  if (program) {
    const fromCms = resolveProgramLandingCopy(program, entry.epId, entry.season)
    if (fromCms?.curriculum.length) return fromCms
  }
  const fallback = programLandingCopy(entry.epId, entry.season)
  return fallback?.curriculum.length ? fallback : null
}

/** CMS program landing curriculum first, then code defaults. */
export async function resolveCurriculumShare(
  season: string,
  slug: string,
): Promise<CurriculumShareDoc | null> {
  if (!isCurriculumShareSeason(season)) return null
  const entry = curriculumShareEntries().find((e) => e.season === season && e.slug === slug)
  if (!entry) return null
  const programs = await getAllPrograms()
  const copy = landingForEntry(entry, programs)
  if (!copy) return null
  return { ...entry, copy }
}

/** Sync fallback for generateStaticParams / build-time metadata when CMS unavailable. */
export function resolveCurriculumShareSync(
  season: string,
  slug: string,
): CurriculumShareDoc | null {
  if (!isCurriculumShareSeason(season)) return null
  const entry = curriculumShareEntries().find((e) => e.season === season && e.slug === slug)
  if (!entry) return null
  const copy = programLandingCopy(entry.epId, season)
  if (!copy?.curriculum.length) return null
  return { ...entry, copy }
}

export function curriculumSharePath(season: CurriculumShareSeason, slug: string): string {
  return `/programs/curriculum/${season}/${slug}`
}
