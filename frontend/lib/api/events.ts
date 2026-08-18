import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import { getWixClient } from '@/lib/wix-client'
import { sortEventCategoryNames } from '@/lib/events/categories'
import {
  isRunForCharitySlug,
  RUN_FOR_CHARITY_REGISTER_URL,
} from '@/lib/run-for-charity'

export interface WixEvent {
  id?: string
  title?: string
  description?: string
  /** One-line promo (e.g. early bird pricing). */
  shortDescription?: string
  location?: { name?: string }
  dateAndTimeSettings?: {
    startDate?: string
    endDate?: string
  }
  mainImage?: { url?: string }
  slug?: string
  /** Host / lead category names (PTO led, SHMS led, PTO/SHMS, …) */
  tags?: string[]
  /** Partner / off-site registration (e.g. Best Runners). Parsed from description when present. */
  externalRegistrationUrl?: string
  ticket?: {
    price: number
    capacity: number
    soldCount: number
    onSale: boolean
  }
}

/** Public path for messaging / deep links. */
export function eventPublicPath(event: Pick<WixEvent, 'slug' | 'id'>): string | null {
  const slug = String(event.slug || '').trim()
  if (slug) return `/events/${encodeURIComponent(slug)}`
  const id = String(event.id || '').trim()
  return id ? `/events/${encodeURIComponent(id)}` : null
}

/** First https URL in event copy (used for partner register CTAs). Prefer our event register section. */
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
    // Legacy middle-page links → canonical event register section
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
  // Early bird through Aug 15, 2026 (inclusive) Eastern
  const end = new Date('2026-08-16T04:00:00.000Z') // Aug 16 00:00 ET
  if (now >= end) return null

  // Drop trailing "Use school code…" sentence; keep pricing.
  const promo = raw
    .replace(/\.\s*Use school code[^.]*\.?/i, '')
    .split(/\n/)[0]
    ?.trim()
  if (!promo) return null

  // "Early bird through Aug 15: Adults $25 · Kids $15" → break after the date.
  const priced = promo.match(/^(Early bird through [^:]+):\s*(.+)$/i)
  if (priced) return `${priced[1].trim()}\n${priced[2].trim()}`
  return promo
}

