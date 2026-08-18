/**
 * First-party pageview counters for the Monday weekly traffic section.
 * Surfaces: website, member portal, staff. Unique = once per browser per Eastern day per surface.
 */
import { getWixClient } from '@/lib/wix-client'

export const SITE_TRAFFIC_COLLECTION = 'SiteTrafficDaily'
const TZ = 'America/New_York'
const PATH_CAP = 40

export type TrafficSurface = 'website' | 'member' | 'staff'

export type TrafficDayRow = {
  _id?: string
  day?: string
  websitePageviews?: number
  memberPageviews?: number
  staffPageviews?: number
  websiteVisitors?: number
  memberVisitors?: number
  staffVisitors?: number
  pathsJson?: string
  updatedAt?: string
}

export type WeeklyTrafficSummary = {
  fromDay: string
  toDay: string
  websitePageviews: number
  memberPageviews: number
  staffPageviews: number
  websiteVisitorDays: number
  memberVisitorDays: number
  staffVisitorDays: number
  topPaths: { path: string; views: number }[]
  daysRecorded: number
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function easternDayLabel(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0)
  return `${n('year')}-${pad2(n('month'))}-${pad2(n('day'))}`
}

export function classifyPath(pathname: string): TrafficSurface | null {
  const path = pathname.split('?')[0].split('#')[0] || '/'
  if (path.startsWith('/api') || path.startsWith('/_next')) return null
  if (/\.[a-z0-9]{1,8}$/i.test(path)) return null
  if (path === '/staff' || path.startsWith('/staff/')) return 'staff'
  if (path.startsWith('/member-portal') || path.startsWith('/auth')) return 'member'
  return 'website'
}

export function collapsePath(pathname: string): string {
  const parts = (pathname.split('?')[0] || '/').split('/').filter(Boolean)
  if (parts.length <= 2) return `/${parts.join('/')}` || '/'
  return `/${parts.slice(0, 2).join('/')}`
}

function num(row: TrafficDayRow, key: keyof TrafficDayRow): number {
  const v = row[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0
}

function parsePaths(raw: string | undefined): Record<string, number> {
  try {
    const parsed = JSON.parse(raw || '{}') as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      const n = Number(v)
      if (k && Number.isFinite(n) && n > 0) out[k] = n
    }
    return out
  } catch {
    return {}
  }
}

function trimPaths(map: Record<string, number>): Record<string, number> {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  return Object.fromEntries(entries.slice(0, PATH_CAP))
}

let collectionReady = false

async function ensureTrafficCollection(): Promise<void> {
  if (collectionReady) return
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return
  const headers = {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
  const getRes = await fetch(`https://www.wixapis.com/wix-data/v2/collections/${SITE_TRAFFIC_COLLECTION}`, {
    headers,
  })
  if (getRes.ok) {
    collectionReady = true
    return
  }
  const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collection: {
        id: SITE_TRAFFIC_COLLECTION,
        displayName: 'Site Traffic Daily',
        fields: [
          { key: 'day', displayName: 'Day (YYYY-MM-DD Eastern)', type: 'TEXT' },
          { key: 'websitePageviews', displayName: 'Website pageviews', type: 'NUMBER' },
          { key: 'memberPageviews', displayName: 'Member portal pageviews', type: 'NUMBER' },
          { key: 'staffPageviews', displayName: 'Staff pageviews', type: 'NUMBER' },
          { key: 'websiteVisitors', displayName: 'Website unique-browser days', type: 'NUMBER' },
          { key: 'memberVisitors', displayName: 'Member unique-browser days', type: 'NUMBER' },
          { key: 'staffVisitors', displayName: 'Staff unique-browser days', type: 'NUMBER' },
          { key: 'pathsJson', displayName: 'Path counts JSON', type: 'TEXT' },
          { key: 'updatedAt', displayName: 'Updated at', type: 'TEXT' },
        ],
        permissions: { insert: 'ADMIN', update: 'ADMIN', remove: 'ADMIN', read: 'ADMIN' },
      },
    }),
  })
  if (createRes.ok || createRes.status === 409) collectionReady = true
}

async function loadDay(day: string): Promise<TrafficDayRow | null> {
  try {
    const client = getWixClient()
    const found = await client.items.query(SITE_TRAFFIC_COLLECTION).eq('day', day).limit(1).find()
    return ((found.items ?? [])[0] as TrafficDayRow | undefined) ?? null
  } catch {
    return null
  }
}

