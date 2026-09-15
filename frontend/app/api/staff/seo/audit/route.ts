import { NextRequest, NextResponse } from 'next/server'
import { requireBrandStaff } from '@/lib/staff/brand-staff-gate'
import { loadAudit, loadWorkspaceBundle, saveAudit } from '@/lib/staff/seo/store'
import { runSiteAudit } from '@/lib/staff/seo/site-audit'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const report = await loadAudit(gated.gate.workspaceId)
  return NextResponse.json({ report })
}

export async function POST(req: NextRequest) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const body = (await req.json().catch(() => ({}))) as { origin?: string; maxPages?: number }
  const bundle = await loadWorkspaceBundle(gated.gate.workspaceId, gated.gate.product)
  const origin = (body.origin || bundle.config.origin).replace(/\/$/, '')
  const productHint =
    gated.gate.product === 'businessrocket'
      ? 'businessrocket'
      : gated.gate.product === 'pavilion'
        ? 'pavilion'
        : 'external'
  const report = await runSiteAudit({
    origin,
    maxPages: Math.min(Math.max(Number(body.maxPages) || 40, 8), 80),
    productHint,
  })
  await saveAudit(gated.gate.workspaceId, report)
  return NextResponse.json({ report })
}
