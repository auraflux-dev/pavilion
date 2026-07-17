import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { STAFF_ROLES, type StaffRole } from '@/lib/staff/roles'
import { normalizeSource, normalizeStatus } from '@/lib/staff/tasks'

type TaskRow = {
  _id?: string
  title?: string
  description?: string
  ownerRole?: string
  status?: string
  dueAt?: string | null
  blockedByTaskId?: string
  blockedByNote?: string
  requestedBy?: string
  source?: string
  createdByEmail?: string
  createdByName?: string
  createdAt?: string
  updatedAt?: string
  active?: boolean
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing task id' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const client = getWixClient()
    const existing = (await client.items.get('StaffTasks', id)) as TaskRow
    if (!existing?._id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const isAdmin = requireStaffRole(session.staff, 'admin')
    const ownerRole = String(existing.ownerRole ?? '')
    if (!isAdmin && !session.staff.roles.includes(ownerRole as StaffRole)) {
      return NextResponse.json({ error: 'Not your role\'s task' }, { status: 403 })
    }

    const nextOwner = body.ownerRole != null ? String(body.ownerRole).trim().toLowerCase() : ownerRole
    if (body.ownerRole != null && !(STAFF_ROLES as readonly string[]).includes(nextOwner)) {
      return NextResponse.json({ error: 'Invalid owner role' }, { status: 400 })
    }
    if (!isAdmin && nextOwner !== ownerRole && !session.staff.roles.includes(nextOwner as StaffRole)) {
      return NextResponse.json({ error: 'Cannot reassign to another role' }, { status: 403 })
    }

    const updates: TaskRow = {
      ...existing,
      _id: id,
      title: body.title != null ? String(body.title).trim() : existing.title,
      description: body.description != null ? String(body.description).trim() : existing.description,
      ownerRole: nextOwner,
      status: body.status != null ? normalizeStatus(body.status) : existing.status,
      dueAt: body.dueAt !== undefined ? String(body.dueAt || '').trim() || null : existing.dueAt,
      blockedByTaskId:
        body.blockedByTaskId !== undefined
          ? String(body.blockedByTaskId).trim()
          : existing.blockedByTaskId,
      blockedByNote:
        body.blockedByNote !== undefined ? String(body.blockedByNote).trim() : existing.blockedByNote,
      requestedBy:
        body.requestedBy !== undefined ? String(body.requestedBy).trim() : existing.requestedBy,
      source: body.source != null ? normalizeSource(body.source) : existing.source,
      active: body.active === false ? false : existing.active !== false,
      updatedAt: new Date().toISOString(),
    }

    // Auto-flip to blocked when a blocker is present
    if (
      updates.status !== 'done' &&
      updates.status !== 'triage' &&
      (updates.blockedByTaskId || updates.blockedByNote)
    ) {
      updates.status = 'blocked'
    }

    await client.items.update('StaffTasks', updates as Parameters<typeof client.items.update>[1])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/staff/tasks/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Could not update task' }, { status: 500 })
  }
}
