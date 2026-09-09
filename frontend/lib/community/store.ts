import 'server-only'

import { randomUUID } from 'crypto'
import { sqlForOrg } from '@/lib/crm/tenant'
import { pavilionCmsEnabled, resolveCmsOrganizationId } from '@/lib/cms/store'

export type CommunitySpaceKind = 'all' | 'grade' | 'committee'

export type CommunitySpace = {
  id: string
  kind: CommunitySpaceKind
  key: string
  title: string
  sortOrder: number
}

export type CommunityPost = {
  id: string
  spaceId: string
  parentPostId: string | null
  authorEmail: string
  authorName: string
  authorKind: 'parent' | 'staff'
  body: string
  pinned: boolean
  hidden: boolean
  createdAt: string
  replyCount?: number
}

const DEFAULT_SPACES: Array<{ kind: CommunitySpaceKind; key: string; title: string; sort: number }> =
  [
    { kind: 'all', key: 'all', title: 'Whole school', sort: 0 },
    { kind: 'grade', key: '6', title: '6th grade', sort: 10 },
    { kind: 'grade', key: '7', title: '7th grade', sort: 20 },
    { kind: 'grade', key: '8', title: '8th grade', sort: 30 },
    { kind: 'committee', key: 'pto', title: 'PTO board', sort: 40 },
    { kind: 'committee', key: 'events', title: 'Events committee', sort: 50 },
  ]

export async function ensureCommunitySpaces(orgId: string): Promise<CommunitySpace[]> {
  if (!pavilionCmsEnabled()) return []
  const existing = await listCommunitySpaces(orgId)
  if (existing.length > 0) return existing

  for (const s of DEFAULT_SPACES) {
    await sqlForOrg(
      orgId,
      `insert into cms_community_spaces (id, organization_id, kind, key, title, sort_order)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (organization_id, kind, key) do nothing`,
      [randomUUID(), orgId, s.kind, s.key, s.title, s.sort],
    )
  }
  return listCommunitySpaces(orgId)
}

export async function listCommunitySpaces(orgId: string): Promise<CommunitySpace[]> {
  if (!pavilionCmsEnabled()) return []
  const res = await sqlForOrg<{
    id: string
    kind: string
    key: string
    title: string
    sort_order: number
  }>(
    orgId,
    `select id, kind, key, title, sort_order
       from cms_community_spaces
      where organization_id = $1 and active = true
      order by sort_order asc`,
    [orgId],
  )
  return res.rows.map((r) => ({
    id: r.id,
    kind: r.kind as CommunitySpaceKind,
    key: r.key,
    title: r.title,
    sortOrder: r.sort_order,
  }))
}

export function spacesForGrades(spaces: CommunitySpace[], grades: string[]): CommunitySpace[] {
  const gradeSet = new Set(grades.map((g) => g.replace(/[^0-9]/g, '')).filter(Boolean))
  return spaces.filter((s) => {
    if (s.kind === 'all') return true
    if (s.kind === 'grade') return gradeSet.has(s.key) || gradeSet.size === 0
    return true
  })
}

export async function listCommunityPosts(
  orgId: string,
  spaceId: string,
  opts?: { includeHidden?: boolean },
): Promise<CommunityPost[]> {
  if (!pavilionCmsEnabled()) return []
  const includeHidden = opts?.includeHidden === true
  const res = await sqlForOrg<{
    id: string
    space_id: string
    parent_post_id: string | null
    author_email: string
    author_name: string
    author_kind: string
    body: string
    pinned: boolean
    hidden: boolean
    created_at: Date
    reply_count: string
  }>(
    orgId,
    `select p.id, p.space_id, p.parent_post_id, p.author_email, p.author_name, p.author_kind,
            p.body, p.pinned, p.hidden, p.created_at,
            (select count(*)::text from cms_community_posts r
              where r.parent_post_id = p.id and r.organization_id = p.organization_id
                and ($3::boolean or r.hidden = false)) as reply_count
       from cms_community_posts p
      where p.organization_id = $1
        and p.space_id = $2
        and p.parent_post_id is null
        and ($3::boolean or p.hidden = false)
      order by p.pinned desc, p.created_at desc
      limit 100`,
    [orgId, spaceId, includeHidden],
  )
  return res.rows.map(mapPost)
}

