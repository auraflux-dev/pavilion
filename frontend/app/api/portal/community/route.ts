import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import {
  createCommunityPost,
  ensureCommunitySpaces,
  listCommunityPosts,
  listCommunityReplies,
  resolveCommunityOrgId,
  spacesForGrades,
} from '@/lib/community/store'

export async function GET(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await resolveCommunityOrgId(req)
  if (!orgId) return NextResponse.json({ spaces: [], posts: [], replies: [] })

  const spaces = await ensureCommunitySpaces(orgId)
  const gradesParam = String(req.nextUrl.searchParams.get('grades') ?? '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
  const visible = spacesForGrades(spaces, gradesParam)

  const spaceId = String(req.nextUrl.searchParams.get('spaceId') ?? '').trim()
  const parentId = String(req.nextUrl.searchParams.get('parentId') ?? '').trim()
  const activeSpace = visible.find((s) => s.id === spaceId) || visible[0] || null

  if (parentId) {
    const replies = await listCommunityReplies(orgId, parentId)
    return NextResponse.json({ spaces: visible, posts: [], replies, spaceId: activeSpace?.id ?? null })
  }

  const posts = activeSpace ? await listCommunityPosts(orgId, activeSpace.id) : []
  return NextResponse.json({
    spaces: visible,
    posts,
    replies: [],
    spaceId: activeSpace?.id ?? null,
  })
}

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await resolveCommunityOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'Community unavailable' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const spaceId = String(body.spaceId ?? '').trim()
  const text = String(body.body ?? '').trim()
  const parentPostId = String(body.parentPostId ?? '').trim() || null
  const authorName = String(body.authorName ?? '').trim() || session.email.split('@')[0]

  if (!spaceId || !text) {
    return NextResponse.json({ error: 'spaceId and body required' }, { status: 400 })
  }

  await ensureCommunitySpaces(orgId)
  const post = await createCommunityPost({
    orgId,
    spaceId,
    parentPostId,
    authorEmail: session.email,
    authorName,
    authorKind: 'parent',
    body: text,
  })
  return NextResponse.json({ ok: true, post })
}
