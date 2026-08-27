import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'
import { getSignupSheetById, updateSignupSheetStatus } from '@/lib/signups/sheets'
import type { SignupSheetStatus } from '@/lib/signups/types'
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

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  try {
    const orgId = await organizationIdFromRequest(req)
    const body = (await req.json()) as { status?: SignupSheetStatus }
    if (!body.status) return NextResponse.json({ error: 'status required' }, { status: 400 })
    const sheet = await updateSignupSheetStatus(orgId, id, body.status)
    if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ sheet })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Could not update'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
