import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { STAFF_ROLES, type StaffRole } from '@/lib/staff/roles'
import { isProjectMember, parseMemberEmails, type StaffProject } from '@/lib/staff/projects'
import { normalizeSource, normalizeStatus } from '@/lib/staff/tasks'

type TaskRow = {
  _id?: string
  title?: string
  description?: string
  projectId?: string
  ownerRole?: string
  assigneeEmail?: string
  assigneeName?: string
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

type ProjectRow = {
  _id?: string
  leadEmail?: string
  memberEmails?: string
  active?: boolean
}

function canEditTask(
  existing: TaskRow,
  sessionEmail: string,
  sessionRoles: StaffRole[],
  isAdmin: boolean,
  project: { leadEmail: string; memberEmails: string[] } | null,
): boolean {
  if (isAdmin) return true
  if (String(existing.assigneeEmail ?? '').toLowerCase() === sessionEmail) return true
  if (String(existing.createdByEmail ?? '').toLowerCase() === sessionEmail) return true
  if (project?.leadEmail === sessionEmail) return true
  if (project && isProjectMember({
    id: '',
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
  } as StaffProject, sessionEmail)) {
    // Members can reassign / update within the project
    return true
  }
  const ownerRole = String(existing.ownerRole ?? '')
  if (!existing.projectId && sessionRoles.includes(ownerRole as StaffRole)) return true
  return false
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
    let project: { leadEmail: string; memberEmails: string[] } | null = null
    const projectId = String(body.projectId ?? existing.projectId ?? '').trim()
    if (projectId) {
      try {
        const prow = (await client.items.get('StaffProjects', projectId)) as ProjectRow
        if (prow?._id) {
          project = {
            leadEmail: String(prow.leadEmail ?? '').toLowerCase(),
            memberEmails: parseMemberEmails(prow.memberEmails),
          }
        }
      } catch {
        project = null
      }
    }

    if (!canEditTask(existing, session.email, session.staff.roles, isAdmin, project)) {
      return NextResponse.json({ error: 'Not allowed to update this task' }, { status: 403 })
    }

    const nextOwner =
      body.ownerRole != null ? String(body.ownerRole).trim().toLowerCase() : String(existing.ownerRole ?? '')
    if (body.ownerRole != null && !(STAFF_ROLES as readonly string[]).includes(nextOwner)) {
      return NextResponse.json({ error: 'Invalid owner role' }, { status: 400 })
    }

    const updates: TaskRow = {
      ...existing,
      _id: id,
      title: body.title != null ? String(body.title).trim() : existing.title,
      description: body.description != null ? String(body.description).trim() : existing.description,
      projectId: body.projectId !== undefined ? String(body.projectId).trim() : existing.projectId,
      ownerRole: nextOwner,
      assigneeEmail:
        body.assigneeEmail !== undefined
          ? String(body.assigneeEmail).trim().toLowerCase()
          : existing.assigneeEmail,
      assigneeName:
        body.assigneeName !== undefined ? String(body.assigneeName).trim() : existing.assigneeName,
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
