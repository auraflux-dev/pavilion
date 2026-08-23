import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import { getWixClient } from "@/lib/wix-client";
import { formatProgramSchedule } from "@/lib/programs/schedule";
import { memberPriorityUntilIso } from '@/lib/programs/registration-access'
import {
  markCatalogTuitionTbd,
  overlayFall2026PacketProgram,
} from '@/lib/programs/public-catalog'
import {
  filterProgramsForPublicCatalog,
  isSpringCatalogListed,
  resolveProgramSeason,
} from '@/lib/programs/season'
import {
  matchFall2026EpClass,
  selectCurrentFall2026Programs,
} from '@/lib/programs/fall-2026-ep'
import { programPublicSlug } from '@/lib/programs/public-path'
import { spring2027StagingCatalogPrograms } from '@/lib/programs/spring-2027-ep'

export interface Program {
  _id: string;
  name: string;
  description: string;
  fee: number;
  capacity: number;
  registrationOpen: boolean;
  /**
   * When set and still in the future (with registrationOpen), only paid members
   * may enroll. After this instant (or when empty), all signed-in parents may enroll.
   */
  memberPriorityUntil?: string;
  cheddarupUrl?: string;
  requiresWaiver: boolean;
  grades: string;
  category?: string;
  paymentType?: 'wix' | 'cheddarup_installment' | 'cheddarup_p2p';
  // Homepage preview fields (added 2025-06)
  schedule?: string;
  detail?: string;
  tags?: string;
  featured?: boolean;
  sortOrder?: number;
  image?: string;
  /** Meeting day(s), e.g. "Tuesday" or "Mon & Wed" */
  dayOfWeek?: string;
 /** Class time window, e.g. "3:30 to 4:30 PM" */
  classTime?: string;
  /** Length of the session run */
  durationWeeks?: number;
  /** First meeting date (ISO or YYYY-MM-DD) */
  startDate?: string;
  /** Last meeting date */
  endDate?: string;
  /** Room / location (e.g. SHMS Library) */
  location?: string;
  /** Comma-separated YYYY-MM-DD meeting nights */
  meetingDates?: string;
  /** Skip / holiday note shown on cards */
  skipsNote?: string;
  instructorName?: string;
  /** Fee footnote, e.g. Members 10 / 15 / 30% off */
  memberDiscountNote?: string;
  fallEpClassId?: string;
  /** Catalog season: fall-2026 | spring-2027 | full-year */
  season?: string;
}

function normalizeImage(raw: unknown): string | undefined {
  if (!raw) return undefined
  if (typeof raw === 'string') return raw.trim() || undefined
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as { url?: string; src?: string }
    return String(obj.url ?? obj.src ?? '').trim() || undefined
  }
  return undefined
}

