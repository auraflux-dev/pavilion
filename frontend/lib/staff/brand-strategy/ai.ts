import type {
  BrandFollowup,
  BrandKitInputs,
  BrandOutputJson,
} from '@/lib/staff/brand-strategy/types'
import { renderBrandMarkdown } from '@/lib/staff/brand-strategy/types'

const SYSTEM = `You are a brand strategist for Pavilion (PTO/PTA software).
Write for school boards, not trades contractors.
Be specific to the inputs. No generic marketing fluff.
No em dashes. Prefer periods and short lines.
SEO should be regional/category first (PTO software, PTA membership, compares).
Local geo only if the pitch names a sales region.`

export class BrandAiService {
  static isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim())
  }

  static model(): string {
    return process.env.OPENAI_BRAND_MODEL?.trim() || 'gpt-4o-mini'
  }

  static async fetchWebsiteContext(url?: string): Promise<string> {
    const raw = url?.trim()
    if (!raw) return ''
    try {
      const u = raw.startsWith('http') ? raw : `https://${raw}`
      const res = await fetch(u, {
        headers: { 'User-Agent': 'PavilionBrandBot/1.0 (+https://onpavilion.com)' },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) return ''
      const html = await res.text()
      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || ''
      const desc =
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ||
        ''
      return [title && `Title: ${title}`, desc && `Description: ${desc}`]
        .filter(Boolean)
        .join('\n')
        .slice(0, 1200)
    } catch {
      return ''
    }
  }

  static async generateFollowups(inputs: BrandKitInputs): Promise<{
    configured: boolean
    followups: BrandFollowup[]
    model?: string
    warning?: string
  }> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        followups: mockFollowups(inputs),
        warning: 'OPENAI_API_KEY missing. Using local follow-up questions.',
      }
    }
    const model = this.model()
    try {
      const json = await chatJson(
        model,
        SYSTEM,
        [
          'Ask exactly 3 specific follow-up questions.',
          'Return JSON: {"questions":["...","...","..."]}',
          '',
          summarizeInputs(inputs),
        ].join('\n'),
      )
      const qs = Array.isArray(json.questions)
        ? (json.questions as unknown[]).map((q) => String(q)).filter(Boolean).slice(0, 3)
        : []
      while (qs.length < 3) qs.push(mockFollowups(inputs)[qs.length]?.question || 'What else matters?')
      return { configured: true, model, followups: qs.map((question) => ({ question })) }
    } catch (e) {
      return {
        configured: true,
        model,
        followups: mockFollowups(inputs),
        warning: e instanceof Error ? e.message : String(e),
      }
    }
  }

  static async generateStrategy(input: {
    inputs: BrandKitInputs
    followups: BrandFollowup[]
  }): Promise<{
    configured: boolean
    outputMd: string
    outputJson: BrandOutputJson
    yamlTokens: string
    model: string
    warning?: string
  }> {
    const model = this.isConfigured() ? this.model() : 'placeholder'
    if (!this.isConfigured()) {
      const mock = mockStrategy(input.inputs)
      return { configured: false, model, ...mock, warning: 'OPENAI_API_KEY missing. Placeholder kit.' }
    }
    try {
      const json = await chatJson(
        model,
        SYSTEM,
        [
          'Produce a full brand strategy JSON with keys:',
          'positioning{statement,uvp,are[],areNot[]}, vmv{vision,mission,values[]},',
          'voice{dos[],donts[],examples[]},',
          'growth{seo{pillars[{name,intent,notes}]}, smm{notes,angles[]}}',
          '',
          summarizeInputs(input.inputs),
          '',
          'Follow-up answers:',
          ...input.followups.map((f, i) => `Q${i + 1}: ${f.question}\nA${i + 1}: ${f.answer || '(blank)'}`),
        ].join('\n'),
      )
      const strategy = normalizeStrategy(json, input.inputs)
      return {
        configured: true,
        model,
        outputJson: strategy,
        outputMd: renderBrandMarkdown(strategy, input.inputs),
        yamlTokens: buildYaml(strategy, input.inputs),
      }
    } catch (e) {
      const mock = mockStrategy(input.inputs)
      return {
        configured: true,
        model,
        ...mock,
        warning: e instanceof Error ? e.message : String(e),
      }
    }
  }
}

