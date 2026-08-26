/**
 * Locked Spring 2027 enrichment grid (library, Tue / Wed / Thu nights).
 * Public /programs/spring-2027 + staff Programs use this. Do not feed member portal from here.
 * Meeting nights skip LCPS holidays and spring break (Mar 22 to 26, 2027).
 * Source: LCPS 2026-27 board calendar + events ICS, locked Aug 2026.
 */

import type { Program } from '@/lib/api/programs'
import { serializeMeetingDates } from '@/lib/programs/fall-2026-ep'
import { springCatalogDescription } from '@/lib/programs/landing-copy'
import { formatProgramSchedule } from '@/lib/programs/schedule'
import { resolveProgramSeason } from '@/lib/programs/season'

export const SPRING_2027_EP_LOCATION = 'SHMS Library'

/**
 * Locked Tuesday nights (12). First week of February start.
 * Skips: Tue Mar 9 holiday; Tue Mar 23 spring break.
 * Weather makeup after last class (not sold): May 11, 18, 25, Jun 1.
 */
export const SPRING_2027_TUESDAY_DATES = [
  '2027-02-02',
  '2027-02-09',
  '2027-02-16',
  '2027-02-23',
  '2027-03-02',
  '2027-03-16',
  '2027-03-30',
  '2027-04-06',
  '2027-04-13',
  '2027-04-20',
  '2027-04-27',
  '2027-05-04',
] as const

/** Optional makeup Tuesdays after the published 12 (weather). Before last day of school Jun 11. */
export const SPRING_2027_TUESDAY_SNOW_BUFFER = [
  '2027-05-11',
  '2027-05-18',
  '2027-05-25',
  '2027-06-01',
] as const

/**
 * Locked Wednesday nights (12). First week of February start.
 * Skip Wed Mar 24 (spring break). Wed Mar 10 still meets (holiday was Tue Mar 9).
 * Weather makeup after last class: May 5, 12, 19, 26.
 */
export const SPRING_2027_WEDNESDAY_DATES = [
  '2027-02-03',
  '2027-02-10',
  '2027-02-17',
  '2027-02-24',
  '2027-03-03',
  '2027-03-10',
  '2027-03-17',
  '2027-03-31',
  '2027-04-07',
  '2027-04-14',
  '2027-04-21',
  '2027-04-28',
] as const

export const SPRING_2027_WEDNESDAY_SNOW_BUFFER = [
  '2027-05-05',
  '2027-05-12',
  '2027-05-19',
  '2027-05-26',
] as const

/**
 * Locked Thursday nights (12). Day after Wed cohort.
 * Skip Thu Mar 25 (spring break).
 */
export const SPRING_2027_THURSDAY_DATES = [
  '2027-02-04',
  '2027-02-11',
  '2027-02-18',
  '2027-02-25',
  '2027-03-04',
  '2027-03-11',
  '2027-03-18',
  '2027-04-01',
  '2027-04-08',
  '2027-04-15',
  '2027-04-22',
  '2027-04-29',
] as const

export const SPRING_2027_THURSDAY_SNOW_BUFFER = [
  '2027-05-06',
  '2027-05-13',
  '2027-05-20',
  '2027-05-27',
] as const

export type Spring2027EpClass = {
  id: string
  name: string
  publicSlug: string
  cmsNameIncludes: string[]
  dayOfWeek: 'Tuesday' | 'Wednesday' | 'Thursday'
  classTime: string
  startClock: string
  endClock: string
  vendor: string
  dates: readonly string[]
  skips: string
  sessionNote?: string
  /** Same Fall vendors continue unless Staff changes CMS. */
  continuesFromFall: boolean
}