export async function recordPageview(opts: {
  path: string
  newVisitor: boolean
}): Promise<{ ok: boolean; surface: TrafficSurface | null }> {
  const surface = classifyPath(opts.path)
  if (!surface) return { ok: false, surface: null }
  await ensureTrafficCollection()
  const day = easternDayLabel()
  const pathKey = collapsePath(opts.path)
  const existing = await loadDay(day)
  const paths = parsePaths(existing?.pathsJson)
  paths[pathKey] = (paths[pathKey] || 0) + 1

  const next: TrafficDayRow = {
    ...(existing || {}),
    day,
    websitePageviews: num(existing || {}, 'websitePageviews') + (surface === 'website' ? 1 : 0),
    memberPageviews: num(existing || {}, 'memberPageviews') + (surface === 'member' ? 1 : 0),
    staffPageviews: num(existing || {}, 'staffPageviews') + (surface === 'staff' ? 1 : 0),
    websiteVisitors:
      num(existing || {}, 'websiteVisitors') + (surface === 'website' && opts.newVisitor ? 1 : 0),
    memberVisitors:
      num(existing || {}, 'memberVisitors') + (surface === 'member' && opts.newVisitor ? 1 : 0),
    staffVisitors: num(existing || {}, 'staffVisitors') + (surface === 'staff' && opts.newVisitor ? 1 : 0),
    pathsJson: JSON.stringify(trimPaths(paths)),
    updatedAt: new Date().toISOString(),
  }

  const client = getWixClient()
  if (existing?._id) {
    await client.items.update(SITE_TRAFFIC_COLLECTION, { ...next, _id: existing._id })
  } else {
    await client.items.insert(SITE_TRAFFIC_COLLECTION, next)
  }
  return { ok: true, surface }
}

function addCalendarDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + delta))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

export async function summarizeTrafficWeek(toDayInclusive: string): Promise<WeeklyTrafficSummary> {
  const fromDay = addCalendarDays(toDayInclusive, -6)
  const days: string[] = []
  for (let i = 0; i < 7; i += 1) days.push(addCalendarDays(fromDay, i))

  const rows: TrafficDayRow[] = []
  try {
    const client = getWixClient()
    const found = await client.items.query(SITE_TRAFFIC_COLLECTION).limit(40).find()
    const wanted = new Set(days)
    for (const item of (found.items ?? []) as TrafficDayRow[]) {
      if (item.day && wanted.has(item.day)) rows.push(item)
    }
  } catch {
    /* collection may not exist yet */
  }

  const pathTotals: Record<string, number> = {}
  let websitePageviews = 0
  let memberPageviews = 0
  let staffPageviews = 0
  let websiteVisitorDays = 0
  let memberVisitorDays = 0
  let staffVisitorDays = 0
  for (const row of rows) {
    websitePageviews += num(row, 'websitePageviews')
    memberPageviews += num(row, 'memberPageviews')
    staffPageviews += num(row, 'staffPageviews')
    websiteVisitorDays += num(row, 'websiteVisitors')
    memberVisitorDays += num(row, 'memberVisitors')
    staffVisitorDays += num(row, 'staffVisitors')
    for (const [path, views] of Object.entries(parsePaths(row.pathsJson))) {
      pathTotals[path] = (pathTotals[path] || 0) + views
    }
  }

  return {
    fromDay,
    toDay: toDayInclusive,
    websitePageviews,
    memberPageviews,
    staffPageviews,
    websiteVisitorDays,
    memberVisitorDays,
    staffVisitorDays,
    topPaths: Object.entries(pathTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views })),
    daysRecorded: rows.length,
  }
}

export function formatWeeklyTraffic(summary: WeeklyTrafficSummary): string[] {
  const lines = [
    `WEEKLY TRAFFIC (${summary.fromDay} → ${summary.toDay} Eastern)`,
    `  Website: ${summary.websitePageviews} pageviews · ${summary.websiteVisitorDays} unique-browser days`,
    `  Member portal: ${summary.memberPageviews} pageviews · ${summary.memberVisitorDays} unique-browser days`,
    `  Staff: ${summary.staffPageviews} pageviews · ${summary.staffVisitorDays} unique-browser days`,
  ]
  if (summary.topPaths.length > 0) {
    lines.push('  Top paths:')
    for (const row of summary.topPaths) {
      lines.push(`  - ${row.path}  ${row.views}`)
    }
  } else {
    lines.push('  No pageviews recorded yet for this week (counters start after this deploy).')
  }
  lines.push(
    '  Unique-browser days count a browser once per area per day, not unique people for the whole week.',
  )
  lines.push('')
  return lines
}
