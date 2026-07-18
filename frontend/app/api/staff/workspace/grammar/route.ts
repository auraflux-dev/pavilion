import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import { checkGrammarWithSapling, saplingConfigured } from '@/lib/staff/sapling'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }
  return NextResponse.json({ configured: saplingConfigured() })
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const text = String(body.text ?? '')
    const sessionId = `staff-${session.email}-${String(body.context ?? 'compose')}`.slice(0, 120)
    const result = await checkGrammarWithSapling(text, sessionId)
    if (!result.ok && result.error) {
      return NextResponse.json(
        { error: result.error, appliedText: result.appliedText, edits: result.edits },
        { status: result.error.includes('not configured') ? 503 : 400 },
      )
    }
    return NextResponse.json({
      ok: true,
      appliedText: result.appliedText,
      edits: result.edits,
      editCount: result.edits.length,
    })
  } catch (err) {
    console.error('/api/staff/workspace/grammar POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Grammar check failed' },
      { status: 503 },
    )
  }
}
