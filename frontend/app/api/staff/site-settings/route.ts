import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

const RETAIL_KEYS = ['storeProductIds', 'spiritWearProductIds'] as const

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const client = getWixClient()
    const result = await client.items.query('SiteSettings').limit(200).find()
    const map: Record<string, { id: string; value: string }> = {}
    for (const item of result.items ?? []) {
      const row = item as { _id?: string; key?: string; value?: string }
      if (row.key) map[row.key] = { id: row._id ?? '', value: String(row.value ?? '') }
    }
    return NextResponse.json({
      storeProductIds: map.storeProductIds?.value ?? '',
      spiritWearProductIds: map.spiritWearProductIds?.value ?? '',
      ids: {
        storeProductIds: map.storeProductIds?.id ?? '',
        spiritWearProductIds: map.spiritWearProductIds?.id ?? '',
      },
    })
  } catch (err) {
    console.error('/api/staff/site-settings GET', err)
    return NextResponse.json({ error: 'Could not load settings' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const key = String(body.key ?? '').trim()
    if (!(RETAIL_KEYS as readonly string[]).includes(key)) {
      return NextResponse.json({ error: 'Only storeProductIds and spiritWearProductIds can be edited here' }, { status: 400 })
    }
    const value = String(body.value ?? '')
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(',')

    const client = getWixClient()
    const existing = await client.items.query('SiteSettings').eq('key', key).limit(1).find()
    const found = existing.items?.[0] as { _id?: string; key?: string; value?: string } | undefined
    if (found?._id) {
      await client.items.update('SiteSettings', {
        ...found,
        _id: found._id,
        key,
        value,
      } as Parameters<typeof client.items.update>[1])
    } else {
      await client.items.insert('SiteSettings', { key, value })
    }
    return NextResponse.json({ ok: true, key, value })
  } catch (err) {
    console.error('/api/staff/site-settings PATCH', err)
    return NextResponse.json({ error: 'Could not save settings' }, { status: 500 })
  }
}
