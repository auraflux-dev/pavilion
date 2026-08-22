/**
 * Pair Fall 2026 ↔ Spring 2027 enrichment by shared fallEpClassId (ye, essay, …).
 */
import type { Program } from '@/lib/api/programs'
import { resolveProgramSeason } from '@/lib/programs/season'

export function programEpClassId(program: Pick<Program, 'fallEpClassId' | 'name'>): string {
  const id = String(program.fallEpClassId ?? '').trim()
  if (id) return id
  const n = String(program.name ?? '').toLowerCase()
  if (n.includes('young entrepreneur')) return 'ye'
  if (n.includes('essay')) return 'essay'
  if (n.includes('math')) return 'mathcounts'
  if (n.includes('robot')) return 'robotics'
  return ''
}

export function findSeasonCompanion(
  program: Program,
  catalog: Program[],
  want: 'fall-2026' | 'spring-2027',
): Program | null {
  const epId = programEpClassId(program)
  if (!epId) return null
  const selfSeason = resolveProgramSeason(program)
  if (selfSeason === want) return null
  return (
    catalog.find((p) => {
      if (resolveProgramSeason(p) !== want) return false
      if (p._id === program._id) return false
      return programEpClassId(p) === epId
    }) ?? null
  )
}

export function findSpringCompanion(program: Program, catalog: Program[]): Program | null {
  return findSeasonCompanion(program, catalog, 'spring-2027')
}

export function findFallCompanion(program: Program, catalog: Program[]): Program | null {
  return findSeasonCompanion(program, catalog, 'fall-2026')
}

/** True when addon is the Spring twin of a Fall primary (or vice versa). */
export function isValidSeasonAddon(primary: Program, addon: Program): boolean {
  const a = resolveProgramSeason(primary)
  const b = resolveProgramSeason(addon)
  if (a === b) return false
  if (!((a === 'fall-2026' && b === 'spring-2027') || (a === 'spring-2027' && b === 'fall-2026'))) {
    return false
  }
  const idA = programEpClassId(primary)
  const idB = programEpClassId(addon)
  return Boolean(idA && idA === idB)
}
