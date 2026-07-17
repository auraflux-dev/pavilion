import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { STAFF_ROLES, type StaffRole } from '@/lib/staff/roles'
import {
  normalizeSource,
  normalizeStatus,
  type StaffTask,
  type TaskStatus,
} from '@/lib/staff/tasks'

type TaskRow = {
  _id?: string
  title?: string
  description?: string
  ownerRole?: string
  status?: string
  dueAt?: string | Date | null
  blockedByTaskId?: string
  blockedByNote?: string
  requestedBy?: string
  source?: string
  createdByEmail?: string
  createdByName?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  active?: boolean
}

function toIso(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value && '$date' in (value as object)) {
    return String((value as { $date: string }).$date)
  }
  try {
    return new Date(String(value)).toISOString()
  } catch {
    return null
  }
}

function mapTask(row: TaskRow): StaffTask {
  return {
    id: row._id ?? '',
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    ownerRole: String(row.ownerRole ?? ''),
    status: normalizeStatus(row.status),
    dueAt: toIso(row.dueAt),
    blockedByTaskId: String(row.blockedByTaskId ?? ''),
    blockedByNote: String(row.blockedByNote ?? ''),
    requestedBy: String(row.requestedBy ?? ''),
    source: normalizeSource(row.source),
    createdByEmail: String(row.createdByEmail ?? ''),
    createdByName: String(row.createdByName ?? ''),
    createdAt: toIso(row.createdAt) ?? '',
    updatedAt: toIso(row.updatedAt) ?? '',
    active: row.active !== false,
  }
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const filterRole = String(req.nextUrl.searchParams.get('role') ?? '').trim().toLowerCase()
  const includeDone = req.nextUrl.searchParams.get('includeDone') === 'true'
  const isAdmin = requireStaffRole(session.staff, 'admin')

  try {
    const client = getWixClient()
    const result = await client.items.query('StaffTasks').limit(200).find()
    let tasks = (result.items as TaskRow[]).map(mapTask).filter((t) => t.active)

    if (!isAdmin) {
      const myRoles = new Set(session.staff.roles)
      tasks = tasks.filter((t) => myRoles.has(t.ownerRole as StaffRole) || t.ownerRole === 'admin')
    }

    if (filterRole) {
      tasks = tasks.filter((t) => t.ownerRole === filterRole)
    }

    if (!includeDone) {
      tasks = tasks.filter((t) => t.status !== 'done')
    }

    const statusOrder: Record<TaskStatus, number> = {
      triage: 0,
      blocked: 1,
      open: 2,
      done: 3,
    }
    tasks.sort((a, b) => {
      const s = statusOrder[a.status] - statusOrder[b.status]
      if (s !== 0) return s
      const ad = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY
      const bd = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY
      return ad - bd
    })

    return NextResponse.json({
      tasks,
      roles: STAFF_ROLES,
      myRoles: session.staff.roles,
      isAdmin,
    })
  } catch (err) {
    console.error('/api/staff/tasks GET error:', err)
    return NextResponse.json({ error: 'Could not load tasks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const title = String(body.title ?? '').trim()
    const description = String(body.description ?? '').trim()
    const ownerRole = String(body.ownerRole ?? '').trim().toLowerCase()
    const status = normalizeStatus(body.status ?? 'open')
    const dueAt = String(body.dueAt ?? '').trim() || null
    const blockedByTaskId = String(body.blockedByTaskId ?? '').trim()
    const blockedByNote = String(body.blockedByNote ?? '').trim()
    const requestedBy = String(body.requestedBy ?? '').trim()
    const source = normalizeSource(body.source ?? 'board')

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!(STAFF_ROLES as readonly string[]).includes(ownerRole)) {
      return NextResponse.json({ error: 'Pick a valid owner role' }, { status: 400 })
    }

    const isAdmin = requireStaffRole(session.staff, 'admin')
    if (!isAdmin && !session.staff.roles.includes(ownerRole as StaffRole) && ownerRole !== 'admin') {
      // Non-admins can only create tasks for their own roles (or hand to admin triage)
      if (status !== 'triage' || ownerRole !== 'admin') {
        return NextResponse.json(
          { error: 'You can only create tasks for your roles (or send triage to admin).' },
          { status: 403 },
        )
      }
    }

    const now = new Date().toISOString()
    const row = {
      title,
      description,
      ownerRole,
      status: blockedByTaskId || blockedByNote ? 'blocked' : status,
      dueAt,
      blockedByTaskId,
      blockedByNote,
      requestedBy,
      source,
      createdByEmail: session.email,
      createdByName: session.staff.name || session.email,
      createdAt: now,
      updatedAt: now,
      active: true,
    }

    const client = getWixClient()
    const inserted = await client.items.insert('StaffTasks', row)
    const id = (inserted as { _id?: string })._id ?? ''

    return NextResponse.json({ ok: true, task: mapTask({ ...row, _id: id }) })
  } catch (err) {
    console.error('/api/staff/tasks POST error:', err)
    return NextResponse.json({ error: 'Could not create task' }, { status: 500 })
  }
}
