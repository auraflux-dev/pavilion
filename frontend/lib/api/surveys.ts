import { getWixClient } from '@/lib/wix-client'
import { mapSurveyItem } from '@/lib/surveys/parse'
import type { SurveyDefinition } from '@/lib/surveys/types'

export async function getActiveSurveys(): Promise<SurveyDefinition[]> {
  try {
    const client = getWixClient()
    const result = await client.items.query('Surveys').eq('active', true).find()
    return (result.items ?? [])
      .map(mapSurveyItem)
      .filter((s): s is SurveyDefinition => s !== null)
  } catch {
    return []
  }
}

export async function getSurveyBySlug(slug: string): Promise<SurveyDefinition | null> {
  try {
    const client = getWixClient()
    const result = await client.items.query('Surveys').eq('slug', slug).eq('active', true).find()
    const item = result.items?.[0]
    if (!item) return null
    return mapSurveyItem(item)
  } catch {
    return null
  }
}

export async function getPortalSurveys(): Promise<SurveyDefinition[]> {
  const all = await getActiveSurveys()
  return all.filter((s) => s.showInPortal)
}