/** Turn a Wix image URI or URL into a browser-safe static URL. */
function resolveWixImageUrl(image: unknown): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') {
    const s = image.trim()
    if (!s) return undefined
    if (s.startsWith('http://') || s.startsWith('https://')) return s
    const m = s.match(/^wix:image:\/\/v1\/([^/#]+)/)
    if (m?.[1]) return `https://static.wixstatic.com/media/${m[1]}`
    return undefined
  }
  if (typeof image === 'object') {
    const obj = image as { url?: string; id?: string }
    if (obj.url && (obj.url.startsWith('http://') || obj.url.startsWith('https://'))) return obj.url
    if (obj.url) return resolveWixImageUrl(obj.url)
    if (obj.id) return `https://static.wixstatic.com/media/${obj.id}`
  }
  return undefined
}

/** Extract plain text from a Wix rich-text description node tree or return the string as-is. */
function extractPlainText(desc: unknown): string | undefined {
  if (!desc) return undefined
  if (typeof desc === 'string') return desc
  if (typeof desc === 'object' && 'nodes' in (desc as object)) {
    const nodes = (desc as { nodes?: unknown[] }).nodes ?? []
    return (
      nodes
        .map((node: unknown) => {
          if (typeof node !== 'object' || !node) return ''
          const n = node as { nodes?: unknown[]; textData?: { text?: string } }
          if (n.textData?.text) return n.textData.text
          if (n.nodes) return extractPlainText({ nodes: n.nodes })
          return ''
        })
        .join(' ')
        .trim() || undefined
    )
  }
  return undefined
}

async function categoryNamesForEvent(
  client: ReturnType<typeof getWixClient>,
  eventId: string,
): Promise<string[]> {
  try {
    const listed = await client.categories.listEventCategories(eventId)
    const names = (listed.categories ?? [])
      .map((c: { name?: string }) => String(c.name ?? '').trim())
      .filter(Boolean)
    return sortEventCategoryNames(names)
  } catch {
    return []
  }
}

export async function getUpcomingEvents(limit = 6): Promise<WixEvent[]> {
  if (isDemoInstance()) {
    const { DEMO_EVENTS } = await import('@/lib/demo/content')
    return DEMO_EVENTS.slice(0, limit)
  }
  try {
    const client = getWixClient()
    const result = await client.wixEventsV2
      .queryEvents({ fields: ['DETAILS', 'TEXTS', 'CATEGORIES', 'URLS'] })
      .eq('status', 'UPCOMING')
      .ascending('dateAndTimeSettings.startDate')
      .limit(limit)
      .find()

    const mapped = await Promise.all(
      (result.items ?? []).map(async (e: unknown) => {
        const ev = e as Record<string, unknown>
        const dts = ev.dateAndTimeSettings as Record<string, unknown> | undefined
        const id = ((ev._id as string) ?? (ev.id as string) ?? '').trim()
        const tags = id ? await categoryNamesForEvent(client, id) : []
        const description = extractPlainText(ev.description)
        const shortDescription =
          typeof ev.shortDescription === 'string' ? ev.shortDescription : undefined
        const slug = ev.slug as string
        const externalRegistrationUrl = isRunForCharitySlug(slug)
          ? RUN_FOR_CHARITY_REGISTER_URL
          : extractExternalRegistrationUrl(description) ||
            extractExternalRegistrationUrl(shortDescription)
        return {
          id,
          title: vanillaizeIfDemo(String(ev.title ?? '')),
          description: description ? vanillaizeIfDemo(description) : description,
          shortDescription,
          location: ev.location as WixEvent['location'],
          dateAndTimeSettings: dts
            ? {
                startDate: dts.startDate ? String(dts.startDate) : undefined,
                endDate: dts.endDate ? String(dts.endDate) : undefined,
              }
            : undefined,
          mainImage: (() => {
            const url = resolveWixImageUrl(ev.mainImage)
            return url ? { url } : undefined
          })(),
          slug,
          tags,
          externalRegistrationUrl,
        } satisfies WixEvent
      }),
    )

    const filtered = mapped.filter((ev) => {
      const desc = (ev.description || '').toLowerCase()
      const title = (ev.title || '').toLowerCase()
      if (isCmsQaItem(ev.title, ev.description)) return false
      if (desc.includes('click here to open up the event editor')) return false
      if (desc.includes("i'm an event description") || desc.includes('i’m an event description'))
        return false
      if (title === 'bake sale' && desc.includes('event editor')) return false
      return true
    })

    try {
      const { listEventTicketOffers } = await import('@/lib/events/tickets')
      const offers = await listEventTicketOffers()
      const byId = new Map(offers.map((o) => [o.eventId, o]))
      return filtered.map((ev) => {
        const offer = ev.id ? byId.get(ev.id) : undefined
        if (!offer || offer.ticketPrice <= 0) return ev
        return {
          ...ev,
          ticket: {
            price: offer.ticketPrice,
            capacity: offer.capacity,
            soldCount: offer.soldCount,
            onSale: offer.active && offer.registrationOpen,
          },
        }
      })
    } catch {
      return filtered
    }
  } catch {
    return []
  }
}

/** Single upcoming event by Wix slug or id (for /events/[slug] share links). */
export async function getEventBySlug(slugOrId: string): Promise<WixEvent | null> {
  const key = String(slugOrId || '').trim()
  if (!key) return null
  const events = await getUpcomingEvents(50)
  return (
    events.find((e) => e.slug === key) ||
    events.find((e) => e.id === key) ||
    null
  )
}
