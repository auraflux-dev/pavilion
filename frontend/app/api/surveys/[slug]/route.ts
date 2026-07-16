import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getSurveyBySlug } from '@/lib/api/surveys'
import { getWixClient } from '@/lib/wix-client'
import type { SurveyResponsePayload } from '@/lib/surveys/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const survey = await getSurveyBySlug(slug)
  if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    survey: {
      slug: survey.slug,
      title: survey.title,
      description: survey.description,
      intro: survey.intro,
      fields: survey.fields,
      branding: survey.branding,
      requireLogin: survey.requireLogin,
    },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const survey = await getSurveyBySlug(slug)
  if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const session = await getMemberSession(req)
  if (survey.requireLogin && !session) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as SurveyResponsePayload
    const answers = body.answers ?? {}
    if (!Object.keys(answers).length) {
      return NextResponse.json({ error: 'No answers provided' }, { status: 400 })
    }

    for (const field of survey.fields) {
      if (field.required && !String(answers[field.id] ?? '').trim()) {
        return NextResponse.json({ error: `Missing required field: ${field.label}` }, { status: 400 })
      }
    }

    const channel = body.channel ?? 'link'
    const respondentEmail = session?.email ?? String(answers.email ?? '').trim()
    const respondentName = session
      ? `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()
      : String(answers.name ?? '').trim()

    const client = getWixClient()
    await client.items.insert('SurveyResponses', {
      surveyId: survey.id,
      surveySlug: survey.slug,
      surveyTitle: survey.title,
      respondentEmail,
      respondentName,
      answersJson: JSON.stringify(answers),
      channel,
      submittedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      thankYou: survey.branding.thankYouMessage ?? 'Thank you!',
    })
  } catch (err) {
    console.error('/api/surveys/[slug] POST error:', err)
    return NextResponse.json({ error: 'Failed to submit survey' }, { status: 500 })
  }
}
