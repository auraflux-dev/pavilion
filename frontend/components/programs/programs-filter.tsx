'use client'

import { useState } from 'react'
import { ProgramCard } from './program-card'
import type { Program } from '@/lib/api/programs'

interface ProgramsFilterProps {
  programs: Program[]
}

export function ProgramsFilter({ programs }: ProgramsFilterProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All')

  // Build unique category list from programs
  const categories = ['All', ...Array.from(new Set(programs.map((p) => p.category).filter((c): c is string => Boolean(c))))]

  const filtered =
    activeCategory === 'All'
      ? programs
      : programs.filter((p) => p.category === activeCategory)

  const open = filtered.filter((p) => p.registrationOpen)
  const closed = filtered.filter((p) => !p.registrationOpen)

  return (
    <>
      {/* Category filter pills */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-10" role="group" aria-label="Filter by category">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
                activeCategory === cat
                  ? 'text-white border-transparent'
                  : 'bg-white text-[#5A6070] border-[#E8E4DC] hover:border-[#085508] hover:text-[#085508]'
              }`}
              style={activeCategory === cat ? { backgroundColor: '#085508', borderColor: '#085508' } : {}}
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Open programs */}
      {open.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">
            Open for Registration
            <span className="ml-2 text-sm font-normal text-[#5A6070]">({open.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-14">
            {open.map((program) => (
              <ProgramCard key={program._id} program={program} />
            ))}
          </div>
        </>
      )}

      {/* Closed programs */}
      {closed.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-[#5A6070] mb-6">
            Coming Soon / Closed
            <span className="ml-2 text-sm font-normal">({closed.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 opacity-70">
            {closed.map((program) => (
              <ProgramCard key={program._id} program={program} />
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#5A6070]">No programs in this category yet.</p>
        </div>
      )}
    </>
  )
}
