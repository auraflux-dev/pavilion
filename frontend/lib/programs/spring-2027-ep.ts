/**
 * Spring 2027 enrichment grid (placeholder dates).
 * Staging / review hosts can preview; www stays gated until SPRING_CATALOG_ENABLED.
 * Confirm against LCPS ICS before locking. Do not feed member portal from here.
 */

import type { Program } from '@/lib/api/programs'

export const SPRING_2027_EP_LOCATION = 'SHMS Library'

/**
 * Placeholder Tuesday nights (12). First week of February start.
 * Skips: Tue Mar 9 Eid; Tue Mar 23 spring break.
 * Snow buffer after last class (not on the sold list): May 11, 18, 25, Jun 1.
 * Source: LCPS events ICS (loudoun_county_public_schools_events.ics) + 2026-27 board calendar.
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
 * Placeholder Wednesday nights (12). First week of February start.
 * Skip Wed Mar 24 (spring break). Wed Mar 10 still meets (Eid was Tuesday Mar 9).
 * Snow buffer after last class: May 5, 12, 19, 26.
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
 * Placeholder Thursday nights (12). Day after Wed cohort.
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
    skips: 'Tue Mar 9 Eid; Tue Mar 23 spring break',
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
    skips: 'Tue Mar 9 Eid; Tue Mar 23 spring break',
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

export const SPRING_2027_EP_PLACEHOLDER = true

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
  { fee: number; capacity: number; category: string; description: string }
> = {
  ye: {
    fee: 375,
    capacity: 30,
    category: 'Strategy',
    description:
      'Young Entrepreneurs II: capital, investor practice, and Stingray Tank pitch prep.\nContinue with Missy Spears from Fall.\n\n• Startup costs, pricing, and basic financials\n• Elevator pitches and public speaking\n• Culminating Stingray Tank showcase\n\nCap 30. Grades 6 to 8.',
  },
  essay: {
    fee: 375,
    capacity: 14,
    category: 'Creative Arts',
    description:
      'Spring analytical writing with Lumi.\nAndrew Martineau. Cap 10 to 14.\n\n• Evidence, MLA basics, and research habits\n• Persuasive and comparative essays\n• High-school readiness editing\n\nTwelve Tuesday nights.',
  },
  mathcounts: {
    fee: 375,
    capacity: 30,
    category: 'Competition',
    description:
      'Competitive Math Part II with Janet Bih: advanced systems, team tactics, and mocks.\n\n• Mixed strategy selection and timed rounds\n• Sprint, Target, Team, and Countdown focus\n• Full mock competitions late in the semester\n\nCap 10 to 30. Continues the Fall year plan.',
  },
  robotics: {
    fee: 450,
    capacity: 30,
    category: 'STEM',
    description:
      'Loudoun Robotics Part II: Blocks to Python and advanced autonomy.\n\n• Functions, gyro, and line following\n• Attachment design and mission course\n• Engineering notebook and Spring showcase\n\nTeams of 3. Kits and laptops included.',
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
    return {
      _id: `staging-spring-2027-${c.id}`,
      name: c.name,
      description: meta.description,
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
      meetingDates: c.dates.join(','),
      skipsNote: c.skips,
      instructorName: c.vendor,
      memberDiscountNote: '',
      season: 'spring-2027',
      tags: 'coming-soon,spring-2027,fee-tbd',
      schedule: `${c.dayOfWeek}s ${c.classTime}, 12 sessions`,
    }
  })
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
  },
>(programs: T[]): T[] {
  const picked: T[] = []
  const used = new Set<string>()
  for (const klass of SPRING_2027_EP_CLASSES) {
    const candidates = programs.filter((p) => {
      if (used.has(p.id)) return false
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
    const seasonRow =
      hasSpring2027SeasonStart(winner) ||
      score >= 50 ||
      (linkedId && (winner.featured || winner.registrationOpen)) ||
      winner.featured
    if (!seasonRow) continue
    picked.push(winner)
    used.add(winner.id)
  }

  for (const p of programs) {
    if (used.has(p.id)) continue
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
  return {
    fallEpClassId: klass.id,
    season: 'spring-2027',
    dayOfWeek: klass.dayOfWeek,
    classTime: klass.classTime,
    location: SPRING_2027_EP_LOCATION,
    instructorName: klass.vendor,
    startDate: klass.dates[0],
    endDate: klass.dates[klass.dates.length - 1],
    durationWeeks: klass.dates.length,
    meetingDates: klass.dates.join(','),
    skipsNote: klass.skips,
    fee: 0,
    tags: 'fee-tbd,spring-2027',
    memberDiscountNote: '',
  }
}
