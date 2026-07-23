/**
 * GET /api/staff/activity. counts staff should notice (mail, payments, forms).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  getStaffGoogleAccess,
  workspaceServiceAccountConfigured,
} from '@/lib/google/workspace-auth'

export const dynamic = 'force-dynamic'

export type StaffActivityItem = {
  id: string
  label: string
  count: number
  href: string
  tone: 'info' | 'warn'
}

async function gmailInboxUnread(email: string): Promise<number | null> {
  try {
    const access = await getStaffGoogleAccess(email)
    if (!access?.accessToken) return null
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX',
      { headers: { Authorization: `Bearer ${access.accessToken}` } },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { messagesUnread?: number }
    return Number(data.messagesUnread ?? 0)
  } catch {
    return null
  }
}

async function countNeedsReconcile(): Promise<number> {
  try {
    const client = getWixClient()
    const found = await client.items
      .query('Payments')
      .eq('status', 'Needs Reconciliation')
      .limit(100)
      .find()
    return (found.items ?? []).length
  } catch {
    return 0
  }
}

async function countRecentContacts(days: number): Promise<number> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const client = getWixClient()
    const found = await (client.items.query('ContactSubmissions') as any)
      .gt('_createdDate', since)
      .limit(100)
      .find()
    return (found.items ?? []).length
  } catch {
    return 0
  }
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  const items: StaffActivityItem[] = []
  const googleConnected =
    workspaceServiceAccountConfigured() ||
    Boolean(await getStaffGoogleAccess(session.email).catch(() => null))

  const mailUnread = googleConnected ? await gmailInboxUnread(session.email) : null
  if (mailUnread != null && mailUnread > 0) {
    items.push({
      id: 'mail',
      label: 'Unread in Workspace Inbox',
      count: mailUnread,
      href: '/staff?view=inbox',
      tone: 'info',
    })
  }

  if (requireStaffRole(session.staff, ['treasurer', 'admin'])) {
    const n = await countNeedsReconcile()
    if (n > 0) {
      items.push({
        id: 'payments',
        label: 'Payments need reconciliation',
        count: n,
        href: '/staff?view=payments',
        tone: 'warn',
      })
    }
  }

  if (
    requireStaffRole(session.staff, [
      'admin',
      'secretary',
      'membership',
      'programs',
      'marketing',
    ])
  ) {
    const n = await countRecentContacts(7)
    if (n > 0) {
      items.push({
        id: 'forms',
        label: 'Website form submissions (7 days). also emailed when Gmail is connected',
        count: n,
        href: '/staff?view=inbox',
        tone: 'info',
      })
    }
  }

  return NextResponse.json({
    googleConnected,
    mailUnread,
    items,
  })
}
