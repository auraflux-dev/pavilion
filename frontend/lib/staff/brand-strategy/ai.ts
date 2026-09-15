import type {
  BrandFollowup,
  BrandKitInputs,
  BrandOutputJson,
} from '@/lib/staff/brand-strategy/types'
import { renderBrandMarkdown } from '@/lib/staff/brand-strategy/types'

export type BrandProductHint = 'pavilion' | 'auraflux' | 'businessrocket' | string

function systemPrompt(product: BrandProductHint): string {
  if (product === 'auraflux') {
    return `You are a brand strategist for AuraFlux (creator / production software).
Write for streamers, clip ops, and multi-platform Shorts teams — not school boards or trades.
Be specific to the inputs. No generic marketing fluff.
No em dashes. Prefer periods and short lines.
SEO pillars should favor peak-to-Shorts, Twitch-to-TikTok, Kick CCV, and clipping-tool compares (Opus, Eklipse, Vizard).
SMM angles: YouTube Shorts, TikTok, Reels. Ads hooks: performance creative for creator platforms.
Location-agnostic unless the pitch names a sales region.`
  }
  if (product === 'businessrocket') {
    return `You are a brand strategist for Business Rocket (local service businesses).
Be specific to the inputs. No generic marketing fluff.
No em dashes. Prefer periods and short lines.
SEO is local/service-category first. No Composio references.`
  }
  return `You are a brand strategist for Pavilion (PTO/PTA software).
Write for school boards, not trades contractors.
Be specific to the inputs. No generic marketing fluff.
No em dashes. Prefer periods and short lines.
SEO should be regional/category first (PTO software, PTA membership, compares).
Local geo only if the pitch names a sales region.`
}

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

  static async generateFollowups(
    inputs: BrandKitInputs,
    product: BrandProductHint = 'pavilion',
  ): Promise<{
    configured: boolean
    followups: BrandFollowup[]
    model?: string
    warning?: string
  }> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        followups: mockFollowups(inputs, product),
        warning: 'OPENAI_API_KEY missing. Using local follow-up questions.',
      }
    }
    const model = this.model()
    try {
      const json = await chatJson(
        model,
        systemPrompt(product),
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
      while (qs.length < 3) {
        qs.push(mockFollowups(inputs, product)[qs.length]?.question || 'What else matters?')
      }
      return { configured: true, model, followups: qs.map((question) => ({ question })) }
    } catch (e) {
      return {
        configured: true,
        model,
        followups: mockFollowups(inputs, product),
        warning: e instanceof Error ? e.message : String(e),
      }
    }
  }

  static async generateStrategy(input: {
    inputs: BrandKitInputs
    followups: BrandFollowup[]
    product?: BrandProductHint
  }): Promise<{
    configured: boolean
    outputMd: string
    outputJson: BrandOutputJson
    yamlTokens: string
    model: string
    warning?: string
  }> {
    const product = input.product || 'pavilion'
    const model = this.isConfigured() ? this.model() : 'placeholder'
    if (!this.isConfigured()) {
      const mock = mockStrategy(input.inputs, product)
      return { configured: false, model, ...mock, warning: 'OPENAI_API_KEY missing. Placeholder kit.' }
    }
    try {
      const json = await chatJson(
        model,
        systemPrompt(product),
        [
          'Produce a full brand strategy JSON with keys:',
          'positioning{statement,uvp,are[],areNot[]}, vmv{vision,mission,values[]},',
          'voice{dos[],donts[],examples[]},',
          'growth{seo{pillars[{name,intent,notes}]}, smm{notes,angles[]}, ads{notes,hooks[]}}',
          '',
          summarizeInputs(input.inputs),
          '',
          'Follow-up answers:',
          ...input.followups.map(
            (f, i) => `Q${i + 1}: ${f.question}\nA${i + 1}: ${f.answer || '(blank)'}`,
          ),
        ].join('\n'),
      )
      const strategy = normalizeStrategy(json, input.inputs, product)
      return {
        configured: true,
        model,
        outputJson: strategy,
        outputMd: renderBrandMarkdown(strategy, input.inputs),
        yamlTokens: buildYaml(strategy, input.inputs),
      }
    } catch (e) {
      const mock = mockStrategy(input.inputs, product)
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

function mockFollowups(inputs: BrandKitInputs, product: BrandProductHint = 'pavilion'): BrandFollowup[] {
  if (product === 'auraflux') {
    return [
      { question: `Who is the primary operator for ${inputs.brandName}: creator, clip editor, or agency producer?` },
      { question: 'Which compare page matters first: Opus, Eklipse, Vizard, or peak-to-Shorts workflow?' },
      { question: 'Lead platforms for Shorts: YouTube, TikTok, both, or Twitch/Kick source first?' },
    ]
  }
  return [
    { question: `Who on a ${inputs.brandName} board should sound like this voice in public copy?` },
    { question: 'Which compare pages matter first: PTO software, PTA membership, or school portal?' },
    { question: 'Any region we should treat as local, or stay category/regional only?' },
  ]
}

function emptyStrategy(inputs: BrandKitInputs, product: BrandProductHint = 'pavilion'): BrandOutputJson {
  if (product === 'auraflux') {
    return {
      positioning: {
        statement: `${inputs.brandName} turns stream peaks into published Shorts without hiring another editor seat.`,
        uvp: 'Peaks + publish for creators and clip teams.',
        are: ['creator production software', 'peak-to-Shorts automation', 'multi-platform publish'],
        areNot: ['manual clip marketplaces', 'generic video editors', 'agency-only retainers'],
      },
      vmv: {
        vision: 'Every streamer ships Shorts from real peak signal, not VOD scrubbing.',
        mission: `Give ${inputs.brandName} a creator voice kit ops can approve and reuse.`,
        values: ['signal first', 'review before publish', 'no fluff'],
      },
      voice: {
        dos: ['Name the Peak → Short → publish job.', 'Talk to operators, not spectators.', 'Short lines.'],
        donts: ['Em dashes.', 'School-board or trades copy.', 'Invent ranks, views, or spend.'],
        examples: [
          `${inputs.brandName} is for streamers and clip ops.`,
          'Peaks become Shorts. You approve before anything goes live.',
        ],
      },
      growth: {
        seo: {
          pillars: [
            {
              name: 'YouTube Most Replayed to Shorts',
              intent: 'peak-to-shorts',
              notes: 'How heat maps become publishable Shorts.',
            },
            {
              name: 'Twitch to TikTok clip workflow',
              intent: 'clipping-automation',
              notes: 'Source from Twitch/Kick; ship TikTok and Shorts.',
            },
            {
              name: 'Opus / Eklipse / Vizard compares',
              intent: 'compare',
              notes: 'Peaks + publish vs single-feature clip tools.',
            },
          ],
        },
        smm: {
          notes: 'Social compose is phase 2. Lead with YouTube Shorts and TikTok when live.',
          angles: ['Peak moment demos', 'Before/after scrub vs signal', 'Operator tips. Not vanity ads.'],
        },
        ads: {
          notes: 'Performance creative for creator platforms. Stub until Ads lane ships.',
          hooks: ['Stop scrubbing VODs', 'Peaks your audience already watched', 'Publish with review'],
        },
      },
    }
  }
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
      ads: {
        notes: 'Ads lane stub. Prefer honest empty states over invented spend.',
        hooks: ['Board-ready software', 'Membership without chaos'],
      },
    },
  }
}

