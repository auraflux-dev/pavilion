import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  buildMassSmsDraft,
  massSmsEnabled,
  sendMassSmsStub,
} from '@/lib/staff/mass-sms'

export async function GET() {
  return NextResponse.json({
    enabled: massSmsEnabled(),
    note: massSmsEnabled()
      ? 'FEATURE_MASS_SMS is on. Sends are dry-run until Twilio is wired.'
      : 'Mass SMS stays off until member portal reach codes land.',
  })
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['membership', 'marketing', 'admin', 'secretary'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const text = String(body.body ?? '').trim()
  const audience = String(body.audience ?? 'custom').trim() || 'custom'
  const phones = Array.isArray(body.phones)
    ? body.phones.map((p: unknown) => String(p ?? ''))
    : []

  if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const draft = buildMassSmsDraft({ audience, body: text, phones })
  const result = await sendMassSmsStub(draft)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
