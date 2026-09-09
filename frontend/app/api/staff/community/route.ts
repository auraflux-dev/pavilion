import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  createCommunityPost,
  ensureCommunitySpaces,
  listCommunityPosts,
  listCommunityReplies,
  resolveCommunityOrgId,
  setCommunityPostHidden,
  setCommunityPostPinned,
} from '@/lib/community/store'
import { requireOrgModule } from '@/lib/modules/gate'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (
    !requireStaffRole(session?.staff ?? null, [
      'membership',
      'secretary',
      'marketing',
      'events',
      'admin',
    ])
  ) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session: session! }
}

export async function GET(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error

  const orgId = await resolveCommunityOrgId(req)
  if (!orgId) return NextResponse.json({ spaces: [], posts: [], replies: [] })
  const mod = await requireOrgModule(orgId, 'staff.community')
  if (mod) return mod

  const spaces = await ensureCommunitySpaces(orgId)
  const spaceId = String(req.nextUrl.searchParams.get('spaceId') ?? '').trim()
  const parentId = String(req.nextUrl.searchParams.get('parentId') ?? '').trim()
  const active = spaces.find((s) => s.id === spaceId) || spaces[0] || null

  if (parentId) {
    const replies = await listCommunityReplies(orgId, parentId, { includeHidden: true })
    return NextResponse.json({ spaces, posts: [], replies, spaceId: active?.id ?? null })
  }

  const posts = active ? await listCommunityPosts(orgId, active.id, { includeHidden: true }) : []
  return NextResponse.json({ spaces, posts, replies: [], spaceId: active?.id ?? null })
}

export async function POST(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error

  const orgId = await resolveCommunityOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'Community unavailable' }, { status: 400 })
  const mod = await requireOrgModule(orgId, 'staff.community')
  if (mod) return mod

  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? 'post').trim()

  if (action === 'hide' || action === 'unhide') {
    const postId = String(body.postId ?? '').trim()
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
    await setCommunityPostHidden(orgId, postId, action === 'hide')
    return NextResponse.json({ ok: true })
  }

  if (action === 'pin' || action === 'unpin') {
    const postId = String(body.postId ?? '').trim()
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
    await setCommunityPostPinned(orgId, postId, action === 'pin')
    return NextResponse.json({ ok: true })
  }

  const spaceId = String(body.spaceId ?? '').trim()
  const text = String(body.body ?? '').trim()
  const parentPostId = String(body.parentPostId ?? '').trim() || null
  if (!spaceId || !text) {
    return NextResponse.json({ error: 'spaceId and body required' }, { status: 400 })
  }

  await ensureCommunitySpaces(orgId)
  const name =
    g.session.staff.name || g.session.staff.boardTitle || g.session.email.split('@')[0] || 'Staff'
  const post = await createCommunityPost({
    orgId,
    spaceId,
    parentPostId,
    authorEmail: g.session.email,
    authorName: name,
    authorKind: 'staff',
    body: text,
  })
  return NextResponse.json({ ok: true, post })
}
