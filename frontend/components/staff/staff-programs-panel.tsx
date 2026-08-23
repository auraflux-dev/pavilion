'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StaffFlyerUpload } from '@/components/staff/staff-flyer-upload'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import {
  formatMemberPriorityUntil,
  toDatetimeLocalValue,
} from '@/lib/programs/registration-access'
import { Fall2026EpSchedule } from '@/components/programs/fall-2026-ep-schedule'
import { StaffProgramsCalendarPlanner } from '@/components/staff/staff-programs-calendar-planner'
import {
  fall2026PacketCmsDefaults,
  fallEpClassById,
  matchFall2026EpClass,
  mergeEmptyProgramFields,
  selectCurrentFall2026Programs,
} from '@/lib/programs/fall-2026-ep'
import {
  CATALOG_SEASON_LABELS,
  resolveProgramSeason,
  STAFF_SEASON_OPTIONS,
  type CatalogSeasonId,
} from '@/lib/programs/season'

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
  season: string
  location: string
  meetingDates: string
  skipsNote: string
  memberDiscountNote: string
  seatsTaken?: number
  seatsRemaining?: number | null
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

function sortProgramsByDisplayOrder(list: Program[]): Program[] {
  return [...list].sort((a, b) => {
    const ao = Number(a.sortOrder ?? 0) || 0
    const bo = Number(b.sortOrder ?? 0) || 0
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name)
  })
}

