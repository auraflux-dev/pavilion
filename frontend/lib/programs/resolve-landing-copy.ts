/**
 * Re-exports for program landing copy resolution.
 * Implementation lives in landing-fields.ts (field-by-field CMS merge).
 */
export {
  parseCurriculumLines,
  curriculumToLines,
  codeLandingDefaults,
  effectiveLandingFields,
  landingCopyToCmsFields,
  resolveProgramLandingCopy,
  type LandingCmsFields,
} from '@/lib/programs/landing-fields'

export type { ProgramCurriculumWeek, ProgramLandingCopy } from '@/lib/programs/landing-copy'
