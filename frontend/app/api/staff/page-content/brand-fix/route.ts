import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { brandifyShmsPto } from '@/lib/copy/brandify-shms-pto'

const TARGETS: { collection: string; fields: string[] }[] = [
  {
    collection: 'PageContent',
    fields: ['eyebrow', 'title', 'body', 'sectionTitle', 'sectionBody', 'bullets', 'ctaLabel'],
  },
  { collection: 'FundraisingCTAs', fields: ['title', 'description', 'ctaLabel'] },
  { collection: 'FAQItems', fields: ['question', 'answer'] },
  { collection: 'NavLinks', fields: ['label'] },
  { collection: 'SiteSettings', fields: ['value'] },
  { collection: 'VolunteerOpportunities', fields: ['title', 'description', 'location'] },
  { collection: 'PortalCalendarEvents', fields: ['title', 'description', 'location'] },
  { collection: 'AnnouncementBar', fields: ['text'] },
]

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'secretary', 'admin'])) return null
  return session
}

/**
 * POST /api/staff/page-content/brand-fix
 * Body: { apply?: boolean }. default dry-run. Set apply:true to write CMS.
 * Find/replace bare "SHMS" → "SHMS PTO" (+ strip LCPS) across marketing CMS collections.
 */
export async function POST(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let apply = false
  try {
    const body = await req.json().catch(() => ({}))
    apply = Boolean(body?.apply)
  } catch {
    apply = false
  }

  const client = getWixClient()
  const changes: { collection: string; id: string; label: string; fields: string[] }[] = []
  let updated = 0

  for (const target of TARGETS) {
    let items: Record<string, unknown>[] = []
    try {
      const result = await client.items.query(target.collection).limit(100).find()
      items = (result.items ?? []) as Record<string, unknown>[]
    } catch {
      continue
    }

    for (const item of items) {
      const id = String(item._id ?? '')
      if (!id) continue
      const patch: Record<string, unknown> = {}
      const fieldNames: string[] = []
      for (const field of target.fields) {
        const raw = item[field]
        if (typeof raw !== 'string' || !raw.trim()) continue
        const next = brandifyShmsPto(raw)
        if (next === raw) continue
        patch[field] = next
        fieldNames.push(field)
      }
      if (!fieldNames.length) continue

      const label =
        String(item.page ?? item.key ?? item.title ?? item.question ?? item.label ?? id).slice(0, 80)
      changes.push({ collection: target.collection, id, label, fields: fieldNames })

      if (apply) {
        await client.items.update(target.collection, {
          ...item,
          ...patch,
          _id: id,
        } as Parameters<typeof client.items.update>[1])
        updated += 1
      }
    }
  }

  return NextResponse.json({
    ok: true,
    apply,
    changedRows: changes.length,
    updated,
    changes,
    message: apply
      ? `Updated ${updated} CMS row(s) so SHMS always has PTO.`
      : `${changes.length} row(s) need SHMS → SHMS PTO. Re-run with apply:true to write.`,
  })
}
