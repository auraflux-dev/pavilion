import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import { listLabels, createLabel, foldersFromLabels } from '@/lib/google/gmail'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }
  try {
    const labels = await listLabels(session.email)
    const folders = foldersFromLabels(labels)
    return NextResponse.json({
      labels,
      folders,
      syncedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('/api/staff/workspace/labels GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Labels unavailable' },
      { status: 503 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    const label = await createLabel(session.email, name)
    return NextResponse.json({ ok: true, label })
  } catch (err) {
    console.error('/api/staff/workspace/labels POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create folder' },
      { status: 503 },
    )
  }
}
