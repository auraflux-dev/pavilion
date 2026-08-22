'use client'

import { useState } from 'react'
import { ProgramCard } from './program-card'
import type { Program } from '@/lib/api/programs'
import {
  CATALOG_SEASON_LABELS,
  filterProgramsBySeason,
  resolveProgramSeason,
  visibleCatalogSeasonTabs,
  type PublicCatalogSeasonId,
} from '@/lib/programs/season'
import { findFallCompanion, findSpringCompanion } from '@/lib/programs/season-companion'

interface ProgramsFilterProps {
  programs: Program[]
  /** Staging / Preview: show Spring tab before www unlock. */
  springCatalogVisible?: boolean
}

export function ProgramsFilter({ programs, springCatalogVisible }: ProgramsFilterProps) {
  const seasonTabs = visibleCatalogSeasonTabs({ reviewHost: springCatalogVisible })
  const [activeSeason, setActiveSeason] = useState<PublicCatalogSeasonId>(
    seasonTabs[0] ?? 'fall-2026',
  )
  const [activeCategory, setActiveCategory] = useState<string>('All')

  const seasonPrograms = filterProgramsBySeason(programs, activeSeason).slice().sort((a, b) => {
    const ao = Number(a.sortOrder ?? 0) || 0
    const bo = Number(b.sortOrder ?? 0) || 0
    if (ao !== bo) return ao - bo
    return String(a.name).localeCompare(String(b.name))
  })

  const categories = [
    'All',
    ...Array.from(
      new Set(seasonPrograms.map((p) => p.category).filter((c): c is string => Boolean(c))),
    ),
  ]

  const filtered =
    activeCategory === 'All'
      ? seasonPrograms
      : seasonPrograms.filter((p) => p.category === activeCategory)

  const open = filtered.filter((p) => p.registrationOpen)
  const closed = filtered.filter((p) => !p.registrationOpen)
  const seasonLabel = CATALOG_SEASON_LABELS[activeSeason]

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Catalog season">
        {seasonTabs.map((season) => (
          <button
            key={season}
            type="button"
            role="tab"
            aria-selected={activeSeason === season}
            onClick={() => {
              setActiveSeason(season)
              setActiveCategory('All')
            }}
            className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
              activeSeason === season
                ? 'text-white border-transparent'
                : 'bg-white text-[#5A6070] border-[var(--border)] hover:border-[var(--brand-green)] hover:text-[var(--brand-green)]'
            }`}
            style={
              activeSeason === season
                ? { backgroundColor: 'var(--brand-green)', borderColor: 'var(--brand-green)' }
                : {}
            }
          >
            {CATALOG_SEASON_LABELS[season]}
          </button>
        ))}
      </div>

      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-10" role="group" aria-label="Filter by category">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
                activeCategory === cat
                  ? 'text-white border-transparent'
                  : 'bg-white text-[#5A6070] border-[var(--border)] hover:border-[var(--brand-green)] hover:text-[var(--brand-green)]'
              }`}
              style={
                activeCategory === cat
                  ? { backgroundColor: 'var(--brand-green)', borderColor: 'var(--brand-green)' }
                  : {}
              }
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {open.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">
            Open for Registration
            <span className="ml-2 text-sm font-normal text-[#5A6070]">({open.length})</span>
          </h3>
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:gap-8 mb-14">
            {open.map((program) => (
              <ProgramCard
                key={program._id}
                program={program}
                companion={
                  resolveProgramSeason(program) === 'fall-2026'
                    ? findSpringCompanion(program, programs)
                    : resolveProgramSeason(program) === 'spring-2027'
                      ? findFallCompanion(program, programs)
                      : null
                }
              />
            ))}
          </div>
        </>
      )}

      {closed.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">
            {open.length > 0 ? 'Coming soon' : `${seasonLabel} lineup`}
            <span className="ml-2 text-sm font-normal text-[#5A6070]">({closed.length})</span>
          </h3>
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:gap-8">
            {closed.map((program) => (
              <ProgramCard
                key={program._id}
                program={program}
                companion={
                  resolveProgramSeason(program) === 'fall-2026'
                    ? findSpringCompanion(program, programs)
                    : resolveProgramSeason(program) === 'spring-2027'
                      ? findFallCompanion(program, programs)
                      : null
                }
              />
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#5A6070] whitespace-pre-line">
            {`No ${seasonLabel} programs listed yet.\nCheck back soon.`}
          </p>
        </div>
      )}
    </>
  )
}
