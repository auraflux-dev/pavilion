import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { resolveCmsOrganizationId } from '@/lib/cms/store'
import {
  listRecentCheckIns,
  lookupCheckIn,
  recordCheckIn,
  type CheckInKind,
} from '@/lib/check-in/store'
import { getWixClient } from '@/lib/wix-client'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['events', 'secretary', 'retail', 'admin'])) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session: session! }
}

export async function GET(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error
  const orgId = await resolveCmsOrganizationId(req)
  if (!orgId) return NextResponse.json({ recent: [] })
  const eventKey = String(req.nextUrl.searchParams.get('eventKey') ?? 'default').trim() || 'default'
  const recent = await listRecentCheckIns(orgId, eventKey)
  return NextResponse.json({ recent })
}

export async function POST(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error
  const orgId = await resolveCmsOrganizationId(req)
  if (!orgId) return NextResponse.json({ error: 'Unavailable' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const code = String(body.code ?? '').trim()
  const kind = (String(body.kind ?? 'ticket').trim() || 'ticket') as CheckInKind
  const eventKey = String(body.eventKey ?? 'default').trim() || 'default'
  const labelIn = String(body.label ?? '').trim()

  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  let label = labelIn || code
  if (kind === 'ticket' && !labelIn) {
    try {
      const client = getWixClient()
      const found = await client.items
        .query('EventTicketOrders')
        .limit(50)
        .find()
        .catch(() => ({ items: [] as Record<string, unknown>[] }))
      const match = ((found.items ?? []) as Record<string, unknown>[]).find((row) => {
        const id = String(row._id ?? '').toUpperCase()
        const conf = String(row.confirmationCode ?? row.orderCode ?? '').toUpperCase()
        const needle = code.toUpperCase()
        return id === needle || conf === needle || id.endsWith(needle) || conf.endsWith(needle)
      })
      if (match) {
        label =
          String(match.buyerName ?? match.parentName ?? match.email ?? match.eventTitle ?? code)
      }
    } catch {
      // label stays code
    }
  }

  const existing = await lookupCheckIn(orgId, kind, code, eventKey)
  if (existing) {
    return NextResponse.json({ ok: true, already: true, record: existing })
  }

  const record = await recordCheckIn({
    orgId,
    kind,
    code,
    label,
    eventKey,
    checkedInBy: g.session.email,
  })
  return NextResponse.json({ ok: true, already: false, record })
}
