import type { Metadata } from 'next'
import type { Program } from '@/lib/api/programs'
import { getAllPrograms } from '@/lib/api/programs'
import { displayProgramName } from '@/lib/programs/display-name'
import { FALL_2026_EP_CLASSES, fallEpClassById, matchFall2026EpClass } from '@/lib/programs/fall-2026-ep'
import {
  matchSpring2027EpClass,
  SPRING_2027_EP_CLASSES,
} from '@/lib/programs/spring-2027-ep'
import { isProgramsCatalogListed } from '@/lib/programs/public-catalog'
import { isProgramsReviewHost } from '@/lib/programs/public-access'
import { resolveProgramLandingCopy } from '@/lib/programs/resolve-landing-copy'
import {
  findProgramBySlug,
  programPublicPath,
} from '@/lib/programs/public-path'
import { resolveProgramSeason, type PublicCatalogSeasonId } from '@/lib/programs/season'
import { getSiteSettings } from '@/lib/api/site-settings'
import { vanillaizeIfDemo } from '@/lib/demo/brand'


export const PROGRAM_LANDING_SEASONS = ['fall-2026', 'spring-2027'] as const

export function isProgramLandingSeason(raw: string): raw is PublicCatalogSeasonId {
  return raw === 'fall-2026' || raw === 'spring-2027'
}

export async function loadProgramLandingContext(opts: {
  slug: string
  season: PublicCatalogSeasonId
  previewToken?: string | null
}) {
  const { canViewProgramsCatalogNow } = await import('@/lib/programs/public-access')
  const access = await canViewProgramsCatalogNow({ previewToken: opts.previewToken ?? null })
  const reviewHost = await isProgramsReviewHost()
  const settings = await getSiteSettings()
  const inSession = settings.getBool('schoolInSession', false)
  if (!isProgramsCatalogListed({ inSession, access, reviewHost })) return null

  const programs = await getAllPrograms({ reviewHost }).catch(() => [])
  const program = findProgramBySlug(programs, opts.slug, opts.season)
  if (!program) return null
  if (resolveProgramSeason(program) !== opts.season) return null

  const { findSpringCompanion, findFallCompanion } = await import('@/lib/programs/season-companion')
  const companion =
    opts.season === 'fall-2026'
      ? findSpringCompanion(program, programs)
      : findFallCompanion(program, programs)

  const ep =
    fallEpClassById(String(program.fallEpClassId ?? '').trim()) ||
    matchFall2026EpClass(program.name) ||
    matchSpring2027EpClass(program.name)
  const landingCopy = resolveProgramLandingCopy(program, ep?.id, opts.season)

  return { program, companion, landingCopy, pageKey: `program-${opts.season}-${opts.slug}` }
}

export async function programLandingMetadata(
  slug: string,
  season: PublicCatalogSeasonId,
): Promise<Metadata> {
  const programs = await getAllPrograms().catch(() => [])
  const program = findProgramBySlug(programs, slug, season)
  if (!program) return { title: 'Program' }
  const title = displayProgramName(program.name)
  const fromCms = String(program.description ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const description =
    fromCms ||
    vanillaizeIfDemo('SHMS PTO enrichment at Stone Hill Middle School')
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(program.image ? { images: [{ url: program.image }] } : {}),
    },
  }
}

export function programLandingStaticParams(season: PublicCatalogSeasonId) {
  const classes = season === 'spring-2027' ? SPRING_2027_EP_CLASSES : FALL_2026_EP_CLASSES
  const slugs = classes.map((c) => c.publicSlug)
  if (season === 'fall-2026' && !slugs.includes('mathcounts')) slugs.push('mathcounts')
  return slugs.map((slug) => ({ slug }))
}

export function canonicalProgramPath(program: Program): string {
  return programPublicPath(program)
}
