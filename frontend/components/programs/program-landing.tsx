'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Link2, MapPin, Play, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgramLandingCheckout } from '@/components/programs/program-register-form'
import type { Program } from '@/lib/api/programs'
import { displayProgramName } from '@/lib/programs/display-name'
import { formatShortDate, programDateBadge } from '@/lib/programs/schedule'
import {
  formatMemberPriorityUntil,
  getRegistrationPhase,
} from '@/lib/programs/registration-access'
import { fallEpClassById, matchFall2026EpClass } from '@/lib/programs/fall-2026-ep'
import { resolveProgramLandingCopy } from '@/lib/programs/resolve-landing-copy'
import type { ProgramLandingCopy } from '@/lib/programs/landing-copy'
import { SpringCompanionOffer } from '@/components/programs/spring-companion-offer'
import {
  CATALOG_SEASON_LABELS,
  resolveProgramSeason,
  type CatalogSeasonId,
} from '@/lib/programs/season'
function hasTag(program: Program, tag: string) {
  return String(program.tags ?? '')
    .toLowerCase()
    .split(/[,|;]/)
    .map((t) => t.trim())
    .includes(tag.toLowerCase())
}

function youtubeEmbedSrc(url: string): string | null {
  const raw = String(url ?? '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
      const parts = u.pathname.split('/').filter(Boolean)
      const emb = parts[0] === 'embed' ? parts[1] : parts[0] === 'shorts' ? parts[1] : null
      return emb ? `https://www.youtube.com/embed/${emb}` : null
    }
  } catch {
    return null
  }
  return null
}

