import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

type SurveyResponseRow = {
  _id?: string
  surveySlug?: string
  surveyTitle?: string
  respondentEmail?: string
  respondentName?: string
  answersJson?: string
  channel?: string
  submittedAt?: string | Date
}

function parseAnswers(value: unknown): Record<string, string> {
  try {
    const parsed = JSON.parse(String(value ?? '{}'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).map(([key, answer]) => [key, String(answer ?? '')]),
    )
  } catch {
    return {}
  }
}

function csvCell(value: unknown): string {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'secretary', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const slug = req.nextUrl.searchParams.get('slug')?.trim() ?? ''
  const format = req.nextUrl.searchParams.get('format')

  try {
    const client = getWixClient()
    let query = client.items.query('SurveyResponses')
    if (slug) query = query.eq('surveySlug', slug)
    const [result, definitionsResult] = await Promise.all([
      query.descending('submittedAt').limit(1000).find(),
      client.items.query('Surveys').eq('active', true).ascending('title').limit(100).find(),
    ])
    const responses = (result.items as SurveyResponseRow[]).map((row) => ({
      id: row._id ?? '',
      surveySlug: String(row.surveySlug ?? ''),
      surveyTitle: String(row.surveyTitle ?? row.surveySlug ?? 'Survey'),
      respondentEmail: String(row.respondentEmail ?? ''),
      respondentName: String(row.respondentName ?? ''),
      answers: parseAnswers(row.answersJson),
      channel: String(row.channel ?? 'link'),
      submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : '',
    }))

    if (format === 'csv') {
      const answerKeys = Array.from(
        new Set(responses.flatMap((response) => Object.keys(response.answers))),
      )
      const headers = [
        'surveySlug',
        'surveyTitle',
        'respondentName',
        'respondentEmail',
        'channel',
        'submittedAt',
        ...answerKeys,
      ]
      const lines = [
        headers.map(csvCell).join(','),
        ...responses.map((response) =>
          [
            response.surveySlug,
            response.surveyTitle,
            response.respondentName,
            response.respondentEmail,
            response.channel,
            response.submittedAt,
            ...answerKeys.map((key) => response.answers[key] ?? ''),
          ]
            .map(csvCell)
            .join(','),
        ),
      ]
      const filename = `${slug || 'all-surveys'}-responses.csv`
      return new NextResponse(`\uFEFF${lines.join('\r\n')}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const counts = responses.reduce((map, response) => {
      map.set(response.surveySlug, (map.get(response.surveySlug) ?? 0) + 1)
      return map
    }, new Map<string, number>())
    const availableSurveys = definitionsResult.items.map((item) => ({
      slug: String(item.slug ?? ''),
      title: String(item.title ?? item.slug ?? 'Survey'),
      description: String(item.description ?? ''),
      showInPortal: Boolean(item.showInPortal),
      responseCount: counts.get(String(item.slug ?? '')) ?? 0,
    })).filter((survey) => survey.slug)
    const knownSlugs = new Set(availableSurveys.map((survey) => survey.slug))
    const historicalSurveys = Array.from(
      responses.reduce((map, response) => {
        if (!knownSlugs.has(response.surveySlug) && !map.has(response.surveySlug)) {
          map.set(response.surveySlug, {
            slug: response.surveySlug,
            title: response.surveyTitle,
            description: '',
            showInPortal: false,
            responseCount: counts.get(response.surveySlug) ?? 0,
          })
        }
        return map
      }, new Map<string, { slug: string; title: string; description: string; showInPortal: boolean; responseCount: number }>()).values(),
    )

    return NextResponse.json({ surveys: [...availableSurveys, ...historicalSurveys], responses })
  } catch (err) {
    console.error('/api/staff/surveys GET error:', err)
    return NextResponse.json({ error: 'Could not load survey responses' }, { status: 500 })
  }
}
