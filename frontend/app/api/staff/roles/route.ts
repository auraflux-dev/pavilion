import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  isPresidentAdminEmail,
  isStaffEmail,
  isValidPersonalEmail,
  normalizePersonalEmail,
  STAFF_ROLES,
  type StaffRole,
} from '@/lib/staff/roles'
import { extrasBeyondRoles, parseExtraWorkspaces } from '@/lib/staff/permissions'

type StaffRoleRow = {
  _id?: string
  email?: string
  name?: string
  boardTitle?: string
  roles?: string
  assignedProgramIds?: string
  personalEmail?: string
  extraWorkspaces?: string
  active?: boolean
}

async function ensureExtraWorkspacesField() {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return
  const headers = {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
  const getRes = await fetch('https://www.wixapis.com/wix-data/v2/collections/StaffRoles', {
    method: 'GET',
    headers,
  })
  const getBody = (await getRes.json().catch(() => ({}))) as {
    collection?: { fields?: { key?: string }[] }
  }
  const existing = new Set((getBody.collection?.fields ?? []).map((f) => String(f.key ?? '')))
  if (existing.has('extraWorkspaces')) return
  await fetch('https://www.wixapis.com/wix-data/v2/collections/create-field', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dataCollectionId: 'StaffRoles',
      field: { key: 'extraWorkspaces', displayName: 'Extra Workspaces', type: 'TEXT' },
    }),
  })
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
        assignedProgramIds: String(row.assignedProgramIds ?? '')
          .split(/[,|;]/)
          .map((id) => id.trim())
          .filter(Boolean),
        personalEmail: String(row.personalEmail ?? '').trim().toLowerCase(),
        extraWorkspaces: parseExtraWorkspaces(row.extraWorkspaces),
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
    const extraWorkspaces = extrasBeyondRoles(
      roles,
      parseExtraWorkspaces(
        Array.isArray(body.extraWorkspaces) ? body.extraWorkspaces.join(',') : body.extraWorkspaces,
      ),
    )
    const assignedProgramIds = Array.isArray(body.assignedProgramIds)
      ? body.assignedProgramIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : String(body.assignedProgramIds ?? '')
          .split(/[,|;]/)
          .map((id) => id.trim())
          .filter(Boolean)
    const personalEmail = normalizePersonalEmail(String(body.personalEmail ?? ''))
    const active = body.active !== false

    if (!isStaffEmail(email)) {
      return NextResponse.json(
        { error: 'Staff access can only be assigned to an @shmspto.org email.' },
        { status: 400 },
      )
    }
    if (!roles.length && !extraWorkspaces.length) {
      return NextResponse.json(
        { error: 'Choose at least one role or permission.' },
        { status: 400 },
      )
    }
    if (roles.includes('admin') && !isPresidentAdminEmail(email)) {
      return NextResponse.json(
        { error: 'Admin can only be assigned to president@shmspto.org.' },
        { status: 400 },
      )
    }
    if (personalEmail && !isValidPersonalEmail(personalEmail)) {
      return NextResponse.json(
        {
          error: isStaffEmail(personalEmail)
            ? 'Parent portal email must be personal, not @shmspto.org.'
            : 'Enter a valid personal email for the parent portal.',
        },
        { status: 400 },
      )
    }

    const client = getWixClient()
    await ensureExtraWorkspacesField()
    if (personalEmail) {
      const clash = await client.items
        .query('StaffRoles')
        .eq('personalEmail', personalEmail)
        .limit(5)
        .find()
      const taken = (clash.items as StaffRoleRow[]).some((item) => {
        const other = String(item.email ?? '').toLowerCase()
        return other && other !== email
      })
      if (taken) {
        return NextResponse.json(
          { error: 'That personal email is already linked to another staff account.' },
          { status: 409 },
        )
      }
    }

    const existing = await client.items.query('StaffRoles').eq('email', email).limit(1).find()
    const row = existing.items[0] as StaffRoleRow | undefined
    const data = {
      email,
      name,
      boardTitle,
      roles: roles.join(','),
      assignedProgramIds: assignedProgramIds.join(','),
      personalEmail,
      extraWorkspaces: extraWorkspaces.join(','),
      active,
    }

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
