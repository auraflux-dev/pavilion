import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { VisitorChrome } from '@/components/site/visitor-chrome'
import { ProgramLanding } from '@/components/programs/program-landing'
import { getAllPrograms } from '@/lib/api/programs'
import { displayProgramName } from '@/lib/programs/display-name'
import { FALL_2026_EP_CLASSES } from '@/lib/programs/fall-2026-ep'
import { findProgramBySlug } from '@/lib/programs/public-path'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { getSiteSettings } from '@/lib/api/site-settings'
import { isProgramsReviewHost } from '@/lib/programs/public-access'
import { isProgramsCatalogListed } from '@/lib/programs/public-catalog'
import { fallEpClassById, matchFall2026EpClass } from '@/lib/programs/fall-2026-ep'
import { resolveProgramLandingCopy } from '@/lib/programs/resolve-landing-copy'
import { resolveProgramSeason } from '@/lib/programs/season'

export const revalidate = 300

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return [
    ...FALL_2026_EP_CLASSES.map((c) => ({ slug: c.publicSlug })),
    ...FALL_2026_EP_CLASSES.map((c) => ({ slug: `${c.publicSlug}-spring` })),
    { slug: 'mathcounts' },
    { slug: 'mathcounts-spring' },
  ]
}

const RESERVED_PROGRAM_SLUGS = new Set(['curriculum', 'fall-2026', 'spring-2027'])

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const programs = await getAllPrograms().catch(() => [])
  const program = findProgramBySlug(programs, slug)
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

export default async function ProgramLandingPage({
  params,
  searchParams,
}: Props & { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params
  if (RESERVED_PROGRAM_SLUGS.has(slug)) notFound()
  const sp = searchParams ? await searchParams : {}
  const previewToken = typeof sp.programsPreview === 'string' ? sp.programsPreview : null
  const { canViewProgramsCatalogNow } = await import('@/lib/programs/public-access')
  const access = await canViewProgramsCatalogNow({ previewToken })
  const reviewHost = await isProgramsReviewHost()
  const settings = await getSiteSettings()
  const inSession = settings.getBool('schoolInSession', false)
  if (!isProgramsCatalogListed({ inSession, access, reviewHost })) notFound()

  const programs = await getAllPrograms({ reviewHost }).catch(() => [])
  const program = findProgramBySlug(programs, slug)
  if (!program) notFound()
  const { findSpringCompanion, findFallCompanion } = await import('@/lib/programs/season-companion')
  const companion =
    resolveProgramSeason(program) === 'fall-2026'
      ? findSpringCompanion(program, programs)
      : resolveProgramSeason(program) === 'spring-2027'
        ? findFallCompanion(program, programs)
        : null

  const ep =
    fallEpClassById(String(program.fallEpClassId ?? '').trim()) ||
    matchFall2026EpClass(program.name)
  const landingCopy = resolveProgramLandingCopy(program, ep?.id, resolveProgramSeason(program))

  return (
    <VisitorChrome pageKey={`program-${slug}`} mainStyle={{ backgroundColor: 'var(--brand-warm)' }}>
      <ProgramLanding program={program} companion={companion} landingCopy={landingCopy} />
    </VisitorChrome>
  )
}
