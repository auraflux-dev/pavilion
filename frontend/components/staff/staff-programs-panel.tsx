'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffFlyerUpload } from '@/components/staff/staff-flyer-upload'
import {
  formatMemberPriorityUntil,
  toDatetimeLocalValue,
} from '@/lib/programs/registration-access'
import { Fall2026EpSchedule } from '@/components/programs/fall-2026-ep-schedule'
import {
  fall2026PacketCmsDefaults,
  fallEpClassById,
  matchFall2026EpClass,
  mergeEmptyProgramFields,
  selectCurrentFall2026Programs,
} from '@/lib/programs/fall-2026-ep'

type Program = {
  id: string
  name: string
  description: string
  fee: number
  capacity: number
  registrationOpen: boolean
  /** ISO datetime; paid members only until this time when registration is open */
  memberPriorityUntil: string
  cheddarupUrl: string
  requiresWaiver: boolean
  grades: string
  category: string
  paymentType: string
  detail: string
  tags: string
  featured: boolean
  sortOrder: number
  schedule: string
  image: string
  dayOfWeek: string
  classTime: string
  durationWeeks: number
  startDate: string
  endDate: string
  instructorName: string
  fallEpClassId: string
  location: string
  meetingDates: string
  skipsNote: string
  memberDiscountNote: string
  seatsTaken?: number
  seatsRemaining?: number | null
}

type Session = {
  id: string
  programId: string
  programName: string
  title: string
  startAt: string | null
  endAt: string | null
  location: string
  instructorName: string
  grades: string
  active: boolean
}

type Enrollment = {
  id: string
  studentId: string
  studentName: string
  parentEmail: string
  status: string
  feePaid: number
  enrolledAt: string | null
  waitlistPosition: number | null
  allergies?: string
  medicalConditions?: string
  medications?: string
  emergencyContact?: string
  emergencyPhone?: string
  pickupAuthorized?: string
  parentPhone?: string
  requestNote?: string
  requestedToProgramId?: string
  requestedToProgramName?: string
}

type AttendanceStudent = {
  studentId: string
  studentName: string
  parentEmail: string
  status: string
  notes: string
  checkedInAt: string | null
  checkedOutAt: string | null
}

const ATT_STATUSES = ['Present', 'Absent', 'Late', 'CheckedOut'] as const

