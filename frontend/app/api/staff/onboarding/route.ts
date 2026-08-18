import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession } from '@/lib/staff/session'
import { getStaffGoogleAccess, workspaceStatusPayload } from '@/lib/google/workspace-auth'
import { vanillaizeDeep } from '@/lib/demo/brand'
import {
  STAFF_ONBOARDING_TRACKS,
  buildTrackProgress,
  onboardingRolesFor,
  parseOnboardingProgress,
  serializeOnboardingProgress,
  type OnboardingProgressMap,
  type StaffOnboardingRole,
} from '@/lib/staff/onboarding'

type StaffRoleRow = {
  _id?: string
  email?: string
  onboardingProgress?: string
  personalEmail?: string
}

async function googleConnected(email: string): Promise<boolean> {
  try {
    const access = await getStaffGoogleAccess(email)
    return Boolean(workspaceStatusPayload(email, Boolean(access)).connected)
  } catch {
    return false
  }
}

async function loadRoleRow(email: string): Promise<StaffRoleRow | null> {
  const client = getWixClient()
  const result = await client.items.query('StaffRoles').eq('email', email).limit(1).find()
  return (result.items?.[0] as StaffRoleRow | undefined) ?? null
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const roles = onboardingRolesFor(session.staff.roles, session.email)
  if (!roles.length) {
    return NextResponse.json({ tracks: [], progress: {}, roles: [] })
  }

  try {
    const row = await loadRoleRow(session.email)
    const progress = parseOnboardingProgress(row?.onboardingProgress)
    const flags = {
      personalEmail: Boolean(session.staff.personalEmail),
      googleConnected: await googleConnected(session.email),
    }

    const tracks = roles.map((role) => {
      const track = STAFF_ONBOARDING_TRACKS[role]
      const built = buildTrackProgress(track, progress, flags)
      return {
        role,
        title: track.title,
        summary: track.summary,
        ...built,
      }
    })

    return NextResponse.json(
      vanillaizeDeep({
        tracks,
        progress,
        roles,
        flags,
        myEmail: session.email,
      }),
    )
  } catch (err) {
    console.error('/api/staff/onboarding GET error:', err)
    return NextResponse.json(
      {
        error:
          'Could not load onboarding. If this is first use, add StaffRoles field onboardingProgress (TEXT).',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const allowed = new Set(onboardingRolesFor(session.staff.roles, session.email))
  if (!allowed.size) {
    return NextResponse.json({ error: 'No onboarding track for your role' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const stepId = String(body.stepId ?? '').trim()
    const done = body.done !== false
    const role = String(body.role ?? '').trim() as StaffOnboardingRole

    if (!stepId) {
      return NextResponse.json({ error: 'stepId is required' }, { status: 400 })
    }
    if (!allowed.has(role) || !STAFF_ONBOARDING_TRACKS[role]) {
      return NextResponse.json({ error: 'Invalid onboarding role' }, { status: 400 })
    }
    const validIds = new Set(STAFF_ONBOARDING_TRACKS[role].steps.map((s) => s.id))
    if (!validIds.has(stepId)) {
      return NextResponse.json({ error: 'Unknown step for this role' }, { status: 400 })
    }

    const row = await loadRoleRow(session.email)
    if (!row?._id) {
      return NextResponse.json({ error: 'StaffRoles row not found' }, { status: 404 })
    }

    const progress: OnboardingProgressMap = parseOnboardingProgress(row.onboardingProgress)
    if (done) progress[stepId] = new Date().toISOString()
    else delete progress[stepId]

    const client = getWixClient()
    await client.items.update('StaffRoles', {
      ...row,
      _id: row._id,
      onboardingProgress: serializeOnboardingProgress(progress),
    } as Parameters<typeof client.items.update>[1])

    const flags = {
      personalEmail: Boolean(session.staff.personalEmail),
      googleConnected: await googleConnected(session.email),
    }
    const track = STAFF_ONBOARDING_TRACKS[role]
    const built = buildTrackProgress(track, progress, flags)

    return NextResponse.json({
      ok: true,
      progress,
      track: { role, title: track.title, summary: track.summary, ...built },
    })
  } catch (err) {
    console.error('/api/staff/onboarding PATCH error:', err)
    return NextResponse.json(
      {
        error:
          'Could not save progress. Ask admin to add Text field “onboardingProgress” on StaffRoles.',
      },
      { status: 500 },
    )
  }
}
