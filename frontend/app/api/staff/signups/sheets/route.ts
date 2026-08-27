import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'
import { createSignupSheet, listSignupSheets } from '@/lib/signups/sheets'
import type { CreateSignupSheetInput } from '@/lib/signups/types'
import { getStaffSession } from '@/lib/staff/session'
import { staffCanWorkspace } from '@/lib/staff/permissions'

export const dynamic = 'force-dynamic'

function gate(req: NextRequest) {
  return getStaffSession(req).then((session) => {
    if (!staffCanWorkspace(session?.staff ?? null, 'signups')) return null
    return session
  })
}

export async function GET(req: NextRequest) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({
      configured: false,
      note: 'Sign-up sheets need Pavilion platform database (not Wix-only customer hosts).',
      sheets: [],
    })
  }
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const orgId = await organizationIdFromRequest(req)
    const sheets = await listSignupSheets(orgId)
    return NextResponse.json({
      configured: true,
      sheets,
      note: 'Create shareable sign-up pages with flexible slots. Publish to share the public link.',
    })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }
    console.error('/api/staff/signups/sheets GET', err)
    return NextResponse.json({ error: 'Could not load sign-up sheets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!commonsDbEnabled()) {
    return NextResponse.json(
      { error: 'Sign-up sheets require Pavilion platform database.' },
      { status: 503 },
    )
  }
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const orgId = await organizationIdFromRequest(req)
    const body = (await req.json()) as CreateSignupSheetInput
    const sheet = await createSignupSheet(orgId, body, session.email)
    return NextResponse.json({ sheet })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Could not create sign-up sheet'
    console.error('/api/staff/signups/sheets POST', err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
