import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isPlatformOwnerEmail } from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { pavilionCmsEnabled } from '@/lib/cms/store'
import {
  listMarketingBlogPosts,
  marketingBlogOrgId,
  seedMarketingBlogIfEmpty,
  setMarketingBlogPostActive,
  slugifyBlogTitle,
  upsertMarketingBlogPost,
} from '@/lib/cms/marketing-blog'

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
  const session = await gatePlatform(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!pavilionCmsEnabled()) {
    return NextResponse.json({ error: 'CMS unavailable' }, { status: 503 })
  }
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()
  const orgId = marketingBlogOrgId()
  await seedMarketingBlogIfEmpty(orgId)
  const posts = await listMarketingBlogPosts(orgId, { activeOnly: false })
  return NextResponse.json({ posts, organizationId: orgId })
}

export async function POST(req: NextRequest) {
  const session = await gatePlatform(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!pavilionCmsEnabled()) {
    return NextResponse.json({ error: 'CMS unavailable' }, { status: 503 })
  }
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()
  try {
    const body = (await req.json()) as Record<string, unknown>
    const title = String(body.title ?? '').trim()
    const slug =
      String(body.slug ?? '').trim() || (title ? slugifyBlogTitle(title) : '')
    const post = await upsertMarketingBlogPost({
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
    })
    return NextResponse.json({ post })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 400 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = await gatePlatform(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!pavilionCmsEnabled()) {
    return NextResponse.json({ error: 'CMS unavailable' }, { status: 503 })
  }
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()
  try {
    const body = (await req.json()) as Record<string, unknown>
    if (body.active !== undefined && body.id && !body.title) {
      await setMarketingBlogPostActive(String(body.id), body.active !== false)
      return NextResponse.json({ ok: true })
    }
    const title = String(body.title ?? '').trim()
    const slug =
      String(body.slug ?? '').trim() || (title ? slugifyBlogTitle(title) : '')
    const post = await upsertMarketingBlogPost({
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
    })
    return NextResponse.json({ post })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 400 },
    )
  }
}
