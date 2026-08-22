import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import { getWixClient } from "@/lib/wix-client";
import { formatProgramSchedule } from "@/lib/programs/schedule";
import { memberPriorityUntilIso } from '@/lib/programs/registration-access'
import { filterProgramsForPublicCatalog } from '@/lib/programs/season'

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

  return await publicPrograms(result.items as Record<string, unknown>[]);
}

export async function getAllPrograms(): Promise<Program[]> {
  if (isDemoInstance()) {
    const { DEMO_PROGRAMS } = await import('@/lib/demo/content')
    return [...DEMO_PROGRAMS]
  }
  if (process.env.COMMONS_PLATFORM === 'true') return []
  const client = getWixClient();
  const result = await client.items.query("Programs").find();
  return await publicPrograms(result.items as Record<string, unknown>[]);
}

export async function getFeaturedPrograms(): Promise<Program[]> {
  if (isDemoInstance()) {
    const { DEMO_PROGRAMS } = await import('@/lib/demo/content')
    return DEMO_PROGRAMS.filter((p) => p.featured)
  }
  if (process.env.COMMONS_PLATFORM === 'true') return []
  const client = getWixClient();
  const result = await client.items
    .query("Programs")
    .eq("featured", true)
    .ascending("sortOrder")
    .find();
  return await publicPrograms(result.items as Record<string, unknown>[]);
}

async function publicPrograms(items: Record<string, unknown>[]): Promise<Program[]> {
  const { isProgramsReviewHost } = await import('@/lib/programs/public-access')
  const reviewHost = await isProgramsReviewHost()
  return filterProgramsForPublicCatalog(
    items
      .map(mapProgramItem)
      .filter((p) => p.name && !isCmsQaItem(p.name, p.description, p.detail, p.tags))
      // Public catalog: open registration and/or featured (keeps legacy closed CMS rows off the site).
      .filter((p) => p.registrationOpen || p.featured),
    { reviewHost },
  )
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
