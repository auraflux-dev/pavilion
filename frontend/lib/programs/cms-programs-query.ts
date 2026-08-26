/**
 * Staff: load every Programs CMS row (paginated).
 */
import { getWixClient } from '@/lib/wix-client'
import type { Program } from '@/lib/api/programs'

export function mapCmsProgramItem(item: Record<string, unknown>): Program {
  return {
    _id: String(item._id ?? ''),
    name: String(item.name ?? ''),
    description: String(item.description ?? ''),
    fee: Number(item.fee ?? 0) || 0,
    capacity: Number(item.capacity ?? 0) || 0,
    registrationOpen: item.registrationOpen === true,
    requiresWaiver: item.requiresWaiver === true,
    grades: String(item.grades ?? ''),
    category: String(item.category ?? ''),
    featured: item.featured === true,
    sortOrder: Number(item.sortOrder ?? 0) || 0,
    dayOfWeek: String(item.dayOfWeek ?? ''),
    classTime: String(item.classTime ?? ''),
    durationWeeks: Number(item.durationWeeks ?? 0) || 0,
    startDate: String(item.startDate ?? '').slice(0, 10),
    endDate: String(item.endDate ?? '').slice(0, 10),
    location: String(item.location ?? ''),
    instructorName: String(item.instructorName ?? ''),
    meetingDates: String(item.meetingDates ?? ''),
    skipsNote: String(item.skipsNote ?? ''),
    memberDiscountNote: String(item.memberDiscountNote ?? ''),
    fallEpClassId: String(item.fallEpClassId ?? ''),
    season: String(item.season ?? ''),
    tags: String(item.tags ?? ''),
    schedule: String(item.schedule ?? ''),
    landingEyebrow: String(item.landingEyebrow ?? ''),
    landingPitch: String(item.landingPitch ?? ''),
    landingHighlights: String(item.landingHighlights ?? ''),
    landingVideoUrl: String(item.landingVideoUrl ?? ''),
    landingCurriculumTitle: String(item.landingCurriculumTitle ?? ''),
    landingCurriculum: String(item.landingCurriculum ?? ''),
  } as Program
}

export async function fetchAllCmsPrograms(): Promise<Program[]> {
  const client = getWixClient()
  const items: Record<string, unknown>[] = []
  let skip = 0
  for (;;) {
    const result = await client.items
      .query('Programs')
      .ascending('name')
      .limit(100)
      .skip(skip)
      .find()
    const page = (result.items ?? []) as Record<string, unknown>[]
    items.push(...page)
    if (page.length < 100) break
    skip += 100
    if (skip > 2000) break
  }
  return items.map(mapCmsProgramItem)
}
