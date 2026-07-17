import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['programs', 'instructor', 'admin'])) return null
  return session
}

function mapProgram(item: Record<string, unknown>) {
  return {
    id: String(item._id ?? ''),
    name: String(item.name ?? ''),
    description: String(item.description ?? ''),
    fee: Number(item.fee ?? 0) || 0,
    capacity: Number(item.capacity ?? 0) || 0,
    registrationOpen: item.registrationOpen === true,
    cheddarupUrl: String(item.cheddarupUrl ?? ''),
    requiresWaiver: item.requiresWaiver === true,
    grades: String(item.grades ?? ''),
    category: String(item.category ?? ''),
    paymentType: String(item.paymentType ?? ''),
    schedule: String(item.schedule ?? ''),
    detail: String(item.detail ?? ''),
    tags: String(item.tags ?? ''),
    featured: item.featured === true,
    sortOrder: Number(item.sortOrder ?? 0) || 0,
  }
}

function mapSession(item: Record<string, unknown>) {
  return {
    id: String(item._id ?? ''),
    programId: String(item.programId ?? ''),
    programName: String(item.programName ?? ''),
    title: String(item.title ?? ''),
    startAt: item.startAt ? new Date(String(item.startAt)).toISOString() : null,
    endAt: item.endAt ? new Date(String(item.endAt)).toISOString() : null,
    location: String(item.location ?? ''),
    instructorName: String(item.instructorName ?? ''),
    grades: String(item.grades ?? ''),
    active: item.active !== false,
  }
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const client = getWixClient()
    const [programs, sessions] = await Promise.all([
      client.items.query('Programs').ascending('name').limit(100).find(),
      client.items.query('ProgramSessions').descending('startAt').limit(200).find(),
    ])
    return NextResponse.json({
      programs: (programs.items ?? []).map((i) => mapProgram(i as Record<string, unknown>)),
      sessions: (sessions.items ?? []).map((i) => mapSession(i as Record<string, unknown>)),
    })
  } catch (err) {
    console.error('/api/staff/programs GET', err)
    return NextResponse.json({ error: 'Could not load programs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const kind = String(body.kind ?? 'session')
    const client = getWixClient()

    if (kind === 'program') {
      const name = String(body.name ?? '').trim()
      if (!name) return NextResponse.json({ error: 'Program name required' }, { status: 400 })
      const row = {
        name,
        description: String(body.description ?? '').trim(),
        fee: Number(body.fee ?? 0) || 0,
        capacity: Number(body.capacity ?? 0) || 0,
        registrationOpen: body.registrationOpen === true,
        cheddarupUrl: String(body.cheddarupUrl ?? '').trim(),
        requiresWaiver: body.requiresWaiver === true,
        grades: String(body.grades ?? '').trim(),
        category: String(body.category ?? '').trim(),
        paymentType: String(body.paymentType ?? 'wix').trim(),
        schedule: String(body.schedule ?? '').trim(),
        detail: String(body.detail ?? '').trim(),
        tags: String(body.tags ?? '').trim(),
        featured: body.featured === true,
        sortOrder: Number(body.sortOrder ?? 0) || 0,
      }
      const inserted = await client.items.insert('Programs', row)
      return NextResponse.json({ ok: true, id: (inserted as { _id?: string })._id })
    }

    const programName = String(body.programName ?? '').trim()
    const title = String(body.title ?? programName).trim()
    if (!programName || !title) {
      return NextResponse.json({ error: 'Program name and session title required' }, { status: 400 })
    }
    const row = {
      programId: String(body.programId ?? '').trim(),
      programName,
      title,
      startAt: body.startAt ? new Date(String(body.startAt)).toISOString() : null,
      endAt: body.endAt ? new Date(String(body.endAt)).toISOString() : null,
      location: String(body.location ?? '').trim(),
      instructorName: String(body.instructorName ?? '').trim(),
      grades: String(body.grades ?? '').trim(),
      active: body.active !== false,
    }
    const inserted = await client.items.insert('ProgramSessions', row)
    return NextResponse.json({ ok: true, id: (inserted as { _id?: string })._id })
  } catch (err) {
    console.error('/api/staff/programs POST', err)
    return NextResponse.json({ error: 'Could not create' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const kind = String(body.kind ?? 'program')
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const client = getWixClient()
    const collection = kind === 'session' ? 'ProgramSessions' : 'Programs'
    const existing = (await client.items.get(collection, id)) as Record<string, unknown>
    if (!existing?._id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (kind === 'session') {
      const updates = {
        ...existing,
        _id: id,
        programId: body.programId != null ? String(body.programId).trim() : existing.programId,
        programName:
          body.programName != null ? String(body.programName).trim() : existing.programName,
        title: body.title != null ? String(body.title).trim() : existing.title,
        startAt:
          body.startAt !== undefined
            ? body.startAt
              ? new Date(String(body.startAt)).toISOString()
              : null
            : existing.startAt,
        endAt:
          body.endAt !== undefined
            ? body.endAt
              ? new Date(String(body.endAt)).toISOString()
              : null
            : existing.endAt,
        location: body.location != null ? String(body.location).trim() : existing.location,
        instructorName:
          body.instructorName != null ? String(body.instructorName).trim() : existing.instructorName,
        grades: body.grades != null ? String(body.grades).trim() : existing.grades,
        active: body.active != null ? body.active !== false : existing.active !== false,
      }
      await client.items.update(collection, updates as Parameters<typeof client.items.update>[1])
      return NextResponse.json({ ok: true })
    }

    const updates = {
      ...existing,
      _id: id,
      name: body.name != null ? String(body.name).trim() : existing.name,
      description: body.description != null ? String(body.description).trim() : existing.description,
      fee: body.fee != null ? Number(body.fee) || 0 : existing.fee,
      capacity: body.capacity != null ? Number(body.capacity) || 0 : existing.capacity,
      registrationOpen:
        body.registrationOpen != null ? body.registrationOpen === true : existing.registrationOpen === true,
      cheddarupUrl:
        body.cheddarupUrl != null ? String(body.cheddarupUrl).trim() : existing.cheddarupUrl,
      requiresWaiver:
        body.requiresWaiver != null ? body.requiresWaiver === true : existing.requiresWaiver === true,
      grades: body.grades != null ? String(body.grades).trim() : existing.grades,
      category: body.category != null ? String(body.category).trim() : existing.category,
      paymentType: body.paymentType != null ? String(body.paymentType).trim() : existing.paymentType,
      schedule: body.schedule != null ? String(body.schedule).trim() : existing.schedule,
      detail: body.detail != null ? String(body.detail).trim() : existing.detail,
      tags: body.tags != null ? String(body.tags).trim() : existing.tags,
      featured: body.featured != null ? body.featured === true : existing.featured === true,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) || 0 : existing.sortOrder,
    }
    await client.items.update(collection, updates as Parameters<typeof client.items.update>[1])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/staff/programs PATCH', err)
    return NextResponse.json({ error: 'Could not update' }, { status: 500 })
  }
}
