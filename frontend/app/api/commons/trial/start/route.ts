import { NextRequest, NextResponse } from 'next/server'
import { persistTrialStart } from '@/lib/crm/persist'
import { isCommonsPlatformHost } from '@/lib/crm/auth-edge'
import { isDemoInstance } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (isDemoInstance() && !isCommonsPlatformHost()) {
    return NextResponse.json(
      {
        ok: false,
        preview: true,
        error:
          'This sample school stays preview-only.\nStart a 30-day trial on your own Commons host (not this demo).\nWe will give you a temp URL like yourpto.commons-pto.org.',
      },
      { status: 409 },
    )
  }
  if (!isCommonsPlatformHost()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Trial signup runs on the Commons app, not Stone Hill.\nAsk Auraflux for your temp host.',
      },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as {
    schoolName?: string
    slug?: string
    email?: string
    password?: string
    firstName?: string
    lastName?: string
  }
  try {
    const started = await persistTrialStart({
      req,
      schoolName: body.schoolName || '',
      slug: body.slug,
      email: body.email || '',
      password: body.password || '',
      firstName: body.firstName,
      lastName: body.lastName,
    })
    const res = NextResponse.json({
      ok: true,
      slug: started.slug,
      tempHost: started.tempHost,
      trialEndsAt: started.trialEndsAt,
      next: '/staff',
    })
    for (const cookie of started.setCookies) {
      res.headers.append('Set-Cookie', cookie)
    }
    return res
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not start trial' },
      { status: 400 },
    )
  }
}