function summarizeInputs(inputs: BrandKitInputs) {
  return [
    `Brand: ${inputs.brandName}`,
    `Site: ${inputs.websiteUrl || '(none)'}`,
    `Pitch: ${inputs.pitch}`,
    `Competitors: ${inputs.competitors.map((c) => c.name).join(', ') || '(none)'}`,
    `Vibe: ${inputs.vibeNotes || inputs.vibePreset || '(none)'}`,
    inputs.websiteContext ? `Site context:\n${inputs.websiteContext}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function mockFollowups(inputs: BrandKitInputs): BrandFollowup[] {
  return [
    { question: `Who on a ${inputs.brandName} board should sound like this voice in public copy?` },
    { question: 'Which compare pages matter first: PTO software, PTA membership, or school portal?' },
    { question: 'Any region we should treat as local, or stay category/regional only?' },
  ]
}

function emptyStrategy(inputs: BrandKitInputs): BrandOutputJson {
  return {
    positioning: {
      statement: `${inputs.brandName} helps parent organizations run membership, events, and staff work in one product.`,
      uvp: 'School-branded software boards can actually operate.',
      are: ['PTO/PTA software', 'board operations', 'parent membership'],
      areNot: ['generic website builders', 'district SIS', 'social ad agencies'],
    },
    vmv: {
      vision: 'Every school community runs on software that matches how boards actually work.',
      mission: `Give ${inputs.brandName} a voice kit boards can approve and reuse.`,
      values: ['plain language', 'board-first', 'no fluff'],
    },
    voice: {
      dos: ['Short sentences.', 'Name the board job.', 'Line break when the idea turns.'],
      donts: ['Em dashes.', 'Trades contractor copy.', 'Invent ranks or spend.'],
      examples: [
        `${inputs.brandName} is for PTO and PTA boards.`,
        'Membership, events, and staff stay in one product.',
      ],
    },
    growth: {
      seo: {
        pillars: [
          { name: 'PTO software', intent: 'category', notes: 'Compare and explain the product job.' },
          { name: 'PTA membership', intent: 'category', notes: 'Membership pages and how-to content.' },
        ],
      },
      smm: {
        notes: 'Social is phase 2. Facebook group posts need board approval.',
        angles: ['Board how-tos', 'Quiet wins. Not ads.'],
      },
    },
  }
}

function mockStrategy(inputs: BrandKitInputs) {
  const strategy = emptyStrategy(inputs)
  return {
    outputJson: strategy,
    outputMd: renderBrandMarkdown(strategy, inputs),
    yamlTokens: buildYaml(strategy, inputs),
  }
}

function normalizeStrategy(raw: Record<string, unknown>, inputs: BrandKitInputs): BrandOutputJson {
  const base = emptyStrategy(inputs)
  const s = (raw.strategy || raw) as Record<string, unknown>
  const pos = (s.positioning || {}) as Record<string, unknown>
  const vmv = (s.vmv || {}) as Record<string, unknown>
  const voice = (s.voice || {}) as Record<string, unknown>
  const growth = (s.growth || {}) as Record<string, unknown>
  const seo = (growth.seo || {}) as Record<string, unknown>
  const smm = (growth.smm || {}) as Record<string, unknown>
  return {
    positioning: {
      statement: String(pos.statement || base.positioning.statement),
      uvp: String(pos.uvp || base.positioning.uvp),
      are: Array.isArray(pos.are) ? pos.are.map(String) : base.positioning.are,
      areNot: Array.isArray(pos.areNot) ? pos.areNot.map(String) : base.positioning.areNot,
    },
    vmv: {
      vision: String(vmv.vision || base.vmv.vision),
      mission: String(vmv.mission || base.vmv.mission),
      values: Array.isArray(vmv.values) ? vmv.values.map(String) : base.vmv.values,
    },
    voice: {
      dos: Array.isArray(voice.dos) ? voice.dos.map(String) : base.voice.dos,
      donts: Array.isArray(voice.donts) ? voice.donts.map(String) : base.voice.donts,
      examples: Array.isArray(voice.examples) ? voice.examples.map(String) : base.voice.examples,
    },
    growth: {
      seo: {
        pillars: Array.isArray(seo.pillars)
          ? (seo.pillars as Record<string, unknown>[]).map((p) => ({
              name: String(p.name || ''),
              intent: String(p.intent || 'category'),
              notes: String(p.notes || ''),
            }))
          : base.growth.seo.pillars,
      },
      smm: {
        notes: String(smm.notes || base.growth.smm.notes),
        angles: Array.isArray(smm.angles) ? smm.angles.map(String) : base.growth.smm.angles,
      },
    },
  }
}

function buildYaml(s: BrandOutputJson, inputs: BrandKitInputs) {
  return [
    '---',
    `brand: ${JSON.stringify(inputs.brandName)}`,
    `uvp: ${JSON.stringify(s.positioning.uvp)}`,
    `tone: ${JSON.stringify(s.voice.dos.slice(0, 3))}`,
    '---',
    '',
  ].join('\n')
}

async function chatJson(model: string, system: string, user: string): Promise<Record<string, unknown>> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
    }),
  })
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(json.error?.message || 'OpenAI request failed')
  const content = json.choices?.[0]?.message?.content || '{}'
  return JSON.parse(content) as Record<string, unknown>
}
