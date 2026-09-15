import { NextRequest, NextResponse } from 'next/server'
import { requireBrandStaff } from '@/lib/staff/brand-staff-gate'
import { BrandAiService } from '@/lib/staff/brand-strategy/ai'
import { createKit, updateKit } from '@/lib/staff/brand-strategy/store'
import type { BrandFollowup, BrandKitInputs } from '@/lib/staff/brand-strategy/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res

  const body = (await req.json()) as {
    phase?: 'followups' | 'strategy'
    workspaceId?: string
    kitId?: string
    inputs?: BrandKitInputs
    followups?: BrandFollowup[]
  }

  const workspaceId = body.workspaceId?.trim() || gated.gate.workspaceId
  const inputs = body.inputs
  if (!inputs?.brandName?.trim() || !inputs?.pitch?.trim()) {
    return NextResponse.json({ error: 'brandName and pitch required' }, { status: 400 })
  }

  const websiteContext =
    inputs.websiteContext || (await BrandAiService.fetchWebsiteContext(inputs.websiteUrl))
  const enriched: BrandKitInputs = { ...inputs, websiteContext: websiteContext || undefined }

  if (body.phase === 'followups') {
    let kitId = body.kitId
    if (!kitId) {
      const kit = await createKit({
        workspaceId,
        inputs: enriched,
        createdBy: gated.gate.email,
      })
      kitId = kit.id
    } else {
      await updateKit(workspaceId, kitId, { inputs: enriched, status: 'draft' })
    }
    const result = await BrandAiService.generateFollowups(enriched)
    await updateKit(workspaceId, kitId, {
      followups: result.followups,
      status: 'refining',
      model: result.model || null,
    })
    return NextResponse.json({
      kitId,
      followups: result.followups,
      warning: result.warning,
      configured: result.configured,
    })
  }

  const followups = body.followups || []
  let kitId = body.kitId
  if (!kitId) {
    const kit = await createKit({
      workspaceId,
      inputs: enriched,
      createdBy: gated.gate.email,
    })
    kitId = kit.id
  }

  const generated = await BrandAiService.generateStrategy({ inputs: enriched, followups })
  const updated = await updateKit(
    workspaceId,
    kitId,
    {
      inputs: enriched,
      followups,
      outputMd: generated.outputMd,
      outputJson: generated.outputJson,
      yamlTokens: generated.yamlTokens,
      model: generated.model,
      status: 'refining',
      title: enriched.brandName,
    },
    { snapshotNote: 'generated', createdBy: gated.gate.email },
  )

  return NextResponse.json({
    kitId,
    status: updated?.status || 'refining',
    outputMd: generated.outputMd,
    outputJson: generated.outputJson,
    yamlTokens: generated.yamlTokens,
    warning: generated.warning,
    configured: generated.configured,
  })
}
