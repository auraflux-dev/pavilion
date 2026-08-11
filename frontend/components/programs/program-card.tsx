'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, DollarSign, GraduationCap, CalendarClock } from 'lucide-react'
import type { Program } from '@/lib/api/programs'
import { formatProgramSchedule } from '@/lib/programs/schedule'
import { MemberGate } from '@/components/member-gate'
import { ProgramRegisterModal } from '@/components/programs/program-register-modal'

interface ProgramCardProps {
  program: Program
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Competition: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Strategy: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  'Creative Arts': { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  STEM: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Music: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Sports: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  default: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
}

function getColors(category?: string) {
  if (!category) return CATEGORY_COLORS.default
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default
}

function hasTag(program: Program, tag: string) {
  return String(program.tags ?? '')
    .toLowerCase()
    .split(/[,|;]/)
    .map((t) => t.trim())
    .includes(tag.toLowerCase())
}

export function ProgramCard({ program }: ProgramCardProps) {
  const colors = getColors(program.category)
  const [registerOpen, setRegisterOpen] = useState(false)
  const scheduleLine = formatProgramSchedule(program)
  const comingSoon = !program.registrationOpen && (program.featured || hasTag(program, 'coming-soon'))
  const feeTbd = hasTag(program, 'fee-tbd')
  const statusLabel = program.registrationOpen ? 'Open' : comingSoon ? 'Coming Soon' : 'Closed'

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
      {program.image ? (
        <div className="h-48 w-full overflow-hidden bg-[#F5F0E8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={program.image}
            alt={`${program.name} flyer`}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="h-28 w-full flex items-center justify-center"
          style={{ backgroundColor: colors.bg }}
          aria-hidden="true"
        >
          <span className="text-xs font-semibold" style={{ color: colors.text }}>
            Flyer coming soon
          </span>
        </div>
      )}

      <div className="p-6 lg:p-7 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {program.category ?? 'Enrichment'}
          </span>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              program.registrationOpen
                ? 'bg-green-50 text-green-700'
                : comingSoon
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{program.name}</h3>

        {program.description && (
          <p
            className="text-sm text-[#5A6070] leading-relaxed mb-4 flex-1"
            dangerouslySetInnerHTML={{
              __html: program.description,
            }}
          />
        )}

        {scheduleLine ? (
          <p className="inline-flex items-start gap-2 text-sm font-semibold text-[#1A1A1A] mb-4">
            <CalendarClock
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: colors.accent }}
              aria-hidden="true"
            />
            <span>{scheduleLine}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 mb-6">
          {program.grades && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#EEF6EE] text-[#5A6070]">
              <GraduationCap className="w-3 h-3" aria-hidden="true" />
              Grades {program.grades}
            </span>
          )}
          {(feeTbd || program.fee != null) && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#EEF6EE] text-[#5A6070]">
              <DollarSign className="w-3 h-3" aria-hidden="true" />
              {feeTbd ? 'Tuition TBD' : program.fee === 0 ? 'Free' : `$${program.fee}`}
            </span>
          )}
          {program.capacity > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#EEF6EE] text-[#5A6070]">
              <Users className="w-3 h-3" aria-hidden="true" />
              {program.capacity} spots
            </span>
          )}
        </div>

        {program.registrationOpen ? (
          <MemberGate label="Register for this program">
            <Button
              className="w-full font-semibold text-white group"
              style={{ backgroundColor: colors.accent }}
              onClick={() => setRegisterOpen(true)}
            >
              Register Now
              <ArrowRight
                className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
          </MemberGate>
        ) : (
          <Button className="w-full font-semibold group" variant="outline" disabled>
            {comingSoon ? 'Details confirming this week' : 'Registration Closed'}
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