export async function listCommunityReplies(
  orgId: string,
  parentPostId: string,
  opts?: { includeHidden?: boolean },
): Promise<CommunityPost[]> {
  if (!pavilionCmsEnabled()) return []
  const includeHidden = opts?.includeHidden === true
  const res = await sqlForOrg<{
    id: string
    space_id: string
    parent_post_id: string | null
    author_email: string
    author_name: string
    author_kind: string
    body: string
    pinned: boolean
    hidden: boolean
    created_at: Date
    reply_count: string
  }>(
    orgId,
    `select id, space_id, parent_post_id, author_email, author_name, author_kind,
            body, pinned, hidden, created_at, '0' as reply_count
       from cms_community_posts
      where organization_id = $1
        and parent_post_id = $2
        and ($3::boolean or hidden = false)
      order by created_at asc
      limit 200`,
    [orgId, parentPostId, includeHidden],
  )
  return res.rows.map(mapPost)
}

export async function createCommunityPost(input: {
  orgId: string
  spaceId: string
  parentPostId?: string | null
  authorEmail: string
  authorName: string
  authorKind: 'parent' | 'staff'
  body: string
}): Promise<CommunityPost> {
  const id = randomUUID()
  const body = input.body.trim()
  if (!body) throw new Error('body required')
  await sqlForOrg(
    input.orgId,
    `insert into cms_community_posts
      (id, organization_id, space_id, parent_post_id, author_email, author_name, author_kind, body)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      input.orgId,
      input.spaceId,
      input.parentPostId || null,
      input.authorEmail.trim().toLowerCase(),
      input.authorName.trim() || 'Parent',
      input.authorKind,
      body,
    ],
  )
  return {
    id,
    spaceId: input.spaceId,
    parentPostId: input.parentPostId || null,
    authorEmail: input.authorEmail.trim().toLowerCase(),
    authorName: input.authorName.trim() || 'Parent',
    authorKind: input.authorKind,
    body,
    pinned: false,
    hidden: false,
    createdAt: new Date().toISOString(),
  }
}

export async function setCommunityPostHidden(
  orgId: string,
  postId: string,
  hidden: boolean,
): Promise<void> {
  await sqlForOrg(
    orgId,
    `update cms_community_posts set hidden = $3, updated_at = now()
      where organization_id = $1 and id = $2`,
    [orgId, postId, hidden],
  )
}

export async function setCommunityPostPinned(
  orgId: string,
  postId: string,
  pinned: boolean,
): Promise<void> {
  await sqlForOrg(
    orgId,
    `update cms_community_posts set pinned = $3, updated_at = now()
      where organization_id = $1 and id = $2 and parent_post_id is null`,
    [orgId, postId, pinned],
  )
}

export async function resolveCommunityOrgId(req: Request): Promise<string | null> {
  return resolveCmsOrganizationId(req)
}

function mapPost(r: {
  id: string
  space_id: string
  parent_post_id: string | null
  author_email: string
  author_name: string
  author_kind: string
  body: string
  pinned: boolean
  hidden: boolean
  created_at: Date
  reply_count: string
}): CommunityPost {
  return {
    id: r.id,
    spaceId: r.space_id,
    parentPostId: r.parent_post_id,
    authorEmail: r.author_email,
    authorName: r.author_name,
    authorKind: r.author_kind === 'staff' ? 'staff' : 'parent',
    body: r.body,
    pinned: r.pinned,
    hidden: r.hidden,
    createdAt: new Date(r.created_at).toISOString(),
    replyCount: Number(r.reply_count || 0),
  }
}
