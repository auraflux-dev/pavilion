import type { Program } from '@/lib/api/programs'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import { codeLandingDefaults } from '@/lib/programs/landing-fields'
import {
  spring2027PacketCmsDefaults,
  spring2027StagingCatalogPrograms,
  springEpClassById,
} from '@/lib/programs/spring-2027-ep'
import { programEpClassId } from '@/lib/programs/season-companion'
import { resolveProgramSeason } from '@/lib/programs/season'

/** CMS rows to insert when Spring 2027 packet classes are missing. */
export function missingSpring2027SeedPrograms(existing: Program[]): Program[] {
  const haveEp = new Set(
    existing
      .filter((p) => resolveProgramSeason(p) === 'spring-2027')
      .map((p) => programEpClassId(p))
      .filter(Boolean),
  )
  return spring2027StagingCatalogPrograms().filter((p) => {
    const ep = programEpClassId(p) || String(p.fallEpClassId ?? '').trim()
    return ep && !haveEp.has(ep)
  })
}

export function spring2027ProgramInsertRow(staging: Program): Record<string, unknown> {
  const epId = programEpClassId(staging) || String(staging.fallEpClassId ?? '').trim()
  const klass = epId ? springEpClassById(epId) : undefined
  const packet = klass ? spring2027PacketCmsDefaults(klass) : {}
  const base = {
    ...staging,
    fallEpClassId: epId,
    season: 'spring-2027',
    fee: Number(staging.fee ?? 0) || 0,
    tags: 'spring-2027,fee-tbd',
    registrationOpen: false,
    featured: true,
  } as Program
  const landing = codeLandingDefaults(base)
  return {
    name: String(staging.name ?? '').trim(),
    description: normalizePlainCopy(String(staging.description ?? '')),
    fee: Number(staging.fee ?? 0) || 0,
    capacity: Number(staging.capacity ?? 0) || 0,
    registrationOpen: false,
    requiresWaiver: staging.requiresWaiver !== false,
    grades: String(staging.grades ?? '6-8').trim(),
    category: String(staging.category ?? '').trim(),
    paymentType: 'wix',
    schedule: String(staging.schedule ?? '').trim(),
    detail: '',
    tags: 'spring-2027,fee-tbd',
    featured: true,
    sortOrder: Number(staging.sortOrder ?? 0) || 0,
    image: '',
    dayOfWeek: String(packet.dayOfWeek ?? staging.dayOfWeek ?? '').trim(),
    classTime: String(packet.classTime ?? staging.classTime ?? '').trim(),
    durationWeeks: Number(packet.durationWeeks ?? staging.durationWeeks ?? 0) || 0,
    startDate: String(packet.startDate ?? staging.startDate ?? '').trim().slice(0, 10) || null,
    endDate: String(packet.endDate ?? staging.endDate ?? '').trim().slice(0, 10) || null,
    location: String(packet.location ?? staging.location ?? '').trim(),
    instructorName: String(packet.instructorName ?? staging.instructorName ?? '').trim(),
    meetingDates: String(packet.meetingDates ?? staging.meetingDates ?? '').trim(),
    skipsNote: String(packet.skipsNote ?? staging.skipsNote ?? '').trim(),
    memberDiscountNote: String(staging.memberDiscountNote ?? '').trim(),
    fallEpClassId: epId,
    season: 'spring-2027',
    landingEyebrow: normalizePlainCopy(String(landing.landingEyebrow ?? '')),
    landingPitch: normalizePlainCopy(String(landing.landingPitch ?? '')),
    landingHighlights: normalizePlainCopy(String(landing.landingHighlights ?? '')),
    landingVideoUrl: String(landing.landingVideoUrl ?? '').trim(),
    landingCurriculumTitle: normalizePlainCopy(String(landing.landingCurriculumTitle ?? '')),
    landingCurriculum: normalizePlainCopy(String(landing.landingCurriculum ?? '')),
  }
}
