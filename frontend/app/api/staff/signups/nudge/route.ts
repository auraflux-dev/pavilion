import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'
import { nudgeOpenSignupSheets, nudgeSignupSheet } from '@/lib/signups/nudge'
import { getStaffSession } from '@/lib/staff/session'
import { staffCanWorkspace } from '@/lib/staff/permissions'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }
  const session = await getStaffSession(req)
  if (!staffCanWorkspace(session?.staff ?? null, 'signups')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const orgId = await organizationIdFromRequest(req)
    const body = await req.json().catch(() => ({}))
    const sheetId = String(body.sheetId ?? '').trim()
    const force = body.force === true
    const fromName = session!.staff.name || session!.staff.boardTitle || session!.email

    if (sheetId) {
      const result = await nudgeSignupSheet(orgId, sheetId, { fromName, force })
      return NextResponse.json({ ok: true, results: [result] })
    }

    const results = await nudgeOpenSignupSheets(orgId, { fromName, force })
    return NextResponse.json({ ok: true, results })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }
    console.error('/api/staff/signups/nudge', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Nudge failed' },
      { status: 500 },
    )
  }
}
