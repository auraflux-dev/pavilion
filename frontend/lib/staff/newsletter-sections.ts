/**
 * Multi-section newsletter copy (plain text beats). Not a Mailchimp builder.
 * Diane still edits headings + paragraphs; we join them into one body.
 */

export type NewsletterBeat = {
  heading: string
  body: string
}

export const NEWSLETTER_BEAT_LABELS = ['Event', 'Ask', 'CTA'] as const

export function emptyNewsletterBeats(): NewsletterBeat[] {
  return NEWSLETTER_BEAT_LABELS.map(() => ({ heading: '', body: '' }))
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

export function parseBeatsJson(raw: string): {
  intro: string
  beats: NewsletterBeat[]
  signoff: string
} | null {
  try {
    const p = JSON.parse(raw) as {
      intro?: string
      beats?: NewsletterBeat[]
      signoff?: string
    }
    if (!p || typeof p !== 'object') return null
    const beats = Array.isArray(p.beats) ? p.beats.slice(0, 3) : []
    while (beats.length < 3) beats.push({ heading: '', body: '' })
    return {
      intro: String(p.intro ?? ''),
      beats: beats.map((b) => ({
        heading: String(b?.heading ?? ''),
        body: String(b?.body ?? ''),
      })),
      signoff: String(p.signoff ?? ''),
    }
  } catch {
    return null
  }
}

export function stringifyBeatsJson(opts: {
  intro: string
  beats: NewsletterBeat[]
  signoff: string
}): string {
  return JSON.stringify({
    intro: opts.intro,
    beats: opts.beats.slice(0, 3),
    signoff: opts.signoff,
  })
}