function dateField(value: unknown): string | undefined {
  if (!value) return undefined
  const m = String(value).match(/(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  try {
    return new Date(String(value)).toISOString().slice(0, 10)
  } catch {
    return undefined
  }
}

function mapProgramItem(item: Record<string, unknown>): Program {
  const dayOfWeek = String(item.dayOfWeek ?? '').trim() || undefined
  const classTime = String(item.classTime ?? '').trim() || undefined
  const durationWeeks = Number(item.durationWeeks ?? 0) || undefined
  const startDate = dateField(item.startDate)
  const endDate = dateField(item.endDate)
  const schedule =
    String(item.schedule ?? '').trim() ||
    formatProgramSchedule({ dayOfWeek, classTime, durationWeeks, startDate, endDate }) ||
    undefined

  return {
    _id: String(item._id ?? ''),
    name: vanillaizeIfDemo(String(item.name ?? '')),
    description: vanillaizeIfDemo(String(item.description ?? '')),
    fee: Number(item.fee ?? 0) || 0,
    capacity: Number(item.capacity ?? 0) || 0,
    registrationOpen: item.registrationOpen === true,
    memberPriorityUntil: memberPriorityUntilIso(item.memberPriorityUntil) ?? undefined,
    cheddarupUrl: String(item.cheddarupUrl ?? '') || undefined,
    requiresWaiver: item.requiresWaiver === true,
    grades: String(item.grades ?? ''),
    category: String(item.category ?? '') || undefined,
    paymentType: item.paymentType as Program['paymentType'],
    schedule,
    detail: String(item.detail ?? '') || undefined,
    tags: String(item.tags ?? '') || undefined,
    featured: item.featured === true,
    sortOrder: Number(item.sortOrder ?? 0) || 0,
    image: normalizeImage(item.image),
    dayOfWeek,
    classTime,
    durationWeeks,
    startDate,
    endDate,
    location: String(item.location ?? '').trim() || undefined,
    meetingDates: String(item.meetingDates ?? '').trim() || undefined,
    skipsNote: String(item.skipsNote ?? '').trim() || undefined,
    instructorName: String(item.instructorName ?? '').trim() || undefined,
    memberDiscountNote: String(item.memberDiscountNote ?? '').trim() || undefined,
    fallEpClassId: String(item.fallEpClassId ?? '').trim() || undefined,
    season: String(item.season ?? '').trim() || undefined,
  }
}

export async function getPrograms(): Promise<Program[]> {
  if (isDemoInstance()) {
    const { DEMO_PROGRAMS } = await import('@/lib/demo/content')
    return DEMO_PROGRAMS.filter((p) => p.registrationOpen)
  }
  if (process.env.COMMONS_PLATFORM === 'true') return []
  const client = getWixClient();
  const result = await client.items
    .query("Programs")
    .eq("registrationOpen", true)
    .find();

  return publicPrograms(result.items as Record<string, unknown>[]);
}

export async function getAllPrograms(opts?: {
  reviewHost?: boolean
}): Promise<Program[]> {
  if (isDemoInstance()) {
    const { DEMO_PROGRAMS } = await import('@/lib/demo/content')
    const listed = filterProgramsForPublicCatalog(
      dedupePublicCatalogPrograms(
        DEMO_PROGRAMS.map((p) => withReviewHostCheckout(p, opts?.reviewHost)),
      ),
      opts,
    )
    return appendSpringPacketIfNeeded(listed, opts)
  }
  if (process.env.COMMONS_PLATFORM === 'true') return []
  const client = getWixClient();
  const result = await client.items.query("Programs").find();
  return publicPrograms(result.items as Record<string, unknown>[], opts);
}

export async function getFeaturedPrograms(opts?: {
  reviewHost?: boolean
}): Promise<Program[]> {
  if (isDemoInstance()) {
    const { DEMO_PROGRAMS } = await import('@/lib/demo/content')
    return filterProgramsForPublicCatalog(
      DEMO_PROGRAMS.filter((p) => p.featured),
      opts,
    )
  }
  if (process.env.COMMONS_PLATFORM === 'true') return []
  const client = getWixClient();
  const result = await client.items
    .query("Programs")
    .eq("featured", true)
    .ascending("sortOrder")
    .find();
  return publicPrograms(result.items as Record<string, unknown>[], opts);
}

/** Staging / Preview: treat CMS Fall (and real Spring) rows as open so checkout dry-runs work. */
function withReviewHostCheckout(program: Program, reviewHost?: boolean): Program {
  if (!reviewHost) return program
  // Synthetic Spring stubs are not Wix rows; Register would 404.
  if (program._id.startsWith('staging-')) return program
  if (program.registrationOpen) return program
  return { ...program, registrationOpen: true }
}

/** One CMS row per Fall 2026 packet class (drops duplicate Robotics/Math rows). */
/** Bump when catalog dedupe logic changes (deploy verification). */
export const PUBLIC_CATALOG_DEDUPE_VERSION = 2

function fallCatalogPickerScore(program: Program): number {
  let score = 0
  if (String(program.fallEpClassId ?? '').trim()) score += 40
  if (program.registrationOpen) score += 25
  if (program.featured) score += 15
  const start = String(program.startDate ?? '').slice(0, 10)
  const end = String(program.endDate ?? '').slice(0, 10)
  if (start >= '2026-08-01' && start < '2027-01-01') score += 100
  else if (start.startsWith('2026')) score += 50
  if (end >= '2026-08-01' && end < '2027-01-01') score += 30
  if (start && start < '2026-08-01') score -= 200
  if (end && end < '2026-08-01') score -= 200
  return score
}

/** One CMS row per Fall 2026 packet class (drops duplicate Robotics/Math rows). */
function dedupePublicCatalogPrograms(programs: Program[]): Program[] {
  const pickedIds = new Set(
    selectCurrentFall2026Programs(
      programs.map((p) => ({
        id: p._id,
        name: p.name,
        fallEpClassId: p.fallEpClassId,
        startDate: p.startDate,
        endDate: p.endDate,
        registrationOpen: p.registrationOpen,
        featured: p.featured,
      })),
    ).map((p) => p.id),
  )
  const epFiltered = programs.filter((p) => {
    const packetMatch =
      Boolean(String(p.fallEpClassId ?? '').trim()) || Boolean(matchFall2026EpClass(p.name))
    if (!packetMatch) return true
    return pickedIds.has(p._id)
  })

  // Belt-and-suspenders: duplicate CMS rows often share the same public slug.
  const fallBySlug = new Map<string, Program>()
  const other: Program[] = []
  for (const program of epFiltered) {
    if (resolveProgramSeason(program) !== 'fall-2026') {
      other.push(program)
      continue
    }
    const slug = programPublicSlug(program)
    const existing = fallBySlug.get(slug)
    if (!existing || fallCatalogPickerScore(program) > fallCatalogPickerScore(existing)) {
      fallBySlug.set(slug, program)
    }
  }
  return [...other, ...fallBySlug.values()]
}

/** EP packet Spring cards when the tab is on but CMS has no spring-2027 rows yet. */
function appendSpringPacketIfNeeded(
  programs: Program[],
  opts?: { reviewHost?: boolean },
): Program[] {
  if (!isSpringCatalogListed({ reviewHost: opts?.reviewHost })) return programs
  if (programs.some((p) => resolveProgramSeason(p) === 'spring-2027')) return programs
  return [...programs, ...spring2027StagingCatalogPrograms()]
}

function shapePublicCatalogItems(
  items: Record<string, unknown>[],
  opts?: { reviewHost?: boolean },
): Program[] {
  return items
    .map(mapProgramItem)
    .filter((p) => p.name && !isCmsQaItem(p.name, p.description, p.detail, p.tags))
    .filter((p) => p.registrationOpen || p.featured)
    .map((p) => withReviewHostCheckout(p, opts?.reviewHost))
    .map(overlayFall2026PacketProgram)
    .map(markCatalogTuitionTbd)
}

function publicPrograms(
  items: Record<string, unknown>[],
  opts?: { reviewHost?: boolean },
): Program[] {
  const listed = filterProgramsForPublicCatalog(
    dedupePublicCatalogPrograms(shapePublicCatalogItems(items, opts)),
    opts,
  )
  return appendSpringPacketIfNeeded(listed, opts)
}

export async function getProgramById(id: string): Promise<Program | null> {
  if (isDemoInstance()) {
    const { DEMO_PROGRAMS } = await import('@/lib/demo/content')
    return DEMO_PROGRAMS.find((p) => p._id === id) ?? null
  }
  const client = getWixClient();
  try {
    const item = await client.items.get("Programs", id);
    return mapProgramItem(item as Record<string, unknown>);
  } catch {
    return null;
  }
}
