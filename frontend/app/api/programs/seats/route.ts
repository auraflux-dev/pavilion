/**
 * GET /api/programs/seats?ids=id1,id2
 * Public seat remaining for enrichment catalog cards (live enrollments).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAllPrograms } from '@/lib/api/programs'
import {
  seatCountsByProgramIds,
  seatsRemainingForCapacity,
} from '@/lib/programs/enrollments'
import { isDemoInstance } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const raw = String(req.nextUrl.searchParams.get('ids') || '')
  const ids = [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, 40)

  if (ids.length === 0) {
    return NextResponse.json({ seats: {} })
  }

  try {
    if (isDemoInstance()) {
      const all = await getAllPrograms()
      const byId = new Map(all.map((p) => [p._id, p]))
      const seats: Record<string, { taken: number; remaining: number | null; capacity: number }> =
        {}
      for (const id of ids) {
        const p = byId.get(id)
        const capacity = p?.capacity ?? 0
        const taken = p?.seatsTaken ?? 0
        seats[id] = {
          capacity,
          taken,
          remaining: seatsRemainingForCapacity(capacity, taken),
        }
      }
      return NextResponse.json({ seats })
    }

    const { tryGetWixClient } = await import('@/lib/wix-client')
    const client = tryGetWixClient()
    if (!client) return NextResponse.json({ seats: {} })

    const programs = await Promise.all(
      ids.map(async (id) => {
        try {
          const item = await client.items.get('Programs', id)
          return {
            id,
            capacity: Number((item as { capacity?: number }).capacity ?? 0) || 0,
          }
        } catch {
          return { id, capacity: 0 }
        }
      }),
    )
    const counts = await seatCountsByProgramIds(ids)
    const seats: Record<string, { taken: number; remaining: number | null; capacity: number }> =
      {}
    for (const p of programs) {
      const taken = counts.get(p.id) ?? 0
      seats[p.id] = {
        capacity: p.capacity,
        taken,
        remaining: seatsRemainingForCapacity(p.capacity, taken),
      }
    }
    return NextResponse.json(
      { seats },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.warn('[programs/seats]', err)
    return NextResponse.json({ seats: {} }, { status: 200 })
  }
}
