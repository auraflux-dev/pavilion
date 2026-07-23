import { NextResponse } from 'next/server'
import { getPortalSurveys } from '@/lib/api/surveys'

/** GET /api/surveys. active surveys for member portal listing */
export async function GET() {
  try {
    const surveys = await getPortalSurveys()
    return NextResponse.json({
      surveys: surveys.map((s) => ({
        slug: s.slug,
        title: s.title,
        description: s.description,
        requireLogin: s.requireLogin,
      })),
    })
  } catch (err) {
    console.error('/api/surveys GET error:', err)
    return NextResponse.json({ error: 'Failed to load surveys' }, { status: 500 })
  }
}
