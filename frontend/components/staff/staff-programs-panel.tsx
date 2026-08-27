'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StaffFlyerUpload } from '@/components/staff/staff-flyer-upload'
import { StaffVideoUpload } from '@/components/staff/staff-video-upload'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import {
  formatMemberPriorityUntil,
  toDatetimeLocalValue,
} from '@/lib/programs/registration-access-shared'
import { Fall2026EpSchedule } from '@/components/programs/fall-2026-ep-schedule'
import { StaffProgramsCalendarPlanner } from '@/components/staff/staff-programs-calendar-planner'
import {
  selectCurrentFall2026Programs,
} from '@/lib/programs/fall-2026-ep'
import {
  selectCurrentSpring2027Programs,
} from '@/lib/programs/spring-2027-ep'
import { programPublicPath } from '@/lib/programs/public-path'
import {
  CATALOG_SEASON_LABELS,
  filterProgramsBySeason,
  resolveProgramSeason,
  STAFF_SEASON_OPTIONS,
  type CatalogSeasonId,
  type PublicCatalogSeasonId,
} from '@/lib/programs/season'
import {
  effectiveLandingFields,
} from '@/lib/programs/landing-fields'
import {
  isProgramDraftDirty,
  mergeProgramDraft,
  programDraftPatch,
} from '@/lib/staff/program-draft'
import {
  EP_MEETING_DATES_APPROVED_KEY,
  EP_MEETING_DATES_PROPOSED_LABEL,
} from '@/lib/programs/ep-meeting-dates-shared'

