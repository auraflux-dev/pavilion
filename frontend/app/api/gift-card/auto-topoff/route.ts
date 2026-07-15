/**
 * GET  /api/gift-card/auto-topoff?studentId=xxx  — fetch current settings
 * POST /api/gift-card/auto-topoff                 — save settings
 * Body: { studentId, enabled, thresholdDollars, reloadDollars }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { getWixClient } from '@/lib/wix-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'

async function getEmailFromRequest(req: NextRequest): Promise<string | null> {
  const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
  if (!tokensCookie) return null
  try {
    const tokens = JSON.parse(tokensCookie)
    const oauthClient = createOAuthClient(tokens)
    const { member } = await oauthClient.members.getCurrentMember({ fieldsets: ['FULL'] })
    return member?.loginEmail ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const email = await getEmailFromRequest(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = req.nextUrl.searchParams.get('studentId')
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

  try {
    const adminClient = getWixClient()
    const student = await adminClient.items.get('Students', studentId) as any
    if (!student || student.parentEmail !== email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      enabled: student.autoTopOff ?? false,
      thresholdDollars: student.topOffThreshold ?? 10,
      reloadDollars: student.topOffAmount ?? 20,
    })
  } catch (err) {
    console.error('/api/gift-card/auto-topoff GET error:', err)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const email = await getEmailFromRequest(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { studentId, enabled, thresholdDollars, reloadDollars } = await req.json()
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const adminClient = getWixClient()
    const student = await adminClient.items.get('Students', studentId) as any
    if (!student || student.parentEmail !== email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await adminClient.items.update('Students', {
      ...student,
      autoTopOff: enabled,
      topOffThreshold: thresholdDollars ?? 10,
      topOffAmount: reloadDollars ?? 20,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/gift-card/auto-topoff POST error:', err)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
