export type BrandWorkspaceId = string
export type BrandKitStatus = 'draft' | 'refining' | 'approved'

export type BrandKitInputs = {
  brandName: string
  websiteUrl?: string
  pitch: string
  competitors: { name: string; url?: string }[]
  vibePreset?: string
  vibeNotes?: string
  websiteContext?: string
}

export type BrandFollowup = {
  question: string
  answer?: string
}

export type BrandOutputJson = {
  positioning: {
    statement: string
    uvp: string
    are: string[]
    areNot: string[]
  }
  vmv: {
    vision: string
    mission: string
    values: string[]
  }
  voice: {
    dos: string[]
    donts: string[]
    examples: string[]
  }
  growth: {
    seo: { pillars: { name: string; intent: string; notes: string }[] }
    smm: { notes: string; angles: string[] }
  }
}

export type BrandKit = {
  id: string
  workspaceId: BrandWorkspaceId
  status: BrandKitStatus | string
  title: string
  inputs: BrandKitInputs
  followups: BrandFollowup[]
  outputMd: string | null
  outputJson: BrandOutputJson | null
  yamlTokens: string | null
  model: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  approvedAt: string | null
}

export function exportGuidelinesFile(kit: {
  inputs: BrandKitInputs
  outputMd: string | null
  outputJson: BrandOutputJson | null
  yamlTokens: string | null
}): string {
  const yaml =
    kit.yamlTokens ||
    `---\nbrand: ${JSON.stringify(kit.inputs.brandName)}\napproved: true\n---\n\n`
  const body =
    kit.outputMd ||
    (kit.outputJson ? renderBrandMarkdown(kit.outputJson, kit.inputs) : '# Brand guidelines\n')
  if (body.trimStart().startsWith('---')) return body
  return `${yaml}${body}`
}

export function renderBrandMarkdown(s: BrandOutputJson, inputs: BrandKitInputs): string {
  return [
    `# ${inputs.brandName} brand guidelines`,
    '',
    '## Positioning',
    s.positioning.statement,
    '',
    `UVP: ${s.positioning.uvp}`,
    `We are: ${s.positioning.are.join('; ')}`,
    `We are not: ${s.positioning.areNot.join('; ')}`,
    '',
    '## Vision / mission / values',
    `Vision: ${s.vmv.vision}`,
    `Mission: ${s.vmv.mission}`,
    `Values: ${s.vmv.values.join(', ')}`,
    '',
    '## Voice',
    `Do: ${s.voice.dos.join('; ')}`,
    `Don't: ${s.voice.donts.join('; ')}`,
    ...s.voice.examples.map((e) => `- ${e}`),
    '',
    '## SEO pillars',
    ...s.growth.seo.pillars.map((p) => `- ${p.name} (${p.intent}): ${p.notes}`),
    '',
    '## Social later',
    s.growth.smm.notes,
    ...s.growth.smm.angles.map((a) => `- ${a}`),
    '',
  ].join('\n')
}