function mockStrategy(inputs: BrandKitInputs, product: BrandProductHint = 'pavilion') {
  const strategy = emptyStrategy(inputs, product)
  return {
    outputJson: strategy,
    outputMd: renderBrandMarkdown(strategy, inputs),
    yamlTokens: buildYaml(strategy, inputs),
  }
}

function normalizeStrategy(
  raw: Record<string, unknown>,
  inputs: BrandKitInputs,
  product: BrandProductHint = 'pavilion',
): BrandOutputJson {
  const base = emptyStrategy(inputs, product)
  const s = (raw.strategy || raw) as Record<string, unknown>
  const pos = (s.positioning || {}) as Record<string, unknown>
  const vmv = (s.vmv || {}) as Record<string, unknown>
  const voice = (s.voice || {}) as Record<string, unknown>
  const growth = (s.growth || {}) as Record<string, unknown>
  const seo = (growth.seo || {}) as Record<string, unknown>
  const smm = (growth.smm || {}) as Record<string, unknown>
  const ads = (growth.ads || {}) as Record<string, unknown>
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
      ads: {
        notes: String(ads.notes || base.growth.ads?.notes || ''),
        hooks: Array.isArray(ads.hooks)
          ? ads.hooks.map(String)
          : base.growth.ads?.hooks || [],
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
