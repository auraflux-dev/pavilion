import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { mapSurveyItem } from '@/lib/surveys/parse'
import type { SurveyBranding, SurveyField, SurveyFieldType } from '@/lib/surveys/types'

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

const FIELD_TYPES: SurveyFieldType[] = ['text', 'textarea', 'email', 'choice', 'grade']

function canManageSurveys(req: NextRequest) {
  return getStaffSession(req).then((session) =>
    requireStaffRole(session?.staff ?? null, ['marketing', 'secretary', 'admin']) ? session : null,
  )
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

function slugify(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function normalizeFields(raw: unknown): SurveyField[] {
  if (!Array.isArray(raw)) return []
  const fields: SurveyField[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const type = String(row.type ?? 'text').toLowerCase() as SurveyFieldType
    if (!FIELD_TYPES.includes(type)) continue
    const label = String(row.label ?? '').trim()
    if (!label) continue
    const id =
      slugify(String(row.id ?? label)) || `q${fields.length + 1}`
    const field: SurveyField = {
      id,
      type,
      label,
      required: row.required === true,
      placeholder: String(row.placeholder ?? '').trim() || undefined,
    }
    if (type === 'choice' || type === 'grade') {
      const options = Array.isArray(row.options)
        ? row.options.map((o) => String(o).trim()).filter(Boolean)
        : String(row.optionsText ?? '')
            .split(/[,\n]/)
            .map((o) => o.trim())
            .filter(Boolean)
      field.options = type === 'grade' && options.length === 0 ? ['6', '7', '8'] : options
    }
    fields.push(field)
  }
  return fields
}

function normalizeBranding(raw: unknown): SurveyBranding {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    accentColor: String(row.accentColor ?? 'var(--brand-green)').trim() || 'var(--brand-green)',
    thankYouMessage:
      String(row.thankYouMessage ?? 'Thank you. Your response was recorded.').trim() ||
      'Thank you. Your response was recorded.',
  }
}

export async function GET(req: NextRequest) {
  if (!(await canManageSurveys(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const slug = req.nextUrl.searchParams.get('slug')?.trim() ?? ''
  const format = req.nextUrl.searchParams.get('format')
  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'

  try {
    const client = getWixClient()
    let query = client.items.query('SurveyResponses')
    if (slug) query = query.eq('surveySlug', slug)
    const [result, definitionsResult] = await Promise.all([
      query.descending('submittedAt').limit(1000).find(),
      includeInactive
        ? client.items.query('Surveys').ascending('title').limit(100).find()
        : client.items.query('Surveys').eq('active', true).ascending('title').limit(100).find(),
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

    const definitions = (definitionsResult.items ?? [])
      .map((item) => {
        const mapped = mapSurveyItem(item)
        if (!mapped) return null
        const data = (item as { active?: boolean }).active
        return {
          ...mapped,
          active: data !== false,
          responseCount: counts.get(mapped.slug) ?? 0,
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    const availableSurveys = definitions.map((survey) => ({
      id: survey.id,
      slug: survey.slug,
      title: survey.title,
      description: survey.description,
      showInPortal: survey.showInPortal,
      active: survey.active,
      responseCount: survey.responseCount,
    }))

    const knownSlugs = new Set(availableSurveys.map((survey) => survey.slug))
    const historicalSurveys = Array.from(
      responses
        .reduce((map, response) => {
          if (!knownSlugs.has(response.surveySlug) && !map.has(response.surveySlug)) {
            map.set(response.surveySlug, {
              id: '',
              slug: response.surveySlug,
              title: response.surveyTitle,
              description: '',
              showInPortal: false,
              active: false,
              responseCount: counts.get(response.surveySlug) ?? 0,
            })
          }
          return map
        }, new Map<string, (typeof availableSurveys)[number]>())
        .values(),
    )

    return NextResponse.json({
      surveys: [...availableSurveys, ...historicalSurveys],
      definitions,
      responses,
    })
  } catch (err) {
    console.error('/api/staff/surveys GET error:', err)
    return NextResponse.json({ error: 'Could not load survey responses' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await canManageSurveys(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const slug = slugify(String(body.slug ?? body.title ?? ''))
    const title = String(body.title ?? '').trim()
    const description = String(body.description ?? '').trim()
    const intro = String(body.intro ?? description).trim()
    const fields = normalizeFields(body.fields)
    const branding = normalizeBranding(body.branding)
    const showInPortal = body.showInPortal !== false
    const requireLogin = body.requireLogin === true
    const audience = requireLogin || body.audience === 'members' ? 'members' : 'all'
    const active = body.active !== false

    const powrEmbedHtml = String(body.powrEmbedHtml ?? '').trim()

    if (!slug) return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (!fields.length && !powrEmbedHtml) {
      return NextResponse.json(
        { error: 'Add at least one question, or paste a POWR embed' },
        { status: 400 },
      )
    }

    const client = getWixClient()
    const existing = await client.items.query('Surveys').eq('slug', slug).limit(1).find()
    if (existing.items?.length) {
      return NextResponse.json({ error: 'That slug is already used. pick another.' }, { status: 409 })
    }

    const row = {
      slug,
      title,
      description,
      intro,
      fieldsJson: JSON.stringify(fields),
      brandingJson: JSON.stringify(branding),
      audience,
      showInPortal,
      requireLogin,
      createdBy: session.staff.name || session.email,
      active,
      powrEmbedHtml: powrEmbedHtml || null,
    }

    const inserted = await client.items.insert('Surveys', row)
    const mapped = mapSurveyItem({ ...inserted, ...row, _id: (inserted as { _id?: string })._id })
    return NextResponse.json({ ok: true, survey: mapped })
  } catch (err) {
    console.error('/api/staff/surveys POST error:', err)
    return NextResponse.json({ error: 'Could not create survey' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await canManageSurveys(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'Survey id is required' }, { status: 400 })

    const client = getWixClient()
    const existing = (await client.items.get('Surveys', id)) as Record<string, unknown>
    if (!existing?._id) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const nextSlug =
      body.slug != null ? slugify(String(body.slug)) : slugify(String(existing.slug ?? ''))
    if (!nextSlug) return NextResponse.json({ error: 'Slug is required' }, { status: 400 })

    if (nextSlug !== String(existing.slug ?? '')) {
      const clash = await client.items.query('Surveys').eq('slug', nextSlug).limit(5).find()
      if ((clash.items ?? []).some((item) => String((item as { _id?: string })._id) !== id)) {
        return NextResponse.json({ error: 'That slug is already used. pick another.' }, { status: 409 })
      }
    }

    const title =
      body.title != null ? String(body.title).trim() : String(existing.title ?? '').trim()
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    const fields =
      body.fields != null
        ? normalizeFields(body.fields)
        : normalizeFields(
            (() => {
              try {
                return JSON.parse(String(existing.fieldsJson ?? '[]'))
              } catch {
                return []
              }
            })(),
          )
    const powrEmbedHtml =
      body.powrEmbedHtml != null
        ? String(body.powrEmbedHtml).trim()
        : String(existing.powrEmbedHtml ?? '').trim()

    if (!fields.length && !powrEmbedHtml) {
      return NextResponse.json(
        { error: 'Add at least one question, or paste a POWR embed' },
        { status: 400 },
      )
    }

    const branding =
      body.branding != null
        ? normalizeBranding(body.branding)
        : normalizeBranding(
            (() => {
              try {
                return JSON.parse(String(existing.brandingJson ?? '{}'))
              } catch {
                return {}
              }
            })(),
          )

    const requireLogin =
      body.requireLogin != null ? body.requireLogin === true : existing.requireLogin === true
    const audience = requireLogin || body.audience === 'members' ? 'members' : 'all'

    const updates = {
      ...existing,
      _id: id,
      slug: nextSlug,
      title,
      description:
        body.description != null
          ? String(body.description).trim()
          : String(existing.description ?? ''),
      intro:
        body.intro != null ? String(body.intro).trim() : String(existing.intro ?? ''),
      fieldsJson: JSON.stringify(fields),
      brandingJson: JSON.stringify(branding),
      audience,
      showInPortal:
        body.showInPortal != null ? body.showInPortal !== false : existing.showInPortal !== false,
      requireLogin,
      active: body.active != null ? body.active !== false : existing.active !== false,
      powrEmbedHtml: powrEmbedHtml || null,
    }

    await client.items.update('Surveys', updates as Parameters<typeof client.items.update>[1])
    const mapped = mapSurveyItem(updates)
    return NextResponse.json({ ok: true, survey: mapped })
  } catch (err) {
    console.error('/api/staff/surveys PATCH error:', err)
    return NextResponse.json({ error: 'Could not update survey' }, { status: 500 })
  }
}
