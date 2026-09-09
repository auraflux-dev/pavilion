import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import {
  createP2pPage,
  listMyP2pPages,
  listP2pCampaigns,
  resolveP2pOrgId,
} from '@/lib/p2p/store'

export async function GET(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = await resolveP2pOrgId(req)
  if (!orgId) return NextResponse.json({ campaigns: [], pages: [] })
  const campaigns = (await listP2pCampaigns(orgId)).filter((c) => c.active)
  const pages = await listMyP2pPages(orgId, session.email)
  return NextResponse.json({ campaigns, pages })
}

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = await resolveP2pOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'Unavailable' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const campaignId = String(body.campaignId ?? '').trim()
  const blurb = String(body.blurb ?? '').trim()
  const authorName =
    String(body.authorName ?? '').trim() ||
    session.email.split('@')[0] ||
    'Parent'

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
  }

  try {
    const page = await createP2pPage({
      orgId,
      campaignId,
      ownerEmail: session.email,
      ownerName: authorName,
      blurb,
    })
    return NextResponse.json({ ok: true, page })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create page' },
      { status: 400 },
    )
  }
}
