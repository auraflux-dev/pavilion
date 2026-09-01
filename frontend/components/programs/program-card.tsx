'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar, Clock, DollarSign, GraduationCap, MapPin, Users } from 'lucide-react'
import type { Program } from '@/lib/api/programs'
import { displayProgramName } from '@/lib/programs/display-name'
import { toPublicPlainCopy } from '@/lib/copy/plain-staff-copy'
import { programPublicPath } from '@/lib/programs/public-path'
import { formatShortDate, programDateBadge } from '@/lib/programs/schedule'

import {
  formatMemberPriorityUntil,
  getRegistrationPhase,
} from '@/lib/programs/registration-access-shared'
import { MemberGate } from '@/components/member-gate'
import { ProgramRegisterModal } from '@/components/programs/program-register-modal'
import { SpringCompanionOffer } from '@/components/programs/spring-companion-offer'
import { useProgramUiCopy, ui } from '@/components/programs/program-ui-copy-context'
import { ProgramSpotsLeft } from '@/components/programs/program-spots-left'

interface ProgramCardProps {
  program: Program
  companion?: Program | null
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

function plainText(html: string) {
  return toPublicPlainCopy(html)
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
    lead: lead.join('\n'),
    bullets: bullets.filter((item) => !SCHEDULE_NOISE.test(item)),
  }
}

export function ProgramCard({ program, companion = null }: ProgramCardProps) {
  const uiCopy = useProgramUiCopy()
  const colors = getColors(program.category)
  const [registerOpen, setRegisterOpen] = useState(false)
  const comingSoon = !program.registrationOpen && (program.featured || hasTag(program, 'coming-soon'))
  const feeTbd = hasTag(program, 'fee-tbd')
  const phase = getRegistrationPhase(program)
  const statusLabel =
    phase === 'member_priority'
      ? ui(uiCopy, 'catalog.paidMembersFirst')
      : phase === 'open'
        ? ui(uiCopy, 'catalog.open')
        : comingSoon
          ? ui(uiCopy, 'catalog.comingSoon')
          : ui(uiCopy, 'catalog.closed')
  const priorityUntilLabel =
    phase === 'member_priority' ? formatMemberPriorityUntil(program.memberPriorityUntil) : ''
  const { lead, bullets } = programCopy(program.description || '')
  const feeLabel = feeTbd ? 'Tuition TBD' : program.fee === 0 ? 'Free' : program.fee != null ? `$${program.fee}` : null

  const meetingDates = String(program.meetingDates ?? '')
    .split(/[,\n]+/)
    .map((s) => s.trim().slice(0, 10))
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
  const firstNight = meetingDates[0] || program.startDate
  const lastNight = meetingDates[meetingDates.length - 1] || program.endDate
  const badge = programDateBadge(firstNight)
  const day = String(program.dayOfWeek ?? '').trim()
  const time = String(program.classTime ?? '').trim()
  const sessionCount =
    meetingDates.length || Number(program.durationWeeks ?? 0) || 0
  const startLabel = formatShortDate(firstNight)
  const endLabel = formatShortDate(lastNight)
  const location = String(program.location ?? '').trim()
  const skipRaw = String(program.skipsNote ?? '').trim()
  const skipLine = skipRaw
    ? skipRaw.toLowerCase().startsWith('no class')
      ? skipRaw
      : `No class: ${skipRaw}`
    : ''
  const rangeLines = [
    sessionCount > 0 && startLabel && endLabel
      ? `${sessionCount} sessions, ${startLabel} to ${endLabel}`
      : sessionCount > 0
        ? `${sessionCount} sessions`
        : startLabel && endLabel
          ? `${startLabel} to ${endLabel}`
          : '',
    skipLine,
  ]
    .filter(Boolean)
    .join('\n')

  const showCmsDetail =
    Boolean(String(program.detail ?? '').trim()) &&
    !SCHEDULE_NOISE.test(String(program.detail ?? ''))
  const memberDiscountNote = String(program.memberDiscountNote ?? '').trim()

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
          <Link href={programPublicPath(program)} className="hover:opacity-80 transition-opacity">
            {displayProgramName(program.name)}
          </Link>
        </h3>

        {lead ? (
          <p
            className={`text-sm text-[#5A6070] leading-relaxed whitespace-pre-line ${bullets.length ? 'mb-2' : 'mb-5'}`}
          >
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
                {memberDiscountNote ? `\n${memberDiscountNote}` : ''}
              </span>
            </div>
          ) : null}
          {program.capacity > 0 ? (
            <div className="flex items-center gap-2 text-sm text-[#5A6070]">
              <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <ProgramSpotsLeft
                programId={program._id}
                capacity={program.capacity}
                initialRemaining={
                  program.seatsRemaining != null
                    ? program.seatsRemaining
                    : Math.max(0, program.capacity - (program.seatsTaken ?? 0))
                }
              />
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
            {ui(uiCopy, 'catalog.priorityBanner', { until: priorityUntilLabel })}
          </p>
        ) : null}

        {companion ? <SpringCompanionOffer companion={companion} variant="card" /> : null}

        {program.registrationOpen ? (
          <>
            <MemberGate label="Register for this program">
              <Button
                className="w-full font-semibold text-white group"
                style={{ backgroundColor: colors.accent }}
                onClick={() => setRegisterOpen(true)}
              >
                {ui(uiCopy, 'catalog.registerNow')}
                <ArrowRight
                  className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Button>
            </MemberGate>
            <Button className="w-full font-semibold mt-2" variant="outline" asChild>
              <Link href={programPublicPath(program)}>{ui(uiCopy, 'catalog.learnMore')}</Link>
            </Button>
          </>
        ) : (
          <>
            <Button
              className="w-full font-semibold text-white"
              style={{ backgroundColor: colors.accent }}
              asChild
            >
              <Link href={programPublicPath(program)} className="inline-flex items-center justify-center">
                {ui(uiCopy, 'catalog.learnMore')}
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
            <Button className="w-full font-semibold mt-2" variant="outline" disabled>
              {comingSoon
                ? ui(uiCopy, 'catalog.registrationOpensSoon')
                : ui(uiCopy, 'catalog.registrationClosed')}
            </Button>
          </>
        )}
      </div>

      <ProgramRegisterModal
        program={program}
        companion={companion}
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
      />
    </article>
  )
}
