/**
 * Multi-section newsletter copy. Plain text for archive; structured beats for HTML email.
 */

export const NEWSLETTER_BEAT_PRESETS = [
  {
    id: 'event',
    label: 'Event',
    hint: 'Upcoming event, date, or ticket reminder',
  },
  {
    id: 'question',
    label: 'Question',
    hint: 'Reply prompt or link to a poll form (plain text only, not portal Ask the PTO)',
  },
  {
    id: 'cta',
    label: 'CTA',
    hint: 'Volunteer, sign up, donate, or shop The Cove',
  },
  {
    id: 'custom',
    label: 'Custom',
    hint: 'Any other section',
  },
] as const

export type NewsletterBeatPreset = (typeof NEWSLETTER_BEAT_PRESETS)[number]['id']

export const NEWSLETTER_MAX_BEATS = 8

export type NewsletterBeat = {
  preset: NewsletterBeatPreset
  heading: string
  body: string
}

/** @deprecated use NEWSLETTER_BEAT_PRESETS */
export const NEWSLETTER_BEAT_LABELS = NEWSLETTER_BEAT_PRESETS.filter((p) => p.id !== 'custom').map(
  (p) => p.label,
) as ['Event', 'Question', 'CTA']

export function emptyNewsletterBeat(preset: NewsletterBeatPreset = 'custom'): NewsletterBeat {
  return { preset, heading: '', body: '' }
}

export function defaultNewsletterBeats(): NewsletterBeat[] {
  return [
    emptyNewsletterBeat('event'),
    emptyNewsletterBeat('question'),
    emptyNewsletterBeat('cta'),
  ]
}

/** @deprecated */
export function emptyNewsletterBeats(): NewsletterBeat[] {
  return defaultNewsletterBeats()
}

export function presetLabel(preset: NewsletterBeatPreset): string {
  return NEWSLETTER_BEAT_PRESETS.find((p) => p.id === preset)?.label ?? 'Section'
}

export function composeNewsletterBody(opts: {
  intro: string
  beats: NewsletterBeat[]
  signoff: string
}): string {
  const parts: string[] = []
  const intro = String(opts.intro ?? '').trim()
  if (intro) parts.push(intro)
  for (const beat of opts.beats ?? []) {
    const heading = String(beat.heading ?? '').trim()
    const body = String(beat.body ?? '').trim()
    if (!heading && !body) continue
    parts.push(heading && body ? `${heading}\n${body}` : heading || body)
  }
  const signoff = String(opts.signoff ?? '').trim()
  if (signoff) parts.push(signoff)
  return parts.join('\n\n')
}

export type NewsletterSections = {
  intro: string
  beats: NewsletterBeat[]
  signoff: string
}

export function normalizeNewsletterSections(raw: Partial<NewsletterSections> | null): NewsletterSections {
  const beats = Array.isArray(raw?.beats) ? raw!.beats!.slice(0, NEWSLETTER_MAX_BEATS) : []
  const normalized: NewsletterBeat[] = beats.map((b) => ({
    preset: normalizePreset((b as NewsletterBeat).preset),
    heading: String(b?.heading ?? '').trim(),
    body: String(b?.body ?? '').trim(),
  }))
  while (normalized.length < 1) normalized.push(emptyNewsletterBeat('event'))
  return {
    intro: String(raw?.intro ?? ''),
    beats: normalized,
    signoff: String(raw?.signoff ?? ''),
  }
}

function normalizePreset(raw: unknown): NewsletterBeatPreset {
  const id = String(raw ?? 'custom').trim().toLowerCase()
  if (id === 'ask') return 'question'
  if (NEWSLETTER_BEAT_PRESETS.some((p) => p.id === id)) return id as NewsletterBeatPreset
  return 'custom'
}

export function parseBeatsJson(raw: string): NewsletterSections | null {
  try {
    const p = JSON.parse(raw) as {
      intro?: string
      beats?: Array<Partial<NewsletterBeat> & { preset?: string }>
      signoff?: string
    }
    if (!p || typeof p !== 'object') return null
    return normalizeNewsletterSections({
      intro: p.intro,
      beats: (p.beats ?? []).map((b) => ({
        preset: normalizePreset(b.preset),
        heading: String(b.heading ?? ''),
        body: String(b.body ?? ''),
      })),
      signoff: p.signoff,
    })
  } catch {
    return null
  }
}

export function stringifyBeatsJson(opts: NewsletterSections): string {
  return JSON.stringify(normalizeNewsletterSections(opts))
}

export function sectionsHaveContent(sections: NewsletterSections): boolean {
  if (String(sections.intro ?? '').trim()) return true
  if (String(sections.signoff ?? '').trim()) return true
  return (sections.beats ?? []).some((b) => b.heading.trim() || b.body.trim())
}
