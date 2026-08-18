import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { getWixClient } from '@/lib/wix-client'
import { mapSurveyItem } from '@/lib/surveys/parse'
import type { SurveyDefinition } from '@/lib/surveys/types'

function isPublicSurvey(s: SurveyDefinition | null): s is SurveyDefinition {
  return Boolean(s && !isCmsQaItem(s.title, s.slug, s.description))
}

export async function getActiveSurveys(): Promise<SurveyDefinition[]> {
  const { isDemoInstance } = await import('@/lib/demo/instance')
  if (isDemoInstance()) return []
  try {
    const client = getWixClient()
    const result = await client.items.query('Surveys').eq('active', true).find()
    return (result.items ?? [])
      .map(mapSurveyItem)
      .filter(isPublicSurvey)
  } catch {
    return []
  }
}

export async function getSurveyBySlug(slug: string): Promise<SurveyDefinition | null> {
  const { isDemoInstance } = await import('@/lib/demo/instance')
  if (isDemoInstance()) return null
  try {
    const client = getWixClient()
    const result = await client.items.query('Surveys').eq('slug', slug).eq('active', true).find()
    const item = result.items?.[0]
    if (!item) return null
    const survey = mapSurveyItem(item)
    return isPublicSurvey(survey) ? survey : null
  } catch {
    return null
  }
}

export async function getPortalSurveys(): Promise<SurveyDefinition[]> {
  const all = await getActiveSurveys()
  return all.filter((s) => s.showInPortal)
}
