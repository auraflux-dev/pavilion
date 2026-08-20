/**
 * Locked Fall 2026 enrichment grid (library, two nights, stacked classes).
 * Public /programs/fall-2026 + staff Programs use this. Do not feed member portal from here.
 */

export const FALL_2026_EP_LOCATION = 'SHMS Library'

/** LCPS student/named holidays only (end-of-quarter kept). Source: LCPS ICS 2026-08-18. */
export const FALL_2026_TUESDAY_DATES = [
  '2026-09-15',
  '2026-09-22',
  '2026-09-29',
  '2026-10-06',
  '2026-10-13',
  '2026-10-20',
  '2026-10-27',
  '2026-11-10',
  '2026-11-17',
  '2026-11-24',
  '2026-12-01',
  '2026-12-08',
] as const

export const FALL_2026_WEDNESDAY_DATES = [
  '2026-09-16',
  '2026-09-23',
  '2026-09-30',
  '2026-10-07',
  '2026-10-14',
  '2026-10-21',
  '2026-10-28',
  '2026-11-04',
  '2026-11-11',
  '2026-11-18',
  '2026-12-02',
  '2026-12-09',
] as const

export type Fall2026EpClass = {
  id: string
  name: string
  /** Public landing path: /programs/{publicSlug} */
  publicSlug: string
  /** Match Wix Programs.name (substring, case-insensitive) */
  cmsNameIncludes: string[]
  dayOfWeek: 'Tuesday' | 'Wednesday'
  classTime: string
  startClock: string
  endClock: string
  vendor: string
  dates: readonly string[]
  skips: string
  /** Extra night note that is not in skips (e.g. end of quarter still meets). */
  sessionNote?: string
  /** Google Workspace mailbox to pick in Staff → Access (empty = none in directory). */
  suggestedMailbox: string
}

export const FALL_2026_EP_CLASSES: Fall2026EpClass[] = [
  {
    id: 'ye',
    name: 'Young Entrepreneurs I',
    publicSlug: 'young-entrepreneurs',
    cmsNameIncludes: ['young entrepreneur'],
    dayOfWeek: 'Tuesday',
    classTime: '5:30 to 6:45 PM',
    startClock: '17:30',
    endClock: '18:45',
    vendor: '021 / Janet Bih',
    dates: FALL_2026_TUESDAY_DATES,
    skips: 'Tue Nov 3 student holiday',
    suggestedMailbox: 'ep-businessplan@shmspto.org',
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
    dates: FALL_2026_TUESDAY_DATES,
    skips: 'Tue Nov 3 student holiday',
    suggestedMailbox: '',
  },
  {
    id: 'mathcounts',
    name: 'MATHCOUNTS',
    publicSlug: 'mathcounts',
    cmsNameIncludes: ['mathcounts', 'mathnasium'],
    dayOfWeek: 'Wednesday',
    classTime: '5:30 to 6:45 PM',
    startClock: '17:30',
    endClock: '18:45',
    vendor: 'Mathnasium of Ashburn',
    dates: FALL_2026_WEDNESDAY_DATES,
    skips: 'Wed Nov 25 Thanksgiving',
    sessionNote: 'Oct 28 meets (end of quarter).',
    suggestedMailbox: 'ep-math@shmspto.org',
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
    dates: FALL_2026_WEDNESDAY_DATES,
    skips: 'Wed Nov 25 Thanksgiving',
    sessionNote: 'Oct 28 meets (end of quarter).',
    suggestedMailbox: 'ep-robotics@shmspto.org',
  },
]

export const FALL_2026_EP_SALES = {
  paidMembers: 'Thu Aug 27 to Wed Sep 2, 2026',
  public: 'Thu Sep 3 to Wed Sep 9, 2026',
}

export function formatFall2026EpDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 16))
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  })
}

export function matchFall2026EpClass(programName: string): Fall2026EpClass | undefined {
  const n = programName.toLowerCase()
  return FALL_2026_EP_CLASSES.find((c) => c.cmsNameIncludes.some((part) => n.includes(part)))
}
