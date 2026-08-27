import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/crm/auth'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { riversideSnapshot } from '@/lib/crm/riverside'
import { seedTrialOrgBrandPack } from '@/lib/crm/seed-trial-pack'
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

function slugifySchool(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export async function persistTrialStart(opts: {
  req: NextRequest
  schoolName: string
  slug?: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  /** Optional named pack (e.g. spring-hill). Else slug match or vanilla. */
  brandPack?: string
}): Promise<{
  orgId: string
  slug: string
  tempHost: string
  trialEndsAt: string
  brandPackSlug: string
  setCookies: string[]
}> {
  if (!commonsDbEnabled()) throw new Error('Commons database is not configured')
  await ensureCommonsReady()
  const email = opts.email.trim().toLowerCase()
  const schoolName = opts.schoolName.trim()
  const slug = slugifySchool(opts.slug || schoolName)
  if (!schoolName || schoolName.length < 3) throw new Error('Enter your school or PTO name')
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug) || slug === 'riverside') {
    throw new Error('Choose a short URL slug (letters, numbers, hyphens). Not “riverside”.')
  }
  if (!email.includes('@')) throw new Error('Enter a treasurer email')
  if ((opts.password || '').length < 8) throw new Error('Password must be at least 8 characters')

  const taken = await sql<{ id: string }>(`select id from organizations where slug = $1`, [slug])
  if (taken.rows[0]) throw new Error('That slug is taken. Try another.')

  const orgId = `org_${createHash('sha256').update(`trial:${slug}:${email}`).digest('hex').slice(0, 16)}`
  const personId = `p_${createHash('sha256').update(`trial:${orgId}:${email}`).digest('hex').slice(0, 16)}`
  const suffix = (process.env.COMMONS_TEMP_DOMAIN_SUFFIX || 'commons-pto.org').replace(/^\./, '')
  const tempHost = `${slug}.${suffix}`
  const started = new Date()
  const ends = new Date(started.getTime() + 30 * 24 * 60 * 60 * 1000)

  await sql(
    `insert into organizations
       (id, name, slug, plan, trial_started_at, trial_ends_at, temp_host)
     values ($1, $2, $3, 'trial', $4, $5, $6)`,
    [orgId, schoolName, slug, started.toISOString(), ends.toISOString(), tempHost],
  )
  await sql(
    `insert into people (id, organization_id, email, first_name, last_name)
     values ($1, $2, $3, $4, $5)`,
    [personId, orgId, email, opts.firstName?.trim() || 'Treasurer', opts.lastName?.trim() || ''],
  )
  await sql(
    `insert into staff_assignments (person_id, role, board_title, organization_id)
     values ($1, 'admin', 'Treasurer', $2)
     on conflict (person_id, role) do update set organization_id = excluded.organization_id`,
    [personId, orgId],
  )

  const auth = getAuth()
  if (!auth) throw new Error('Sign-in is not configured on this host yet')
  const name = `${opts.firstName || 'Treasurer'} ${opts.lastName || ''}`.trim()
  try {
    await auth.api.signUpEmail({
      body: { email, password: opts.password, name },
    })
  } catch {
    throw new Error('That email already has a login. Sign in instead, or use a different email.')
  }
  const signIn = await auth.api.signInEmail({
    body: { email, password: opts.password },
    headers: opts.req.headers,
    asResponse: true,
  })
  const setCookies =
    typeof signIn.headers.getSetCookie === 'function' ? signIn.headers.getSetCookie() : []
  const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ')
  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })
  const userId = session?.user?.id
  if (userId) {
    await sql(`update people set auth_user_id = $1 where id = $2`, [userId, personId])
  }

  const seeded = await seedTrialOrgBrandPack({
    orgId,
    slug,
    schoolName,
    tempHost,
    brandPack: opts.brandPack,
  })

  return {
    orgId,
    slug,
    tempHost,
    trialEndsAt: ends.toISOString(),
    brandPackSlug: seeded.packSlug,
    setCookies,
  }
}
