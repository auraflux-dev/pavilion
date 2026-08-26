/**
 * Public catalog shaping: packet overlay (schedule/vendor copy) and tuition TBD.
 */
import type { Program } from '@/lib/api/programs'
import { fallCatalogDescription, springCatalogDescription } from '@/lib/programs/landing-copy'
import {
  FALL_2026_EP_CLASSES,
  FALL_2026_EP_LOCATION,
  fallEpClassById,
  matchFall2026EpClass,
  serializeMeetingDates,
} from '@/lib/programs/fall-2026-ep'
import {
  matchSpring2027EpClass,
  SPRING_2027_EP_LOCATION,
  springEpClassById,
} from '@/lib/programs/spring-2027-ep'
import {
  EP_MEETING_DATES_PROPOSED_LABEL,
} from '@/lib/programs/ep-meeting-dates'
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

/** Spring 2027 packet wins over stale CMS schedule/vendor fields until staff edits CMS. */
export function overlaySpring2027PacketProgram(program: Program): Program {
  if (resolveProgramSeason(program) !== 'spring-2027') return program
  const klass =
    (program.fallEpClassId ? springEpClassById(program.fallEpClassId) : undefined) ??
    matchSpring2027EpClass(program.name)
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
  const catalogDesc = springCatalogDescription(klass.id)
  const cmsDesc = String(program.description ?? '').trim()
  const cmsSchedule = String(program.schedule ?? '').trim()
  const cmsDay = String(program.dayOfWeek ?? '').trim()
  const cmsTime = String(program.classTime ?? '').trim()
  const cmsInstructor = String(program.instructorName ?? '').trim()
  const cmsLocation = String(program.location ?? '').trim()
  const cmsMeetingDates = String(program.meetingDates ?? '').trim()
  const cmsSkips = String(program.skipsNote ?? '').trim()
  const cmsSeason = String(program.season ?? '').trim()

  return {
    ...program,
    fallEpClassId: klass.id,
    season: cmsSeason || 'spring-2027',
    dayOfWeek: cmsDay || klass.dayOfWeek,
    classTime: cmsTime || klass.classTime,
    instructorName: cmsInstructor || klass.vendor,
    location: cmsLocation || SPRING_2027_EP_LOCATION,
    startDate: program.startDate || startDate,
    endDate: program.endDate || endDate,
    durationWeeks: program.durationWeeks || dates.length,
    meetingDates: cmsMeetingDates || serializeMeetingDates(dates),
    skipsNote: cmsSkips || klass.skips,
    schedule: cmsSchedule || schedule,
    description: cmsDesc || catalogDesc || program.description,
  }
}

/** Fall 2026 packet wins over stale CMS schedule/vendor fields until staff edits CMS. */
export function overlayFall2026PacketProgram(program: Program): Program {
  if (resolveProgramSeason(program) !== 'fall-2026') return program
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
  const cmsDesc = String(program.description ?? '').trim()
  const cmsSchedule = String(program.schedule ?? '').trim()
  const cmsDay = String(program.dayOfWeek ?? '').trim()
  const cmsTime = String(program.classTime ?? '').trim()
  const cmsInstructor = String(program.instructorName ?? '').trim()
  const cmsLocation = String(program.location ?? '').trim()
  const cmsMeetingDates = String(program.meetingDates ?? '').trim()
  const cmsSkips = String(program.skipsNote ?? '').trim()
  const cmsSeason = String(program.season ?? '').trim()

  return {
    ...program,
    fallEpClassId: klass.id,
    season: cmsSeason || 'fall-2026',
    dayOfWeek: cmsDay || klass.dayOfWeek,
    classTime: cmsTime || klass.classTime,
    instructorName: cmsInstructor || klass.vendor,
    location: cmsLocation || FALL_2026_EP_LOCATION,
    startDate: program.startDate || startDate,
    endDate: program.endDate || endDate,
    durationWeeks: program.durationWeeks || dates.length,
    meetingDates: cmsMeetingDates || serializeMeetingDates(dates),
    skipsNote: cmsSkips || klass.skips,
    schedule: cmsSchedule || schedule,
    description: cmsDesc || catalogDesc || program.description,
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

/**
 * Public catalog payloads: strip concrete meeting nights until approved.
 * Staff/CMS still holds the real dates; this only shapes visitor responses.
 */
export function redactUnapprovedEpMeetingDates(
  program: Program,
  meetingDatesApproved: boolean,
): Program {
  if (meetingDatesApproved) return program
  const season = resolveProgramSeason(program)
  if (season !== 'fall-2026' && season !== 'spring-2027') return program

  const schedule = formatProgramSchedule(
    {
      dayOfWeek: program.dayOfWeek,
      classTime: program.classTime,
      durationWeeks: program.durationWeeks,
      startDate: program.startDate,
      endDate: program.endDate,
    },
    { includeCalendarDates: false },
  )

  return {
    ...program,
    startDate: undefined,
    endDate: undefined,
    meetingDates: undefined,
    skipsNote: undefined,
    schedule: schedule || EP_MEETING_DATES_PROPOSED_LABEL,
  }
}

export function fall2026PacketClassCount(): number {
  return FALL_2026_EP_CLASSES.length
}
