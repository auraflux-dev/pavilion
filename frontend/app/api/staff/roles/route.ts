import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  canManageInstructorStaff,
  INSTRUCTOR_STAFF_ROLES,
  isInstructorStaffOnly,
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

async function staffRolesSession(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canManageInstructorStaff(session.staff)) return null
  return session
}

export async function GET(req: NextRequest) {
  const session = await staffRolesSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const isAdmin = Boolean(requireStaffRole(session.staff, 'admin'))
    const client = getWixClient()
    const result = await client.items.query('StaffRoles').ascending('email').limit(100).find()
    let staff = (result.items as StaffRoleRow[]).map((row) => ({
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
    }))
    if (!isAdmin) {
      staff = staff.filter((row) => isInstructorStaffOnly(row.roles))
    }
    return NextResponse.json({
      scope: isAdmin ? 'all' : 'instructors',
      availableRoles: isAdmin ? STAFF_ROLES : INSTRUCTOR_STAFF_ROLES,
      staff,
    })
  } catch (err) {
    console.error('/api/staff/roles GET error:', err)
    return NextResponse.json({ error: 'Could not load staff roles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await staffRolesSession(req)
  if (!session) {
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

    const isAdmin = Boolean(requireStaffRole(session.staff, 'admin'))
    const client = getWixClient()
    const existing = await client.items.query('StaffRoles').eq('email', email).limit(1).find()
    const row = existing.items[0] as StaffRoleRow | undefined
    const existingRoles = normalizeRoles(row?.roles)

    if (!isAdmin) {
      if (!isInstructorStaffOnly(roles) || extraWorkspaces.length) {
        return NextResponse.json(
          { error: 'You can only assign Instructor or Coordinator, with a program ID.' },
          { status: 403 },
        )
      }
      if (!assignedProgramIds.length) {
        return NextResponse.json(
          { error: 'Assign at least one program so they only see their class.' },
          { status: 400 },
        )
      }
      if (row && existingRoles.length && !isInstructorStaffOnly(existingRoles)) {
        return NextResponse.json(
          { error: 'That mailbox is a board seat. Ask the president to change it.' },
          { status: 403 },
        )
      }
    }

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

    const data = {
      email,
      name,
      boardTitle,
      roles: roles.join(','),
      assignedProgramIds: assignedProgramIds.join(','),
      personalEmail,
      extraWorkspaces: isAdmin ? extraWorkspaces.join(',') : String(row?.extraWorkspaces ?? ''),
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

    let boardSeatBenefits: {
      parentEmail: string
      fallCode: string
      springCode: string
      enrichmentCode: string | null
    } | null = null
    const wantBoardPerks = body.grantBoardSeatBenefits === true
    if (wantBoardPerks) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Only the president can grant board seat Reef + 75% enrichment perks.' },
          { status: 403 },
        )
      }
      if (!personalEmail) {
        return NextResponse.json(
          {
            error:
              'Link a personal parent email before granting board seat Reef + 75% enrichment perks.',
          },
          { status: 400 },
        )
      }
      const { grantBoardSeatBenefits } = await import('@/lib/staff/board-seat-benefits')
      const granted = await grantBoardSeatBenefits({
        parentEmail: personalEmail,
        displayName: name || boardTitle || personalEmail,
        staffEmail: email,
      })
      boardSeatBenefits = {
        parentEmail: granted.parentEmail,
        fallCode: granted.fallCode,
        springCode: granted.springCode,
        enrichmentCode: granted.enrichmentCode,
      }
    }

    return NextResponse.json({ ok: true, boardSeatBenefits })
  } catch (err) {
    console.error('/api/staff/roles POST error:', err)
    const message = err instanceof Error ? err.message : 'Could not save staff role'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