export function StaffProgramsPanel() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [canManageAll, setCanManageAll] = useState(true)
  const [tab, setTab] = useState<'programs' | 'roster' | 'attendance' | 'calendar'>(
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
  const [boardPosts, setBoardPosts] = useState<
    {
      id: string
      subject: string
      body: string
      fromName: string
      sentAt: string | null
    }[]
  >([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [savingProgramId, setSavingProgramId] = useState<string | null>(null)
  const [showOlderPrograms, setShowOlderPrograms] = useState(false)
  /** Frozen while editing so filter/sort cannot yank the focused field away. */
  const [visibleIdOrder, setVisibleIdOrder] = useState<string[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  /** Insertion index while dragging: 0 = first, length = last. */
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [advancedIds, setAdvancedIds] = useState<Record<string, boolean>>({})
  const [attProgramId, setAttProgramId] = useState('')
  const [attDate, setAttDate] = useState(todayYmd)
  const [attStudents, setAttStudents] = useState<AttendanceStudent[]>([])
  const [attDraft, setAttDraft] = useState<Record<string, { status: string; notes: string }>>({})

  const visiblePrograms = useMemo(() => {
    if (showOlderPrograms) return sortProgramsByDisplayOrder(programs)
    if (visibleIdOrder.length === 0) {
      return sortProgramsByDisplayOrder(selectCurrentFall2026Programs(programs))
    }
    const byId = new Map(programs.map((p) => [p.id, p]))
    return visibleIdOrder.map((id) => byId.get(id)).filter(Boolean) as Program[]
  }, [programs, showOlderPrograms, visibleIdOrder])


  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/programs')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      let list = (d.programs ?? []) as Program[]
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
      setVisibleIdOrder(
        sortProgramsByDisplayOrder(selectCurrentFall2026Programs(list)).map((p) => p.id),
      )
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

  const loadBoard = useCallback(async (programId: string) => {
    if (!programId) {
      setBoardPosts([])
      return
    }
    try {
      const r = await fetch(`/api/staff/programs/board?programId=${encodeURIComponent(programId)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Board failed')
      setBoardPosts(
        ((d.posts ?? []) as {
          id: string
          subject: string
          body: string
          fromName: string
          sentAt: string | null
        }[]).map((p) => ({
          id: p.id,
          subject: p.subject,
          body: p.body,
          fromName: p.fromName,
          sentAt: p.sentAt,
        })),
      )
    } catch (err) {
      setBoardPosts([])
      setStatus(err instanceof Error ? err.message : 'Board failed')
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
    if (tab === 'roster') {
      void loadRoster(rosterProgramId)
      void loadBoard(rosterProgramId)
    }
  }, [tab, rosterProgramId, loadRoster, loadBoard])

  useEffect(() => {
    if (tab === 'attendance') void loadAttendance(attProgramId, attDate)
  }, [tab, attProgramId, attDate, loadAttendance])

  function changeProgramLocal(id: string, body: Record<string, unknown>) {
    setPrograms((list) =>
      list.map((p) => (p.id === id ? ({ ...p, ...body } as Program) : p)),
    )
  }

  async function saveProgram(id: string, body: Record<string, unknown>) {
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

  async function applyDisplayOrder(orderedIds: string[]) {
    const total = orderedIds.length
    setVisibleIdOrder(orderedIds)
    setPrograms((list) =>
      list.map((p) => {
        const idx = orderedIds.indexOf(p.id)
        return idx >= 0 ? { ...p, sortOrder: idx + 1 } : p
      }),
    )
    setBusy(true)
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i]
        const sortOrder = i + 1
        const r = await fetch('/api/staff/programs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'program', id, sortOrder }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Could not save display order')
      }
      setStatus(`Saved display order. Positions 1 to ${total}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save display order')
      await load()
    } finally {
      setBusy(false)
      setDragId(null)
      setDropIndex(null)
    }
  }

  function clearDrag() {
    setDragId(null)
    setDropIndex(null)
  }

  function commitDragToIndex(insertBefore: number) {
    if (!dragId) {
      clearDrag()
      return
    }
    const ids = visiblePrograms.map((p) => p.id)
    const from = ids.indexOf(dragId)
    if (from < 0) {
      clearDrag()
      return
    }
    let to = insertBefore
    if (from < insertBefore) to = insertBefore - 1
    if (to === from) {
      clearDrag()
      return
    }
    const next = [...ids]
    next.splice(from, 1)
    next.splice(to, 0, dragId)
    void applyDisplayOrder(next)
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
          location: seed?.location || vanillaizeIfDemo('School library'),
          grades: seed?.grades || '6-8',
          category: seed?.category || 'Enrichment',
          season: seed?.season || 'fall-2026',
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
      setVisibleIdOrder((ids) => ids.filter((x) => x !== id))
      setStatus(`Removed “${name}”.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not remove program')
      await load()
    } finally {
      setBusy(false)
    }
  }


  /** @deprecated alias kept for older call sites in this file */
  async function patchProgram(id: string, body: Record<string, unknown>) {
    await saveProgram(id, body)
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

  async function postToClassBoard() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: rosterProgramId,
          subject: msgSubject,
          body: msgBody,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Post failed')
      setStatus(
        `Posted to class board and sent to ${d.recipients} parent${d.recipients === 1 ? '' : 's'}.`,
      )
      setMsgSubject('')
      setMsgBody('')
      await loadBoard(rosterProgramId)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Post failed')
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
    ['roster', 'Roster'],
    ['attendance', 'Attendance'],
    ['calendar', 'Calendar'],
  ] as const

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Programs</h2>
        <p className="text-xs text-[#5A6070] whitespace-pre-line">
          {`Programs = public catalog cards.
Calendar = season schedule table plus school calendar overlays for planning.
Roster / Attendance = enrolled families.`}
        </p>
        <p className="text-[11px] text-[#5A6070] mt-1 min-h-[1.25rem]" aria-live="polite">
          {savingProgramId ? 'Saving…' : status || '\u00a0'}
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
            Ensure CMS schedule fields
          </button>
        ) : null}
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
            onChange={(e) => {
              const next = e.target.checked
              setShowOlderPrograms(next)
              if (!next) {
                setVisibleIdOrder(
                  sortProgramsByDisplayOrder(selectCurrentFall2026Programs(programs)).map(
                    (p) => p.id,
                  ),
                )
              } else {
                setVisibleIdOrder(sortProgramsByDisplayOrder(programs).map((p) => p.id))
              }
            }}
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
          {visiblePrograms.length > 0 ? (
            <p className="text-xs text-[#5A6070] whitespace-pre-line">
              {`Drag the grip to set public catalog order.
There are ${visiblePrograms.length} program${visiblePrograms.length === 1 ? '' : 's'} in this list.`}
            </p>
          ) : null}
          {dragId && dropIndex != null ? (
            <div
              className="sticky top-2 z-10 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm"
              style={{
                backgroundColor: 'var(--brand-warm)',
                borderColor: 'var(--brand-green)',
                color: 'var(--brand-green)',
              }}
              aria-live="polite"
            >
              {dropIndex >= visiblePrograms.length
                ? `Drop as position ${visiblePrograms.length} of ${visiblePrograms.length}`
                : `Drop as position ${dropIndex + 1} of ${visiblePrograms.length}`}
            </div>
          ) : null}
          {visiblePrograms.length === 0 ? (
            <p className="text-sm text-[#5A6070] whitespace-pre-line">
              {showOlderPrograms
                ? 'No programs in your scope. Ask an admin to assign program IDs on your StaffRoles row.'
                : 'No Fall 2026 programs in this list yet.\nTurn on “Show older programs” for prior seasons.\nCurrent season: Fall 2026 start date, plus featured and/or registration open.'}
            </p>
          ) : null}
          {visiblePrograms.map((p, index) => (
            <div
              key={p.id}
              className={`border border-[var(--border)] rounded-lg p-3 space-y-2 ${
                dragId === p.id ? 'opacity-60' : ''
              } ${
                dragId && dropIndex === index
                  ? 'ring-2 ring-[var(--brand-green)] ring-offset-1'
                  : ''
              }`}
              onDragOver={(e) => {
                if (!dragId) return
                e.preventDefault()
                const rect = e.currentTarget.getBoundingClientRect()
                const before = e.clientY < rect.top + rect.height / 2
                setDropIndex(before ? index : index + 1)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dropIndex == null) {
                  clearDrag()
                  return
                }
                commitDragToIndex(dropIndex)
              }}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <button
                    type="button"
                    draggable
                    aria-label={`Drag to reorder ${p.name}. Currently position ${index + 1} of ${visiblePrograms.length}.`}
                    title={`Drag to reorder. Currently ${index + 1} of ${visiblePrograms.length}`}
                    className="mt-1 shrink-0 cursor-grab touch-none rounded border border-[var(--border)] bg-white p-1 text-[#5A6070] active:cursor-grabbing"
                    onDragStart={(e) => {
                      setDragId(p.id)
                      setDropIndex(index)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', p.id)
                    }}
                    onDragEnd={() => clearDrag()}
                  >
                    <GripVertical className="h-4 w-4" aria-hidden />
                  </button>
                  <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-semibold text-[#5A6070]">
                    Position {index + 1} of {visiblePrograms.length}
                  </p>
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
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={p.registrationOpen}
                      onChange={(e) => void saveProgram(p.id, { registrationOpen: e.target.checked })}
                    />
                    Registration open (checkout)
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
                <p className="text-xs text-[#5A6070]">
                  {[p.dayOfWeek, p.classTime, p.fee > 0 ? `$${p.fee}` : null, CATALOG_SEASON_LABELS[resolveProgramSeason(p)]]
                    .filter(Boolean)
                    .join(' · ') || 'No schedule yet'}
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: 'var(--brand-green)' }}
                  aria-expanded={Boolean(expandedIds[p.id])}
                  onClick={() =>
                    setExpandedIds((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                  }
                >
                  {expandedIds[p.id] ? (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {expandedIds[p.id] ? 'Hide details' : 'Edit details'}
                </button>
              </div>
              {expandedIds[p.id] ? (
              <>
              <div className="grid sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--border)]">
                <div className="sm:col-span-2">
                  <StaffPlainCopyField
                    label="Description"
                    value={p.description}
                    rows={5}
                    textareaClassName="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(next) => changeProgramLocal(p.id, { description: next })}
                    onCommit={(next) => void saveProgram(p.id, { description: normalizePlainCopy(next) })}
                  />
                </div>
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
                <label className="text-[11px] text-[#5A6070] space-y-0.5 sm:col-span-2">
                  <span>Catalog season</span>
                  <select
                    value={resolveProgramSeason(p)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] bg-white"
                    onChange={(e) => {
                      const season = e.target.value as CatalogSeasonId
                      changeProgramLocal(p.id, { season })
                      void saveProgram(p.id, { season })
                    }}
                  >
                    {STAFF_SEASON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                        {opt.note ? ` (${opt.note})` : ''}
                      </option>
                    ))}
                  </select>
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
              <StaffFlyerUpload
                label="Program flyer"
                currentUrl={p.image}
                disabled={false}
                onUploaded={(url) => void saveProgram(p.id, { image: url })}
              />
              <div className="border-t border-[var(--border)] pt-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5A6070]"
                  aria-expanded={Boolean(advancedIds[p.id])}
                  onClick={() =>
                    setAdvancedIds((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                  }
                >
                  {advancedIds[p.id] ? (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Advanced / legacy
                </button>
                {advancedIds[p.id] ? (
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    <p className="text-[10px] text-[#5A6070] sm:col-span-2 whitespace-pre-line">
                      {`Cheddar Up is legacy (installments / peer fundraising).
Leave blank for normal in-app Square checkout.`}
                    </p>
                    <label className="text-[11px] text-[#5A6070] space-y-0.5 sm:col-span-2">
                      <span>Cheddar Up / external checkout URL</span>
                      <input
                        value={p.cheddarupUrl}
                        placeholder="Leave blank unless using Cheddar Up"
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                        onChange={(e) => changeProgramLocal(p.id, { cheddarupUrl: e.target.value })}
                        onBlur={(e) => void saveProgram(p.id, { cheddarupUrl: e.target.value })}
                      />
                    </label>
                    <label className="text-[11px] text-[#5A6070] space-y-0.5">
                      <span>Payment type</span>
                      <input
                        value={p.paymentType}
                        placeholder="wix / cheddarup_installment / cheddarup_p2p"
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                        onChange={(e) => changeProgramLocal(p.id, { paymentType: e.target.value })}
                        onBlur={(e) => void saveProgram(p.id, { paymentType: e.target.value })}
                      />
                    </label>
                    <label className="text-[11px] text-[#5A6070] space-y-0.5">
                      <span>Sort order number</span>
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
                      <span>Tags (comma-separated)</span>
                      <input
                        value={p.tags}
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                        onChange={(e) => changeProgramLocal(p.id, { tags: e.target.value })}
                        onBlur={(e) => void saveProgram(p.id, { tags: e.target.value })}
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <StaffPlainCopyField
                        label="Detail (extra copy)"
                        value={p.detail}
                        rows={4}
                        textareaClassName="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                        onChange={(next) => changeProgramLocal(p.id, { detail: next })}
                        onCommit={(next) => void saveProgram(p.id, { detail: normalizePlainCopy(next) })}
                      />
                    </div>
                    <label className="inline-flex items-center gap-1 text-xs sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={p.requiresWaiver}
                        onChange={(e) => void saveProgram(p.id, { requiresWaiver: e.target.checked })}
                      />
                      Requires waiver CMS flag (checkout still always asks waiver, medical, photo)
                    </label>
                    <p className="text-[11px] text-[#5A6070] font-mono sm:col-span-2">
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
                ) : null}
              </div>
              </>
              ) : null}
            </div>
          ))}
          {dragId && visiblePrograms.length > 0 ? (
            <div
              className={`h-10 rounded-lg border border-dashed text-center text-xs leading-10 ${
                dropIndex === visiblePrograms.length
                  ? 'border-[var(--brand-green)] text-[var(--brand-green)]'
                  : 'border-[var(--border)] text-[#5A6070]'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDropIndex(visiblePrograms.length)
              }}
              onDrop={(e) => {
                e.preventDefault()
                commitDragToIndex(visiblePrograms.length)
              }}
            >
              Drop here for last (position {visiblePrograms.length} of {visiblePrograms.length})
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'roster' ? (
        <div className="space-y-4">
          <p className="text-xs text-[#5A6070] whitespace-pre-line">
            {`Who is enrolled or waitlisted.\nEdit actions: promote, transfer, refund, cancel.\nSafety details stay collapsed until you open them.`}
          </p>
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

          <div
            className="rounded-xl border p-4 space-y-3"
            style={{
              backgroundColor: '#0f3d1f',
              borderColor: '#1a5c2e',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <p
                className="text-base font-semibold tracking-wide"
                style={{ color: '#e8f5e9', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              >
                Class chalkboard
              </p>
              <p
                className="text-xs mt-1 whitespace-pre-line"
                style={{ color: '#a8c9b0' }}
              >
                {`Post a short class summary.
Parents see it in their portal Messages and on the class board.`}
              </p>
            </div>
            <input
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              placeholder="Subject"
              disabled={!rosterProgramId}
              className="w-full rounded-lg px-3 py-2 text-sm border border-[#2d6b3f] bg-[#0b3319] text-[#f1f8f2] placeholder:text-[#7fa88a]"
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="What happened in class today?"
              rows={4}
              disabled={!rosterProgramId}
              className="w-full rounded-lg px-3 py-2 text-sm border border-[#2d6b3f] bg-[#0b3319] text-[#f1f8f2] placeholder:text-[#7fa88a] whitespace-pre-line"
            />
            <Button
              disabled={busy || !rosterProgramId || !msgSubject.trim() || !msgBody.trim()}
              onClick={() => void postToClassBoard()}
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              Post to class
            </Button>
            {rosterProgramId ? (
              <div className="pt-2 space-y-2 border-t border-[#2d6b3f]">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a8c9b0' }}>
                  Recent posts
                </p>
                {boardPosts.length === 0 ? (
                  <p className="text-xs" style={{ color: '#7fa88a' }}>
                    No chalkboard posts yet.
                  </p>
                ) : (
                  boardPosts.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg px-3 py-2 space-y-0.5"
                      style={{ backgroundColor: 'rgba(11,51,25,0.7)' }}
                    >
                      <p className="text-xs" style={{ color: '#7fa88a' }}>
                        {p.sentAt
                          ? new Date(p.sentAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Date TBA'}
                        {p.fromName ? ` · ${p.fromName}` : ''}
                      </p>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: '#e8f5e9', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                      >
                        {p.subject}
                      </p>
                      <p className="text-xs whitespace-pre-line line-clamp-3" style={{ color: '#c5e0cb' }}>
                        {p.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'attendance' ? (
        <div className="space-y-4">
          <p className="text-xs text-[#5A6070] whitespace-pre-line">
            {`Mark Present / Absent / Late / CheckedOut for one program and date.\nSaves to CMS. Does not change enrollment status.`}
          </p>
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
        <div className="space-y-4">
          <p className="text-xs text-[#5A6070] whitespace-pre-line">
            {`Season schedule table (what instructors share).
Edit cells here or on the Programs card. Click out to save.
Use Planning calendar below to overlay LCPS or other school calendars.`}
          </p>
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
          </div>
          <StaffProgramsCalendarPlanner programs={visiblePrograms} />
        </div>
      ) : null}
    </section>
  )
}