export function ProgramLanding({
  program,
  companion = null,
  landingCopy: landingCopyProp = null,
}: {
  program: Program
  companion?: Program | null
  /** Server-resolved CMS + fallback copy */
  landingCopy?: ProgramLandingCopy | null
}) {
  const [copied, setCopied] = useState(false)
  const [curriculumOpen, setCurriculumOpen] = useState(false)
  const title = displayProgramName(program.name)
  const ep =
    fallEpClassById(String(program.fallEpClassId ?? '').trim()) ||
    matchFall2026EpClass(program.name)
  const season = resolveProgramSeason(program)
  const copy =
    landingCopyProp ??
    resolveProgramLandingCopy(program, ep?.id, season)
  const seasonLabel =
    CATALOG_SEASON_LABELS[season as CatalogSeasonId] ||
    (season === 'spring-2027' ? 'Spring 2027' : 'Fall 2026')
  const scheduleHref =
    season === 'spring-2027' ? '/programs/spring-2027' : '/programs/fall-2026'
  const feeTbd = hasTag(program, 'fee-tbd')
  const phase = getRegistrationPhase(program)
  const priorityUntilLabel =
    phase === 'member_priority' ? formatMemberPriorityUntil(program.memberPriorityUntil) : ''
  const meetingDates = String(program.meetingDates ?? '')
    .split(/[,\n]+/)
    .map((s) => s.trim().slice(0, 10))
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
  const firstNight = meetingDates[0] || program.startDate
  const lastNight = meetingDates[meetingDates.length - 1] || program.endDate
  const badge = programDateBadge(firstNight)
  const feeLabel = feeTbd
    ? 'Tuition TBD'
    : program.fee === 0
      ? 'Free'
      : program.fee != null
        ? `$${program.fee}`
        : null
  const day = String(program.dayOfWeek ?? '').trim()
  const time = String(program.classTime ?? '').trim()
  const location = String(program.location ?? '').trim()
  const skips = String(program.skipsNote ?? '').trim()
  const instructor = String(program.instructorName ?? '').trim()
  const sessionCount = meetingDates.length || Number(program.durationWeeks ?? 0) || 0
  const memberDiscountNote = String(program.memberDiscountNote ?? '').trim()
  const flyer = program.image || ''
  const videoEmbed = youtubeEmbedSrc(copy?.videoUrl ?? '')
  const pitch = copy?.pitch ?? ''
  const highlights = copy?.highlights ?? []
  const curriculum = copy?.curriculum ?? []

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
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green)] hover:opacity-80"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            All programs
          </Link>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-5 space-y-5">
              <header className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-green)]">
                  {copy?.eyebrow ||
                    `${seasonLabel}${program.category ? ` · ${program.category}` : ''}`}
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] tracking-tight text-balance leading-[1.15]">
                  {title}
                </h1>
                {pitch ? (
                  <p className="text-base text-[#3D4450] leading-relaxed whitespace-pre-line">
                    {pitch}
                  </p>
                ) : null}
              </header>

              <aside
                className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5 space-y-3 shadow-sm"
                aria-label="Class summary"
              >
                <div className="flex items-start gap-3">
                  {badge ? (
                    <div
                      className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--brand-green)' }}
                      aria-label={`${badge.month} ${badge.day}`}
                    >
                      <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider leading-none">
                        {badge.month}
                      </span>
                      <span className="text-white text-xl font-bold leading-tight">{badge.day}</span>
                    </div>
                  ) : null}
                  <div className="min-w-0 space-y-1.5 text-sm text-[#5A6070]">
                    {day || time ? (
                      <p className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="whitespace-pre-line">
                          {[day, time].filter(Boolean).join('\n')}
                        </span>
                      </p>
                    ) : null}
                    {location ? (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {location}
                      </p>
                    ) : null}
                    {sessionCount > 0 && firstNight && lastNight ? (
                      <p className="flex items-start gap-2">
                        <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="whitespace-pre-line">
                          {`${sessionCount} sessions, ${formatShortDate(firstNight)} to ${formatShortDate(lastNight)}`}
                          {skips
                            ? `\n${skips.toLowerCase().startsWith('no class') ? skips : `No class: ${skips}`}`
                            : ''}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm border-t border-[var(--border)] pt-3">
                  {instructor ? (
                    <>
                      <dt className="text-[#5A6070]">Instructor</dt>
                      <dd className="font-semibold text-[#1A1A1A] text-right">{instructor}</dd>
                    </>
                  ) : null}
                  {program.grades ? (
                    <>
                      <dt className="text-[#5A6070]">Grades</dt>
                      <dd className="font-semibold text-[#1A1A1A] text-right">{program.grades}</dd>
                    </>
                  ) : null}
                  {feeLabel ? (
                    <>
                      <dt className="text-[#5A6070]">Tuition</dt>
                      <dd className="font-semibold text-[#1A1A1A] text-right whitespace-pre-line">
                        {feeLabel}
                        {memberDiscountNote ? `\n${memberDiscountNote}` : ''}
                      </dd>
                    </>
                  ) : null}
                  {program.capacity > 0 ? (
                    <>
                      <dt className="text-[#5A6070] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        Spots
                      </dt>
                      <dd className="font-semibold text-[#1A1A1A] text-right">{program.capacity}</dd>
                    </>
                  ) : null}
                </dl>

                {highlights.length > 0 ? (
                  <ul className="space-y-1.5 text-sm text-[#5A6070] list-disc pl-5 marker:text-[var(--brand-green)] border-t border-[var(--border)] pt-3">
                    {highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </aside>

              {priorityUntilLabel ? (
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Open to paid PTO members only until {priorityUntilLabel}. Then registration opens
                  to all signed-in parents.
                </p>
              ) : null}

              <div className="space-y-2">
                <Button
                  className="w-full font-semibold text-white"
                  style={{ backgroundColor: 'var(--brand-green)' }}
                  asChild
                >
                  <a href="#register">
                    {program.registrationOpen ? 'Register now' : 'Registration opens soon'}
                  </a>
                </Button>
                {curriculum.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full font-semibold"
                    onClick={() => setCurriculumOpen((v) => !v)}
                    aria-expanded={curriculumOpen}
                  >
                    {curriculumOpen ? 'Hide curriculum' : 'View curriculum'}
                  </Button>
                ) : null}
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
                    href={scheduleHref}
                    className="text-sm font-semibold text-[var(--brand-green)] hover:underline underline-offset-2"
                  >
                    {season === 'spring-2027' ? 'Spring 2027 schedule' : 'Fall 2026 schedule'}
                  </Link>
                </p>
              </div>

              {curriculumOpen && curriculum.length > 0 ? (
                <div
                  id="curriculum"
                  className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5"
                >
                  <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">
                    {copy?.curriculumTitle || 'Curriculum'}
                  </h2>
                  <ol className="space-y-2 text-sm text-[#5A6070]">
                    {curriculum.map((row) => (
                      <li key={row.week} className="flex gap-3">
                        <span
                          className="shrink-0 w-7 h-7 rounded-full text-xs font-bold text-white flex items-center justify-center"
                          style={{ backgroundColor: 'var(--brand-green)' }}
                        >
                          {row.week}
                        </span>
                        <span className="pt-1 whitespace-pre-line">
                          <span className="font-semibold text-[#1A1A1A]">{row.title}</span>
                          {row.focus ? `\n${row.focus}` : ''}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-7 space-y-5">
              <div className="overflow-hidden rounded-2xl shadow-[0_24px_48px_-28px_rgba(11,61,11,0.45)] ring-1 ring-[var(--border)] bg-white">
                {videoEmbed ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      title={`${title} video`}
                      src={videoEmbed}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-video flex flex-col items-center justify-center gap-3 px-6 text-center"
                    style={{ backgroundColor: 'var(--brand-soft)' }}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: 'var(--brand-green)' }}
                      aria-hidden="true"
                    >
                      <Play className="w-6 h-6 ml-0.5" />
                    </div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">Class video coming soon</p>
                    <p className="text-xs text-[#5A6070] max-w-sm whitespace-pre-line">
                      {`A short intro from the instructor will land here.
Until then, use the summary and curriculum on the left.`}
                    </p>
                  </div>
                )}
                {flyer ? (
                  <div className="border-t border-[var(--border)] bg-[var(--brand-warm)] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={flyer}
                      alt={`${title} flyer`}
                      className="w-full h-auto object-contain rounded-lg"
                    />
                  </div>
                ) : null}
              </div>
              {companion ? (
                <SpringCompanionOffer companion={companion} variant="landing" />
              ) : null}
              <ProgramLandingCheckout program={program} companion={companion} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
