import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/crm/auth'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { riversideSnapshot } from '@/lib/crm/riverside'
import { requireOrganizationId } from '@/lib/crm/tenant'

function passwordForEmail(email: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.DEMO_SIGNING_SECRET || 'demo'
  const hash = createHash('sha256').update(`${secret}:${email}`).digest('hex').slice(0, 24)
  return `Crm.${hash}!aA1`
}

function copySetCookies(from: Response, to: NextResponse) {
  const cookies =
    typeof from.headers.getSetCookie === 'function' ? from.headers.getSetCookie() : []
  for (const cookie of cookies) {
    to.headers.append('Set-Cookie', cookie)
  }
}

export async function persistDemoJoin(opts: {
  req: NextRequest
  res: NextResponse
  email: string
  firstName: string
  lastName: string
  phone?: string
}): Promise<void> {
  if (!commonsDbEnabled()) return
  try {
    await ensureCommonsReady()
    const orgId = requireOrganizationId(riversideSnapshot().organization.id)
    const email = opts.email.trim().toLowerCase()
    await sql(
      `insert into people (id, organization_id, email, first_name, last_name, phone)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (organization_id, email) do update set
         first_name = excluded.first_name,
         last_name = excluded.last_name`,
      [
        `p_${createHash('sha256').update(email).digest('hex').slice(0, 16)}`,
        orgId,
        email,
        opts.firstName,
        opts.lastName,
        opts.phone ?? '',
      ],
    )

    const auth = getAuth()
    if (!auth) return
    const name = `${opts.firstName} ${opts.lastName}`.trim()
    const password = passwordForEmail(email)
    try {
      await auth.api.signUpEmail({
        body: { email, password, name },
      })
    } catch {
      // already registered
    }
    const signIn = await auth.api.signInEmail({
      body: { email, password },
      headers: opts.req.headers,
      asResponse: true,
    })
    copySetCookies(signIn, opts.res)

    const setCookies =
      typeof signIn.headers.getSetCookie === 'function' ? signIn.headers.getSetCookie() : []
    const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ')
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    })
    const userId = session?.user?.id
    if (userId) {
      await sql(`update people set auth_user_id = $1 where organization_id = $2 and email = $3`, [
        userId,
        orgId,
        email,
      ])
    }
  } catch (err) {
    console.warn('commons persistDemoJoin failed', err)
  }
}
