import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'
import { getSignupSheetById } from '@/lib/signups/sheets'
import { getStaffSession } from '@/lib/staff/session'
import { staffCanWorkspace } from '@/lib/staff/permissions'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

function gate(req: NextRequest) {
  return getStaffSession(req).then((session) => {
    if (!staffCanWorkspace(session?.staff ?? null, 'signups')) return null
    return session
  })
}

export async function GET(req: NextRequest, ctx: Ctx) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  try {
    const orgId = await organizationIdFromRequest(req)
    const sheet = await getSignupSheetById(orgId, id)
    if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ sheet })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }
    console.error('/api/staff/signups/sheets/[id] GET', err)
    return NextResponse.json({ error: 'Could not load sign-up sheet' }, { status: 500 })
  }
}
