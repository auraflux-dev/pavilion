import { notFound, redirect } from 'next/navigation'
import { getAllPrograms } from '@/lib/api/programs'
import {
  findProgramBySlug,
  parseLegacyProgramSlug,
  programPublicPath,
} from '@/lib/programs/public-path'
import { resolveProgramSeason } from '@/lib/programs/season'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

const RESERVED_PROGRAM_SLUGS = new Set(['curriculum', 'fall-2026', 'spring-2027'])

/** Legacy /programs/{slug} URLs redirect to season-scoped landing pages. */
export default async function LegacyProgramLandingRedirect({ params }: Props) {
  const { slug: rawSlug } = await params
  if (RESERVED_PROGRAM_SLUGS.has(rawSlug)) notFound()

  const parsed = parseLegacyProgramSlug(rawSlug)
  const programs = await getAllPrograms().catch(() => [])
  const program =
    (parsed.season
      ? findProgramBySlug(programs, parsed.slug, parsed.season)
      : findProgramBySlug(programs, parsed.slug)) ?? null
  if (!program) notFound()

  const season = parsed.season ?? resolveProgramSeason(program)
  redirect(programPublicPath({ ...program, season }))
}
