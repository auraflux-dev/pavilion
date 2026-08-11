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

function plainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function ProgramCard({ program }: ProgramCardProps) {
  const colors = getColors(program.category)
  const [registerOpen, setRegisterOpen] = useState(false)
  const scheduleLine = formatProgramSchedule(program)
  const comingSoon = !program.registrationOpen && (program.featured || hasTag(program, 'coming-soon'))
  const feeTbd = hasTag(program, 'fee-tbd')
  const statusLabel = program.registrationOpen ? 'Open' : comingSoon ? 'Coming Soon' : 'Closed'
  const summary = plainText(program.description || '')
  const springNote = String(program.detail ?? '').trim()
  const feeLabel = feeTbd ? 'Tuition TBD' : program.fee === 0 ? 'Free' : program.fee != null ? `$${program.fee}` : null

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col border border-[#E8E4DC]">
      {program.image ? (
        <div className="h-40 w-full overflow-hidden bg-[#F5F0E8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={program.image}
            alt={`${program.name} flyer`}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-1.5 w-full" style={{ backgroundColor: colors.accent }} aria-hidden="true" />
      )}

      <div className="p-5 lg:p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {program.category ?? 'Enrichment'}
          </span>

          <span
            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
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

        <h3 className="text-lg font-bold text-[#1A1A1A] leading-snug mb-2">{program.name}</h3>

        {summary ? (
          <p className="text-sm text-[#5A6070] leading-relaxed mb-4 flex-1">{summary}</p>
        ) : (
          <div className="flex-1" />
        )}

        <dl className="space-y-2 mb-4 text-sm border-t border-[#E8E4DC] pt-4">
          {program.grades ? (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-[#8A9099] flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                Grades
              </dt>
              <dd className="font-medium text-[#1A1A1A]">{program.grades}</dd>
            </div>
          ) : null}
          {scheduleLine ? (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-[#8A9099] flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                When
              </dt>
              <dd className="font-medium text-[#1A1A1A]">{scheduleLine}</dd>
            </div>
          ) : null}
          {feeLabel ? (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-[#8A9099] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
                Tuition
              </dt>
              <dd className="font-medium text-[#1A1A1A]">{feeLabel}</dd>
            </div>
          ) : null}
          {program.capacity > 0 ? (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-[#8A9099] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                Spots
              </dt>
              <dd className="font-medium text-[#1A1A1A]">{program.capacity}</dd>
            </div>
          ) : null}
        </dl>

        {springNote ? (
          <p className="text-xs text-[#5A6070] mb-4">{springNote}</p>
        ) : null}

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
          <Button className="w-full font-semibold" variant="outline" disabled>
            {comingSoon ? 'Registration opens soon' : 'Registration closed'}
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
