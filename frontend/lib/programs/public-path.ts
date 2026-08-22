import type { Program } from '@/lib/api/programs'
import { displayProgramName } from '@/lib/programs/display-name'
import {
  FALL_2026_EP_CLASSES,
  fallEpClassById,
  matchFall2026EpClass,
} from '@/lib/programs/fall-2026-ep'
import { resolveProgramSeason } from '@/lib/programs/season'
import { programEpClassId } from '@/lib/programs/season-companion'

export const FALL_2026_PROGRAM_SLUGS = FALL_2026_EP_CLASSES.map((c) => c.publicSlug)
export const SPRING_2027_PROGRAM_SLUGS = FALL_2026_EP_CLASSES.map((c) => `${c.publicSlug}-spring`)

function slugify(name: string) {
  return displayProgramName(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function programPublicSlug(
  program: Pick<Program, 'name' | 'season' | 'fallEpClassId'>,
): string {
  const ep =
    fallEpClassById(programEpClassId(program)) || matchFall2026EpClass(program.name)
  const base = ep?.publicSlug || slugify(program.name)
  if (resolveProgramSeason(program) === 'spring-2027') return `${base}-spring`
  return base
}

export function programPublicPath(
  program: Pick<Program, 'name' | 'season' | 'fallEpClassId'>,
): string {
  return `/programs/${programPublicSlug(program)}`
}

export function findProgramBySlug(programs: Program[], slug: string): Program | undefined {
  const want = String(slug ?? '').trim().toLowerCase()
  return programs.find((p) => programPublicSlug(p) === want)
}