export const SPRING_2027_EP_CLASSES: Spring2027EpClass[] = [
  {
    id: 'ye',
    name: 'Young Entrepreneurs',
    publicSlug: 'young-entrepreneurs',
    cmsNameIncludes: ['young entrepreneur'],
    dayOfWeek: 'Tuesday',
    classTime: '5:30 to 6:45 PM',
    startClock: '17:30',
    endClock: '18:45',
    vendor: 'Missy Spears',
    dates: SPRING_2027_TUESDAY_DATES,
    skips: 'Tue Mar 9 holiday; Tue Mar 23 spring break',
    continuesFromFall: true,
  },
  {
    id: 'essay',
    name: 'Essay Writing',
    publicSlug: 'essay',
    cmsNameIncludes: ['essay'],
    dayOfWeek: 'Tuesday',
    classTime: '7:00 to 8:00 PM',
    startClock: '19:00',
    endClock: '20:00',
    vendor: 'Lumi (Andrew Martineau)',
    dates: SPRING_2027_TUESDAY_DATES,
    skips: 'Tue Mar 9 holiday; Tue Mar 23 spring break',
    continuesFromFall: true,
  },
  {
    id: 'robotics',
    name: 'Robotics',
    publicSlug: 'robotics',
    cmsNameIncludes: ['robotics'],
    dayOfWeek: 'Wednesday',
    classTime: '6:00 to 7:00 PM',
    startClock: '18:00',
    endClock: '19:00',
    vendor: 'Loudoun Robotics',
    dates: SPRING_2027_WEDNESDAY_DATES,
    skips: 'Wed Mar 24 spring break',
    continuesFromFall: true,
  },
  {
    id: 'mathcounts',
    name: 'Competitive Math Prep',
    publicSlug: 'competitive-math',
    cmsNameIncludes: ['mathcounts', 'mathnasium', 'competitive math', 'math prep'],
    dayOfWeek: 'Thursday',
    classTime: '6:00 to 7:00 PM',
    startClock: '18:00',
    endClock: '19:00',
    vendor: 'Janet Bih',
    dates: SPRING_2027_THURSDAY_DATES,
    skips: 'Thu Mar 25 spring break',
    continuesFromFall: true,
  },
]

export const SPRING_2027_EP_PLACEHOLDER = false

export function formatSpring2027EpDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 16))
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  })
}

function formatMakeupList(dates: readonly string[]): string {
  return dates
    .map((iso) => {
      const [y, m, d] = iso.split('-').map(Number)
      const dt = new Date(Date.UTC(y, m - 1, d, 16))
      return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'America/New_York',
      })
    })
    .join(', ')
}

/** Weather makeup nights by cohort (derived from packet constants). */
export function spring2027WeatherMakeupFootnote(): string {
  return [
    `Weather makeups if a night is cancelled: Tue ${formatMakeupList(SPRING_2027_TUESDAY_SNOW_BUFFER)}.`,
    `Wed ${formatMakeupList(SPRING_2027_WEDNESDAY_SNOW_BUFFER)}.`,
    `Thu ${formatMakeupList(SPRING_2027_THURSDAY_SNOW_BUFFER)}.`,
    'Last day of school Jun 11.',
  ].join('\n')
}

export type Spring2027ScheduleRow = {
  id: string
  name: string
  dayOfWeek: string
  classTime: string
  location: string
  instructorName: string
  startDate: string
  endDate: string
  meetingDates: string
  skipsNote: string
  sessionNote?: string
}

/** Packet rows for schedule UI when CMS Spring programs are not seeded yet. */
export function spring2027PacketScheduleRows(): Spring2027ScheduleRow[] {
  return SPRING_2027_EP_CLASSES.map((c) => ({
    id: `packet-${c.id}`,
    name: c.name,
    dayOfWeek: c.dayOfWeek,
    classTime: c.classTime,
    location: SPRING_2027_EP_LOCATION,
    instructorName: c.vendor,
    startDate: c.dates[0],
    endDate: c.dates[c.dates.length - 1],
    meetingDates: c.dates.join('\n'),
    skipsNote: c.skips,
    sessionNote: c.sessionNote,
  }))
}

