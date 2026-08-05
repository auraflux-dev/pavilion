/**
 * Staff WhatsApp send queue (grade groups).
 * Stored as JSON in SiteSettings key `whatsappMessageQueue`.
 * Confirm still opens invite links + clipboard. Meta has no group-post API.
 */
import { getWixClient } from '@/lib/wix-client'
import type { WhatsAppGrade } from '@/lib/staff/whatsapp-compose'

export const WHATSAPP_QUEUE_SETTING_KEY = 'whatsappMessageQueue'

export type WhatsAppQueueStatus = 'scheduled' | 'sent' | 'cancelled'

export type WhatsAppQueueAttachment = {
  url: string
  fileName: string
  mimeType: string
  size?: number
}

export type WhatsAppQueueItem = {
  id: string
  message: string
  grade: WhatsAppGrade
  sendAt: string
  status: WhatsAppQueueStatus
  createdByEmail: string
  createdByName: string
  createdAt: string
  attachments?: WhatsAppQueueAttachment[]
  confirmedByEmail?: string
  confirmedByName?: string
  confirmedAt?: string
}

export const WHATSAPP_ATTACHMENT_MAX = 3
export const WHATSAPP_ATTACHMENT_MAX_BYTES = 12 * 1024 * 1024

const ALLOWED_ATTACHMENT_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
])

export function normalizeWhatsAppAttachments(raw: unknown): WhatsAppQueueAttachment[] {
  if (!Array.isArray(raw)) return []
  const out: WhatsAppQueueAttachment[] = []
  for (const row of raw.slice(0, WHATSAPP_ATTACHMENT_MAX)) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const url = String(r.url ?? '').trim()
    const fileName = String(r.fileName ?? r.name ?? 'attachment').trim() || 'attachment'
    const mimeType = String(r.mimeType ?? 'application/octet-stream').trim()
    if (!url.startsWith('https://')) continue
    out.push({
      url,
      fileName,
      mimeType,
      size: typeof r.size === 'number' ? r.size : undefined,
    })
  }
  return out
}

export function isAllowedWhatsAppAttachmentMime(mime: string): boolean {
  return ALLOWED_ATTACHMENT_MIME.has(mime)
}

function newId(): string {
  return `waq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeWhatsAppGrade(raw: unknown): WhatsAppGrade {
  const g = String(raw ?? '').trim().toLowerCase()
  if (g === '6' || g === '7' || g === '8' || g === 'all') return g
  return 'all'
}

export function isDue(item: WhatsAppQueueItem, now = Date.now()): boolean {
  if (item.status !== 'scheduled') return false
  const t = Date.parse(item.sendAt)
  return Number.isFinite(t) && t <= now
}

export async function readWhatsAppQueue(): Promise<WhatsAppQueueItem[]> {
  const client = getWixClient()
  try {
    const result = await client.items
      .query('SiteSettings')
      .eq('key', WHATSAPP_QUEUE_SETTING_KEY)
      .limit(1)
      .find()
    const row = result.items?.[0] as { value?: string } | undefined
    const raw = String(row?.value ?? '').trim()
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row) => mapItem(row))
      .filter((item): item is WhatsAppQueueItem => Boolean(item))
      .sort((a, b) => Date.parse(a.sendAt) - Date.parse(b.sendAt))
  } catch {
    return []
  }
}

function mapItem(row: unknown): WhatsAppQueueItem | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const message = String(r.message ?? '').trim()
  const sendAt = String(r.sendAt ?? '').trim()
  if (!message || !sendAt) return null
  const statusRaw = String(r.status ?? 'scheduled')
  const status: WhatsAppQueueStatus =
    statusRaw === 'sent' || statusRaw === 'cancelled' ? statusRaw : 'scheduled'
  const attachments = normalizeWhatsAppAttachments(r.attachments)
  return {
    id: String(r.id ?? newId()),
    message,
    grade: normalizeWhatsAppGrade(r.grade),
    sendAt,
    status,
    createdByEmail: String(r.createdByEmail ?? '').toLowerCase(),
    createdByName: String(r.createdByName ?? ''),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    attachments: attachments.length ? attachments : undefined,
    confirmedByEmail: r.confirmedByEmail
      ? String(r.confirmedByEmail).toLowerCase()
      : undefined,
    confirmedByName: r.confirmedByName ? String(r.confirmedByName) : undefined,
    confirmedAt: r.confirmedAt ? String(r.confirmedAt) : undefined,
  }
}

async function writeWhatsAppQueue(items: WhatsAppQueueItem[]): Promise<void> {
  const client = getWixClient()
  const payload = JSON.stringify(items.slice(-80))
  const result = await client.items
    .query('SiteSettings')
    .eq('key', WHATSAPP_QUEUE_SETTING_KEY)
    .limit(1)
    .find()
  const existing = result.items?.[0] as { _id?: string } | undefined
  if (existing?._id) {
    await client.items.update('SiteSettings', {
      _id: existing._id,
      key: WHATSAPP_QUEUE_SETTING_KEY,
      value: payload,
    })
    return
  }
  await client.items.insert('SiteSettings', {
    key: WHATSAPP_QUEUE_SETTING_KEY,
    value: payload,
  })
}

export async function addWhatsAppQueueItem(input: {
  message: string
  grade: WhatsAppGrade
  sendAt: string
  createdByEmail: string
  createdByName: string
  attachments?: WhatsAppQueueAttachment[]
}): Promise<WhatsAppQueueItem> {
  const message = input.message.trim()
  if (!message) throw new Error('Message is required')
  const sendAtMs = Date.parse(input.sendAt)
  if (!Number.isFinite(sendAtMs)) throw new Error('Send time is required')
  const attachments = normalizeWhatsAppAttachments(input.attachments)

  const item: WhatsAppQueueItem = {
    id: newId(),
    message,
    grade: input.grade,
    sendAt: new Date(sendAtMs).toISOString(),
    status: 'scheduled',
    createdByEmail: input.createdByEmail.toLowerCase(),
    createdByName: input.createdByName.trim(),
    createdAt: new Date().toISOString(),
    attachments: attachments.length ? attachments : undefined,
  }
  const items = await readWhatsAppQueue()
  items.push(item)
  await writeWhatsAppQueue(items)
  return item
}

export async function updateWhatsAppQueueItem(
  id: string,
  patch: Partial<
    Pick<
      WhatsAppQueueItem,
      | 'status'
      | 'confirmedByEmail'
      | 'confirmedByName'
      | 'confirmedAt'
      | 'message'
      | 'grade'
      | 'sendAt'
      | 'attachments'
    >
  >,
): Promise<WhatsAppQueueItem | null> {
  const items = await readWhatsAppQueue()
  const idx = items.findIndex((i) => i.id === id)
  if (idx < 0) return null
  const next = { ...items[idx], ...patch }
  items[idx] = next
  await writeWhatsAppQueue(items)
  return next
}

export function partitionWhatsAppQueue(items: WhatsAppQueueItem[], now = Date.now()) {
  const due = items.filter((i) => isDue(i, now))
  const upcoming = items.filter(
    (i) => i.status === 'scheduled' && !isDue(i, now),
  )
  const recent = items
    .filter((i) => i.status === 'sent' || i.status === 'cancelled')
    .sort((a, b) => Date.parse(b.confirmedAt || b.createdAt) - Date.parse(a.confirmedAt || a.createdAt))
    .slice(0, 12)
  return { due, upcoming, recent }
}
