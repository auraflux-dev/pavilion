import 'server-only'

import { getPageStrings } from '@/lib/api/page-strings'
import {
  CURRICULUM_PAGE_DEFAULTS,
  DONATE_FORM_DEFAULTS,
  LEGAL_SHELL_DEFAULTS,
  RFC_DEFAULTS,
  SURVEY_DEFAULTS,
  VISITOR_VIDEO_DEFAULTS,
} from '@/lib/defaults/visitor-string-defaults'

export { visitorString } from '@/lib/api/visitor-strings-shared'

export async function getVisitorVideoStrings(): Promise<Record<string, string>> {
  const cms = await getPageStrings('visitor-videos')
  return { ...VISITOR_VIDEO_DEFAULTS, ...cms }
}

export async function getDonateFormStrings(): Promise<Record<string, string>> {
  const cms = await getPageStrings('donate-form')
  return { ...DONATE_FORM_DEFAULTS, ...cms }
}

export async function getRfcPromoStrings(): Promise<Record<string, string>> {
  const cms = await getPageStrings('rfc-promo')
  return { ...RFC_DEFAULTS, ...cms }
}

export async function getCurriculumPageStrings(): Promise<Record<string, string>> {
  const cms = await getPageStrings('programs-curriculum')
  return { ...CURRICULUM_PAGE_DEFAULTS, ...cms }
}

export async function getLegalShellStrings(): Promise<Record<string, string>> {
  const cms = await getPageStrings('legal-shell')
  return { ...LEGAL_SHELL_DEFAULTS, ...cms }
}

export async function getSurveyStrings(): Promise<Record<string, string>> {
  const cms = await getPageStrings('survey-strings')
  return { ...SURVEY_DEFAULTS, ...cms }
}
