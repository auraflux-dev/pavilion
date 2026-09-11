import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isPlatformOwnerEmail } from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { pavilionCmsEnabled, resolveCmsOrganizationId } from '@/lib/cms/store'
import { requireOrgModule } from '@/lib/modules/gate'
import { parseCompanyProduct } from '@/lib/crm/fleet-product'
import {
  listMarketingBlogPosts,
  marketingBlogOrgId,
  seedMarketingBlogIfEmpty,
  setMarketingBlogPostActive,
  slugifyBlogTitle,
  upsertMarketingBlogPost,
} from '@/lib/cms/marketing-blog'
import { normalizeCompanyProduct } from '@/lib/crm/platform-owners'
import { commonsDbEnabled, sql } from '@/lib/crm/db'

async function gateStaff(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'admin'])) return null
  return session
}

async function resolveOrgProduct(orgId: string) {
  if (!commonsDbEnabled()) return 'pavilion' as const
  try {
    const found = await sql<{ product: string | null }>(
      `select coalesce(product, 'pavilion') as product from organizations where id = $1 limit 1`,
      [orgId],
    )
    return normalizeCompanyProduct(found.rows[0]?.product)
  } catch {
    return 'pavilion' as const
  }
}

async function resolveOrg(req: NextRequest, session: NonNullable<Awaited<ReturnType<typeof gateStaff>>>) {
  const demo = isDemoInstanceFromRequest(req)
  const email = String(session.staff?.email || session.email || '').trim().toLowerCase()
  const productHint = parseCompanyProduct(req.nextUrl.searchParams.get('product'))
  const platformOwner =
    demo || (email ? await isPlatformOwnerEmail(email, { demo }) : false)

  let orgId: string | null = null
  if (platformOwner && productHint) {
    orgId = marketingBlogOrgId(productHint)
  } else {
    orgId = await resolveCmsOrganizationId(req)
  }
  if (!orgId) {
    return { error: NextResponse.json({ error: 'No organization' }, { status: 400 }) }
  }
  const denied = await requireOrgModule(orgId, 'staff.blog')
  if (denied) return { error: denied }
  return { orgId }
}

export async function GET(req: NextRequest) {
  const session = await gateStaff(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!pavilionCmsEnabled()) {
    return NextResponse.json({ error: 'CMS unavailable' }, { status: 503 })
  }
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()
  const resolved = await resolveOrg(req, session)
  if ('error' in resolved && resolved.error) return resolved.error
  const orgId = resolved.orgId!
  const product = await resolveOrgProduct(orgId)
  await seedMarketingBlogIfEmpty(orgId, product)
  const posts = await listMarketingBlogPosts(orgId, { activeOnly: false })
  return NextResponse.json({ posts, organizationId: orgId, product })
}

export async function POST(req: NextRequest) {
  const session = await gateStaff(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!pavilionCmsEnabled()) {
    return NextResponse.json({ error: 'CMS unavailable' }, { status: 503 })
  }
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()
  const resolved = await resolveOrg(req, session)
  if ('error' in resolved && resolved.error) return resolved.error
  const orgId = resolved.orgId!
  try {
    const body = (await req.json()) as Record<string, unknown>
    const title = String(body.title ?? '').trim()
    const slug =
      String(body.slug ?? '').trim() || (title ? slugifyBlogTitle(title) : '')
    const post = await upsertMarketingBlogPost(
      {
        id: body.id ? String(body.id) : undefined,
        slug,
        title,
        date: String(body.date ?? '').trim(),
        category: String(body.category ?? '').trim(),
        excerpt: String(body.excerpt ?? '').trim(),
        minutes: Number(body.minutes ?? 3),
        bodyMarkdown: String(body.bodyMarkdown ?? ''),
        active: body.active !== false,
        sortOrder: Number(body.sortOrder ?? 0),
      },
      orgId,
    )
    return NextResponse.json({ post })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 400 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = await gateStaff(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!pavilionCmsEnabled()) {
    return NextResponse.json({ error: 'CMS unavailable' }, { status: 503 })
  }
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()
  const resolved = await resolveOrg(req, session)
  if ('error' in resolved && resolved.error) return resolved.error
  const orgId = resolved.orgId!
  try {
    const body = (await req.json()) as Record<string, unknown>
    if (body.active !== undefined && body.id && !body.title) {
      await setMarketingBlogPostActive(String(body.id), body.active !== false, orgId)
      return NextResponse.json({ ok: true })
    }
    const title = String(body.title ?? '').trim()
    const slug =
      String(body.slug ?? '').trim() || (title ? slugifyBlogTitle(title) : '')
    const post = await upsertMarketingBlogPost(
      {
        id: body.id ? String(body.id) : undefined,
        slug,
        title,
        date: String(body.date ?? '').trim(),
        category: String(body.category ?? '').trim(),
        excerpt: String(body.excerpt ?? '').trim(),
        minutes: Number(body.minutes ?? 3),
        bodyMarkdown: String(body.bodyMarkdown ?? ''),
        active: body.active !== false,
        sortOrder: Number(body.sortOrder ?? 0),
      },
      orgId,
    )
    return NextResponse.json({ post })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 400 },
    )
  }
}
