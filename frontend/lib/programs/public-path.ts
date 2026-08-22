import type { Program } from '@/lib/api/programs'
import { displayProgramName } from '@/lib/programs/display-name'
import { FALL_2026_EP_CLASSES, matchFall2026EpClass } from '@/lib/programs/fall-2026-ep'

export const FALL_2026_PROGRAM_SLUGS = FALL_2026_EP_CLASSES.map((c) => c.publicSlug)

function slugify(name: string) {
  return displayProgramName(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function programPublicSlug(program: Pick<Program, 'name'>): string {
  const ep = matchFall2026EpClass(program.name)
  if (ep) return ep.publicSlug
  return slugify(program.name)
}

export function programPublicPath(program: Pick<Program, 'name' | 'season'>): string {
  if (String(program.season ?? '').trim() === 'spring-2027') {
    return '/programs/spring-2027'
  }
  return `/programs/${programPublicSlug(program)}`
}

export function findProgramBySlug(programs: Program[], slug: string): Program | undefined {
  const want = String(slug ?? '').trim().toLowerCase()
  return programs.find((p) => programPublicSlug(p) === want)
}
