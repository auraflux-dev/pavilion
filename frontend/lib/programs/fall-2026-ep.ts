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

export function fallEpClassById(id: string): Fall2026EpClass | undefined {
  return FALL_2026_EP_CLASSES.find((c) => c.id === id)
}

/** Prefer stable CMS fallEpClassId; fall back to name keywords. */
export function findProgramForFallEpClass<T extends { name: string; fallEpClassId?: string }>(
  klass: Fall2026EpClass,
  programs: T[],
): T | undefined {
  const byId = programs.find((p) => String(p.fallEpClassId ?? '').trim() === klass.id)
  if (byId) return byId
  return programs.find((p) => matchFall2026EpClass(p.name)?.id === klass.id)
}

/** Current Fall 2026 enrichment rows (hide older CMS programs on staff). */
export function isCurrentFall2026EpProgram(program: {
  name: string
  fallEpClassId?: string
}): boolean {
  const id = String(program.fallEpClassId ?? '').trim()
  if (id && FALL_2026_EP_CLASSES.some((c) => c.id === id)) return true
  return Boolean(matchFall2026EpClass(program.name))
}

function fall2026CandidateScore(program: {
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
  if (start >= '2026-08-01' && start < '2027-01-01') score += 100
  else if (start.startsWith('2026')) score += 50
  if (end >= '2026-08-01' && end < '2027-01-01') score += 30
  // Prior seasons / spring leftovers
  if (start && start < '2026-08-01') score -= 200
  if (end && end < '2026-08-01') score -= 200
  return score
}

/**
 * Staff default list: at most one CMS Programs row per Fall 2026 EP class.
 * Drops prior-season duplicates that share names like Essay / Robotics.
 */
export function selectCurrentFall2026Programs<
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
  for (const klass of FALL_2026_EP_CLASSES) {
    const candidates = programs.filter((p) => {
      if (used.has(p.id)) return false
      const byId = String(p.fallEpClassId ?? '').trim() === klass.id
      const byName = matchFall2026EpClass(p.name)?.id === klass.id
      return byId || byName
    })
    if (!candidates.length) continue
    candidates.sort((a, b) => fall2026CandidateScore(b) - fall2026CandidateScore(a))
    const winner = candidates[0]
    // Need Fall 2026 dates, or linked id plus open/featured (not id alone on an old row).
    const score = fall2026CandidateScore(winner)
    if (score < 50) continue
    picked.push(winner)
    used.add(winner.id)
  }
  return picked
}

/** Parse CMS meetingDates; fall back to packet dates. */
export function resolveMeetingDates(
  meetingDates: string | undefined,
  fallback: readonly string[],
): string[] {
  const parsed = String(meetingDates ?? '')
    .split(/[,\n]+/)
    .map((s) => s.trim().slice(0, 10))
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
  return parsed.length > 0 ? parsed : [...fallback]
}

export function serializeMeetingDates(dates: string[]): string {
  return dates.map((d) => d.slice(0, 10)).filter(Boolean).join(',')
}
