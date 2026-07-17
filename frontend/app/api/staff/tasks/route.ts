import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { STAFF_ROLES, type StaffRole } from '@/lib/staff/roles'
import {
  isProjectMember,
  parseMemberEmails,
  type StaffProject,
} from '@/lib/staff/projects'
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
  projectId?: string
  ownerRole?: string
  assigneeEmail?: string
  assigneeName?: string
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

type ProjectRow = {
  _id?: string
  leadEmail?: string
  memberEmails?: string
  active?: boolean
  status?: string
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

export function mapTask(row: TaskRow): StaffTask {
  return {
    id: row._id ?? '',
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    projectId: String(row.projectId ?? ''),
    ownerRole: String(row.ownerRole ?? ''),
    assigneeEmail: String(row.assigneeEmail ?? '').toLowerCase(),
    assigneeName: String(row.assigneeName ?? ''),
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

function mapProjectLite(row: ProjectRow): Pick<StaffProject, 'id' | 'leadEmail' | 'memberEmails' | 'active'> {
  return {
    id: row._id ?? '',
    leadEmail: String(row.leadEmail ?? '').toLowerCase(),
    memberEmails: parseMemberEmails(row.memberEmails),
    active: row.active !== false,
  }
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const view = String(req.nextUrl.searchParams.get('view') ?? 'year').trim().toLowerCase()
  const projectId = String(req.nextUrl.searchParams.get('projectId') ?? '').trim()
  const filterRole = String(req.nextUrl.searchParams.get('role') ?? '').trim().toLowerCase()
  const includeDone = req.nextUrl.searchParams.get('includeDone') === 'true'
  const isAdmin = requireStaffRole(session.staff, 'admin')
  const myEmail = session.email

  try {
    const client = getWixClient()
    const [taskResult, projectResult] = await Promise.all([
      client.items.query('StaffTasks').limit(500).find(),
      client.items.query('StaffProjects').limit(200).find(),
    ])

    const projectsById = new Map(
      (projectResult.items as ProjectRow[])
        .map(mapProjectLite)
        .filter((p) => p.id && p.active)
        .map((p) => [p.id, p]),
    )

    let tasks = (taskResult.items as TaskRow[]).map(mapTask).filter((t) => t.active)

    // Year board: everyone sees all project tasks (and orphan role tasks)
    if (view === 'mine') {
      tasks = tasks.filter((t) => {
        if (t.assigneeEmail === myEmail) return true
        if (t.createdByEmail === myEmail) return true
        const project = t.projectId ? projectsById.get(t.projectId) : undefined
        if (project?.leadEmail === myEmail) return true
        if (!t.projectId && session.staff.roles.includes(t.ownerRole as StaffRole)) return true
        return false
      })
    } else if (view === 'project' && projectId) {
      tasks = tasks.filter((t) => t.projectId === projectId)
    }
    // view === 'year' → no ownership filter; full board

    if (projectId && view !== 'project') {
      tasks = tasks.filter((t) => t.projectId === projectId)
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
      myEmail,
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
    const projectId = String(body.projectId ?? '').trim()
    const ownerRole = String(body.ownerRole ?? '').trim().toLowerCase()
    const assigneeEmail = String(body.assigneeEmail ?? '').trim().toLowerCase()
    const assigneeName = String(body.assigneeName ?? '').trim()
    const status = normalizeStatus(body.status ?? 'open')
    const dueAt = String(body.dueAt ?? '').trim() || null
    const blockedByTaskId = String(body.blockedByTaskId ?? '').trim()
    const blockedByNote = String(body.blockedByNote ?? '').trim()
    const requestedBy = String(body.requestedBy ?? '').trim()
    const source = normalizeSource(body.source ?? 'board')

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const isAdmin = requireStaffRole(session.staff, 'admin')
    const client = getWixClient()

    let resolvedOwnerRole = ownerRole
    let project: ReturnType<typeof mapProjectLite> | null = null

    if (projectId) {
      const existing = (await client.items.get('StaffProjects', projectId)) as ProjectRow
      if (!existing?._id || existing.active === false) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      project = mapProjectLite(existing)
      const full: StaffProject = {
        id: project.id,
        title: '',
        description: '',
        schoolYear: '',
        leadEmail: project.leadEmail,
        leadName: '',
        leadRole: '',
        memberEmails: project.memberEmails,
        status: 'active',
        sortOrder: 0,
        createdByEmail: '',
        createdAt: '',
        updatedAt: '',
        active: true,
      }
      if (!isAdmin && !isProjectMember(full, session.email)) {
        return NextResponse.json(
          { error: 'Only project members can add tasks to this project' },
          { status: 403 },
        )
      }
      if (assigneeEmail && !isAdmin && !isProjectMember(full, assigneeEmail) && assigneeEmail !== session.email) {
        // Allow assigning any staff — user said assign after communicating.
        // Soft rule: prefer project members but allow any @shmspto staff email.
      }
      if (!resolvedOwnerRole) {
        resolvedOwnerRole = session.staff.roles[0] || 'admin'
      }
    }

    if (!resolvedOwnerRole || !(STAFF_ROLES as readonly string[]).includes(resolvedOwnerRole)) {
      return NextResponse.json({ error: 'Pick a valid owner role' }, { status: 400 })
    }

    if (!projectId) {
      // Legacy / triage path without a project
      if (!isAdmin && !session.staff.roles.includes(resolvedOwnerRole as StaffRole) && resolvedOwnerRole !== 'admin') {
        if (status !== 'triage' || resolvedOwnerRole !== 'admin') {
          return NextResponse.json(
            { error: 'You can only create tasks for your roles (or send triage to admin).' },
            { status: 403 },
          )
        }
      }
    }

    const now = new Date().toISOString()
    const row = {
      title,
      description,
      projectId,
      ownerRole: resolvedOwnerRole,
      assigneeEmail,
      assigneeName: assigneeName || assigneeEmail,
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

    const inserted = await client.items.insert('StaffTasks', row)
    const id = (inserted as { _id?: string })._id ?? ''

    return NextResponse.json({ ok: true, task: mapTask({ ...row, _id: id }) })
  } catch (err) {
    console.error('/api/staff/tasks POST error:', err)
    return NextResponse.json({ error: 'Could not create task' }, { status: 500 })
  }
}
