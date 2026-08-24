/** Fields staff edit on a program card (batched Save). */
export const PROGRAM_DRAFT_KEYS = [
  'name',
  'description',
  'detail',
  'fee',
  'capacity',
  'grades',
  'category',
  'season',
  'instructorName',
  'location',
  'dayOfWeek',
  'classTime',
  'durationWeeks',
  'startDate',
  'endDate',
  'skipsNote',
  'memberDiscountNote',
  'registrationOpen',
  'featured',
  'memberPriorityUntil',
  'image',
  'cheddarupUrl',
  'paymentType',
  'sortOrder',
  'tags',
  'requiresWaiver',
  'landingEyebrow',
  'landingPitch',
  'landingHighlights',
  'landingVideoUrl',
  'landingCurriculumTitle',
  'landingCurriculum',
] as const

export type ProgramDraftKey = (typeof PROGRAM_DRAFT_KEYS)[number]

export function mergeProgramDraft<T extends Record<string, unknown>>(
  saved: T,
  draft?: Partial<T>,
): T {
  if (!draft) return saved
  return { ...saved, ...draft }
}

export function programDraftPatch<T extends Record<string, unknown>>(
  saved: T,
  draft?: Partial<T>,
): Partial<T> {
  if (!draft) return {}
  const patch: Partial<T> = {}
  for (const key of PROGRAM_DRAFT_KEYS) {
    if (!(key in draft)) continue
    const next = draft[key as keyof T]
    const prev = saved[key as keyof T]
    if (next !== prev) patch[key as keyof T] = next
  }
  return patch
}

export function isProgramDraftDirty<T extends Record<string, unknown>>(
  saved: T,
  draft?: Partial<T>,
): boolean {
  return Object.keys(programDraftPatch(saved, draft)).length > 0
}
