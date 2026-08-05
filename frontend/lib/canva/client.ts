import { CANVA_API_BASE } from '@/lib/canva/config'

export type CanvaDesign = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  editUrl: string
  viewUrl: string
  thumbnailUrl: string
  pageCount: number | null
}

type RawDesign = {
  id?: string
  title?: string
  created_at?: number
  updated_at?: number
  page_count?: number
  urls?: { edit_url?: string; view_url?: string }
  thumbnail?: { url?: string }
}

function mapDesign(d: RawDesign): CanvaDesign | null {
  const id = String(d.id ?? '').trim()
  if (!id) return null
  return {
    id,
    title: String(d.title ?? 'Untitled').trim() || 'Untitled',
    createdAt: d.created_at ? new Date(d.created_at * 1000).toISOString() : '',
    updatedAt: d.updated_at ? new Date(d.updated_at * 1000).toISOString() : '',
    editUrl: String(d.urls?.edit_url ?? `https://www.canva.com/design/${id}/edit`),
    viewUrl: String(d.urls?.view_url ?? `https://www.canva.com/design/${id}/view`),
    thumbnailUrl: String(d.thumbnail?.url ?? ''),
    pageCount: typeof d.page_count === 'number' ? d.page_count : null,
  }
}

async function canvaFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${CANVA_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & {
    code?: string
    message?: string
  }
  if (!res.ok) {
    throw new Error(data.message || data.code || `Canva API ${res.status}`)
  }
  return data
}

export async function listCanvaDesigns(
  accessToken: string,
  opts?: { query?: string; limit?: number; continuation?: string },
): Promise<{ designs: CanvaDesign[]; continuation: string | null }> {
  const params = new URLSearchParams()
  params.set('limit', String(Math.min(Math.max(opts?.limit ?? 25, 1), 100)))
  params.set('sort_by', 'modified_descending')
  params.set('ownership', 'any')
  if (opts?.query?.trim()) params.set('query', opts.query.trim())
  if (opts?.continuation) params.set('continuation', opts.continuation)

  const data = await canvaFetch<{
    items?: RawDesign[]
    designs?: RawDesign[]
    continuation?: string
  }>(accessToken, `/designs?${params}`)

  const raw = data.items || data.designs || []
  const designs = raw.map(mapDesign).filter((d): d is CanvaDesign => Boolean(d))
  return { designs, continuation: data.continuation || null }
}

export async function getCanvaUser(accessToken: string): Promise<{
  displayName: string
  teamName: string
}> {
  const data = await canvaFetch<{
    team_user?: { user?: { display_name?: string }; team?: { name?: string } }
    display_name?: string
  }>(accessToken, '/users/me')
  return {
    displayName:
      data.team_user?.user?.display_name || data.display_name || 'Canva user',
    teamName: data.team_user?.team?.name || '',
  }
}

export async function createCanvaDesign(
  accessToken: string,
  opts?: { title?: string },
): Promise<CanvaDesign> {
  const data = await canvaFetch<{ design?: RawDesign }>(accessToken, '/designs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      design_type: { type: 'preset', name: 'doc' },
      title: opts?.title?.trim() || 'SHMS PTO draft',
    }),
  })
  const mapped = mapDesign(data.design || {})
  if (!mapped) throw new Error('Canva did not return a design')
  return mapped
}
