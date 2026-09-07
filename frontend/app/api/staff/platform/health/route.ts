import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isPlatformOwnerEmail } from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { listPlatformTenants } from '@/lib/crm/platform-tenants'
import { commonsDbEnabled } from '@/lib/crm/db'

async function gatePlatform(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) return null
  if (!requireStaffRole(session.staff, 'admin')) return null
  const demo = isDemoInstanceFromRequest(req)
  if (demo) return session
  const email = String(session.staff.email || session.email || '').trim().toLowerCase()
  if (!(await isPlatformOwnerEmail(email, { demo }))) return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await gatePlatform(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const demo = isDemoInstanceFromRequest(req)
  const tenants = await listPlatformTenants({ demo })
  const editable = tenants.filter((t) => !t.vipReadonly && t.plan !== 'platform')
  const withSquare = editable.filter((t) => t.squareConnected).length
  const withoutSquare = editable.length - withSquare

  return NextResponse.json({
    targets: [
      {
        id: 'commons-pto-demo',
        label: 'commons-pto-demo',
        url: 'https://commons-pto-demo.vercel.app',
        ok: true,
        note: 'Product demo host. Confirm with ship check after deploys.',
      },
      {
        id: 'commons-site',
        label: 'onpavilion.com',
        url: 'https://onpavilion.com',
        ok: true,
        note: 'Marketing. Separate ship target.',
      },
    ],
    connectors: {
      dbEnabled: commonsDbEnabled(),
      orgsEditable: editable.length,
      orgsWithSquare: withSquare,
      orgsWithoutSquare: withoutSquare,
      orgsWithPlaid: editable.filter((t) => t.plaidConnected).length,
    },
    vipNote: 'SHMS VIP is not managed from this health board.',
  })
}
