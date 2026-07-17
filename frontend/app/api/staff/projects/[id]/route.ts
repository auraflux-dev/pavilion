import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { STAFF_ROLES } from '@/lib/staff/roles'
import {
  isProjectMember,
  normalizeProjectStatus,
  parseMemberEmails,
  serializeMemberEmails,
  type StaffProject,
} from '@/lib/staff/projects'

type ProjectRow = {
  _id?: string
  title?: string
  description?: string
  schoolYear?: string
  leadEmail?: string
  leadName?: string
  leadRole?: string
  memberEmails?: string
  status?: string
  sortOrder?: number
  createdByEmail?: string
  createdAt?: string
  updatedAt?: string
  active?: boolean
}

function mapProject(row: ProjectRow): StaffProject {
  return {
    id: row._id ?? '',
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    schoolYear: String(row.schoolYear ?? ''),
    leadEmail: String(row.leadEmail ?? '').toLowerCase(),
    leadName: String(row.leadName ?? ''),
    leadRole: String(row.leadRole ?? ''),
    memberEmails: parseMemberEmails(row.memberEmails),
    status: normalizeProjectStatus(row.status),
    sortOrder: Number(row.sortOrder ?? 0) || 0,
    createdByEmail: String(row.createdByEmail ?? '').toLowerCase(),
    createdAt: String(row.createdAt ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
    active: row.active !== false,
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing project id' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const client = getWixClient()
    const existing = (await client.items.get('StaffProjects', id)) as ProjectRow
    if (!existing?._id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = mapProject(existing)
    const isAdmin = requireStaffRole(session.staff, 'admin')
    const isLead = project.leadEmail === session.email
    if (!isAdmin && !isLead) {
      return NextResponse.json({ error: 'Only the project lead or admin can edit this project' }, { status: 403 })
    }

    const nextLeadRole =
      body.leadRole != null ? String(body.leadRole).trim().toLowerCase() : project.leadRole
    if (body.leadRole != null && !(STAFF_ROLES as readonly string[]).includes(nextLeadRole)) {
      return NextResponse.json({ error: 'Invalid lead role' }, { status: 400 })
    }

    let memberEmails =
      body.memberEmails !== undefined ? parseMemberEmails(body.memberEmails) : project.memberEmails
    const leadEmail =
      body.leadEmail != null && isAdmin
        ? String(body.leadEmail).trim().toLowerCase()
        : project.leadEmail
    if (!memberEmails.includes(leadEmail)) memberEmails = [leadEmail, ...memberEmails]

    const updates: ProjectRow = {
      ...existing,
      _id: id,
      title: body.title != null ? String(body.title).trim() : existing.title,
      description: body.description != null ? String(body.description).trim() : existing.description,
      schoolYear: body.schoolYear != null ? String(body.schoolYear).trim() : existing.schoolYear,
      leadEmail,
      leadName:
        body.leadName != null ? String(body.leadName).trim() : existing.leadName,
      leadRole: nextLeadRole,
      memberEmails: serializeMemberEmails(memberEmails),
      status: body.status != null ? normalizeProjectStatus(body.status) : existing.status,
      sortOrder:
        body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : existing.sortOrder,
      active: body.active === false ? false : existing.active !== false,
      updatedAt: new Date().toISOString(),
    }

    await client.items.update('StaffProjects', updates as Parameters<typeof client.items.update>[1])
    return NextResponse.json({ ok: true, project: mapProject(updates) })
  } catch (err) {
    console.error('/api/staff/projects/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Could not update project' }, { status: 500 })
  }
}

/** Lightweight membership check helper used by task routes via import pattern — keep exported util. */
export function canManageProject(project: StaffProject, email: string, isAdmin: boolean) {
  return isAdmin || project.leadEmail === email || isProjectMember(project, email)
}
