import { NextRequest, NextResponse } from 'next/server'
import { requireBrandStaff } from '@/lib/staff/brand-staff-gate'
import { loadGscImport, loadWorkspaceBundle, saveGscImport, saveWorkspaceBundle } from '@/lib/staff/seo/store'
import { fetchGscSearchAnalytics, googleAccessToken } from '@/lib/staff/seo/google'
import { seedContentIdeas } from '@/lib/staff/seo/content-bridge'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const imported = await loadGscImport(gated.gate.workspaceId)
  const bundle = await loadWorkspaceBundle(gated.gate.workspaceId, gated.gate.product)
  return NextResponse.json({
    imported,
    metrics: bundle.metrics,
    ideas: bundle.ideas,
  })
}

export async function POST(req: NextRequest) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const body = (await req.json().catch(() => ({}))) as { seedBlog?: boolean }
  const bundle = await loadWorkspaceBundle(gated.gate.workspaceId, gated.gate.product)
  const gsc = bundle.config.connection.integrations.find((i) => i.tool === 'gsc' && i.refreshTokenEnc)
  const siteUrl = bundle.config.connection.gscSiteUrl
  if (!gsc || !siteUrl) {
    return NextResponse.json(
      { error: 'Connect Google Search Console and pick a property first.' },
      { status: 400 },
    )
  }
  const access = await googleAccessToken(gsc.refreshTokenEnc)
  const rows = await fetchGscSearchAnalytics({ accessToken: access, siteUrl })
  await saveGscImport(gated.gate.workspaceId, rows)
  bundle.metrics = {
    importedAt: new Date().toISOString(),
    source: 'gsc_api',
    rows,
    totals: {
      clicks: rows.reduce((n, r) => n + r.clicks, 0),
      impressions: rows.reduce((n, r) => n + r.impressions, 0),
      queries: rows.length,
    },
  }
  const seeded = await seedContentIdeas({
    bundle,
    rows,
    product: gated.gate.product,
    publishBlogDrafts: Boolean(body.seedBlog),
  })
  await saveWorkspaceBundle(bundle)
  return NextResponse.json({
    rows,
    totals: bundle.metrics.totals,
    ideas: seeded.ideas,
    blogDrafts: seeded.seeded,
  })
}
