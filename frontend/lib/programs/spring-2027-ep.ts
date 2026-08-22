/**
 * Spring 2027 enrichment grid (placeholder dates).
 * Staging / review hosts can preview; www stays gated until SPRING_CATALOG_ENABLED.
 * Confirm against LCPS ICS before locking. Do not feed member portal from here.
 */

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

export type Spring2027EpClass = {
  id: string
  name: string
  publicSlug: string
  cmsNameIncludes: string[]
  dayOfWeek: 'Tuesday' | 'Wednesday'
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
    id: 'mathcounts',
    name: 'Competitive Math Prep',
    publicSlug: 'mathcounts',
    cmsNameIncludes: ['mathcounts', 'mathnasium', 'competitive math', 'math prep'],
    dayOfWeek: 'Wednesday',
    classTime: '5:30 to 6:45 PM',
    startClock: '17:30',
    endClock: '18:45',
    vendor: 'RSM Ashburn',
    dates: SPRING_2027_WEDNESDAY_DATES,
    skips: 'Wed Mar 24 spring break',
    continuesFromFall: true,
  },
  {
    id: 'robotics',
    name: 'Robotics',
    publicSlug: 'robotics',
    cmsNameIncludes: ['robotics'],
    dayOfWeek: 'Wednesday',
    classTime: '7:00 to 8:00 PM',
    startClock: '19:00',
    endClock: '20:00',
    vendor: 'Loudoun Robotics',
    dates: SPRING_2027_WEDNESDAY_DATES,
    skips: 'Wed Mar 24 spring break',
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
