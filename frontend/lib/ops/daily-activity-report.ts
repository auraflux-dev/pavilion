/**
 * Yesterday’s recorded site / member / staff actions, emailed at 6am Eastern.
 * CMS + Gmail actions daily; Mondays also include first-party weekly pageviews.
 */
import { getWixClient } from '@/lib/wix-client'
import { getSiteSettings } from '@/lib/api/site-settings'
import { listMessages } from '@/lib/google/gmail'
import { sendMassEmail } from '@/lib/staff/mass-email'
import { preferredGmailSender } from '@/lib/staff/gmail-send-auth'
import { formatWeeklyTraffic, summarizeTrafficWeek } from '@/lib/ops/site-traffic'

const TZ = 'America/New_York'
const LIST_CAP = 12
const QUERY_LIMIT = 200

export type DailyActivityWindow = {
  label: string
  startIso: string
  endIso: string
  startMs: number
  endMs: number
}

type CmsRow = Record<string, unknown>

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function etParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
  return { year: num('year'), month: num('month'), day: num('day') }
}

/** Instant for Eastern local wall time (handles EST/EDT). */
function zonedLocalToUtc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour + 4, minute, 0))
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const read = (d: Date) => {
    const p = fmt.formatToParts(d)
    const n = (t: string) => Number(p.find((x) => x.type === t)?.value || 0)
    return { y: n('year'), mo: n('month'), d: n('day'), h: n('hour'), mi: n('minute') }
  }
  let instant = guess
  for (let i = 0; i < 8; i += 1) {
    const got = read(instant)
    const want = Date.UTC(year, month - 1, day, hour, minute)
    const have = Date.UTC(got.y, got.mo - 1, got.d, got.h, got.mi)
    const delta = want - have
    if (delta === 0) break
    instant = new Date(instant.getTime() + delta)
  }
  return instant
}

export function isMondayEastern(now = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
  }).format(now)
  return weekday === 'Mon'
}

export function easternYesterdayWindow(now = new Date()): DailyActivityWindow {
  const today = etParts(now)
  const todayStart = zonedLocalToUtc(today.year, today.month, today.day, 0, 0)
  const prev = new Date(Date.UTC(today.year, today.month - 1, today.day - 1))
  const y = { year: prev.getUTCFullYear(), month: prev.getUTCMonth() + 1, day: prev.getUTCDate() }
  const start = zonedLocalToUtc(y.year, y.month, y.day, 0, 0)
  const end = todayStart
  const label = `${y.year}-${pad2(y.month)}-${pad2(y.day)}`
  return {
    label,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startMs: start.getTime(),
    endMs: end.getTime(),
  }
}

function parseTime(value: unknown): number {
  if (value == null || value === '') return NaN
  if (typeof value === 'object' && value && '$date' in (value as object)) {
    return Date.parse(String((value as { $date?: string }).$date))
  }
  return Date.parse(String(value))
}

function rowTime(row: CmsRow, fields: string[]): number {
  for (const field of fields) {
    const ms = parseTime(row[field])
    if (!Number.isNaN(ms)) return ms
  }
  return NaN
}

function inWindow(ms: number, win: DailyActivityWindow): boolean {
  return !Number.isNaN(ms) && ms >= win.startMs && ms < win.endMs
}

function str(row: CmsRow, key: string): string {
  return String(row[key] ?? '').trim()
}

function money(n: unknown): string {
  const v = Number(n)
  if (!Number.isFinite(v)) return '$0.00'
  return `$${v.toFixed(2)}`
}

function etClock(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms))
}

async function queryCollection(collection: string): Promise<CmsRow[]> {
  const client = getWixClient()
  try {
    const found = await client.items.query(collection).descending('_createdDate').limit(QUERY_LIMIT).find()
    return (found.items ?? []) as CmsRow[]
  } catch {
    try {
      const found = await client.items.query(collection).limit(QUERY_LIMIT).find()
      return (found.items ?? []) as CmsRow[]
    } catch {
      return []
    }
  }
}

