import { getAuth } from '@/lib/crm/auth'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { isCommonsPlatformHost } from '@/lib/crm/auth-edge'
import type { StaffProfile, StaffRole } from '@/lib/staff/roles'
import { ROLE_HOME_COPY } from '@/lib/staff/roles'

export async function loadCommonsStaffJson(req: Request): Promise<{
  email: string
  sessionEmail: string
  name: string
  boardTitle: string
  roles: StaffRole[]
  personalEmail: string
  extraWorkspaces: []
  isAdmin: boolean
  homes: { role: StaffRole; title: string; owns: string; thisWeek: string[] }[]
  commons: true
} | null> {
  if (!isCommonsPlatformHost() || !commonsDbEnabled()) return null
  const auth = getAuth()
  if (!auth) return null
  await ensureCommonsReady()
  const session = await auth.api.getSession({ headers: req.headers })
  const userId = session?.user?.id
  const email = (session?.user?.email || '').trim().toLowerCase()
  if (!userId || !email) return null
  const found = await sql<{
    first_name: string
    last_name: string
    role: string
    board_title: string
  }>(
    `select p.first_name, p.last_name, a.role, a.board_title
       from people p
       join staff_assignments a on a.person_id = p.id
      where p.auth_user_id = $1
      limit 8`,
    [userId],
  )
  if (!found.rows.length) return null
  const roles = [...new Set(found.rows.map((r) => r.role))] as StaffRole[]
  const name =
    `${found.rows[0].first_name} ${found.rows[0].last_name}`.trim() ||
    session.user.name ||
    email
  const boardTitle = found.rows[0].board_title || 'Treasurer'
  const homes = roles.map((role) => ({
    role,
    ...ROLE_HOME_COPY[role],
  }))
  return {
    email,
    sessionEmail: email,
    name,
    boardTitle,
    roles,
    personalEmail: '',
    extraWorkspaces: [],
    isAdmin: roles.includes('admin'),
    homes,
    commons: true,
  }
}

export function commonsStaffProfile(json: NonNullable<Awaited<ReturnType<typeof loadCommonsStaffJson>>>): StaffProfile {
  return {
    email: json.email,
    roles: json.roles,
    boardTitle: json.boardTitle,
    name: json.name,
    emailSignature: '',
    assignedProgramIds: [],
    personalEmail: '',
    extraWorkspaces: [],
  }
}
