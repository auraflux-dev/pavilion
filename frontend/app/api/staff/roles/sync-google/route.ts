/**
 * POST /api/staff/roles/sync-google
 * Pull active @shmspto.org users from Google Admin Directory into StaffRoles.
 * Creates seats with empty roles (admin assigns before first login).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { syncStaffRolesFromGoogleDirectory } from '@/lib/staff/sync-google-directory'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !requireStaffRole(session.staff, 'admin')) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 })
  }

  try {
    const result = await syncStaffRolesFromGoogleDirectory(session.email)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('/api/staff/roles/sync-google', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not sync Google Workspace users.',
      },
      { status: 500 },
    )
  }
}