function todayYmd() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function StaffProgramsPanel() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [canManageAll, setCanManageAll] = useState(true)
  const [tab, setTab] = useState<'programs' | 'sessions' | 'roster' | 'attendance' | 'calendar'>(
    'programs',
  )
  const [rosterProgramId, setRosterProgramId] = useState('')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [expandedSafety, setExpandedSafety] = useState<Record<string, boolean>>({})
  const [rosterMeta, setRosterMeta] = useState<{
    enrolled: number
    waitlisted: number
    capacity: number
    seatsRemaining: number | null
  } | null>(null)
  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [savingProgramId, setSavingProgramId] = useState<string | null>(null)
  const [showOlderPrograms, setShowOlderPrograms] = useState(false)
  const [attProgramId, setAttProgramId] = useState('')
  const [attDate, setAttDate] = useState(todayYmd)
  const [attStudents, setAttStudents] = useState<AttendanceStudent[]>([])
  const [attDraft, setAttDraft] = useState<Record<string, { status: string; notes: string }>>({})
  const [sessionForm, setSessionForm] = useState({
    programName: '',
    programId: '',
    title: '',
    startAt: '',
    endAt: '',
    location: '',
    instructorName: '',
    grades: '',
  })

  const visiblePrograms = useMemo(() => {
    if (showOlderPrograms) return programs
    return selectCurrentFall2026Programs(programs)
  }, [programs, showOlderPrograms])

  const visibleProgramIds = useMemo(
    () => new Set(visiblePrograms.map((p) => p.id)),
    [visiblePrograms],
  )

  const upcomingSessions = useMemo(() => {
    const now = Date.now()
    return [...sessions]
      .filter((s) => s.active !== false)
      .filter((s) => !s.programId || visibleProgramIds.has(s.programId))
      .filter((s) => {
        if (!s.startAt) return true
        return new Date(s.startAt).getTime() >= now - 12 * 60 * 60 * 1000
      })
      .sort((a, b) => String(a.startAt ?? '').localeCompare(String(b.startAt ?? '')))
  }, [sessions, visibleProgramIds])

  const visibleSessions = useMemo(
    () => sessions.filter((s) => !s.programId || visibleProgramIds.has(s.programId)),
    [sessions, visibleProgramIds],
  )

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/programs')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      let list = (d.programs ?? []) as Program[]
      setSessions(d.sessions ?? [])
      setCanManageAll(d.canManageAll !== false)
      // Link + seed empty CMS fields from Fall packet so the public site reads CMS only.
      if (d.canManageAll !== false) {
        for (const p of selectCurrentFall2026Programs(list)) {
          const matched =
            fallEpClassById(String(p.fallEpClassId ?? '').trim()) ||
            matchFall2026EpClass(p.name)
          if (!matched) continue
          const defaults = fall2026PacketCmsDefaults(matched)
          const patch = mergeEmptyProgramFields(p as unknown as Record<string, unknown>, defaults)
          if (Object.keys(patch).length === 0) continue
          try {
            const linkRes = await fetch('/api/staff/programs', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ kind: 'program', id: p.id, ...patch }),
            })
            if (linkRes.ok) {
              list = list.map((row) =>
                row.id === p.id ? ({ ...row, ...patch } as Program) : row,
              )
            }
          } catch {
            /* non-blocking */
          }
        }
      }
      setPrograms(list)
      const firstId = list[0]?.id as string | undefined
      if (firstId) {
        setRosterProgramId((prev) => prev || firstId)
        setAttProgramId((prev) => prev || firstId)
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [])

  const loadRoster = useCallback(async (programId: string) => {
    if (!programId) {
      setEnrollments([])
      setRosterMeta(null)
      return
    }
    try {
      const r = await fetch(`/api/staff/programs/enrollments?programId=${encodeURIComponent(programId)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Roster failed')
      setEnrollments(d.enrollments ?? [])
      setRosterMeta({
        enrolled: d.program?.enrolled ?? 0,
        waitlisted: d.program?.waitlisted ?? 0,
        capacity: d.program?.capacity ?? 0,
        seatsRemaining: d.program?.seatsRemaining ?? null,
      })
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Roster failed')
    }
  }, [])

  const loadAttendance = useCallback(async (programId: string, date: string) => {
    if (!programId) {
      setAttStudents([])
      setAttDraft({})
      return
    }
    try {
      const r = await fetch(
        `/api/staff/programs/attendance?programId=${encodeURIComponent(programId)}&date=${encodeURIComponent(date)}`,
      )
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Attendance failed')
      const students = (d.students ?? []) as AttendanceStudent[]
      setAttStudents(students)
      const draft: Record<string, { status: string; notes: string }> = {}
      for (const s of students) {
        draft[s.studentId] = { status: s.status || '', notes: s.notes || '' }
      }
      setAttDraft(draft)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Attendance failed')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (tab === 'roster') void loadRoster(rosterProgramId)
  }, [tab, rosterProgramId, loadRoster])

  useEffect(() => {
    if (tab === 'attendance') void loadAttendance(attProgramId, attDate)
  }, [tab, attProgramId, attDate, loadAttendance])

  function changeProgramLocal(id: string, body: Record<string, unknown>) {
    setPrograms((list) =>
      list.map((p) => (p.id === id ? ({ ...p, ...body } as Program) : p)),
    )
    if (typeof body.name === 'string') {
      const nextName = body.name
      setSessions((list) =>
        list.map((s) => (s.programId === id ? { ...s, programName: nextName } : s)),
      )
    }
  }

  async function saveProgram(id: string, body: Record<string, unknown>) {
    setStatus('')
    changeProgramLocal(id, body)
    setSavingProgramId(id)
    try {
      const r = await fetch('/api/staff/programs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'program', id, ...body }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setStatus('Saved.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
      await load()
    } finally {
      setSavingProgramId(null)
    }
  }

  async function createProgram(seed?: Partial<Program>) {
    const name =
      seed?.name?.trim() ||
      (typeof window !== 'undefined' ? window.prompt('New program name') : null)
    if (!name?.trim()) return
    setStatus('')
    setBusy(true)
    try {
      const r = await fetch('/api/staff/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'program',
          name: name.trim(),
          featured: true,
          registrationOpen: false,
          startDate: seed?.startDate || '2026-09-15',
          endDate: seed?.endDate || '2026-12-08',
          dayOfWeek: seed?.dayOfWeek || '',
          classTime: seed?.classTime || '',
          location: seed?.location || 'SHMS Library',
          grades: seed?.grades || '6-8',
          category: seed?.category || 'Enrichment',
          memberDiscountNote: seed?.memberDiscountNote || 'Members 10 / 15 / 30% off',
          description: seed?.description || '',
          fee: seed?.fee ?? 0,
          capacity: seed?.capacity ?? 0,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not create program')
      setStatus(`Added “${name.trim()}”.`)
      setShowOlderPrograms(false)
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create program')
    } finally {
      setBusy(false)
    }
  }

  async function deleteProgram(id: string, name: string) {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Remove “${name}” from Programs CMS?\nThis cannot be undone.`)
    ) {
      return
    }
    setStatus('')
    setBusy(true)
    try {
      const r = await fetch('/api/staff/programs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'program', id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not remove program')
      setPrograms((list) => list.filter((p) => p.id !== id))
      setStatus(`Removed “${name}”.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not remove program')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function deleteSession(id: string, title: string) {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Remove session “${title}”?`)
    ) {
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'session', id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not remove session')
      setStatus('Session removed.')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not remove session')
    } finally {
      setBusy(false)
    }
  }

  /** @deprecated alias kept for older call sites in this file */
  async function patchProgram(id: string, body: Record<string, unknown>) {
    await saveProgram(id, body)
  }

  async function patchSession(id: string, body: Record<string, unknown>) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'session', id, ...body }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  function toDatetimeLocal(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  async function addSession() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'session',
          ...sessionForm,
          startAt: sessionForm.startAt ? new Date(sessionForm.startAt).toISOString() : null,
          endAt: sessionForm.endAt ? new Date(sessionForm.endAt).toISOString() : null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not add session')
      setStatus('Session added.')
      setSessionForm({
        programName: '',
        programId: '',
        title: '',
        startAt: '',
        endAt: '',
        location: '',
        instructorName: '',
        grades: '',
      })
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not add session')
    } finally {
      setBusy(false)
    }
  }

  async function updateEnrollment(id: string, nextStatus: string) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs/enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      await loadRoster(rosterProgramId)
      await load()
      setStatus(d.promoted ? 'Enrollment updated (waitlist promoted).' : 'Enrollment updated.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function refundEnrollment(id: string) {
    const note = window.prompt('Refund note (optional)') ?? ''
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs/enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refund', id, note }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Refund failed')
      await loadRoster(rosterProgramId)
      await load()
      setStatus(d.promoted ? 'Marked refunded (waitlist promoted).' : 'Marked refunded.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Refund failed')
    } finally {
      setBusy(false)
    }
  }

  async function transferEnrollment(id: string) {
    const choices = programs.filter((p) => p.id !== rosterProgramId)
    if (!choices.length) {
      setStatus('No other programs available to transfer into.')
      return
    }
    const label = choices.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
    const pick = window.prompt(`Transfer to program number:\n${label}`)
    if (!pick) return
    const idx = Number(pick) - 1
    const dest = choices[idx]
    if (!dest) {
      setStatus('Invalid program selection.')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs/enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          id,
          toProgramId: dest.id,
          toProgramName: dest.name,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Transfer failed')
      await loadRoster(rosterProgramId)
      await load()
      setStatus(`Transferred to ${dest.name}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Transfer failed')
    } finally {
      setBusy(false)
    }
  }

  async function messageClass() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message-class',
          programId: rosterProgramId,
          subject: msgSubject,
          body: msgBody,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Send failed')
      setStatus(`Message sent to ${d.recipients} parent${d.recipients === 1 ? '' : 's'}.`)
      setMsgSubject('')
      setMsgBody('')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveAttendance() {
    setBusy(true)
    setStatus('')
    try {
      const marks = Object.entries(attDraft)
        .filter(([, v]) => v.status)
        .map(([studentId, v]) => ({
          studentId,
          status: v.status,
          notes: v.notes || undefined,
        }))
      const r = await fetch('/api/staff/programs/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: attProgramId,
          sessionDate: attDate,
          marks,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      await loadAttendance(attProgramId, attDate)
      setStatus(`Saved ${d.upserted ?? marks.length} attendance mark(s).`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function exportCsv() {
    const header =
      'studentName,parentEmail,status,feePaid,enrolledAt,waitlistPosition,allergies,emergencyContact,emergencyPhone'
    const lines = enrollments.map((e) =>
      [
        e.studentName,
        e.parentEmail,
        e.status,
        e.feePaid,
        e.enrolledAt ?? '',
        e.waitlistPosition ?? '',
        e.allergies ?? '',
        e.emergencyContact ?? '',
        e.emergencyPhone ?? '',
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roster-${rosterProgramId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    ['programs', 'Programs'],
    ['sessions', 'Sessions'],
    ['roster', 'Roster'],
    ['attendance', 'Attendance'],
    ['calendar', 'Calendar'],
  ] as const

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Programs & sessions</h2>
        <p className="text-xs text-[#5A6070] whitespace-pre-line">
          {`Everything parents see on /programs comes from these CMS fields.\nClick out of a field to save. Fall schedule and cards stay in sync.\nEmpty schedule fields auto-fill once from the Fall packet, then you own the copy.`}
        </p>
        {canManageAll ? (
          <button
            type="button"
            className="text-[11px] underline font-semibold"
            style={{ color: 'var(--brand-green)' }}
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setStatus('')
                try {
                  const r = await fetch('/api/staff/cms/ensure-fields', { method: 'POST' })
                  const d = await r.json()
                  if (!r.ok) throw new Error(d.error ?? 'Could not ensure CMS fields')
                  setStatus('Schedule / flyer / attendance fields are ready.')
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Could not ensure fields')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Ensure schedule fields (day/time/dates/flyer/attendance)
          </button>
        ) : null}
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--brand-warm)] p-4">
        <Fall2026EpSchedule
          variant="staff"
          programs={visiblePrograms}
          canEdit
          onProgramChange={changeProgramLocal}
          onProgramSave={(id, patch) => void saveProgram(id, patch)}
          onAddProgram={() => void createProgram()}
          onRemoveProgram={(id, name) => void deleteProgram(id, name)}
        />
        {savingProgramId ? (
          <p className="text-[11px] text-[#5A6070] mt-2">Saving…</p>
        ) : null}
        {status ? <p className="text-[11px] text-[#5A6070] mt-1 whitespace-pre-line">{status}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap rounded-lg border border-[var(--border)] overflow-hidden text-sm">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-1.5 ${tab === id ? 'bg-[var(--brand-green)] text-white' : 'bg-white'}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-1.5 text-[11px] text-[#5A6070]">
          <input
            type="checkbox"
            checked={showOlderPrograms}
            onChange={(e) => setShowOlderPrograms(e.target.checked)}
          />
          Show older programs
        </label>
      </div>

      {tab === 'programs' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => void createProgram()}
              className="text-white text-sm"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              Add program
            </Button>
          </div>
          {visiblePrograms.length === 0 ? (
            <p className="text-sm text-[#5A6070] whitespace-pre-line">
              {showOlderPrograms
                ? 'No programs in your scope. Ask an admin to assign program IDs on your StaffRoles row.'
                : 'No Fall 2026 programs in this list yet.\nTurn on “Show older programs” for prior seasons.\nCurrent season: Fall 2026 start date, plus featured and/or registration open.'}
            </p>
          ) : null}
          {visiblePrograms.map((p) => (
            <div key={p.id} className="border border-[var(--border)] rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    value={p.name}
                    aria-label="Program name"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm font-bold"
                    onChange={(e) => changeProgramLocal(p.id, { name: e.target.value })}
                    onBlur={(e) => {
                      const next = e.target.value.trim()
                      if (next) void saveProgram(p.id, { name: next })
                    }}
                  />
                  <p className="text-xs text-[#5A6070] mt-1">
                    Seats{' '}
                    {p.capacity
                      ? `${p.seatsTaken ?? 0}/${p.capacity}${
                          p.seatsRemaining != null ? ` (${p.seatsRemaining} open)` : ''
                        }`
                      : 'unlimited'}
                  </p>
                  <p className="text-[11px] text-[#5A6070] mt-0.5 font-mono">
                    ID{' '}
                    <button
                      type="button"
                      className="underline"
                      style={{ color: 'var(--brand-green)' }}
                      onClick={() => {
                        void navigator.clipboard.writeText(p.id)
                        setStatus(`Copied program ID for ${p.name}`)
                      }}
                    >
                      {p.id}
                    </button>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={p.registrationOpen}
                      onChange={(e) => void saveProgram(p.id, { registrationOpen: e.target.checked })}
                    />
                    Registration open
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={p.featured}
                      onChange={(e) => void saveProgram(p.id, { featured: e.target.checked })}
                    />
                    Featured
                  </label>
                  <label className="inline-flex flex-col gap-0.5 text-[11px] text-[#5A6070] w-full sm:w-auto">
                    <span>Paid members only until</span>
                    <input
                      type="datetime-local"
                      className="border border-[var(--border)] rounded px-1.5 py-1 text-xs text-[#1A1A1A]"
                      value={toDatetimeLocalValue(p.memberPriorityUntil)}
                      onChange={(e) =>
                        void saveProgram(p.id, {
                          memberPriorityUntil: e.target.value || null,
                        })
                      }
                    />
                    <span className="text-[10px] leading-snug max-w-xs">
                      {p.memberPriorityUntil
                        ? `Opens to all after ${formatMemberPriorityUntil(p.memberPriorityUntil)}`
                        : 'Leave blank = open to all signed-in parents when registration is on'}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="underline font-semibold"
                    style={{ color: 'var(--brand-green)' }}
                    onClick={() => {
                      setRosterProgramId(p.id)
                      setTab('roster')
                    }}
                  >
                    Roster
                  </button>
                  <button
                    type="button"
                    className="underline font-semibold"
                    style={{ color: 'var(--brand-green)' }}
                    onClick={() => {
                      setAttProgramId(p.id)
                      setTab('attendance')
                    }}
                  >
                    Attendance
                  </button>
                  <button
                    type="button"
                    className="underline font-semibold text-red-700"
                    disabled={busy}
                    onClick={() => void deleteProgram(p.id, p.name)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--border)]">
                <label className="text-[11px] text-[#5A6070] space-y-0.5 sm:col-span-2">
                  <span>Description</span>
                  <textarea
                    value={p.description}
                    rows={2}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => changeProgramLocal(p.id, { description: e.target.value })}
                    onBlur={(e) => void saveProgram(p.id, { description: e.target.value })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Fee ($)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={p.fee}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => changeProgramLocal(p.id, { fee: Number(e.target.value) || 0 })}
                    onBlur={(e) => void saveProgram(p.id, { fee: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Capacity (0 = unlimited)</span>
                  <input
                    type="number"
                    min={0}
                    value={p.capacity}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) =>
                      changeProgramLocal(p.id, { capacity: Number(e.target.value) || 0 })
                    }
                    onBlur={(e) => void saveProgram(p.id, { capacity: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Grades</span>
                  <input
                    value={p.grades}
                    placeholder="e.g. 6-8"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => changeProgramLocal(p.id, { grades: e.target.value })}
                    onBlur={(e) => void saveProgram(p.id, { grades: e.target.value })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Category</span>
                  <input
                    value={p.category}
                    placeholder="e.g. Enrichment"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => changeProgramLocal(p.id, { category: e.target.value })}
                    onBlur={(e) => void saveProgram(p.id, { category: e.target.value })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Payment type</span>
                  <input
                    value={p.paymentType}
                    placeholder="e.g. Square"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => changeProgramLocal(p.id, { paymentType: e.target.value })}
                    onBlur={(e) => void saveProgram(p.id, { paymentType: e.target.value })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Sort order</span>
                  <input
                    type="number"
                    value={p.sortOrder}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) =>
                      changeProgramLocal(p.id, { sortOrder: Number(e.target.value) || 0 })
                    }
                    onBlur={(e) => void saveProgram(p.id, { sortOrder: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5 sm:col-span-2">
                  <span>Cheddar Up / external checkout URL</span>
                  <input
                    value={p.cheddarupUrl}
                    placeholder="https://…"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => changeProgramLocal(p.id, { cheddarupUrl: e.target.value })}
                    onBlur={(e) => void saveProgram(p.id, { cheddarupUrl: e.target.value })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5 sm:col-span-2">
                  <span>Tags (comma-separated)</span>
                  <input
                    value={p.tags}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => changeProgramLocal(p.id, { tags: e.target.value })}
                    onBlur={(e) => void saveProgram(p.id, { tags: e.target.value })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5 sm:col-span-2">
                  <span>Detail (extra copy)</span>
                  <textarea
                    value={p.detail}
                    rows={2}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => changeProgramLocal(p.id, { detail: e.target.value })}
                    onBlur={(e) => void saveProgram(p.id, { detail: e.target.value })}
                  />
                </label>
                <label className="inline-flex items-center gap-1 text-xs sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={p.requiresWaiver}
                    onChange={(e) => void saveProgram(p.id, { requiresWaiver: e.target.checked })}
                  />
                  Requires waiver
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 pt-1">
                <input
                  value={p.instructorName}
                  placeholder="Instructor / vendor"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                  onChange={(e) => changeProgramLocal(p.id, { instructorName: e.target.value })}
                  onBlur={(e) => void saveProgram(p.id, { instructorName: e.target.value })}
                />
                <input
                  value={p.location}
                  placeholder="Room / location"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                  onChange={(e) => changeProgramLocal(p.id, { location: e.target.value })}
                  onBlur={(e) => void saveProgram(p.id, { location: e.target.value })}
                />
                <input
                  value={p.dayOfWeek}
                  placeholder="Day of week (e.g. Tuesdays)"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) => changeProgramLocal(p.id, { dayOfWeek: e.target.value })}
                  onBlur={(e) => void saveProgram(p.id, { dayOfWeek: e.target.value })}
                />
                <input
                  value={p.classTime}
                  placeholder="Class time (e.g. 3:30 to 4:30 PM)"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) => changeProgramLocal(p.id, { classTime: e.target.value })}
                  onBlur={(e) => void saveProgram(p.id, { classTime: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  value={p.durationWeeks || ''}
                  placeholder="Weeks"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) =>
                    changeProgramLocal(p.id, { durationWeeks: Number(e.target.value) || 0 })
                  }
                  onBlur={(e) =>
                    void saveProgram(p.id, { durationWeeks: Number(e.target.value) || 0 })
                  }
                />
                <input
                  type="date"
                  value={p.startDate || ''}
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) => {
                    changeProgramLocal(p.id, { startDate: e.target.value })
                    void saveProgram(p.id, { startDate: e.target.value })
                  }}
                />
                <input
                  type="date"
                  value={p.endDate || ''}
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) => {
                    changeProgramLocal(p.id, { endDate: e.target.value })
                    void saveProgram(p.id, { endDate: e.target.value })
                  }}
                />
                <input
                  value={p.skipsNote}
                  placeholder="Skip / holiday note"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                  onChange={(e) => changeProgramLocal(p.id, { skipsNote: e.target.value })}
                  onBlur={(e) => void saveProgram(p.id, { skipsNote: e.target.value })}
                />
                <input
                  value={p.memberDiscountNote}
                  placeholder="Member discount note (under fee on /programs cards)"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                  onChange={(e) => changeProgramLocal(p.id, { memberDiscountNote: e.target.value })}
                  onBlur={(e) => void saveProgram(p.id, { memberDiscountNote: e.target.value })}
                />
              </div>
              <p className="text-[11px] text-[#5A6070]">
                Parents see day, time, weeks, and date range on the program card before they register.
              </p>
              <StaffFlyerUpload
                label="Program flyer"
                currentUrl={p.image}
                disabled={false}
                onUploaded={(url) => void saveProgram(p.id, { image: url })}
              />
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'sessions' ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] p-3 space-y-2 bg-[#FAFAF8]">
            <p className="text-xs font-bold text-[#5A6070]">Add session</p>
            <select
              value={sessionForm.programId}
              onChange={(e) => {
                const p = visiblePrograms.find((x) => x.id === e.target.value)
                setSessionForm((f) => ({
                  ...f,
                  programId: e.target.value,
                  programName: p?.name ?? '',
                  title: f.title || p?.name || '',
                }))
              }}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Program…</option>
              {visiblePrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              value={sessionForm.title}
              onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Session title"
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={sessionForm.startAt}
                onChange={(e) => setSessionForm((f) => ({ ...f, startAt: e.target.value }))}
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={sessionForm.endAt}
                onChange={(e) => setSessionForm((f) => ({ ...f, endAt: e.target.value }))}
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={sessionForm.location}
                onChange={(e) => setSessionForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Location"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={sessionForm.instructorName}
                onChange={(e) => setSessionForm((f) => ({ ...f, instructorName: e.target.value }))}
                placeholder="Instructor"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <Button
              disabled={busy || !sessionForm.programName || !sessionForm.title}
              onClick={() => void addSession()}
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              Add session
            </Button>
          </div>
          <div className="space-y-3">
            {visibleSessions.map((s) => (
              <div key={s.id} className="border border-[var(--border)] rounded-lg p-3 space-y-2 text-sm">
                <input
                  defaultValue={s.title}
                  disabled={busy}
                  aria-label="Session title"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm font-semibold"
                  onBlur={(e) => {
                    const next = e.target.value.trim()
                    if (next && next !== s.title) void patchSession(s.id, { title: next })
                  }}
                />
                <p className="text-xs text-[#5A6070]">{s.programName}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    defaultValue={toDatetimeLocal(s.startAt)}
                    disabled={busy}
                    aria-label="Session start"
                    className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                    onBlur={(e) => {
                      const prev = toDatetimeLocal(s.startAt)
                      if (e.target.value !== prev) {
                        void patchSession(s.id, {
                          startAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                    }}
                  />
                  <input
                    type="datetime-local"
                    defaultValue={toDatetimeLocal(s.endAt)}
                    disabled={busy}
                    aria-label="Session end"
                    className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                    onBlur={(e) => {
                      const prev = toDatetimeLocal(s.endAt)
                      if (e.target.value !== prev) {
                        void patchSession(s.id, {
                          endAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                    }}
                  />
                  <input
                    defaultValue={s.location}
                    disabled={busy}
                    placeholder="Location"
                    className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                    onBlur={(e) => {
                      if (e.target.value !== s.location) {
                        void patchSession(s.id, { location: e.target.value })
                      }
                    }}
                  />
                  <input
                    defaultValue={s.instructorName}
                    disabled={busy}
                    placeholder="Instructor"
                    className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                    onBlur={(e) => {
                      if (e.target.value !== s.instructorName) {
                        void patchSession(s.id, { instructorName: e.target.value })
                      }
                    }}
                  />
                  <input
                    defaultValue={s.grades}
                    disabled={busy}
                    placeholder="Grades"
                    className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                    onBlur={(e) => {
                      if (e.target.value !== s.grades) {
                        void patchSession(s.id, { grades: e.target.value })
                      }
                    }}
                  />
                  <label className="inline-flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={s.active}
                      disabled={busy}
                      onChange={(e) => void patchSession(s.id, { active: e.target.checked })}
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold underline text-red-700"
                    disabled={busy}
                    onClick={() => void deleteSession(s.id, s.title)}
                  >
                    Remove session
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'roster' ? (
        <div className="space-y-4">
          <select
            value={rosterProgramId}
            onChange={(e) => setRosterProgramId(e.target.value)}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select program…</option>
            {visiblePrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {rosterMeta ? (
            <p className="text-xs text-[#5A6070]">
              Enrolled {rosterMeta.enrolled}
              {rosterMeta.capacity ? ` / ${rosterMeta.capacity}` : ''} · Waitlist{' '}
              {rosterMeta.waitlisted}
              {rosterMeta.seatsRemaining != null ? ` · ${rosterMeta.seatsRemaining} seats open` : ''}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!enrollments.length}
              onClick={exportCsv}
              variant="outline"
              className="text-sm"
            >
              Export CSV
            </Button>
          </div>
          <div className="space-y-2 max-h-96 overflow-auto">
            {enrollments.map((e) => {
              const allergyLine = (e.allergies || '').trim()
              const hasSafety =
                allergyLine ||
                e.medicalConditions ||
                e.medications ||
                e.emergencyContact ||
                e.pickupAuthorized
              const open = expandedSafety[e.id]
              const actionable =
                e.status === 'Enrolled' ||
                e.status === 'Paid' ||
                e.status === 'Waitlisted' ||
                e.status === 'RefundRequested' ||
                e.status === 'TransferRequested'
              return (
                <div key={e.id} className="border border-[var(--border)] rounded-lg p-2 text-sm space-y-1">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-semibold">{e.studentName || 'Student'}</p>
                      <p className="text-xs text-[#5A6070]">
                        {e.parentEmail} · {e.status}
                        {e.waitlistPosition ? ` #${e.waitlistPosition}` : ''}
                        {e.feePaid ? ` · $${e.feePaid}` : ''}
                      </p>
                      {allergyLine ? (
                        <p className="text-xs text-amber-800 mt-0.5">Allergy: {allergyLine}</p>
                      ) : (
                        <p className="text-xs text-[#8A8F9C] mt-0.5">No allergies listed</p>
                      )}
                      {e.requestedToProgramName ? (
                        <p className="text-xs text-[#5A6070]">
                          Transfer request → {e.requestedToProgramName}
                        </p>
                      ) : null}
                      {e.requestNote ? (
                        <p className="text-xs text-[#5A6070]">Note: {e.requestNote}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1 text-xs items-start">
                      {e.status === 'Waitlisted' ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="underline font-semibold"
                          style={{ color: 'var(--brand-green)' }}
                          onClick={() => void updateEnrollment(e.id, 'Enrolled')}
                        >
                          Promote
                        </button>
                      ) : null}
                      {e.status === 'RefundRequested' ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="underline font-semibold"
                          style={{ color: 'var(--brand-green)' }}
                          onClick={() => void refundEnrollment(e.id)}
                        >
                          Approve refund
                        </button>
                      ) : null}
                      {e.status === 'TransferRequested' && e.requestedToProgramId ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="underline font-semibold"
                          style={{ color: 'var(--brand-green)' }}
                          onClick={() => {
                            void (async () => {
                              setBusy(true)
                              try {
                                const r = await fetch('/api/staff/programs/enrollments', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'transfer',
                                    id: e.id,
                                    toProgramId: e.requestedToProgramId,
                                    toProgramName: e.requestedToProgramName,
                                  }),
                                })
                                const d = await r.json()
                                if (!r.ok) throw new Error(d.error ?? 'Transfer failed')
                                await loadRoster(rosterProgramId)
                                await load()
                                setStatus('Transfer completed.')
                              } catch (err) {
                                setStatus(err instanceof Error ? err.message : 'Transfer failed')
                              } finally {
                                setBusy(false)
                              }
                            })()
                          }}
                        >
                          Approve transfer
                        </button>
                      ) : null}
                      {actionable ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            className="underline font-semibold"
                            style={{ color: 'var(--brand-green)' }}
                            onClick={() => void transferEnrollment(e.id)}
                          >
                            Transfer
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="underline font-semibold"
                            style={{ color: 'var(--brand-green)' }}
                            onClick={() => void refundEnrollment(e.id)}
                          >
                            Refund
                          </button>
                        </>
                      ) : null}
                      {e.status !== 'Cancelled' && e.status !== 'Refunded' ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="underline text-red-700"
                          onClick={() => void updateEnrollment(e.id, 'Cancelled')}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {hasSafety ? (
                    <button
                      type="button"
                      className="text-[11px] underline text-[#5A6070]"
                      onClick={() =>
                        setExpandedSafety((prev) => ({ ...prev, [e.id]: !prev[e.id] }))
                      }
                    >
                      {open ? 'Hide safety details' : 'Show safety details'}
                    </button>
                  ) : null}
                  {open ? (
                    <div className="text-[11px] text-[#5A6070] space-y-0.5 pl-1 border-l-2 border-[var(--border)]">
                      {e.parentPhone ? <p>Parent phone: {e.parentPhone}</p> : null}
                      {e.emergencyContact || e.emergencyPhone ? (
                        <p>
                          Emergency: {e.emergencyContact || 'n/a'}
                          {e.emergencyPhone ? ` · ${e.emergencyPhone}` : ''}
                        </p>
                      ) : null}
                      {e.medicalConditions ? <p>Conditions: {e.medicalConditions}</p> : null}
                      {e.medications ? <p>Medications: {e.medications}</p> : null}
                      {e.pickupAuthorized ? <p>Pickup: {e.pickupAuthorized}</p> : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
            {rosterProgramId && enrollments.length === 0 ? (
              <p className="text-sm text-[#5A6070]">No enrollments yet.</p>
            ) : null}
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3 space-y-2 bg-[#FAFAF8]">
            <p className="text-xs font-bold text-[#5A6070]">Message this class</p>
            <input
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Message to enrolled + waitlisted parents (portal inbox)"
              rows={4}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
            <Button
              disabled={busy || !rosterProgramId || !msgSubject.trim() || !msgBody.trim()}
              onClick={() => void messageClass()}
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              Send to class
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'attendance' ? (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-2">
            <select
              value={attProgramId}
              onChange={(e) => setAttProgramId(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select program…</option>
              {visiblePrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={attDate}
              onChange={(e) => setAttDate(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-auto">
            {attStudents.map((s) => (
              <div
                key={s.studentId}
                className="border border-[var(--border)] rounded-lg p-2 text-sm flex flex-wrap gap-2 items-center justify-between"
              >
                <div className="min-w-[140px]">
                  <p className="font-semibold">{s.studentName || 'Student'}</p>
                  <p className="text-xs text-[#5A6070]">{s.parentEmail}</p>
                </div>
                <select
                  value={attDraft[s.studentId]?.status ?? ''}
                  onChange={(e) =>
                    setAttDraft((prev) => ({
                      ...prev,
                      [s.studentId]: {
                        status: e.target.value,
                        notes: prev[s.studentId]?.notes ?? '',
                      },
                    }))
                  }
                  className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="">None</option>
                  {ATT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <input
                  value={attDraft[s.studentId]?.notes ?? ''}
                  onChange={(e) =>
                    setAttDraft((prev) => ({
                      ...prev,
                      [s.studentId]: {
                        status: prev[s.studentId]?.status ?? '',
                        notes: e.target.value,
                      },
                    }))
                  }
                  placeholder="Notes"
                  className="flex-1 min-w-[120px] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs"
                />
              </div>
            ))}
            {attProgramId && attStudents.length === 0 ? (
              <p className="text-sm text-[#5A6070]">No active enrollments for this program.</p>
            ) : null}
          </div>
          <Button
            disabled={busy || !attProgramId || !attStudents.length}
            onClick={() => void saveAttendance()}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            Save attendance
          </Button>
        </div>
      ) : null}

      {tab === 'calendar' ? (
        <div className="space-y-2">
          <p className="text-xs text-[#5A6070] whitespace-pre-line">
            {`CMS session rows below are optional night-by-night entries.
Class title and schedule live on the Programs card; the Fall table above mirrors them.`}
          </p>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-[#5A6070]">
              No CMS session rows yet. Edit class details on the Programs tab.
            </p>
          ) : (
            upcomingSessions.map((s) => (
              <div key={s.id} className="border border-[var(--border)] rounded-lg p-3 text-sm">
                <p className="font-semibold">
                  {s.title} · {s.programName}
                </p>
                <p className="text-xs text-[#5A6070]">
                  {s.startAt ? new Date(s.startAt).toLocaleString() : 'TBD'}
                  {s.endAt ? ` to ${new Date(s.endAt).toLocaleTimeString()}` : ''}
                  {s.location ? ` · ${s.location}` : ''}
                  {s.instructorName ? ` · ${s.instructorName}` : ''}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
