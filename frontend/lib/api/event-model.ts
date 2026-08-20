/** Shared event types + pure helpers safe for client components. */

export interface WixEvent {
  id?: string
  title?: string
  description?: string
  shortDescription?: string
  location?: { name?: string }
  dateAndTimeSettings?: {
    startDate?: string
    endDate?: string
  }
  mainImage?: { url?: string }
  slug?: string
  tags?: string[]
  externalRegistrationUrl?: string
  ticket?: {
    price: number
    capacity: number
    soldCount: number
    onSale: boolean
  }
}

export function eventPublicPath(event: Pick<WixEvent, 'slug' | 'id'>): string | null {
  const slug = String(event.slug || '').trim()
  if (slug) return `/events/${encodeURIComponent(slug)}`
  const id = String(event.id || '').trim()
  return id ? `/events/${encodeURIComponent(id)}` : null
}

export function extractExternalRegistrationUrl(text?: string): string | undefined {
  if (!text) return undefined
  const eventRegister = text.match(
    /https:\/\/(?:www\.)?shmspto\.org\/events\/run-for-charity[^\s<>"']*/i,
  )
  if (eventRegister?.[0]) {
    const cleaned = eventRegister[0].replace(/[.,);]+$/, '')
    return cleaned.includes('#') ? cleaned : `${cleaned}#register`
  }
  const bridge = text.match(/https:\/\/(?:www\.)?shmspto\.org\/run-for-charity[^\s<>"']*/i)
  if (bridge?.[0]) {
    return 'https://www.shmspto.org/events/run-for-charity-1k-5k-best-runners-code-shms#register'
  }
  const m = text.match(/https:\/\/[^\s<>"']+/i)
  if (!m?.[0]) return undefined
  return m[0].replace(/[.,);]+$/, '')
}

/** Early-bird promo while the window is still open (Eastern). Two-line display. */
export function earlyBirdCallout(text?: string, now = new Date()): string | null {
  const raw = String(text || '').trim()
  if (!raw) return null
  if (!/early\s*bird/i.test(raw)) return null
  const end = new Date('2026-08-16T04:00:00.000Z')
  if (now >= end) return null

  const promo = raw
    .replace(/\.\s*Use school code[^.]*\.?/i, '')
    .split(/\n/)[0]
    ?.trim()
  if (!promo) return null

  const priced = promo.match(/^(Early bird through [^:]+):\s*(.+)$/i)
  if (priced) return `${priced[1].trim()}\n${priced[2].trim()}`
  return promo
}
