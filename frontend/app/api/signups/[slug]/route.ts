import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import { MissingOrganizationIdError, organizationFromHostHeader, organizationIdFromRequest } from '@/lib/crm/tenant'
import { resolvePublishedSignupSheet } from '@/lib/signups/sheets'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

/** Public read for published sign-up sheets (participant flow builds on this). */
export async function GET(req: NextRequest, ctx: Ctx) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Not available' }, { status: 503 })
  }
  const { slug } = await ctx.params
  try {
    let orgId: string | null = null
    try {
      orgId = await organizationIdFromRequest(req)
    } catch (err) {
      if (!(err instanceof MissingOrganizationIdError)) throw err
      const hostRow = await organizationFromHostHeader(req)
      orgId = hostRow?.id ?? null
    }
    const sheet = await resolvePublishedSignupSheet(slug, orgId)
    if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      sheet: {
        title: sheet.title,
        description: sheet.description,
        location: sheet.location,
        startsAt: sheet.startsAt,
        endsAt: sheet.endsAt,
        timezone: sheet.timezone,
        fields: sheet.fields,
        slots: sheet.slots.map((s) => ({
          id: s.id,
          slotType: s.slotType,
          title: s.title,
          description: s.description,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          quantityNeeded: s.quantityNeeded,
          quantityClaimed: s.quantityClaimed,
          quantityRemaining: Math.max(0, s.quantityNeeded - s.quantityClaimed),
          itemUnit: s.itemUnit,
        })),
      },
    })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('/api/signups/[slug] GET', err)
    return NextResponse.json({ error: 'Could not load sign-up sheet' }, { status: 500 })
  }
}