/**
 * Spring catalog cards from the EP packet when CMS has no spring-2027 rows yet.
 * Registration stays closed until Staff opens CMS rows.
 */
const SPRING_STAGING_CATALOG: Record<
  string,
  { name: string; capacity: number; category: string }
> = {
  ye: {
    name: 'Young Entrepreneurs II: Stingray Tank',
    capacity: 30,
    category: 'Strategy',
  },
  essay: {
    name: 'Essay Writing: Analytical & High-School Ready',
    capacity: 14,
    category: 'Creative Arts',
  },
  mathcounts: {
    name: 'Competitive Math Prep (Spring)',
    capacity: 30,
    category: 'Competition',
  },
  robotics: {
    name: 'Robotics: Advanced Systems & Applied Engineering',
    capacity: 30,
    category: 'STEM',
  },
}

/**
 * Synthetic Spring programs for /programs when CMS has no spring-2027 rows yet.
 */
export function spring2027StagingCatalogPrograms(): Program[] {
  return SPRING_2027_EP_CLASSES.map((c, i) => {
    const meta = SPRING_STAGING_CATALOG[c.id]
    const startDate = c.dates[0]
    const endDate = c.dates[c.dates.length - 1]
    const description = springCatalogDescription(c.id) || meta.name
    return {
      _id: `staging-spring-2027-${c.id}`,
      name: meta.name,
      description,
      fee: 0,
      capacity: meta.capacity,
      registrationOpen: false,
      requiresWaiver: true,
      grades: '6-8',
      category: meta.category,
      featured: true,
      sortOrder: 100 + i,
      dayOfWeek: c.dayOfWeek,
      classTime: c.classTime,
      durationWeeks: c.dates.length,
      startDate,
      endDate,
      location: SPRING_2027_EP_LOCATION,
      meetingDates: serializeMeetingDates([...c.dates]),
      skipsNote: c.skips,
      instructorName: c.vendor,
      memberDiscountNote: '',
      season: 'spring-2027',
      tags: 'coming-soon,spring-2027,fee-tbd',
      schedule: `${c.dayOfWeek}s ${c.classTime}, 12 sessions`,
      fallEpClassId: c.id,
    }
  })
}

/** Fill missing Spring 2027 packet slots so catalog + landing pages always list all four classes. */
export function appendMissingSpringPacketPrograms<T extends Program>(programs: T[]): T[] {
  const stubs = spring2027StagingCatalogPrograms() as T[]
  const out = [...programs]
  for (const stub of stubs) {
    const klassId = String(stub.fallEpClassId ?? '').trim()
    const has = out.some((p) => {
      if (resolveProgramSeason(p) !== 'spring-2027') return false
      if (String(p.fallEpClassId ?? '').trim() === klassId) return true
      return matchSpring2027EpClass(p.name)?.id === klassId
    })
    if (!has) out.push(stub)
  }
  return out
}

export function matchSpring2027EpClass(programName: string): Spring2027EpClass | undefined {
  const n = programName.toLowerCase()
  return SPRING_2027_EP_CLASSES.find((c) => c.cmsNameIncludes.some((part) => n.includes(part)))
}

export function springEpClassById(id: string): Spring2027EpClass | undefined {
  return SPRING_2027_EP_CLASSES.find((c) => c.id === id)
}

function spring2027CandidateScore(program: {
  name: string
  fallEpClassId?: string
  startDate?: string
  endDate?: string
  registrationOpen?: boolean
  featured?: boolean
}): number {
  let score = 0
  const start = String(program.startDate ?? '').slice(0, 10)
  const end = String(program.endDate ?? '').slice(0, 10)
  if (String(program.fallEpClassId ?? '').trim()) score += 40
  if (program.registrationOpen) score += 25
  if (program.featured) score += 15
  if (start >= '2027-01-15' && start < '2027-07-01') score += 100
  else if (start.startsWith('2027')) score += 50
  if (end >= '2027-01-15' && end < '2027-07-01') score += 30
  if (start && start < '2027-01-15') score -= 200
  return score
}

