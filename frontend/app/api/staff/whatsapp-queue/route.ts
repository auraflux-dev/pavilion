import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  buildWhatsAppGroupPlan,
  type GradeWhatsAppLinks,
  type WhatsAppGrade,
} from '@/lib/staff/whatsapp-compose'
import {
  addWhatsAppQueueItem,
  normalizeWhatsAppGrade,
  partitionWhatsAppQueue,
  readWhatsAppQueue,
  updateWhatsAppQueueItem,
} from '@/lib/staff/whatsapp-queue'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) return { status: 401 as const, session: null }
  if (
    !requireStaffRole(session.staff, ['membership', 'secretary', 'marketing', 'admin'])
  ) {
    return { status: 403 as const, session: null }
  }
  return { status: 200 as const, session }
}

async function loadWhatsAppLinks(): Promise<GradeWhatsAppLinks> {
  const client = getWixClient()
  const result = await client.items.query('SiteSettings').limit(200).find()
  const map = new Map<string, string>()
  for (const item of result.items ?? []) {
    const row = item as { key?: string; value?: string }
    if (row.key) map.set(row.key, String(row.value ?? ''))
  }
  return {
    grade6: map.get('announcement6thLink') ?? '',
    grade7: map.get('announcement7thLink') ?? '',
    grade8: map.get('announcement8thLink') ?? '',
  }
}

export async function GET(req: NextRequest) {
  const gated = await gate(req)
  if (gated.status !== 200) {
    return NextResponse.json(
      { error: gated.status === 401 ? 'Sign in to continue.' : 'Forbidden' },
      { status: gated.status },
    )
  }
  try {
    const [items, links] = await Promise.all([readWhatsAppQueue(), loadWhatsAppLinks()])
    const parts = partitionWhatsAppQueue(items)
    return NextResponse.json({
      ...parts,
      dueCount: parts.due.length,
      whatsapp: links,
    })
  } catch (err) {
    console.error('/api/staff/whatsapp-queue GET', err)
    return NextResponse.json({ error: 'Could not load WhatsApp queue' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const gated = await gate(req)
  if (gated.status !== 200 || !gated.session) {
    return NextResponse.json(
      { error: gated.status === 401 ? 'Sign in to continue.' : 'Forbidden' },
      { status: gated.status === 403 ? 403 : 401 },
    )
  }
  try {
    const body = await req.json()
    const action = String(body.action ?? 'schedule').trim()

    if (action === 'schedule') {
      const item = await addWhatsAppQueueItem({
        message: String(body.message ?? ''),
        grade: normalizeWhatsAppGrade(body.grade) as WhatsAppGrade,
        sendAt: String(body.sendAt ?? ''),
        createdByEmail: gated.session.staff.email,
        createdByName: gated.session.staff.name || gated.session.staff.email,
      })
      return NextResponse.json({ ok: true, item })
    }

    if (action === 'confirm') {
      const id = String(body.id ?? '').trim()
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      const items = await readWhatsAppQueue()
      const current = items.find((i) => i.id === id)
      if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (current.status === 'cancelled') {
        return NextResponse.json({ error: 'This message was cancelled' }, { status: 400 })
      }

      const links = await loadWhatsAppLinks()
      const plan = buildWhatsAppGroupPlan(links, current.grade, current.message)
      if (!plan.openUrls.length && !plan.waMeShare) {
        return NextResponse.json(
          { error: plan.instructions || 'No WhatsApp grade links configured' },
          { status: 400 },
        )
      }

      const updated = await updateWhatsAppQueueItem(id, {
        status: 'sent',
        confirmedByEmail: gated.session.staff.email,
        confirmedByName: gated.session.staff.name || gated.session.staff.email,
        confirmedAt: new Date().toISOString(),
      })

      return NextResponse.json({
        ok: true,
        item: updated,
        plan,
      })
    }

    if (action === 'cancel') {
      const id = String(body.id ?? '').trim()
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      const updated = await updateWhatsAppQueueItem(id, {
        status: 'cancelled',
        confirmedByEmail: gated.session.staff.email,
        confirmedByName: gated.session.staff.name || gated.session.staff.email,
        confirmedAt: new Date().toISOString(),
      })
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ ok: true, item: updated })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('/api/staff/whatsapp-queue POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update WhatsApp queue' },
      { status: 500 },
    )
  }
}
