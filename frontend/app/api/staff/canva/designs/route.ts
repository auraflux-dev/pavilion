import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getCanvaAccessTokenForStaff } from '@/lib/canva/tokens'
import { createCanvaDesign, listCanvaDesigns } from '@/lib/canva/client'

function canAccess(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  return requireStaffRole(session.staff, ['marketing', 'admin'])
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canAccess(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const tok = await getCanvaAccessTokenForStaff(session.email)
    if (!tok) {
      return NextResponse.json(
        { error: 'Connect Canva first (or set CANVA_REFRESH_TOKEN / CANVA_ACCESS_TOKEN).' },
        { status: 401 },
      )
    }
    const query = String(req.nextUrl.searchParams.get('q') ?? '').trim()
    const continuation = String(req.nextUrl.searchParams.get('continuation') ?? '').trim()
    const result = await listCanvaDesigns(tok.accessToken, {
      query: query || undefined,
      continuation: continuation || undefined,
      limit: 24,
    })
    return NextResponse.json({ ...result, mode: tok.mode })
  } catch (err) {
    console.error('/api/staff/canva/designs GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not list designs' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canAccess(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const tok = await getCanvaAccessTokenForStaff(session.email)
    if (!tok) {
      return NextResponse.json({ error: 'Connect Canva first.' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const title = String(body.title ?? '').trim() || 'SHMS PTO draft'
    const design = await createCanvaDesign(tok.accessToken, { title })
    return NextResponse.json({ ok: true, design })
  } catch (err) {
    console.error('/api/staff/canva/designs POST', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not create design (check Canva scopes include design write).',
      },
      { status: 500 },
    )
  }
}
