import type { Program } from '@/lib/api/programs'
import {
  programLandingCopy,
  type ProgramCurriculumWeek,
  type ProgramLandingCopy,
} from '@/lib/programs/landing-copy'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'

function parseCurriculumLines(raw: string): ProgramCurriculumWeek[] {
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

function landingFromProgram(program: Program): ProgramLandingCopy | null {
  const pitch = normalizePlainCopy(String(program.landingPitch ?? '')).trim()
  const highlights = String(program.landingHighlights ?? '')
    .split('\n')
    .map((s) => normalizePlainCopy(s).trim())
    .filter(Boolean)
  const curriculum = parseCurriculumLines(String(program.landingCurriculum ?? ''))
  if (!pitch && highlights.length === 0 && curriculum.length === 0) return null

  return {
    eyebrow: normalizePlainCopy(String(program.landingEyebrow ?? '')).trim() || 'Program',
    pitch,
    highlights,
    videoUrl: String(program.landingVideoUrl ?? '').trim() || undefined,
    curriculumTitle:
      normalizePlainCopy(String(program.landingCurriculumTitle ?? '')).trim() || 'Curriculum',
    curriculum,
  }
}

/** CMS program landing fields first, then code defaults in landing-copy.ts */
export function resolveProgramLandingCopy(
  program: Program,
  epId?: string,
  season?: string,
): ProgramLandingCopy | null {
  return landingFromProgram(program) ?? programLandingCopy(epId, season)
}
