'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, DollarSign, GraduationCap, CalendarClock } from 'lucide-react'
import type { Program } from '@/lib/api/programs'
import { formatProgramSchedule } from '@/lib/programs/schedule'
import {
  formatMemberPriorityUntil,
  getRegistrationPhase,
} from '@/lib/programs/registration-access'
import { MemberGate } from '@/components/member-gate'
import { ProgramRegisterModal } from '@/components/programs/program-register-modal'

interface ProgramCardProps {
  program: Program
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Competition: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  Strategy: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  'Creative Arts': { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  STEM: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  Music: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  Sports: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  default: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
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
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function programCopy(html: string): { lead: string; bullets: string[] } {
  const lines = plainText(html)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const lead: string[] = []
  const bullets: string[] = []
  for (const line of lines) {
    if (line.startsWith('•') || line.startsWith('- ')) {
      bullets.push(line.replace(/^[•-]\s*/, ''))
    } else if (bullets.length) {
      bullets.push(line)
    } else {
      lead.push(line)
    }
  }
  return { lead: lead.join(' '), bullets }
}

export function ProgramCard({ program }: ProgramCardProps) {
  const colors = getColors(program.category)
  const [registerOpen, setRegisterOpen] = useState(false)
  const scheduleLine = formatProgramSchedule(program)
  const comingSoon = !program.registrationOpen && (program.featured || hasTag(program, 'coming-soon'))
  const feeTbd = hasTag(program, 'fee-tbd')
  const phase = getRegistrationPhase(program)
  const statusLabel =
    phase === 'member_priority'
      ? 'Paid members first'
      : phase === 'open'
        ? 'Open'
        : comingSoon
          ? 'Coming Soon'
          : 'Closed'
  const priorityUntilLabel =
    phase === 'member_priority' ? formatMemberPriorityUntil(program.memberPriorityUntil) : ''
  const { lead, bullets } = programCopy(program.description || '')
  const springNote = String(program.detail ?? '').trim()
  const feeLabel = feeTbd ? 'Tuition TBD' : program.fee === 0 ? 'Free' : program.fee != null ? `$${program.fee}` : null

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col border border-[var(--border)]">
      {program.image ? (
        <div className="h-40 w-full overflow-hidden bg-[var(--brand-warm)]">
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
              phase === 'member_priority'
                ? 'bg-amber-50 text-amber-800'
                : phase === 'open'
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

        {lead ? (
          <p className={`text-sm text-[#5A6070] leading-snug ${bullets.length ? 'mb-2' : 'mb-4'}`}>
            {lead}
          </p>
        ) : null}
        {bullets.length > 0 ? (
          <ul className="mb-4 space-y-1.5 text-sm text-[#5A6070] leading-snug list-disc pl-4 marker:text-[var(--brand-green)]">
            {bullets.map((item) => (
              <li key={item} className="pl-0.5">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex-1" />

        <dl className="space-y-2 mb-3 text-sm border-t border-[var(--border)] pt-4">
          {program.grades ? (
            <div className="flex items-start gap-2">
              <dt className="w-20 shrink-0 text-[#8A9099] flex items-center gap-1.5 pt-0.5">
                <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                Grades
              </dt>
              <dd className="font-medium text-[#1A1A1A] min-w-0">{program.grades}</dd>
            </div>
          ) : null}
          {scheduleLine ? (
            <div className="flex items-start gap-2">
              <dt className="w-20 shrink-0 text-[#8A9099] flex items-center gap-1.5 pt-0.5">
                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                When
              </dt>
              <dd className="font-medium text-[#1A1A1A] min-w-0">{scheduleLine}</dd>
            </div>
          ) : null}
          {feeLabel ? (
            <div className="flex items-start gap-2">
              <dt className="w-20 shrink-0 text-[#8A9099] flex items-center gap-1.5 pt-0.5">
                <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
                Tuition
              </dt>
              <dd className="font-medium text-[#1A1A1A] min-w-0">
                {feeLabel}
                {!feeTbd && program.fee > 0 ? (
                  <span className="block text-xs font-normal text-[#5A6070] mt-0.5">
                    Members 10 / 15 / 30% off
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
          {program.capacity > 0 ? (
            <div className="flex items-start gap-2">
              <dt className="w-20 shrink-0 text-[#8A9099] flex items-center gap-1.5 pt-0.5">
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                Spots
              </dt>
              <dd className="font-medium text-[#1A1A1A] min-w-0">{program.capacity}</dd>
            </div>
          ) : null}
        </dl>

        {springNote ? (
          <p className="text-xs text-[#5A6070] leading-snug mb-3 line-clamp-2">{springNote}</p>
        ) : null}

        {priorityUntilLabel ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
            Open to paid PTO members only until {priorityUntilLabel}. Then registration opens to all
            signed-in parents.
          </p>
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
