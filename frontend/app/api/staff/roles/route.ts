import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isStaffEmail, STAFF_ROLES, type StaffRole } from '@/lib/staff/roles'

type StaffRoleRow = {
  _id?: string
  email?: string
  name?: string
  boardTitle?: string
  roles?: string
  active?: boolean
}

function normalizeRoles(value: unknown): StaffRole[] {
  const requested = Array.isArray(value) ? value : String(value ?? '').split(',')
  return Array.from(
    new Set(
      requested
        .map((role) => String(role).trim().toLowerCase())
        .filter((role): role is StaffRole => STAFF_ROLES.includes(role as StaffRole)),
    ),
  )
}

async function requireAdmin(req: NextRequest) {
  const session = await getStaffSession(req)
  return requireStaffRole(session?.staff ?? null, 'admin') ? session : null
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const client = getWixClient()
    const result = await client.items.query('StaffRoles').ascending('email').limit(100).find()
    return NextResponse.json({
      availableRoles: STAFF_ROLES,
      staff: (result.items as StaffRoleRow[]).map((row) => ({
        id: row._id ?? '',
        email: String(row.email ?? ''),
        name: String(row.name ?? ''),
        boardTitle: String(row.boardTitle ?? ''),
        roles: normalizeRoles(row.roles),
        active: row.active !== false,
      })),
    })
  } catch (err) {
    console.error('/api/staff/roles GET error:', err)
    return NextResponse.json({ error: 'Could not load staff roles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const name = String(body.name ?? '').trim()
    const boardTitle = String(body.boardTitle ?? '').trim()
    const roles = normalizeRoles(body.roles)
    const active = body.active !== false

    if (!isStaffEmail(email)) {
      return NextResponse.json(
        { error: 'Staff access can only be assigned to an @shmspto.org email.' },
        { status: 400 },
      )
    }
    if (!roles.length) {
      return NextResponse.json({ error: 'Choose at least one role.' }, { status: 400 })
    }

    const client = getWixClient()
    const existing = await client.items.query('StaffRoles').eq('email', email).limit(1).find()
    const row = existing.items[0] as StaffRoleRow | undefined
    const data = { email, name, boardTitle, roles: roles.join(','), active }

    if (row?._id) {
      await client.items.update('StaffRoles', {
        ...row,
        ...data,
        _id: row._id,
      } as Parameters<typeof client.items.update>[1])
    } else {
      await client.items.insert('StaffRoles', data)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/staff/roles POST error:', err)
    return NextResponse.json({ error: 'Could not save staff role' }, { status: 500 })
  }
}
