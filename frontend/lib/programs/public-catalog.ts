/**
 * Public catalog shaping: packet overlay (schedule/vendor copy) and tuition TBD.
 */
import type { Program } from '@/lib/api/programs'
import { fallCatalogDescription } from '@/lib/programs/landing-copy'
import {
  FALL_2026_EP_CLASSES,
  FALL_2026_EP_LOCATION,
  fallEpClassById,
  matchFall2026EpClass,
  serializeMeetingDates,
} from '@/lib/programs/fall-2026-ep'
import { formatProgramSchedule } from '@/lib/programs/schedule'
import { resolveProgramSeason, isPublicProgramsCatalogOpen } from '@/lib/programs/season'
import type { ProgramsCatalogAccess } from '@/lib/programs/public-access'

/** List /programs when the public unlock passed, school is in session, or on staging. */
export function isProgramsCatalogListed(opts: {
  inSession: boolean
  access: ProgramsCatalogAccess
  reviewHost?: boolean
}): boolean {
  if (!opts.access.allowed) return false
  if (opts.reviewHost) return true
  if (isPublicProgramsCatalogOpen()) return true
  return opts.inSession
}

function tagSet(tags: string | undefined): Set<string> {
  return new Set(
    String(tags ?? '')
      .split(/[,;\n]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  )
}

function joinTags(tags: Set<string>): string {
  return [...tags].join(',')
}

/** Fall 2026 packet wins over stale CMS schedule/vendor fields until staff edits CMS. */
export function overlayFall2026PacketProgram(program: Program): Program {
  const klass =
    (program.fallEpClassId ? fallEpClassById(program.fallEpClassId) : undefined) ??
    matchFall2026EpClass(program.name)
  if (!klass) return program

  const dates = [...klass.dates]
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]
  const schedule = formatProgramSchedule({
    dayOfWeek: klass.dayOfWeek,
    classTime: klass.classTime,
    durationWeeks: dates.length,
    startDate,
    endDate,
  })
  const catalogDesc = fallCatalogDescription(klass.id)

  return {
    ...program,
    fallEpClassId: klass.id,
    season: 'fall-2026',
    dayOfWeek: klass.dayOfWeek,
    classTime: klass.classTime,
    instructorName: klass.vendor,
    location: FALL_2026_EP_LOCATION,
    startDate,
    endDate,
    durationWeeks: dates.length,
    meetingDates: serializeMeetingDates(dates),
    skipsNote: klass.skips,
    schedule,
    description: catalogDesc ?? program.description,
  }
}

/**
 * Fall + Spring: show Tuition TBD only when CMS fee is unset/zero.
 * Real CMS fees display on the catalog. Checkout still requires Registration open.
 */
export function markCatalogTuitionTbd(program: Program): Program {
  const season = resolveProgramSeason(program)
  if (season !== 'fall-2026' && season !== 'spring-2027') return program
  const fee = Number(program.fee ?? 0)
  const tags = tagSet(program.tags)
  if (fee > 0) {
    if (!tags.has('fee-tbd')) return program
    tags.delete('fee-tbd')
    return { ...program, tags: joinTags(tags) }
  }
  tags.add('fee-tbd')
  return {
    ...program,
    fee: 0,
    tags: joinTags(tags),
    memberDiscountNote: '',
  }
}

export function fall2026PacketClassCount(): number {
  return FALL_2026_EP_CLASSES.length
}
