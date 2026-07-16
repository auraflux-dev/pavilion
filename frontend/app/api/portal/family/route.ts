/**
 * GET /api/portal/family
 * Family overview for the logged-in parent:
 * calendar (programs + events), instructor messages, recent purchases.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { getWixClient } from '@/lib/wix-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { getUpcomingEvents } from '@/lib/api/events'
import { getAllPrograms } from '@/lib/api/programs'
import { getUpcomingProgramSessions } from '@/lib/api/program-sessions'
import { getEffectiveParentEmail } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'

export type PortalCalendarItem = {
  id: string
  kind: 'program' | 'event'
  title: string
  subtitle: string
  whenLabel: string
  startDate: string | null
  href: string
  studentNames: string[]
}

export type PortalMessage = {
  id: string
  fromName: string
  subject: string
  body: string
  programName: string
  studentName: string
  sentAt: string | null
}

export type PortalPurchase = {
  id: string
  label: string
  amount: number
  status: string
  date: string | null
  studentName: string
  source: 'payment' | 'enrollment'
}

export async function GET(req: NextRequest) {
  const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
  if (!tokensCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tokens = JSON.parse(tokensCookie)
    const oauthClient = createOAuthClient(tokens)
    const { member } = await oauthClient.members.getCurrentMember({ fieldsets: ['FULL'] })
    const actorEmail = (member?.loginEmail ?? '').trim().toLowerCase()
    if (!actorEmail) return NextResponse.json({ error: 'No email' }, { status: 400 })
    const effective = await getEffectiveParentEmail(req)
    const email = effective?.parentEmail ?? actorEmail
    const actingAs = Boolean(effective?.actingAs)

    const admin = getWixClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentsRes: any = await admin.items
      .query('Students')
      .eq('parentEmail', email)
      .find()
      .catch(() => ({ items: [] }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const students = (studentsRes.items ?? [])
      .filter((s: any) => s.archived !== true)
      .map((s: any) => ({
      id: s._id as string,
      firstName: String(s.firstName ?? ''),
      lastName: String(s.lastName ?? ''),
      grade: String(s.grade ?? ''),
      name: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
    }))
    const studentIds: string[] = students.map((s: { id: string }) => s.id)
    const studentById = new Map<string, string>(
      students.map((s: { id: string; name: string }) => [s.id, s.name])
    )
    const nameFor = (id: string) => studentById.get(id) ?? ''

    const enrollQueries = studentIds.map((id: string) =>
      admin.items
        .query('Enrollments')
        .eq('studentId', id)
        .descending('registrationDate')
        .limit(25)
        .find()
        .catch(() => ({ items: [] }))
    )
    const payQueries = studentIds.map((id: string) =>
      admin.items
        .query('Payments')
        .eq('studentId', id)
        .descending('paymentDate')
        .limit(15)
        .find()
        .catch(() => ({ items: [] }))
    )

    const [programs, events, sessions, enrollResults, payResults, msgRes] = await Promise.all([
      getAllPrograms().catch(() => []),
      getUpcomingEvents(12).catch(() => []),
      getUpcomingProgramSessions(50).catch(() => []),
      Promise.all(enrollQueries),
      Promise.all(payQueries),
      // ParentMessages — optional CMS collection for instructor → parent notes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin.items.query('ParentMessages') as any)
        .eq('active', true)
        .descending('sentAt')
        .limit(40)
        .find()
        .catch(() => ({ items: [] })),
    ])

    const enrollRes = {
      items: enrollResults.flatMap((r) => r.items ?? []),
    }
    const payRes = {
      items: payResults.flatMap((r) => r.items ?? []),
    }

    const programByName = new Map(
      programs.map((p) => [p.name.trim().toLowerCase(), p])
    )
    const programById = new Map(programs.map((p) => [p._id, p]))

    // --- Calendar from enrollments + program schedule ---
    const calendar: PortalCalendarItem[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of enrollRes.items ?? []) {
      const e = item as any
      const status = String(e.status ?? '').toLowerCase()
      if (status === 'cancelled' || status === 'historical') continue
      const programName = String(e.programName ?? 'Program')
      const sid = String(e.studentId ?? '')
      const sname = nameFor(sid) || 'Student'
      const key = programName.toLowerCase()

      const prog =
        (e.programId && programById.get(String(e.programId))) ||
        programByName.get(key) ||
        null

      calendar.push({
        id: `enroll-${e._id}`,
        kind: 'program',
        title: programName,
        subtitle: prog?.schedule || prog?.detail || 'Enrolled program',
        whenLabel: prog?.schedule || formatWhen(e.registrationDate) || 'See program details',
        startDate: e.registrationDate ?? null,
        href: '/programs',
        studentNames: [sname],
      })
    }

    // Dedupe program rows by title (merge student names)
    const programCalendar = new Map<string, PortalCalendarItem>()
    for (const item of calendar) {
      if (item.kind !== 'program') continue
      const existing = programCalendar.get(item.title.toLowerCase())
      if (existing) {
        for (const n of item.studentNames) {
          if (!existing.studentNames.includes(n)) existing.studentNames.push(n)
        }
      } else {
        programCalendar.set(item.title.toLowerCase(), { ...item })
      }
    }

    // Concrete session dates for enrolled program names / IDs
    const enrolledNames = new Set(
      Array.from(programCalendar.keys())
    )
    const enrolledIds = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of enrollRes.items ?? []) {
      const e = item as any
      if (e.programId) enrolledIds.add(String(e.programId))
    }

    const sessionItems: PortalCalendarItem[] = sessions
      .filter((s) => {
        const nameKey = s.programName.trim().toLowerCase()
        if (enrolledNames.has(nameKey)) return true
        if (s.programId && enrolledIds.has(s.programId)) return true
        return false
      })
      .map((s) => {
        const nameKey = s.programName.trim().toLowerCase()
        const enrolled = programCalendar.get(nameKey)
        return {
          id: `session-${s.id}`,
          kind: 'program' as const,
          title: s.title || s.programName,
          subtitle: [s.location, s.instructorName ? `with ${s.instructorName}` : '']
            .filter(Boolean)
            .join(' · ') || s.programName,
          whenLabel: formatEventWhen(s.startAt, s.endAt),
          startDate: s.startAt,
          href: '/programs',
          studentNames: enrolled?.studentNames ?? [],
        }
      })

    const eventItems: PortalCalendarItem[] = events.map((ev) => {
      const start = ev.dateAndTimeSettings?.startDate ?? null
      return {
        id: `event-${ev.id}`,
        kind: 'event' as const,
        title: ev.title || 'Event',
        subtitle: ev.location?.name || 'SHMS / PTO',
        whenLabel: formatEventWhen(start, ev.dateAndTimeSettings?.endDate),
        startDate: start,
        href: '/events',
        studentNames: [],
      }
    })

    // Prefer real sessions over free-text enrollment placeholders when sessions exist
    const hasSessions = sessionItems.length > 0
    const programRows = hasSessions
      ? sessionItems
      : Array.from(programCalendar.values())

    const calendarOut = [...programRows, ...eventItems].sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0
      if (!a.startDate) return 1
      if (!b.startDate) return -1
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    })

    // --- Messages (filter to this family) ---
    const grades = new Set(students.map((s: { grade: string }) => s.grade))
    const messages: PortalMessage[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of msgRes.items ?? []) {
      const m = item as any
      const parentEmail = String(m.parentEmail ?? '')
        .trim()
        .toLowerCase()
      const audience = String(m.audience ?? 'family').toLowerCase() // family | grade | all
      const studentId = m.studentId ? String(m.studentId) : ''
      const grade = m.grade ? String(m.grade) : ''

      let visible = false
      if (parentEmail && parentEmail === email) visible = true
      else if (audience === 'all') visible = true
      else if (audience === 'grade' && grade && grades.has(grade)) visible = true
      else if (audience === 'program' && m.programName) {
        const pname = String(m.programName).trim().toLowerCase()
        visible = Array.from(programCalendar.keys()).some((k) => k.includes(pname) || pname.includes(k))
      }
      else if (studentId && studentIds.includes(studentId)) visible = true
      else if (!parentEmail && !audience && !studentId && !grade) visible = true // broadcast drafts marked active

      if (!visible) continue

      messages.push({
        id: m._id,
        fromName: String(m.fromName ?? 'Instructor'),
        subject: String(m.subject ?? 'Update'),
        body: String(m.body ?? ''),
        programName: String(m.programName ?? ''),
        studentName: String(m.studentName ?? '') || (studentId ? nameFor(studentId) : ''),
        sentAt: (m.sentAt as string | null) ?? (m._createdDate as string | null) ?? null,
      })
    }

    // --- Purchases ---
    const purchases: PortalPurchase[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of payRes.items ?? []) {
      const p = item as any
      purchases.push({
        id: p._id,
        label: String(p.programName ?? 'Payment'),
        amount: Number(p.amount ?? 0),
        status: String(p.status ?? ''),
        date: p.paymentDate ?? null,
        studentName: nameFor(String(p.studentId ?? '')),
        source: 'payment',
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of enrollRes.items ?? []) {
      const e = item as any
      if (!e.paymentAmount) continue
      purchases.push({
        id: `en-${e._id}`,
        label: String(e.programName ?? 'Enrollment'),
        amount: Number(e.paymentAmount ?? 0),
        status: String(e.status ?? ''),
        date: e.registrationDate ?? null,
        studentName: nameFor(String(e.studentId ?? '')),
        source: 'enrollment',
      })
    }
    purchases.sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return NextResponse.json({
      calendar: calendarOut.slice(0, 20),
      messages: messages.slice(0, 15),
      purchases: purchases.slice(0, 12),
      studentCount: students.length,
      actingAs,
      parentEmail: email,
      actorEmail,
    })
  } catch (err) {
    console.error('/api/portal/family error:', err)
    return NextResponse.json({ error: 'Failed to load family overview' }, { status: 500 })
  }
}

function formatWhen(d: string | null | undefined): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function formatEventWhen(start: string | null | undefined, end?: string | null): string {
  if (!start) return 'Date TBA'
  try {
    const s = new Date(start)
    const datePart = s.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    const timePart = s.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    if (end) {
      const e = new Date(end)
      const endTime = e.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
      return `${datePart} · ${timePart}–${endTime}`
    }
    return `${datePart} · ${timePart}`
  } catch {
    return 'Date TBA'
  }
}
