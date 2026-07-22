/**
 * Paid event tickets — CMS EventTicketOffers + EventTicketOrders.
 * Staff sets price/capacity when marking an event Ticketed; parents buy on /events.
 */
import { getWixClient } from '@/lib/wix-client'

export type EventTicketOffer = {
  _id?: string
  eventId: string
  eventTitle: string
  ticketPrice: number
  capacity: number
  soldCount: number
  active: boolean
  registrationOpen: boolean
}

export async function getEventTicketOffer(eventId: string): Promise<EventTicketOffer | null> {
  if (!eventId) return null
  const client = getWixClient()
  const found = await client.items
    .query('EventTicketOffers')
    .eq('eventId', eventId)
    .limit(1)
    .find()
    .catch(() => ({ items: [] }))
  const row = (found.items ?? [])[0] as Record<string, unknown> | undefined
  if (!row) return null
  return {
    _id: String(row._id ?? ''),
    eventId: String(row.eventId ?? ''),
    eventTitle: String(row.eventTitle ?? ''),
    ticketPrice: Number(row.ticketPrice ?? 0) || 0,
    capacity: Number(row.capacity ?? 0) || 0,
    soldCount: Number(row.soldCount ?? 0) || 0,
    active: row.active !== false,
    registrationOpen: row.registrationOpen !== false,
  }
}

export async function listEventTicketOffers(): Promise<EventTicketOffer[]> {
  const client = getWixClient()
  const found = await client.items
    .query('EventTicketOffers')
    .eq('active', true)
    .limit(100)
    .find()
    .catch(() => ({ items: [] }))
  return ((found.items ?? []) as Record<string, unknown>[]).map((row) => ({
    _id: String(row._id ?? ''),
    eventId: String(row.eventId ?? ''),
    eventTitle: String(row.eventTitle ?? ''),
    ticketPrice: Number(row.ticketPrice ?? 0) || 0,
    capacity: Number(row.capacity ?? 0) || 0,
    soldCount: Number(row.soldCount ?? 0) || 0,
    active: row.active !== false,
    registrationOpen: row.registrationOpen !== false,
  }))
}

export async function upsertEventTicketOffer(opts: {
  eventId: string
  eventTitle: string
  ticketPrice: number
  capacity?: number
  registrationOpen?: boolean
  active?: boolean
}): Promise<EventTicketOffer> {
  const client = getWixClient()
  const existing = await getEventTicketOffer(opts.eventId)
  const row = {
    eventId: opts.eventId,
    eventTitle: opts.eventTitle,
    ticketPrice: opts.ticketPrice,
    capacity: opts.capacity ?? existing?.capacity ?? 0,
    soldCount: existing?.soldCount ?? 0,
    active: opts.active ?? true,
    registrationOpen: opts.registrationOpen ?? true,
  }
  if (existing?._id) {
    await client.items.update('EventTicketOffers', { ...row, _id: existing._id } as never)
    return { ...row, _id: existing._id }
  }
  const inserted = await client.items.insert('EventTicketOffers', row)
  return { ...row, _id: String((inserted as { _id?: string })._id ?? '') }
}

export async function recordEventTicketSale(opts: {
  eventId: string
  quantity: number
  parentEmail: string
  parentName?: string
  transactionId: string
  amount: number
}) {
  const client = getWixClient()
  const offer = await getEventTicketOffer(opts.eventId)
  if (!offer?._id) throw new Error('Ticket offer missing')

  const nextSold = (offer.soldCount || 0) + opts.quantity
  await client.items.update('EventTicketOffers', {
    ...offer,
    _id: offer._id,
    soldCount: nextSold,
  } as never)

  await client.items.insert('EventTicketOrders', {
    eventId: opts.eventId,
    eventTitle: offer.eventTitle,
    parentEmail: opts.parentEmail.trim().toLowerCase(),
    parentName: opts.parentName || '',
    quantity: opts.quantity,
    amount: opts.amount,
    ticketPrice: offer.ticketPrice,
    transactionId: opts.transactionId,
    status: 'Paid',
    purchasedAt: new Date().toISOString(),
  })
}
