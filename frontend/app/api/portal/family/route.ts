/**
 * GET /api/portal/family
 * Family overview for the logged-in parent:
 * calendar (programs + events), instructor messages, recent purchases.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { getWixClient } from '@/lib/wix-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { getAllPrograms } from '@/lib/api/programs'
import { formatProgramSchedule } from '@/lib/programs/schedule'
import { getUpcomingProgramSessions } from '@/lib/api/program-sessions'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { listEnrollmentsForStudent } from '@/lib/programs/enrollments'

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
  detail?: string
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
      listEnrollmentsForStudent(id).catch(() => [] as Awaited<ReturnType<typeof listEnrollmentsForStudent>>),
    )
    const payQueries = [
      ...studentIds.map((id: string) =>
        admin.items
          .query('Payments')
          .eq('studentId', id)
          .descending('paymentDate')
          .limit(15)
          .find()
          .catch(() => ({ items: [] })),
      ),
      // Membership charges are parent-level; include when not tied to a studentId.
      admin.items
        .query('Payments')
        .eq('parentEmail', email)
        .descending('paymentDate')
        .limit(20)
        .find()
        .catch(() => ({ items: [] })),
    ]

    const [programs, sessions, enrollResults, payResults, msgRes, newsletterRes, portalEventRes, membershipRes] =
      await Promise.all([
        getAllPrograms().catch(() => []),
        getUpcomingProgramSessions(50).catch(() => []),
        Promise.all(enrollQueries),
        Promise.all(payQueries),
        // ParentMessages. instructor / staff → parent notes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (admin.items.query('ParentMessages') as any)
          .eq('active', true)
          .descending('sentAt')
          .limit(40)
          .find()
          .catch(() => ({ items: [] })),
        // Newsletters. VP Marketing archive → portal Messages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (admin.items.query('Newsletters') as any)
          .eq('active', true)
          .descending('publishedAt')
          .limit(30)
          .find()
          .catch(() => ({ items: [] })),
        // Staff-added events for member portal calendar
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (admin.items.query('PortalCalendarEvents') as any)
          .eq('active', true)
          .ascending('startAt')
          .limit(40)
          .find()
          .catch(() => ({ items: [] })),
        admin.items
          .query('Memberships')
          .eq('email', email)
          .limit(1)
          .find()
          .catch(() => ({ items: [] })),
      ])

    const enrollRes = {
      items: enrollResults.flatMap((r) => r ?? []),
    }
    const payRes = {
      items: Array.from(
        new Map(
          payResults
            .flatMap((r) => r.items ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => [String(item._id), item]),
        ).values(),
      ),
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
      if (status === 'cancelled' || status === 'historical' || status === 'waitlisted') continue
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
        subtitle: (prog && formatProgramSchedule(prog)) || prog?.detail || 'Enrolled program',
        whenLabel:
          (prog && formatProgramSchedule(prog)) ||
          formatWhen(e.enrolledAt || e.registrationDate) ||
          'See program details',
        startDate: prog?.startDate ?? e.enrolledAt ?? e.registrationDate ?? null,
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

    // Prefer real sessions over free-text enrollment placeholders when sessions exist
    const hasSessions = sessionItems.length > 0
    const programRows = hasSessions
      ? sessionItems
      : Array.from(programCalendar.values())

    // Staff CMS events for portal calendar (any event. not limited to enrollments)
    const grades = new Set(students.map((s: { grade: string }) => s.grade))
    const staffEventItems: PortalCalendarItem[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of portalEventRes.items ?? []) {
      const e = item as any
      const audience = String(e.audience ?? 'all').toLowerCase()
      const grade = e.grade ? String(e.grade) : ''
      if (audience === 'grade' && grade && !grades.has(grade)) continue
      staffEventItems.push({
        id: `staff-event-${e._id}`,
        kind: 'event',
        title: String(e.title ?? 'Event'),
        subtitle: String(e.subtitle ?? ''),
        whenLabel: formatEventWhen(e.startAt, e.endAt),
        startDate: (e.startAt as string | null) ?? null,
        href: String(e.href ?? '/events').trim() || '/events',
        studentNames: [],
      })
    }

    // Portal calendar = enrolled programs + staff PortalCalendarEvents
    const calendarOut = [...programRows, ...staffEventItems].sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0
      if (!a.startDate) return 1
      if (!b.startDate) return -1
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    })

    // Paid vs free for newsletter audience filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membershipRow = (membershipRes.items?.[0] ?? null) as any
    const paidFromMemberships =
      !!membershipRow?.tier &&
      String(membershipRow.tier) !== 'free' &&
      String(membershipRow.status ?? '') !== 'expired'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paidFromStudentRows = (studentsRes.items ?? []).some((raw: any) => {
      if (raw.archived === true) return false
      return String(raw.membershipTier ?? 'free') !== 'free'
    })
    const hasPaidMembership = paidFromMemberships || paidFromStudentRows

    // --- Messages (ParentMessages + Newsletters) ---
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

    // Newsletters → same Messages list in the member portal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of newsletterRes.items ?? []) {
      const n = item as any
      const audience = String(n.audience ?? 'all').toLowerCase()
      const grade = n.grade ? String(n.grade) : ''
      let visible = false
      if (audience === 'all') visible = true
      else if (audience === 'free' && !hasPaidMembership) visible = true
      else if (audience === 'paid' && hasPaidMembership) visible = true
      else if (audience === 'grade' && grade && grades.has(grade)) visible = true
      if (!visible) continue

      messages.push({
        id: `nl-${n._id}`,
        fromName: String(n.fromName ?? 'SHMS PTO'),
        subject: String(n.title ?? 'Newsletter'),
        body: String(n.body ?? ''),
        programName: 'Newsletter',
        studentName: '',
        sentAt:
          (n.publishedAt as string | null) ??
          (n._createdDate as string | null) ??
          null,
      })
    }

    messages.sort((a, b) => {
      if (!a.sentAt && !b.sentAt) return 0
      if (!a.sentAt) return 1
      if (!b.sentAt) return -1
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    })

    // --- Purchases ---
    const purchases: PortalPurchase[] = []
    const { normalizePaymentLedgerRow } = await import('@/lib/payment-ledger')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of payRes.items ?? []) {
      const p = item as any
      const norm = normalizePaymentLedgerRow(p)
      purchases.push({
        id: p._id,
        label: norm.programName,
        amount: norm.amount,
        status: norm.status,
        date: norm.paymentDate,
        studentName: nameFor(String(p.studentId ?? '')),
        source: 'payment',
        detail: norm.detail,
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of enrollRes.items ?? []) {
      const e = item as any
      const status = String(e.status ?? '').toLowerCase()
      // Skip Jumbula / prior-year and cancelled rows so Purchases looks like current season only
      if (status === 'historical' || status === 'cancelled') continue
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
      return `${datePart} · ${timePart} to ${endTime}`
    }
    return `${datePart} · ${timePart}`
  } catch {
    return 'Date TBA'
  }
}
