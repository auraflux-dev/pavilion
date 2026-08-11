import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { getWixClient } from '@/lib/wix-client'
import { sortEventCategoryNames } from '@/lib/events/categories'

export interface WixEvent {
  id?: string
  title?: string
  description?: string
  location?: { name?: string }
  dateAndTimeSettings?: {
    startDate?: string
    endDate?: string
  }
  mainImage?: { url?: string }
  slug?: string
  /** Host / lead category names (PTO led, SHMS led, PTO/SHMS, …) */
  tags?: string[]
  ticket?: {
    price: number
    capacity: number
    soldCount: number
    onSale: boolean
  }
}

/** Turn a Wix image URI or URL into a browser-safe static URL. */
function resolveWixImageUrl(image: unknown): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') {
    const s = image.trim()
    if (!s) return undefined
    if (s.startsWith('http://') || s.startsWith('https://')) return s
    const m = s.match(/^wix:image:\/\/v1\/([^#]+)/)
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
        return {
          id,
          title: ev.title as string,
          description: extractPlainText(ev.description),
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
          slug: ev.slug as string,
          tags,
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
