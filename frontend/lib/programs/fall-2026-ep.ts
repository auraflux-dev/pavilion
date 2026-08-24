/**
 * Locked Fall 2026 enrichment grid (library, Tue / Wed / Thu nights).
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

/** Thursdays aligned to Wed cohort; skip Thanksgiving Thu Nov 26. */
export const FALL_2026_THURSDAY_DATES = [
  '2026-09-17',
  '2026-09-24',
  '2026-10-01',
  '2026-10-08',
  '2026-10-15',
  '2026-10-22',
  '2026-10-29',
  '2026-11-05',
  '2026-11-12',
  '2026-11-19',
  '2026-12-03',
  '2026-12-10',
] as const

export type Fall2026EpClass = {
  id: string
  name: string
  /** Public landing path: /programs/{publicSlug} */
  publicSlug: string
  /** Match Wix Programs.name (substring, case-insensitive) */
  cmsNameIncludes: string[]
  dayOfWeek: 'Tuesday' | 'Wednesday' | 'Thursday'
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
    vendor: 'Missy Spears',
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
    id: 'robotics',
    name: 'Robotics',
    publicSlug: 'robotics',
    cmsNameIncludes: ['robotics'],
    dayOfWeek: 'Wednesday',
    classTime: '6:00 to 7:00 PM',
    startClock: '18:00',
    endClock: '19:00',
    vendor: 'Loudoun Robotics',
    dates: FALL_2026_WEDNESDAY_DATES,
    skips: 'Wed Nov 25 Thanksgiving',
    sessionNote: 'Oct 28 meets (end of quarter).',
    suggestedMailbox: 'ep-robotics@shmspto.org',
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
    dates: FALL_2026_THURSDAY_DATES,
    skips: 'Thu Nov 26 Thanksgiving',
    sessionNote: 'Oct 29 meets (end of quarter week). Cap 10 to 30.',
    suggestedMailbox: 'ep-math@shmspto.org',
  },
]

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

function hasFall2026SeasonStart(program: { startDate?: string }): boolean {
  const start = String(program.startDate ?? '').slice(0, 10)
  return Boolean(start && start >= '2026-08-01' && start < '2027-01-01')
}

/**
 * Staff default list: current Fall 2026 season programs.
 * Keeps at most one row per packet class when names collide, and also keeps
 * other Fall 2026 featured/open rows (e.g. Competitive Math Prep).
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
    const score = fall2026CandidateScore(winner)
    const linkedId =
      Boolean(String(winner.fallEpClassId ?? '').trim()) ||
      Boolean(matchFall2026EpClass(winner.name))
    const seasonRow =
      hasFall2026SeasonStart(winner) ||
      score >= 50 ||
      (linkedId && (winner.featured || winner.registrationOpen)) ||
      winner.featured
    if (!seasonRow) continue
    picked.push(winner)
    used.add(winner.id)
  }

  // Current-season rows that are not one of the four packet name matches.
  for (const p of programs) {
    if (used.has(p.id)) continue
    if (matchFall2026EpClass(p.name)) continue
    if (String(p.fallEpClassId ?? '').trim()) continue
    if (!hasFall2026SeasonStart(p)) continue
    if (fall2026CandidateScore(p) < 50) continue
    picked.push(p)
    used.add(p.id)
  }

  // Keep source order so typing a name in staff does not jump the focused card.
  return picked.sort((a, b) => {
    const ai = programs.findIndex((p) => p.id === a.id)
    const bi = programs.findIndex((p) => p.id === b.id)
    return ai - bi
  })
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

/** CMS field defaults from the Fall 2026 packet (staff seed only; public reads CMS). */
export function fall2026PacketCmsDefaults(klass: Fall2026EpClass): Record<string, string | number> {
  return {
    fallEpClassId: klass.id,
    season: 'fall-2026',
    dayOfWeek: klass.dayOfWeek,
    classTime: klass.classTime,
    location: FALL_2026_EP_LOCATION,
    instructorName: klass.vendor,
    startDate: klass.dates[0],
    endDate: klass.dates[klass.dates.length - 1],
    durationWeeks: klass.dates.length,
    meetingDates: serializeMeetingDates([...klass.dates]),
    skipsNote: klass.skips,
    fee: 0,
    tags: 'fee-tbd',
    memberDiscountNote: '',
  }
}

/** Fill only empty CMS fields from packet defaults. */
export function mergeEmptyProgramFields<
  T extends Record<string, unknown>,
>(current: T, defaults: Record<string, string | number>): Record<string, string | number> {
  const patch: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(defaults)) {
    const existing = current[key]
    const empty =
      existing == null ||
      existing === '' ||
      existing === 0 ||
      (typeof existing === 'string' && !existing.trim())
    if (empty) patch[key] = value
  }
  return patch
}