function filterRows(rows: CmsRow[], fields: string[], win: DailyActivityWindow): CmsRow[] {
  return rows
    .map((row) => ({ row, ms: rowTime(row, fields) }))
    .filter((x) => inWindow(x.ms, win))
    .sort((a, b) => b.ms - a.ms)
    .map((x) => x.row)
}

function bullets(lines: string[], total: number): string[] {
  if (total === 0) return ['  (none)']
  const shown = lines.slice(0, LIST_CAP)
  const out = shown.map((line) => `  - ${line}`)
  if (total > shown.length) out.push(`  …and ${total - shown.length} more`)
  return out
}

function section(title: string, count: number, lines: string[]): string[] {
  return [`${title} (${count})`, ...bullets(lines, count), '']
}

function isPortalHelp(row: CmsRow): boolean {
  const dept = str(row, 'department').toLowerCase()
  const topic = str(row, 'topic').toLowerCase()
  return dept.includes('portal-help') || topic.startsWith('portal help')
}

function studentLabel(row: CmsRow): string {
  const name = `${str(row, 'firstName')} ${str(row, 'lastName')}`.trim() || 'Student'
  return `${name} · grade ${str(row, 'grade') || '?'} · ${str(row, 'parentEmail') || 'no email'}`
}

function paymentLine(row: CmsRow): string {
  const ms = rowTime(row, ['paymentDate', '_createdDate'])
  return `${etClock(ms)} · ${money(row.amount)} · ${str(row, 'programName') || str(row, 'source') || 'Payment'} · ${str(row, 'parentEmail')}`
}

