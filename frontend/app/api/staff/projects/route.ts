import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { STAFF_ROLES, type StaffRole } from '@/lib/staff/roles'
import {
  currentSchoolYear,
  normalizeProjectStatus,
  parseMemberEmails,
  serializeMemberEmails,
  type StaffDirectoryPerson,
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
  createdAt?: string | Date
  updatedAt?: string | Date
  active?: boolean
}

type StaffRoleRow = {
  email?: string
  name?: string
  boardTitle?: string
  roles?: string
  active?: boolean
}

function toIso(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value && '$date' in (value as object)) {
    return String((value as { $date: string }).$date)
  }
  try {
    return new Date(String(value)).toISOString()
  } catch {
    return ''
  }
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
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    active: row.active !== false,
  }
}

function parseRoles(raw: unknown): string[] {
  return String(raw ?? '')
    .split(/[,|;]/)
    .map((r) => r.trim().toLowerCase())
    .filter((r) => (STAFF_ROLES as readonly string[]).includes(r))
}

async function loadDirectory(): Promise<StaffDirectoryPerson[]> {
  const client = getWixClient()
  const result = await client.items.query('StaffRoles').eq('active', true).limit(100).find()
  return (result.items as StaffRoleRow[])
    .map((row) => ({
      email: String(row.email ?? '').toLowerCase(),
      name: String(row.name ?? ''),
      boardTitle: String(row.boardTitle ?? ''),
      roles: parseRoles(row.roles),
    }))
    .filter((p) => p.email && p.roles.length > 0)
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolYear =
    String(req.nextUrl.searchParams.get('schoolYear') ?? '').trim() || currentSchoolYear()
  const includeDone = req.nextUrl.searchParams.get('includeDone') === 'true'
  const isAdmin = requireStaffRole(session.staff, 'admin')

  try {
    const client = getWixClient()
    const result = await client.items.query('StaffProjects').limit(200).find()
    let projects = (result.items as ProjectRow[]).map(mapProject).filter((p) => p.active)
    projects = projects.filter((p) => p.schoolYear === schoolYear)
    if (!includeDone) {
      projects = projects.filter((p) => p.status === 'active')
    }
    projects.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))

    const directory = await loadDirectory()

    return NextResponse.json({
      projects,
      directory,
      schoolYear,
      myEmail: session.email,
      myRoles: session.staff.roles,
      isAdmin,
      roles: STAFF_ROLES,
    })
  } catch (err) {
    console.error('/api/staff/projects GET error:', err)
    return NextResponse.json({ error: 'Could not load projects' }, { status: 500 })
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
    const schoolYear = String(body.schoolYear ?? '').trim() || currentSchoolYear()
    const leadRole = String(body.leadRole ?? session.staff.roles[0] ?? 'admin')
      .trim()
      .toLowerCase()
    const memberEmails = parseMemberEmails(body.memberEmails)

    if (!title) {
      return NextResponse.json({ error: 'Project title is required' }, { status: 400 })
    }
    if (!(STAFF_ROLES as readonly string[]).includes(leadRole)) {
      return NextResponse.json({ error: 'Pick a valid lead role' }, { status: 400 })
    }

    // Lead is the creator unless admin creates on behalf of someone
    const isAdmin = requireStaffRole(session.staff, 'admin')
    let leadEmail = session.email
    let leadName = session.staff.name || session.email
    if (isAdmin && body.leadEmail) {
      leadEmail = String(body.leadEmail).trim().toLowerCase()
      leadName = String(body.leadName ?? leadEmail).trim() || leadEmail
    }

    // Ensure lead is in members
    if (!memberEmails.includes(leadEmail)) memberEmails.unshift(leadEmail)

    const now = new Date().toISOString()
    const row = {
      title,
      description,
      schoolYear,
      leadEmail,
      leadName,
      leadRole,
      memberEmails: serializeMemberEmails(memberEmails),
      status: 'active',
      sortOrder: Number(body.sortOrder ?? 0) || 0,
      createdByEmail: session.email,
      createdAt: now,
      updatedAt: now,
      active: true,
    }

    const client = getWixClient()
    const inserted = await client.items.insert('StaffProjects', row)
    const id = (inserted as { _id?: string })._id ?? ''

    return NextResponse.json({ ok: true, project: mapProject({ ...row, _id: id }) })
  } catch (err) {
    console.error('/api/staff/projects POST error:', err)
    return NextResponse.json({ error: 'Could not create project' }, { status: 500 })
  }
}