function hasSpring2027SeasonStart(program: { startDate?: string }): boolean {
  const start = String(program.startDate ?? '').slice(0, 10)
  return Boolean(start && start >= '2027-01-15' && start < '2027-07-01')
}

type SeasonPickFields = {
  season?: string
  tags?: string
  name: string
  fallEpClassId?: string
  startDate?: string
  endDate?: string
}

function isSpring2027CatalogRow(program: SeasonPickFields): boolean {
  return resolveProgramSeason(program) === 'spring-2027'
}

/** Public catalog tie-break when multiple Spring rows share a slug. */
export function spring2027CatalogPickerScore(program: {
  name: string
  fallEpClassId?: string
  startDate?: string
  endDate?: string
  registrationOpen?: boolean
  featured?: boolean
}): number {
  return spring2027CandidateScore(program)
}

/** Staff default list: current Spring 2027 season programs. */
export function selectCurrentSpring2027Programs<
  T extends {
    id: string
    name: string
    fallEpClassId?: string
    startDate?: string
    endDate?: string
    registrationOpen?: boolean
    featured?: boolean
    season?: string
    tags?: string
  },
>(programs: T[]): T[] {
  const picked: T[] = []
  const used = new Set<string>()
  for (const klass of SPRING_2027_EP_CLASSES) {
    const candidates = programs.filter((p) => {
      if (used.has(p.id)) return false
      if (!isSpring2027CatalogRow(p)) return false
      const byId = String(p.fallEpClassId ?? '').trim() === klass.id
      const byName = matchSpring2027EpClass(p.name)?.id === klass.id
      return byId || byName
    })
    if (!candidates.length) continue
    candidates.sort((a, b) => spring2027CandidateScore(b) - spring2027CandidateScore(a))
    const winner = candidates[0]
    const score = spring2027CandidateScore(winner)
    const linkedId =
      Boolean(String(winner.fallEpClassId ?? '').trim()) ||
      Boolean(matchSpring2027EpClass(winner.name))
    // Packet-linked Spring rows always count (even if fee/dates/featured still empty).
    const seasonRow =
      linkedId ||
      hasSpring2027SeasonStart(winner) ||
      score >= 50 ||
      winner.featured
    if (!seasonRow) continue
    picked.push(winner)
    used.add(winner.id)
  }

  for (const p of programs) {
    if (used.has(p.id)) continue
    if (!isSpring2027CatalogRow(p)) continue
    if (matchSpring2027EpClass(p.name)) continue
    if (String(p.fallEpClassId ?? '').trim()) continue
    if (!hasSpring2027SeasonStart(p)) continue
    if (spring2027CandidateScore(p) < 50) continue
    picked.push(p)
    used.add(p.id)
  }

  return picked.sort((a, b) => {
    const ai = programs.findIndex((p) => p.id === a.id)
    const bi = programs.findIndex((p) => p.id === b.id)
    return ai - bi
  })
}

/** CMS field defaults from the Spring 2027 packet (staff seed only). */
export function spring2027PacketCmsDefaults(klass: Spring2027EpClass): Record<string, string | number> {
  const dates = [...klass.dates]
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]
  return {
    fallEpClassId: klass.id,
    season: 'spring-2027',
    dayOfWeek: klass.dayOfWeek,
    classTime: klass.classTime,
    location: SPRING_2027_EP_LOCATION,
    instructorName: klass.vendor,
    startDate,
    endDate,
    durationWeeks: dates.length,
    meetingDates: serializeMeetingDates(dates),
    skipsNote: klass.skips,
    fee: 0,
    tags: 'fee-tbd,spring-2027',
    memberDiscountNote: '',
    schedule: formatProgramSchedule({
      dayOfWeek: klass.dayOfWeek,
      classTime: klass.classTime,
      durationWeeks: dates.length,
      startDate,
      endDate,
    }),
  }
}
