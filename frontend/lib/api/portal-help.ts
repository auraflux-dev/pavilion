import { getPortalSurveys } from '@/lib/api/surveys'
import { PAGE_CONTENT_DEFAULTS } from '@/lib/defaults/page-content'
import { getPageContent } from '@/lib/api/page-content'

export interface PortalHelpItem {
  question: string
  answer: string
}

export async function getPortalHelpItems(): Promise<PortalHelpItem[]> {
  const content = await getPageContent('portal-help')
  const bullets =
    content.bullets.length > 0
      ? content.bullets
      : PAGE_CONTENT_DEFAULTS['portal-help']?.bullets ?? []

  const items: PortalHelpItem[] = []
  for (const line of bullets) {
    const i = line.indexOf('|')
    if (i <= 0) continue
    const question = line.slice(0, i).trim()
    const answer = line.slice(i + 1).trim()
    if (question && answer) items.push({ question, answer })
  }
  return items
}

export async function getPortalSurveyList() {
  return getPortalSurveys()
}