async function gmailReceived(win: DailyActivityWindow): Promise<{ from: string; subject: string; ms: number }[]> {
  const mailboxes = [...new Set(['president@shmspto.org', await preferredGmailSender()])]
  const out: { from: string; subject: string; ms: number }[] = []
  const seen = new Set<string>()
  for (const box of mailboxes) {
    try {
      const items = await listMessages(box, { query: 'in:inbox newer_than:2d', maxResults: 40 })
      for (const item of items) {
        const ms = Date.parse(item.date)
        if (!inWindow(ms, win)) continue
        const key = item.id || `${item.from}|${item.subject}|${item.date}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ from: item.from || '(unknown)', subject: item.subject || '(no subject)', ms })
      }
    } catch (err) {
      console.warn('[daily-activity] gmail skip', box, err instanceof Error ? err.message : err)
    }
  }
  out.sort((a, b) => b.ms - a.ms)
  return out
}

function parseReportEmails(raw: string, president: string): string[] {
  const parts = [president, ...raw.split(/[,;\s]+/)]
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  return [...new Set(parts)]
}

export async function buildDailyActivityReport(now = new Date()): Promise<{
  window: DailyActivityWindow
  subject: string
  body: string
  counts: Record<string, number>
}> {
  const win = easternYesterdayWindow(now)

  const [
    contacts,
    payments,
    tickets,
    students,
    memberships,
    enrollments,
    guardians,
    messages,
    surveys,
    audit,
    tasks,
    minutes,
    newsletters,
    errors,
    inbox,
  ] = await Promise.all([
    queryCollection('ContactSubmissions'),
    queryCollection('Payments'),
    queryCollection('EventTicketOrders'),
    queryCollection('Students'),
    queryCollection('Memberships'),
    queryCollection('ProgramEnrollments'),
    queryCollection('FamilyGuardians'),
    queryCollection('ParentMessages'),
    queryCollection('SurveyResponses'),
    queryCollection('StaffAuditLog'),
    queryCollection('StaffTasks'),
    queryCollection('MeetingMinutes'),
    queryCollection('Newsletters'),
    queryCollection('ErrorEvents'),
    gmailReceived(win),
  ])

  const websiteForms = filterRows(contacts, ['submittedAt', '_createdDate'], win).filter((r) => !isPortalHelp(r))
  const portalHelp = filterRows(contacts, ['submittedAt', '_createdDate'], win).filter(isPortalHelp)
  const payRows = filterRows(payments, ['paymentDate', '_createdDate'], win)
  const ticketRows = filterRows(tickets, ['purchasedAt', '_createdDate'], win)
  const studentRows = filterRows(students, ['_createdDate'], win)
  const membershipRows = filterRows(memberships, ['_updatedDate', '_createdDate'], win)
  const enrollRows = filterRows(enrollments, ['enrolledAt', 'registrationDate', '_createdDate'], win)
  const guardianRows = filterRows(guardians, ['invitedAt', '_createdDate'], win)
  const messageRows = filterRows(messages, ['sentAt', '_createdDate'], win)
  const surveyRows = filterRows(surveys, ['_createdDate'], win)
  const auditRows = filterRows(audit, ['createdAt', '_createdDate'], win)
  const taskRows = filterRows(tasks, ['createdAt', '_createdDate'], win)
  const minutesRows = filterRows(minutes, ['_createdDate', 'meetingDate'], win)
  const newsletterRows = filterRows(newsletters, ['publishedAt', '_createdDate'], win)
  const errorRows = filterRows(errors, ['createdAt', '_createdDate'], win)

  let trafficLines: string[] = []
  if (isMondayEastern(now)) {
    try {
      trafficLines = formatWeeklyTraffic(await summarizeTrafficWeek(win.label))
    } catch (err) {
      console.warn('[daily-activity] weekly traffic skipped', err)
      trafficLines = ['WEEKLY TRAFFIC', '  Could not load pageview counters.', '']
    }
  }

  const paidTotal = payRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const ticketTotal = ticketRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const lines: string[] = [
    `SHMS PTO daily activity — ${win.label} (US Eastern, midnight–midnight)`,
    `Window: ${win.startIso} → ${win.endIso}`,
    'This is recorded actions (forms, checkouts, enrollments, staff work). Weekly pageviews are included on Mondays.',
    '',
    ...trafficLines,
    'WEBSITE',
    ...section(
      'Public / website forms',
      websiteForms.length,
      websiteForms.map((r) => {
        const ms = rowTime(r, ['submittedAt', '_createdDate'])
        return `${etClock(ms)} · ${str(r, 'topic') || 'Form'} · ${str(r, 'name') || str(r, 'email')} <${str(r, 'email')}>`
      }),
    ),
    ...section(
      'Survey responses',
      surveyRows.length,
      surveyRows.map((r) => {
        const ms = rowTime(r, ['_createdDate'])
        return `${etClock(ms)} · ${str(r, 'surveySlug') || str(r, 'slug') || 'Survey'} · ${str(r, 'email') || str(r, 'parentEmail')}`
      }),
    ),
    'SALES (website + member checkout)',
    ...section(
      `Payments ${money(paidTotal)}`,
      payRows.length,
      payRows.map(paymentLine),
    ),
    ...section(
      `Event tickets ${money(ticketTotal)}`,
      ticketRows.length,
      ticketRows.map((r) => {
        const ms = rowTime(r, ['purchasedAt', '_createdDate'])
        return `${etClock(ms)} · ${str(r, 'eventTitle')} · qty ${str(r, 'quantity') || '1'} · ${money(r.amount)} · ${str(r, 'parentEmail')}`
      }),
    ),
    'MEMBER PORTAL',
    ...section('Students added', studentRows.length, studentRows.map(studentLabel)),
    ...section(
      'Memberships created or updated',
      membershipRows.length,
      membershipRows.map((r) => `${str(r, 'email')} · ${str(r, 'tier') || str(r, 'status') || 'membership'}`),
    ),
    ...section(
      'Program enrollments',
      enrollRows.length,
      enrollRows.map((r) => `${str(r, 'programName')} · ${str(r, 'studentName')} · ${str(r, 'parentEmail')} · ${str(r, 'status')}`),
    ),
    ...section(
      'Household adult invites',
      guardianRows.length,
      guardianRows.map((r) => `${str(r, 'primaryParentEmail')} invited ${str(r, 'guardianEmail')} (${str(r, 'status') || 'pending'})`),
    ),
    ...section(
      'Portal help requests',
      portalHelp.length,
      portalHelp.map((r) => {
        const ms = rowTime(r, ['submittedAt', '_createdDate'])
        return `${etClock(ms)} · ${str(r, 'topic')} · ${str(r, 'email')}`
      }),
    ),
    ...section(
      'Portal messages posted',
      messageRows.length,
      messageRows.map((r) => `${str(r, 'parentEmail')} · ${str(r, 'subject') || '(no subject)'}`),
    ),
    'STAFF PORTAL',
    ...section(
      'Staff audit (act-as / sensitive)',
      auditRows.length,
      auditRows.map((r) => `${str(r, 'actorEmail')} · ${str(r, 'action')} · ${str(r, 'detail') || str(r, 'route')}`),
    ),
    ...section(
      'Tasks created',
      taskRows.length,
      taskRows.map((r) => `${str(r, 'title')} · ${str(r, 'assigneeEmail') || str(r, 'ownerRole')} · ${str(r, 'createdByEmail')}`),
    ),
    ...section(
      'Meeting minutes saved',
      minutesRows.length,
      minutesRows.map((r) => `${str(r, 'committee')} · ${str(r, 'meetingDate')} · ${str(r, 'summary') || 'minutes'}`),
    ),
    ...section(
      'Newsletters / outreach logged',
      newsletterRows.length,
      newsletterRows.map((r) => `${str(r, 'title') || str(r, 'subject')} · ${str(r, 'audience') || ''} · ${str(r, 'fromName')}`),
    ),
    ...section(
      'President inbox (received)',
      inbox.length,
      inbox.map((m) => `${etClock(m.ms)} · ${m.from} · ${m.subject}`),
    ),
    'OPS',
    ...section(
      'Logged errors',
      errorRows.length,
      errorRows.map((r) => `${str(r, 'route') || 'app'} · ${str(r, 'message').slice(0, 120)}`),
    ),
    'Staff Home: https://shmspto.org/staff',
    'Member portal: https://shmspto.org/member-portal',
    'Cron is 10:00 UTC (6:00am Eastern during daylight time, 5:00am during standard time).',
  ]

  const counts = {
    websiteForms: websiteForms.length,
    surveys: surveyRows.length,
    payments: payRows.length,
    tickets: ticketRows.length,
    students: studentRows.length,
    memberships: membershipRows.length,
    enrollments: enrollRows.length,
    invites: guardianRows.length,
    portalHelp: portalHelp.length,
    portalMessages: messageRows.length,
    audit: auditRows.length,
    tasks: taskRows.length,
    minutes: minutesRows.length,
    newsletters: newsletterRows.length,
    inbox: inbox.length,
    errors: errorRows.length,
  }

  return {
    window: win,
    subject: isMondayEastern(now)
      ? `SHMS PTO daily activity — ${win.label} + weekly traffic`
      : `SHMS PTO daily activity — ${win.label}`,
    body: lines.join('\n').replace(/\n{3,}/g, '\n\n'),
    counts,
  }
}

export async function sendDailyActivityReport(): Promise<{
  ok: boolean
  date: string
  sent: number
  failed: number
  recipients: string[]
  counts: Record<string, number>
  error?: string
}> {
  const report = await buildDailyActivityReport()
  const settings = await getSiteSettings()
  const president = settings.get('presidentEmail', 'president@shmspto.org')
  const recipients = parseReportEmails(settings.get('dailyActivityReportEmails'), president)

  const result = await sendMassEmail(
    {
      subject: report.subject,
      body: report.body,
      fromName: 'SHMS PTO',
      replyTo: president,
      recipients,
    },
    { allowInternal: true },
  )

  return {
    ok: result.ok,
    date: report.window.label,
    sent: result.sent,
    failed: result.failed,
    recipients,
    counts: report.counts,
    error: result.errors[0],
  }
}
