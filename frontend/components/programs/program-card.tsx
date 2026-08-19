'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar, Clock, DollarSign, GraduationCap, MapPin, Users } from 'lucide-react'
import type { Program } from '@/lib/api/programs'
import { formatShortDate, programDateBadge } from '@/lib/programs/schedule'
import {
  FALL_2026_EP_LOCATION,
  matchFall2026EpClass,
} from '@/lib/programs/fall-2026-ep'
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

const SCHEDULE_NOISE =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|library|grades?\s*\d|12 weeks|5:30|7:00|75 min|60 min)\b/i

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

function displayProgramName(name: string) {
  return name.replace(/\s*\((Fall|Spring|Winter|Summer)\s+20\d{2}\)\s*$/i, '').trim()
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

function weekdayLabel(day: string) {
  if (!day) return ''
  if (/s$/i.test(day) || /&|\band\b|,/.test(day)) return day
  return `${day}s`
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
  return {
    lead: lead.join(' '),
    bullets: bullets.filter((item) => !SCHEDULE_NOISE.test(item)),
  }
}

export function ProgramCard({ program }: ProgramCardProps) {
  const colors = getColors(program.category)
  const [registerOpen, setRegisterOpen] = useState(false)
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
  const feeLabel = feeTbd ? 'Tuition TBD' : program.fee === 0 ? 'Free' : program.fee != null ? `$${program.fee}` : null

  const ep = matchFall2026EpClass(program.name)
  const firstNight = ep ? ep.dates[0] : program.startDate
  const lastNight = ep ? ep.dates[ep.dates.length - 1] : program.endDate
  const badge = programDateBadge(firstNight)
  const day = (ep?.dayOfWeek ?? program.dayOfWeek ?? '').trim()
  const time = (ep?.classTime ?? program.classTime ?? '').trim()
  const sessionCount = ep?.dates.length ?? (Number(program.durationWeeks ?? 0) || 0)
  const startLabel = formatShortDate(firstNight)
  const endLabel = formatShortDate(lastNight)
  const location = ep ? FALL_2026_EP_LOCATION : ''
  const skipLine = ep?.skips ? `No class: ${ep.skips}.` : ''
  const sessionNote = ep?.sessionNote ?? ''
  const rangeLines = [
    sessionCount > 0 && startLabel && endLabel
      ? `${sessionCount} sessions, ${startLabel} to ${endLabel}`
      : sessionCount > 0
        ? `${sessionCount} sessions`
        : startLabel && endLabel
          ? `${startLabel} to ${endLabel}`
          : '',
    skipLine,
    sessionNote,
  ]
    .filter(Boolean)
    .join('\n')

  const showCmsDetail =
    !ep &&
    Boolean(String(program.detail ?? '').trim()) &&
    !SCHEDULE_NOISE.test(String(program.detail ?? ''))

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col border border-[var(--border)]">
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-5">
          {badge ? (
            <div
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm shrink-0"
              style={{ backgroundColor: colors.accent }}
              aria-label={`${badge.month} ${badge.day}`}
            >
              <span className="text-white/80 text-xs font-bold uppercase tracking-wider leading-none">
                {badge.month}
              </span>
              <span className="text-white text-2xl font-bold leading-tight">{badge.day}</span>
            </div>
          ) : (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {program.category ?? 'Enrichment'}
            </span>
          )}

          <div className="flex flex-wrap items-start justify-end gap-2">
            {badge && program.category ? (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {program.category}
              </span>
            ) : null}
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
        </div>

        <h3 className="text-lg font-bold text-[#1A1A1A] leading-snug mb-2">
          {displayProgramName(program.name)}
        </h3>

        {lead ? (
          <p className={`text-sm text-[#5A6070] leading-relaxed ${bullets.length ? 'mb-2' : 'mb-5'}`}>
            {lead}
          </p>
        ) : null}
        {bullets.length > 0 ? (
          <ul className="mb-5 space-y-1.5 text-sm text-[#5A6070] leading-snug list-disc pl-4 marker:text-[var(--brand-green)]">
            {bullets.map((item) => (
              <li key={item} className="pl-0.5">
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex-1" />

        <div className="space-y-2 mb-5">
          {day || time ? (
            <div className="flex items-start gap-2 text-sm text-[#5A6070]">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="whitespace-pre-line min-w-0">
                {[day ? weekdayLabel(day) : '', time].filter(Boolean).join('\n')}
              </span>
            </div>
          ) : null}
          {location ? (
            <div className="flex items-center gap-2 text-sm text-[#5A6070]">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{location}</span>
            </div>
          ) : null}
          {rangeLines ? (
            <div className="flex items-start gap-2 text-sm text-[#5A6070]">
              <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="whitespace-pre-line min-w-0">{rangeLines}</span>
            </div>
          ) : null}
          {program.grades ? (
            <div className="flex items-center gap-2 text-sm text-[#5A6070]">
              <GraduationCap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Grades {program.grades}</span>
            </div>
          ) : null}
          {feeLabel ? (
            <div className="flex items-start gap-2 text-sm text-[#5A6070]">
              <DollarSign className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="whitespace-pre-line min-w-0">
                {feeLabel}
                {!feeTbd && program.fee > 0 ? '\nMembers 10 / 15 / 30% off' : ''}
              </span>
            </div>
          ) : null}
          {program.capacity > 0 ? (
            <div className="flex items-center gap-2 text-sm text-[#5A6070]">
              <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{program.capacity} spots</span>
            </div>
          ) : null}
        </div>

        {showCmsDetail ? (
          <p className="text-xs text-[#5A6070] leading-snug mb-4 whitespace-pre-line">
            {String(program.detail).trim()}
          </p>
        ) : null}

        {program.image ? (
          <div className="mb-5 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--brand-warm)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={program.image}
              alt={`${displayProgramName(program.name)} flyer`}
              className="w-full h-auto object-contain"
            />
          </div>
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
