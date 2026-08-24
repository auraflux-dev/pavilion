/**
 * Program landing CMS fields ↔ code defaults in landing-copy.ts.
 * Staff forms show effective live copy; public pages merge CMS overrides per field.
 */
import type { Program } from '@/lib/api/programs'
import {
  programLandingCopy,
  type ProgramCurriculumWeek,
  type ProgramLandingCopy,
} from '@/lib/programs/landing-copy'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import { programEpClassId } from '@/lib/programs/season-companion'
import { resolveProgramSeason } from '@/lib/programs/season'

export type LandingCmsFields = {
  landingEyebrow: string
  landingPitch: string
  landingHighlights: string
  landingVideoUrl: string
  landingCurriculumTitle: string
  landingCurriculum: string
}

const EMPTY_LANDING: LandingCmsFields = {
  landingEyebrow: '',
  landingPitch: '',
  landingHighlights: '',
  landingVideoUrl: '',
  landingCurriculumTitle: '',
  landingCurriculum: '',
}

function trimField(value: unknown): string {
  return String(value ?? '').trim()
}

export function parseCurriculumLines(raw: string): ProgramCurriculumWeek[] {
  const out: ProgramCurriculumWeek[] = []
  for (const line of String(raw ?? '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split('|').map((s) => s.trim())
    const week = Number(parts[0])
    if (!Number.isFinite(week) || week <= 0) continue
    out.push({
      week,
      title: parts[1] ?? '',
      focus: parts[2] || undefined,
    })
  }
  return out
}

export function curriculumToLines(curriculum: ProgramCurriculumWeek[]): string {
  return curriculum
    .map((row) =>
      row.focus ? `${row.week}|${row.title}|${row.focus}` : `${row.week}|${row.title}`,
    )
    .join('\n')
}

export function landingCopyToCmsFields(copy: ProgramLandingCopy | null): LandingCmsFields {
  if (!copy) return { ...EMPTY_LANDING }
  return {
    landingEyebrow: copy.eyebrow,
    landingPitch: copy.pitch,
    landingHighlights: copy.highlights.join('\n'),
    landingVideoUrl: copy.videoUrl ?? '',
    landingCurriculumTitle: copy.curriculumTitle,
    landingCurriculum: curriculumToLines(copy.curriculum),
  }
}

export function codeLandingDefaults(
  program: Pick<Program, 'fallEpClassId' | 'name' | 'season'>,
): LandingCmsFields {
  const epId = programEpClassId(program)
  const season = resolveProgramSeason(program)
  return landingCopyToCmsFields(programLandingCopy(epId, season))
}

/** Values staff should see: CMS when set, else code defaults (matches public page). */
export function effectiveLandingFields(
  program: Pick<
    Program,
    | 'fallEpClassId'
    | 'name'
    | 'season'
    | 'landingEyebrow'
    | 'landingPitch'
    | 'landingHighlights'
    | 'landingVideoUrl'
    | 'landingCurriculumTitle'
    | 'landingCurriculum'
  >,
): LandingCmsFields {
  const defaults = codeLandingDefaults(program)
  return {
    landingEyebrow: trimField(program.landingEyebrow) || defaults.landingEyebrow,
    landingPitch: trimField(program.landingPitch) || defaults.landingPitch,
    landingHighlights: trimField(program.landingHighlights) || defaults.landingHighlights,
    landingVideoUrl: trimField(program.landingVideoUrl) || defaults.landingVideoUrl,
    landingCurriculumTitle:
      trimField(program.landingCurriculumTitle) || defaults.landingCurriculumTitle,
    landingCurriculum: trimField(program.landingCurriculum) || defaults.landingCurriculum,
  }
}

export function parseLandingCmsPartial(
  program: Pick<
    Program,
    | 'landingEyebrow'
    | 'landingPitch'
    | 'landingHighlights'
    | 'landingVideoUrl'
    | 'landingCurriculumTitle'
    | 'landingCurriculum'
  >,
): Partial<ProgramLandingCopy> {
  const out: Partial<ProgramLandingCopy> = {}
  const eyebrow = normalizePlainCopy(trimField(program.landingEyebrow))
  const pitch = normalizePlainCopy(trimField(program.landingPitch))
  const highlights = trimField(program.landingHighlights)
    .split('\n')
    .map((s) => normalizePlainCopy(s).trim())
    .filter(Boolean)
  const curriculum = parseCurriculumLines(trimField(program.landingCurriculum))
  const videoUrl = trimField(program.landingVideoUrl)
  const curriculumTitle = normalizePlainCopy(trimField(program.landingCurriculumTitle))

  if (eyebrow) out.eyebrow = eyebrow
  if (pitch) out.pitch = pitch
  if (highlights.length) out.highlights = highlights
  if (videoUrl) out.videoUrl = videoUrl
  if (curriculumTitle) out.curriculumTitle = curriculumTitle
  if (curriculum.length) out.curriculum = curriculum
  return out
}

/** CMS overrides per field, then landing-copy.ts defaults. */
export function resolveProgramLandingCopy(
  program: Pick<
    Program,
    | 'fallEpClassId'
    | 'name'
    | 'season'
    | 'landingEyebrow'
    | 'landingPitch'
    | 'landingHighlights'
    | 'landingVideoUrl'
    | 'landingCurriculumTitle'
    | 'landingCurriculum'
  >,
  epId?: string,
  season?: string,
): ProgramLandingCopy | null {
  const resolvedEp = epId || programEpClassId(program)
  const resolvedSeason = season || resolveProgramSeason(program)
  const fallback = programLandingCopy(resolvedEp, resolvedSeason)
  const cms = parseLandingCmsPartial(program)
  if (!fallback && Object.keys(cms).length === 0) return null

  return {
    eyebrow: cms.eyebrow ?? fallback?.eyebrow ?? 'Program',
    pitch: cms.pitch ?? fallback?.pitch ?? '',
    highlights: cms.highlights ?? fallback?.highlights ?? [],
    videoUrl: cms.videoUrl ?? fallback?.videoUrl,
    curriculumTitle: cms.curriculumTitle ?? fallback?.curriculumTitle ?? 'Curriculum',
    curriculum: cms.curriculum ?? fallback?.curriculum ?? [],
  }
}
