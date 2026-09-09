import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  createP2pCampaign,
  listP2pCampaigns,
  listP2pPagesForCampaign,
  resolveP2pOrgId,
  setP2pCampaignActive,
} from '@/lib/p2p/store'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (
    !requireStaffRole(session?.staff ?? null, [
      'treasurer',
      'programs',
      'marketing',
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
  const orgId = await resolveP2pOrgId(req)
  if (!orgId) return NextResponse.json({ campaigns: [], pages: [] })

  const campaignId = String(req.nextUrl.searchParams.get('campaignId') ?? '').trim()
  const campaigns = await listP2pCampaigns(orgId)
  if (campaignId) {
    const pages = await listP2pPagesForCampaign(orgId, campaignId)
    return NextResponse.json({ campaigns, pages, campaignId })
  }
  return NextResponse.json({ campaigns, pages: [] })
}

export async function POST(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error
  const orgId = await resolveP2pOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'Unavailable' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? 'create').trim()

  if (action === 'setActive') {
    const campaignId = String(body.campaignId ?? '').trim()
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    await setP2pCampaignActive(orgId, campaignId, body.active !== false)
    return NextResponse.json({ ok: true })
  }

  try {
    const campaign = await createP2pCampaign({
      orgId,
      title: String(body.title ?? ''),
      story: String(body.story ?? ''),
      goalCents: Math.round(Number(body.goalDollars ?? 0) * 100) || 0,
      slug: String(body.slug ?? ''),
    })
    return NextResponse.json({ ok: true, campaign })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create' },
      { status: 400 },
    )
  }
}
