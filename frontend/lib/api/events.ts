import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import { getWixClient } from '@/lib/wix-client'
import { sortEventCategoryNames } from '@/lib/events/categories'
import {
  isRunForCharitySlug,
  RUN_FOR_CHARITY_REGISTER_URL,
} from '@/lib/run-for-charity'
import { isPavilionProductPlatform } from '@/lib/crm/platform-env'

import {
  earlyBirdCallout,
  eventPublicPath,
  extractExternalRegistrationUrl,
  type WixEvent,
} from '@/lib/api/event-model'

export type { WixEvent }
export { earlyBirdCallout, eventPublicPath, extractExternalRegistrationUrl }

/** Hosted flyer when Wix Events does not return a mainImage. */
function localFlyerUrl(slug?: string): string | undefined {
  const s = String(slug || '').toLowerCase()
  if (s.includes('back-to-school-night')) return '/events/back-to-school-night-2026.jpg'
  if (isRunForCharitySlug(slug) || s.includes('run-for-charity')) {
    return '/events/run-for-charity-2026.jpg'
  }
  return undefined
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
  const { getActiveBrandPack } = await import('@/lib/crm/active-trial-server')
  const brandPack = await getActiveBrandPack()
  if (brandPack?.events?.length) return brandPack.events.slice(0, limit)
  if (brandPack) return []
  if (isDemoInstance()) {
    const { DEMO_EVENTS } = await import('@/lib/demo/content')
    return DEMO_EVENTS.slice(0, limit)
  }
  if (isPavilionProductPlatform()) return []
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
            const url = localFlyerUrl(slug) || resolveWixImageUrl(ev.mainImage)
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
