'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, DollarSign, GraduationCap } from 'lucide-react'
import type { Program } from '@/lib/api/programs'
import { MemberGate } from '@/components/member-gate'
import { ProgramRegisterModal } from '@/components/programs/program-register-modal'

interface ProgramCardProps {
  program: Program
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Competition:   { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Strategy:      { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  'Creative Arts': { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  STEM:          { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Music:         { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Sports:        { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  default:       { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
}

function getColors(category?: string) {
  if (!category) return CATEGORY_COLORS.default
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default
}

export function ProgramCard({ program }: ProgramCardProps) {
  const colors = getColors(program.category)
  const [registerOpen, setRegisterOpen] = useState(false)

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
      {program.image ? (
        <div className="h-48 w-full overflow-hidden">
          <img
            src={program.image}
            alt={program.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: colors.accent }}
          aria-hidden="true"
        />
      )}

      <div className="p-6 lg:p-7 flex flex-col flex-1">
        {/* Category tag */}
        <div className="flex items-start justify-between mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {program.category ?? 'Enrichment'}
          </span>

          {/* Open/Closed badge */}
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              program.registrationOpen
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {program.registrationOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{program.name}</h3>

        {/* Description — strip HTML from rich text */}
        {program.description && (
          <p
            className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1"
            dangerouslySetInnerHTML={{
              __html: program.description,
            }}
          />
        )}

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {program.grades && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#EEF6EE] text-[#5A6070]">
              <GraduationCap className="w-3 h-3" aria-hidden="true" />
              Grades {program.grades}
            </span>
          )}
          {program.fee != null && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#EEF6EE] text-[#5A6070]">
              <DollarSign className="w-3 h-3" aria-hidden="true" />
              {program.fee === 0 ? 'Free' : `$${program.fee}`}
            </span>
          )}
          {program.capacity != null && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#EEF6EE] text-[#5A6070]">
              <Users className="w-3 h-3" aria-hidden="true" />
              {program.capacity} spots
            </span>
          )}
        </div>

        {/* CTA button — in-app registration (same checkout pattern as membership) */}
        {program.registrationOpen ? (
          <MemberGate label="Log in or create a free account to register">
            <Button
              className="w-full font-semibold text-white group"
              style={{ backgroundColor: colors.accent }}
              onClick={() => setRegisterOpen(true)}
            >
              Register Now
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Button>
          </MemberGate>
        ) : (
          <Button className="w-full font-semibold group" variant="outline" disabled>
            Registration Closed
          </Button>
        )}
      </div>

      <ProgramRegisterModal
        program={program}
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
      />
    </article>
  )
}
