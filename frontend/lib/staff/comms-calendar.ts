/**
 * Staff Comms Calendar. plan, draft, and track outbound communications
 * to parents, school staff (teachers/principal/admin), and the board.
 * Publishing still happens in Newsletter / Social / WhatsApp / email tools;
 * this is the shared schedule of record.
 */

export const COMMS_AUDIENCES = ['parents', 'school', 'board'] as const
export type CommsAudience = (typeof COMMS_AUDIENCES)[number]

export const COMMS_CHANNELS = [
  'email',
  'whatsapp',
  'social',
  'portal',
  'flyer',
  'in_person',
  'other',
] as const
export type CommsChannel = (typeof COMMS_CHANNELS)[number]

export const COMMS_PLANNER_KINDS = ['comms', 'content'] as const
export type CommsPlannerKind = (typeof COMMS_PLANNER_KINDS)[number]

export const COMMS_PLANNER_KIND_LABEL: Record<CommsPlannerKind, string> = {
  comms: 'Communications',
  content: 'Content planner',
}

/** Channels that default into the content planner. */
export const CONTENT_CHANNELS: readonly CommsChannel[] = ['social', 'flyer', 'portal']

export function defaultKindForChannel(channel: CommsChannel): CommsPlannerKind {
  return (CONTENT_CHANNELS as readonly string[]).includes(channel) ? 'content' : 'comms'
}

export function normalizeCommsPlannerKind(raw: unknown, channel?: CommsChannel): CommsPlannerKind {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
  if ((COMMS_PLANNER_KINDS as readonly string[]).includes(v)) return v as CommsPlannerKind
  return channel ? defaultKindForChannel(channel) : 'comms'
}

export const COMMS_STATUSES = [
  'idea',
  'drafting',
  'review',
  'scheduled',
  'published',
  'cancelled',
] as const
export type CommsStatus = (typeof COMMS_STATUSES)[number]

export const COMMS_AUDIENCE_LABEL: Record<CommsAudience, string> = {
  parents: 'Parents',
  school: 'Teachers / principal / admin',
  board: 'Internal board',
}

export const COMMS_CHANNEL_LABEL: Record<CommsChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  social: 'Social (FB/IG)',
  portal: 'Member portal',
  flyer: 'Flyer / print',
  in_person: 'In person / meeting',
  other: 'Other',
}

export const COMMS_STATUS_LABEL: Record<CommsStatus, string> = {
  idea: 'Idea',
  drafting: 'Drafting',
  review: 'In review',
  scheduled: 'Scheduled',
  published: 'Published',
  cancelled: 'Cancelled',
}

/** Which Staff workspace to open when ready to send. */
export const COMMS_CHANNEL_WORKSPACE: Partial<
  Record<CommsChannel, 'newsletter' | 'social' | 'messages'>
> = {
  email: 'newsletter',
  whatsapp: 'newsletter',
  social: 'social',
  portal: 'messages',
}

export type CommsCalendarItem = {
  id: string
  title: string
  body: string
  audiences: CommsAudience[]
  channel: CommsChannel
  /** Communications vs content planner lane. */
  kind: CommsPlannerKind
  status: CommsStatus
  /** Target publish / send datetime (ISO). */
  publishAt: string
  ownerEmail: string
  ownerName: string
  /** Canva, Drive, draft Doc, post preview, etc. */
  assetUrl: string
  notes: string
  publishedAt: string
  publishedByEmail: string
  createdByEmail: string
  createdAt: string
  updatedAt: string
  active: boolean
}

export function normalizeCommsAudience(raw: unknown): CommsAudience | null {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
  if ((COMMS_AUDIENCES as readonly string[]).includes(v)) return v as CommsAudience
  return null
}

export function parseCommsAudiences(raw: unknown): CommsAudience[] {
  const parts = Array.isArray(raw)
    ? raw.map((x) => String(x))
    : String(raw ?? '')
        .split(/[,|;]/)
        .map((s) => s.trim())
  const out: CommsAudience[] = []
  const seen = new Set<CommsAudience>()
  for (const part of parts) {
    const a = normalizeCommsAudience(part)
    if (a && !seen.has(a)) {
      seen.add(a)
      out.push(a)
    }
  }
  return out
}

export function serializeCommsAudiences(audiences: CommsAudience[]): string {
  return audiences.join(',')
}

export function normalizeCommsChannel(raw: unknown): CommsChannel {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
  if ((COMMS_CHANNELS as readonly string[]).includes(v)) return v as CommsChannel
  return 'other'
}

export function normalizeCommsStatus(raw: unknown): CommsStatus {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
  if ((COMMS_STATUSES as readonly string[]).includes(v)) return v as CommsStatus
  return 'idea'
}

export function startOfWeekMonday(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = x.getDay() // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function weekKey(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'unscheduled'
  return startOfWeekMonday(new Date(t)).toISOString().slice(0, 10)
}

export function formatWeekLabel(weekStartIsoDate: string): string {
  if (weekStartIsoDate === 'unscheduled') return 'No date yet'
  const start = new Date(`${weekStartIsoDate}T12:00:00`)
  if (Number.isNaN(start.getTime())) return weekStartIsoDate
  const end = addDays(start, 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString(undefined, opts)} to ${end.toLocaleDateString(undefined, {
    ...opts,
    year: 'numeric',
  })}`
}
