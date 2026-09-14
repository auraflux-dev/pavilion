import { NextRequest, NextResponse } from 'next/server'
import { appDbEnabled } from '@/lib/crm/db'
import {
  MissingOrganizationIdError,
  organizationFromHostHeader,
  organizationIdFromRequest,
} from '@/lib/crm/tenant'
import { getStaffSession } from '@/lib/staff/session'
import { cancelSignupRegistration } from '@/lib/signups/registrations'
import { resolvePublishedSignupSheet } from '@/lib/signups/sheets'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

async function resolveOrg(req: NextRequest): Promise<string | null> {
  try {
    return await organizationIdFromRequest(req)
  } catch (err) {
    if (!(err instanceof MissingOrganizationIdError)) throw err
    const hostRow = await organizationFromHostHeader(req)
    return hostRow?.id ?? null
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  if (!appDbEnabled()) {
    return NextResponse.json({ error: 'Not available' }, { status: 503 })
  }
  const { slug } = await ctx.params
  try {
    const orgId = await resolveOrg(req)
    const sheet = await resolvePublishedSignupSheet(slug, orgId)
    if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = (await req.json()) as { registrationId?: string; email?: string }
    const registrationId = String(body.registrationId || '').trim()
    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId required' }, { status: 400 })
    }

    const session = await getStaffSession(req)
    const email = (
      session?.staff?.email ||
      String(body.email || '').trim()
    ).toLowerCase()
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Sign in or provide the email used for this sign-up' },
        { status: 401 },
      )
    }

    const result = await cancelSignupRegistration(
      sheet.organizationId,
      sheet.id,
      registrationId,
      email,
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not cancel'
    console.error('/api/signups/[slug]/cancel', err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