type Program = {
  id: string
  name: string
  description: string
  fee: number
  /** Wix Stores catalog product for list tuition */
  productId: string
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
  landingEyebrow: string
  landingPitch: string
  landingHighlights: string
  landingVideoUrl: string
  landingCurriculumTitle: string
  landingCurriculum: string
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

function selectStaffSeasonPrograms<T extends { id: string; name: string; fallEpClassId?: string; startDate?: string; endDate?: string; registrationOpen?: boolean; featured?: boolean; season?: string; tags?: string }>(
  programs: T[],
  season: PublicCatalogSeasonId,
  showOlder: boolean,
): T[] {
  if (showOlder) return filterProgramsBySeason(programs, season)
  return season === 'spring-2027'
    ? selectCurrentSpring2027Programs(programs)
    : selectCurrentFall2026Programs(programs)
}

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
  const [programDrafts, setProgramDrafts] = useState<Record<string, Partial<Program>>>({})
  const [showOlderPrograms, setShowOlderPrograms] = useState(false)
  const [staffCatalogSeason, setStaffCatalogSeason] = useState<PublicCatalogSeasonId>('fall-2026')
  const [meetingDatesApproved, setMeetingDatesApproved] = useState(false)
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
    const pool = showOlderPrograms
      ? sortProgramsByDisplayOrder(filterProgramsBySeason(programs, staffCatalogSeason))
      : sortProgramsByDisplayOrder(selectStaffSeasonPrograms(programs, staffCatalogSeason, false))

    if (visibleIdOrder.length === 0) return pool

    const poolById = new Map(pool.map((p) => [p.id, p]))
    const ordered = visibleIdOrder.map((id) => poolById.get(id)).filter(Boolean) as Program[]
    // Stale order (e.g. before programs finished loading): show the current pool.
    if (ordered.length === 0) return pool
    for (const p of pool) {
      if (!ordered.some((row) => row.id === p.id)) ordered.push(p)
    }
    return ordered
  }, [programs, showOlderPrograms, staffCatalogSeason, visibleIdOrder])

  useEffect(() => {
    if (programs.length === 0 || dragId) return
    const pool = showOlderPrograms
      ? sortProgramsByDisplayOrder(filterProgramsBySeason(programs, staffCatalogSeason))
      : sortProgramsByDisplayOrder(selectStaffSeasonPrograms(programs, staffCatalogSeason, false))
    if (pool.length === 0) {
      setVisibleIdOrder([])
      return
    }
    setVisibleIdOrder((prev) => {
      if (prev.length === 0) return pool.map((p) => p.id)
      const poolIds = new Set(pool.map((p) => p.id))
      const kept = prev.filter((id) => poolIds.has(id))
      if (kept.length === 0) return pool.map((p) => p.id)
      for (const p of pool) {
        if (!kept.includes(p.id)) kept.push(p.id)
      }
      return kept
    })
  }, [programs, showOlderPrograms, staffCatalogSeason, dragId])

  const loadMeetingDatesFlag = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/site-settings')
      const d = await r.json()
      if (!r.ok) return
      const raw = String(d.settings?.[EP_MEETING_DATES_APPROVED_KEY] ?? 'false')
        .trim()
        .toLowerCase()
      setMeetingDatesApproved(raw !== '' && raw !== 'false' && raw !== '0' && raw !== 'no')
    } catch {
      /* optional when role cannot read SiteSettings */
    }
  }, [])

  const saveMeetingDatesApproved = useCallback(
    async (next: boolean) => {
      setBusy(true)
      setStatus('')
      const previous = meetingDatesApproved
      setMeetingDatesApproved(next)
      try {
        const r = await fetch('/api/staff/site-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: EP_MEETING_DATES_APPROVED_KEY,
            value: next ? 'true' : 'false',
          }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Could not save meeting-dates flag')
        setStatus(
          next
            ? 'EP meeting nights are published on public pages.'
            : `EP meeting nights set to ${EP_MEETING_DATES_PROPOSED_LABEL}.`,
        )
      } catch (err) {
        setMeetingDatesApproved(previous)
        setStatus(err instanceof Error ? err.message : 'Could not save meeting-dates flag')
      } finally {
        setBusy(false)
      }
    },
    [meetingDatesApproved],
  )

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/programs')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      const list = (d.programs ?? []) as Program[]
      setCanManageAll(d.canManageAll !== false)
      setPrograms(list)
      void loadMeetingDatesFlag()
      setProgramDrafts({})
      setVisibleIdOrder(
        sortProgramsByDisplayOrder(selectStaffSeasonPrograms(list, 'fall-2026', false)).map(
          (p) => p.id,
        ),
      )
      const firstId = list[0]?.id as string | undefined
      if (firstId) {
        setRosterProgramId((prev) => prev || firstId)
        setAttProgramId((prev) => prev || firstId)
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [loadMeetingDatesFlag])

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

  function displayProgram(saved: Program): Program {
    return mergeProgramDraft(saved, programDrafts[saved.id]) as Program
  }

  function patchProgramDraft(id: string, patch: Partial<Program>) {
    setProgramDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch },
    }))
  }

  function discardProgramDraft(id: string) {
    setProgramDrafts((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function changeProgramLocal(id: string, body: Record<string, unknown>) {
    setPrograms((list) =>
      list.map((p) => (p.id === id ? ({ ...p, ...body } as Program) : p)),
    )
  }

  async function saveProgramDraft(id: string) {
    const saved = programs.find((p) => p.id === id)
    if (!saved) return
    const draft = programDrafts[id]
    if (!draft) return
    const normalized = { ...draft }
    if (typeof normalized.description === 'string') {
      normalized.description = normalizePlainCopy(normalized.description)
    }
    if (typeof normalized.detail === 'string') {
      normalized.detail = normalizePlainCopy(normalized.detail)
    }
    if (normalized.memberPriorityUntil === '') {
      normalized.memberPriorityUntil = ''
    }
    const patch = programDraftPatch(saved, normalized)
    if ('memberPriorityUntil' in patch && patch.memberPriorityUntil === '') {
      patch.memberPriorityUntil = null as unknown as string
    }
    if (Object.keys(patch).length === 0) return
    await saveProgram(id, patch as Record<string, unknown>)
  }

  async function saveProgram(id: string, body: Record<string, unknown>) {
    setSavingProgramId(id)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'program', id, ...body }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setPrograms((list) =>
        list.map((p) =>
          p.id === id
            ? ({
                ...p,
                ...body,
                ...(d.productId != null ? { productId: String(d.productId) } : {}),
                ...(d.fee != null ? { fee: Number(d.fee) || 0 } : {}),
              } as Program)
            : p,
        ),
      )
      discardProgramDraft(id)
      setStatus(
        d.catalogSync?.productId
          ? d.catalogSync.created
            ? 'Saved · linked to ecommerce catalog.'
            : 'Saved · catalog price updated.'
          : 'Saved.',
      )
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
          startDate:
            seed?.startDate ||
            (staffCatalogSeason === 'spring-2027' ? '2027-02-02' : '2026-09-15'),
          endDate:
            seed?.endDate ||
            (staffCatalogSeason === 'spring-2027' ? '2027-05-04' : '2026-12-08'),
          dayOfWeek: seed?.dayOfWeek || '',
          classTime: seed?.classTime || '',
          location: seed?.location || vanillaizeIfDemo('School library'),
          grades: seed?.grades || '6-8',
          category: seed?.category || 'Enrichment',
          season: seed?.season || staffCatalogSeason,
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
Roster / Attendance = enrolled families.
Edit fields, then click Save program. www updates within seconds after Save.`}
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
      </div>

      {tab === 'programs' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex flex-wrap rounded-lg border border-[var(--border)] overflow-hidden text-sm">
              {(['fall-2026', 'spring-2027'] as const).map((season) => (
                <button
                  key={season}
                  type="button"
                  className={`px-3 py-1.5 text-xs ${
                    staffCatalogSeason === season ? 'bg-[var(--brand-green)] text-white' : 'bg-white'
                  }`}
                  onClick={() => {
                    setStaffCatalogSeason(season)
                    setShowOlderPrograms(false)
                    setVisibleIdOrder([])
                  }}
                >
                  {CATALOG_SEASON_LABELS[season]} copy
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-[#5A6070]">
              <input
                type="checkbox"
                checked={showOlderPrograms}
                onChange={(e) => {
                  setShowOlderPrograms(e.target.checked)
                  setVisibleIdOrder([])
                }}
              />
              Show all {CATALOG_SEASON_LABELS[staffCatalogSeason]} rows
            </label>
          </div>
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
            {canManageAll ? (
              <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-[var(--border)]"
                  checked={meetingDatesApproved}
                  disabled={busy}
                  onChange={(e) => void saveMeetingDatesApproved(e.target.checked)}
                />
                <span className="leading-snug">
                  <span className="font-semibold text-[#1A1A1A]">Publish EP meeting nights</span>
                  <span className="block text-xs text-[#5A6070]">
                    {meetingDatesApproved
                      ? 'Parents see concrete calendar dates.'
                      : `Parents see “${EP_MEETING_DATES_PROPOSED_LABEL}”.`}
                  </span>
                </span>
              </label>
            ) : null}
            {canManageAll ? (
              <Button
                type="button"
                disabled={busy}
                variant="outline"
                className="text-sm"
                onClick={() => {
                  const label = CATALOG_SEASON_LABELS[staffCatalogSeason]
                  if (
                    !window.confirm(
                      `Ensure ${label} packet?\nCreates any missing classes, then writes locked LCPS meeting dates into CMS.\nDoes not change fees, registration, names, or landing copy.`,
                    )
                  ) {
                    return
                  }
                  void (async () => {
                    setBusy(true)
                    setStatus('')
                    try {
                      const r = await fetch('/api/staff/programs/ensure-packet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ season: staffCatalogSeason }),
                      })
                      const d = await r.json()
                      if (!r.ok) throw new Error(d.error ?? 'Ensure packet failed')
                      setStatus(String(d.message ?? `${label} packet ready.`))
                      await load()
                    } catch (err) {
                      setStatus(err instanceof Error ? err.message : 'Ensure packet failed')
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                Ensure {CATALOG_SEASON_LABELS[staffCatalogSeason]} packet
              </Button>
            ) : null}
          </div>
          {visiblePrograms.length === 0 ? (
            <p className="text-sm text-[#5A6070] whitespace-pre-line">
              {(() => {
                const seasonCount = filterProgramsBySeason(programs, staffCatalogSeason).length
                const label = CATALOG_SEASON_LABELS[staffCatalogSeason]
                if (programs.length === 0) {
                  return `No programs loaded from CMS.\nUse Ensure ${label} packet to create the four class rows.`
                }
                if (seasonCount === 0) {
                  return `CMS has ${programs.length} program${programs.length === 1 ? '' : 's'}, but none resolve as ${label}.\nUse Ensure ${label} packet to create missing class rows.`
                }
                return showOlderPrograms
                  ? `No ${label} programs in your scope.`
                  : `No current ${label} programs yet.\nTurn on “Show all rows” for every CMS row in this season.`
              })()}
            </p>
          ) : null}
          {visiblePrograms.length > 0 ? (
            <p className="text-xs text-[#5A6070] whitespace-pre-line">
              {`Drag the grip to set public catalog order.
There are ${visiblePrograms.length} program${visiblePrograms.length === 1 ? '' : 's'} in this list.`}
            </p>
          ) : null}
          <p className="text-xs text-[#5A6070]">
            Compact list · open <strong>Show editor</strong> on one class at a time (editor replaces the
            previous open row).
          </p>
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
          {visiblePrograms.map((p, index) => {
            const row = displayProgram(p)
            const landing = effectiveLandingFields(row)
            const dirty = isProgramDraftDirty(p, programDrafts[p.id])
            const saving = savingProgramId === p.id
            return (
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
                    {row.registrationOpen ? ' · Reg open' : ' · Reg closed'}
                    {row.featured ? ' · Featured' : ''}
                  </p>
                  <p className="text-sm font-bold text-[#1A1A1A] truncate">{row.name || 'Untitled'}</p>
                  <p className="text-xs text-[#5A6070] mt-1">
                    Seats{' '}
                    {row.capacity
                      ? `${p.seatsTaken ?? 0}/${row.capacity}${
                          p.seatsRemaining != null ? ` (${p.seatsRemaining} open)` : ''
                        }`
                      : 'unlimited'}
                    {dirty ? ' · Unsaved changes' : ''}
                  </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
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
                  {[row.dayOfWeek, row.classTime, row.fee > 0 ? `$${row.fee}` : null, CATALOG_SEASON_LABELS[resolveProgramSeason(row)]]
                    .filter(Boolean)
                    .join(' · ') || 'No schedule yet'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {dirty ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy || saving}
                        onClick={() => void saveProgramDraft(p.id)}
                        className="text-white text-xs h-8"
                        style={{ backgroundColor: 'var(--brand-green)' }}
                      >
                        {saving ? 'Saving…' : 'Save program'}
                      </Button>
                      <button
                        type="button"
                        className="text-xs underline text-[#5A6070]"
                        disabled={busy || saving}
                        onClick={() => discardProgramDraft(p.id)}
                      >
                        Discard
                      </button>
                    </>
                  ) : null}
                  <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: 'var(--brand-green)' }}
                  aria-expanded={Boolean(expandedIds[p.id])}
                  onClick={() =>
                    setExpandedIds((prev) => (prev[p.id] ? {} : { [p.id]: true }))
                  }
                >
                  {expandedIds[p.id] ? (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {expandedIds[p.id] ? 'Hide editor' : 'Show editor'}
                  </button>
                </div>
              </div>
              {expandedIds[p.id] ? (
              <>
              <div className="grid sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--border)]">
                <label className="sm:col-span-2 text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Program name</span>
                  <input
                    value={row.name}
                    aria-label="Program name"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm font-bold text-[#1A1A1A]"
                    onChange={(e) => patchProgramDraft(p.id, { name: e.target.value })}
                  />
                </label>
                <label className="inline-flex items-center gap-1 text-xs text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={row.registrationOpen}
                    onChange={(e) =>
                      patchProgramDraft(p.id, { registrationOpen: e.target.checked })
                    }
                  />
                  Registration open (checkout)
                </label>
                <label className="inline-flex items-center gap-1 text-xs text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={row.featured}
                    onChange={(e) => patchProgramDraft(p.id, { featured: e.target.checked })}
                  />
                  Featured
                </label>
                <label className="sm:col-span-2 inline-flex flex-col gap-0.5 text-[11px] text-[#5A6070]">
                  <span>Paid members only until</span>
                  <input
                    type="datetime-local"
                    className="border border-[var(--border)] rounded px-1.5 py-1 text-xs text-[#1A1A1A] max-w-xs"
                    value={toDatetimeLocalValue(row.memberPriorityUntil)}
                    onChange={(e) =>
                      patchProgramDraft(p.id, {
                        memberPriorityUntil: e.target.value || '',
                      })
                    }
                  />
                  <span className="text-[10px] leading-snug max-w-md">
                    {row.memberPriorityUntil
                      ? `Opens to all after ${formatMemberPriorityUntil(row.memberPriorityUntil)}`
                      : 'Leave blank = open to all signed-in parents when registration is on'}
                  </span>
                </label>
                <div className="sm:col-span-2">
                  <StaffPlainCopyField
                    label="Description"
                    value={row.description}
                    rows={5}
                    saveOnBlur={false}
                    textareaClassName="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(next) => patchProgramDraft(p.id, { description: next })}
                  />
                </div>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Fee ($) · ecommerce catalog</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={row.fee}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => patchProgramDraft(p.id, { fee: Number(e.target.value) || 0 })}
                  />
                  <span className="block text-[10px] text-[#8A90A0] leading-snug">
                    {row.productId
                      ? `Linked catalog product · ${row.productId.slice(0, 8)}…`
                      : 'Save with a fee > 0 to create the Wix Stores catalog SKU (same place as memberships).'}
                  </span>
                  {row.fee > 0 ? (
                    <button
                      type="button"
                      className="mt-1 text-[10px] font-medium text-[var(--brand)] underline-offset-2 hover:underline"
                      disabled={savingProgramId === p.id}
                      onClick={() =>
                        void saveProgram(p.id, {
                          fee: row.fee,
                          name: row.name,
                          syncCatalog: true,
                        })
                      }
                    >
                      {row.productId ? 'Re-sync catalog price' : 'Create catalog SKU now'}
                    </button>
                  ) : null}
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Capacity (0 = unlimited)</span>
                  <input
                    type="number"
                    min={0}
                    value={row.capacity}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) =>
                      patchProgramDraft(p.id, { capacity: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Grades</span>
                  <input
                    value={row.grades}
                    placeholder="e.g. 6-8"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => patchProgramDraft(p.id, { grades: e.target.value })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5">
                  <span>Category</span>
                  <input
                    value={row.category}
                    placeholder="e.g. Enrichment"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                    onChange={(e) => patchProgramDraft(p.id, { category: e.target.value })}
                  />
                </label>
                <label className="text-[11px] text-[#5A6070] space-y-0.5 sm:col-span-2">
                  <span>Catalog season</span>
                  <select
                    value={resolveProgramSeason(row)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] bg-white"
                    onChange={(e) => {
                      patchProgramDraft(p.id, { season: e.target.value as CatalogSeasonId })
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
                  value={row.instructorName}
                  placeholder="Instructor / vendor"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                  onChange={(e) => patchProgramDraft(p.id, { instructorName: e.target.value })}
                />
                <input
                  value={row.location}
                  placeholder="Room / location"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                  onChange={(e) => patchProgramDraft(p.id, { location: e.target.value })}
                />
                <input
                  value={row.dayOfWeek}
                  placeholder="Day of week (e.g. Tuesdays)"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) => patchProgramDraft(p.id, { dayOfWeek: e.target.value })}
                />
                <input
                  value={row.classTime}
                  placeholder="Class time (e.g. 3:30 to 4:30 PM)"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) => patchProgramDraft(p.id, { classTime: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  value={row.durationWeeks || ''}
                  placeholder="Weeks"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) =>
                    patchProgramDraft(p.id, { durationWeeks: Number(e.target.value) || 0 })
                  }
                />
                <input
                  type="date"
                  value={row.startDate || ''}
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) => patchProgramDraft(p.id, { startDate: e.target.value })}
                />
                <input
                  type="date"
                  value={row.endDate || ''}
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                  onChange={(e) => patchProgramDraft(p.id, { endDate: e.target.value })}
                />
                <input
                  value={row.skipsNote}
                  placeholder="Skip / holiday note"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                  onChange={(e) => patchProgramDraft(p.id, { skipsNote: e.target.value })}
                />
                <input
                  value={row.memberDiscountNote}
                  placeholder="Member discount note (under fee on /programs cards)"
                  className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                  onChange={(e) => patchProgramDraft(p.id, { memberDiscountNote: e.target.value })}
                />
              </div>
              <div className="border-t border-[var(--border)] pt-3 space-y-2">
                <p className="text-[11px] font-semibold text-[#1A1A1A]">
                  Landing page ({programPublicPath(row)})
                </p>
                <p className="text-[10px] text-[#5A6070] whitespace-pre-line">
                  {`${CATALOG_SEASON_LABELS[resolveProgramSeason(row)]} only. Empty CMS fields use code defaults until Save.
Curriculum: one week|title|focus per line.`}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    value={landing.landingEyebrow}
                    placeholder="Landing eyebrow"
                    className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                    onChange={(e) => patchProgramDraft(p.id, { landingEyebrow: e.target.value })}
                  />
                  <StaffPlainCopyField
                    label="Landing pitch"
                    value={landing.landingPitch}
                    rows={3}
                    saveOnBlur={false}
                    textareaClassName="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] sm:col-span-2"
                    onChange={(next) => patchProgramDraft(p.id, { landingPitch: next })}
                  />
                  <StaffPlainCopyField
                    label="Highlights (one per line)"
                    value={landing.landingHighlights}
                    rows={4}
                    saveOnBlur={false}
                    textareaClassName="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] sm:col-span-2"
                    onChange={(next) => patchProgramDraft(p.id, { landingHighlights: next })}
                  />
                  <StaffVideoUpload
                    currentUrl={landing.landingVideoUrl}
                    onUploaded={({ url }) => patchProgramDraft(p.id, { landingVideoUrl: url })}
                    onClear={() => patchProgramDraft(p.id, { landingVideoUrl: '' })}
                  />
                  <input
                    value={landing.landingCurriculumTitle}
                    placeholder="Curriculum section title"
                    className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                    onChange={(e) =>
                      patchProgramDraft(p.id, { landingCurriculumTitle: e.target.value })
                    }
                  />
                  <StaffPlainCopyField
                    label="Curriculum weeks"
                    value={landing.landingCurriculum}
                    rows={6}
                    saveOnBlur={false}
                    textareaClassName="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[#1A1A1A] sm:col-span-2"
                    onChange={(next) => patchProgramDraft(p.id, { landingCurriculum: next })}
                  />
                </div>
              </div>
              <StaffFlyerUpload
                label="Program flyer"
                currentUrl={row.image}
                disabled={false}
                onUploaded={(media) => void saveProgram(p.id, { image: media.url })}
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
                        value={row.cheddarupUrl}
                        placeholder="Leave blank unless using Cheddar Up"
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                        onChange={(e) => patchProgramDraft(p.id, { cheddarupUrl: e.target.value })}
                      />
                    </label>
                    <label className="text-[11px] text-[#5A6070] space-y-0.5">
                      <span>Payment type</span>
                      <input
                        value={row.paymentType}
                        placeholder="wix / cheddarup_installment / cheddarup_p2p"
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                        onChange={(e) => patchProgramDraft(p.id, { paymentType: e.target.value })}
                      />
                    </label>
                    <label className="text-[11px] text-[#5A6070] space-y-0.5">
                      <span>Sort order number</span>
                      <input
                        type="number"
                        value={row.sortOrder}
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                        onChange={(e) =>
                          patchProgramDraft(p.id, { sortOrder: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                    <label className="text-[11px] text-[#5A6070] space-y-0.5 sm:col-span-2">
                      <span>Tags (comma-separated)</span>
                      <input
                        value={row.tags}
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                        onChange={(e) => patchProgramDraft(p.id, { tags: e.target.value })}
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <StaffPlainCopyField
                        label="Detail (extra copy)"
                        value={row.detail}
                        rows={4}
                        saveOnBlur={false}
                        textareaClassName="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A]"
                        onChange={(next) => patchProgramDraft(p.id, { detail: next })}
                      />
                    </div>
                    <label className="inline-flex items-center gap-1 text-xs sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={row.requiresWaiver}
                        onChange={(e) =>
                          patchProgramDraft(p.id, { requiresWaiver: e.target.checked })
                        }
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
            )
          })}
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
