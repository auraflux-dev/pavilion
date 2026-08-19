'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Link2, MapPin, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgramLandingCheckout } from '@/components/programs/program-register-form'
import type { Program } from '@/lib/api/programs'
import { displayProgramName } from '@/lib/programs/display-name'
import {
  FALL_2026_EP_LOCATION,
  formatFall2026EpDate,
  matchFall2026EpClass,
} from '@/lib/programs/fall-2026-ep'
import { programLandingCopy } from '@/lib/programs/landing-copy'
import { programDateBadge, formatShortDate } from '@/lib/programs/schedule'
import {
  formatMemberPriorityUntil,
  getRegistrationPhase,
} from '@/lib/programs/registration-access'

function hasTag(program: Program, tag: string) {
  return String(program.tags ?? '')
    .toLowerCase()
    .split(/[,|;]/)
    .map((t) => t.trim())
    .includes(tag.toLowerCase())
}

export function ProgramLanding({ program }: { program: Program }) {
  const [copied, setCopied] = useState(false)
  const ep = matchFall2026EpClass(program.name)
  const copy = programLandingCopy(ep?.id)
  const title = displayProgramName(program.name)
  const feeTbd = hasTag(program, 'fee-tbd')
  const phase = getRegistrationPhase(program)
  const priorityUntilLabel =
    phase === 'member_priority' ? formatMemberPriorityUntil(program.memberPriorityUntil) : ''
  const firstNight = ep ? ep.dates[0] : program.startDate
  const lastNight = ep ? ep.dates[ep.dates.length - 1] : program.endDate
  const badge = programDateBadge(firstNight)
  const feeLabel = feeTbd
    ? 'Tuition TBD'
    : program.fee === 0
      ? 'Free'
      : program.fee != null
        ? `$${program.fee}`
        : null
  const photo = program.image || copy?.photo || '/home/hero-a.jpg'
  const isFlyer = Boolean(program.image)
  const why = copy?.why?.length ? copy.why : []

  async function copyShareLink() {
    if (typeof window === 'undefined') return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden border-b border-[#D9D2C5]"
        style={{
          background:
            'linear-gradient(165deg, var(--brand-warm) 0%, #E8F0E4 45%, var(--brand-warm) 100%)',
        }}
      >
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green)] hover:opacity-80"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            All programs
          </Link>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <header className="lg:col-span-5 space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-green)]">
                {copy?.eyebrow ?? program.category ?? 'Enrichment'}
              </p>

              {badge ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--brand-green)' }}
                    aria-label={`${badge.month} ${badge.day}`}
                  >
                    <span className="text-white/80 text-xs font-bold uppercase tracking-wider leading-none">
                      {badge.month}
                    </span>
                    <span className="text-white text-2xl font-bold leading-tight">{badge.day}</span>
                  </div>
                  <div className="text-sm text-[#5A6070] whitespace-pre-line">
                    {ep
                      ? `${ep.dayOfWeek}s\n${ep.classTime}`
                      : [program.dayOfWeek, program.classTime].filter(Boolean).join('\n')}
                  </div>
                </div>
              ) : null}

              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#1A1A1A] tracking-tight text-balance leading-[1.15]">
                {title}
              </h1>

              {copy?.pitch ? (
                <p className="text-base sm:text-lg text-[#3D4450] leading-relaxed whitespace-pre-line">
                  {copy.pitch}
                </p>
              ) : null}

              {why.length > 0 ? (
                <ul className="space-y-1.5 text-sm sm:text-base text-[#5A6070] list-disc pl-5 marker:text-[var(--brand-green)]">
                  {why.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}

              <div className="space-y-2 text-sm text-[#5A6070]">
                {copy?.night ? (
                  <p className="flex items-start gap-2 whitespace-pre-line">
                    <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{copy.night}</span>
                  </p>
                ) : null}
                {ep ? (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{FALL_2026_EP_LOCATION}</span>
                  </p>
                ) : null}
                {ep ? (
                  <p className="flex items-start gap-2 whitespace-pre-line">
                    <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {`${ep.dates.length} sessions, ${formatFall2026EpDate(ep.dates[0])} to ${formatFall2026EpDate(ep.dates[ep.dates.length - 1])}\nNo class: ${ep.skips}.`}
                      {ep.sessionNote ? `\n${ep.sessionNote}` : ''}
                    </span>
                  </p>
                ) : firstNight && lastNight ? (
                  <p className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {formatShortDate(firstNight)} to {formatShortDate(lastNight)}
                    </span>
                  </p>
                ) : null}
                {program.grades ? <p>Grades {program.grades}</p> : null}
                {ep?.vendor ? <p>Instructor: {ep.vendor}</p> : null}
                {feeLabel ? (
                  <p className="whitespace-pre-line">
                    {feeLabel}
                    {!feeTbd && program.fee > 0 ? '\nMembers 10 / 15 / 30% off' : ''}
                  </p>
                ) : null}
                {program.capacity > 0 ? (
                  <p className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {program.capacity} spots
                  </p>
                ) : null}
              </div>

              {priorityUntilLabel ? (
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Open to paid PTO members only until {priorityUntilLabel}. Then registration opens
                  to all signed-in parents.
                </p>
              ) : null}

              <div className="space-y-2 pt-2">
                <Button className="w-full font-semibold text-white" style={{ backgroundColor: 'var(--brand-green)' }} asChild>
                  <a href="#register">
                    {program.registrationOpen ? 'Checkout on this page' : 'See checkout dates'}
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full font-semibold"
                  onClick={copyShareLink}
                >
                  <Link2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  {copied ? 'Link copied' : 'Copy class link'}
                </Button>
                <p className="text-center">
                  <Link
                    href="/programs/fall-2026"
                    className="text-sm font-semibold text-[var(--brand-green)] hover:underline underline-offset-2"
                  >
                    Fall 2026 schedule
                  </Link>
                </p>
              </div>
            </header>

            <div className="lg:col-span-7 space-y-5">
              <div className="overflow-hidden rounded-2xl shadow-[0_24px_48px_-28px_rgba(11,61,11,0.45)] ring-1 ring-[var(--border)] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={isFlyer ? `${title} flyer` : 'Stone Hill campus'}
                  className={`w-full ${isFlyer ? 'h-auto object-contain' : 'aspect-[16/10] object-cover'}`}
                />
                {!isFlyer ? (
                  <p className="px-4 py-3 text-xs text-[#5A6070] bg-[var(--brand-warm)]">
                    Share this page. A class flyer can go here when we have one.
                  </p>
                ) : (
                  <p className="px-4 py-3 text-center text-sm font-semibold text-white" style={{ backgroundColor: 'var(--brand-green)' }}>
                    Class flyer
                  </p>
                )}
              </div>
              <ProgramLandingCheckout program={program} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
