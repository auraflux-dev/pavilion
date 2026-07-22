'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffFlyerUpload } from '@/components/staff/staff-flyer-upload'

type Program = {
  id: string
  name: string
  description: string
  fee: number
  capacity: number
  registrationOpen: boolean
  cheddarupUrl: string
  grades: string
  featured: boolean
  schedule: string
  image: string
  dayOfWeek: string
  classTime: string
  durationWeeks: number
  startDate: string
  endDate: string
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
}

export function StaffProgramsPanel() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [canManageAll, setCanManageAll] = useState(true)
  const [tab, setTab] = useState<'programs' | 'sessions' | 'roster'>('programs')
  const [rosterProgramId, setRosterProgramId] = useState('')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
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

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/programs')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setPrograms(d.programs ?? [])
      setSessions(d.sessions ?? [])
      setCanManageAll(d.canManageAll !== false)
      if (!rosterProgramId && (d.programs ?? [])[0]?.id) {
        setRosterProgramId(d.programs[0].id)
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [rosterProgramId])

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

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (tab === 'roster') void loadRoster(rosterProgramId)
  }, [tab, rosterProgramId, loadRoster])

  async function patchProgram(id: string, body: Record<string, unknown>) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'program', id, ...body }),
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
      setStatus('Enrollment updated.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
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

  function exportCsv() {
    const header = 'studentName,parentEmail,status,feePaid,enrolledAt,waitlistPosition'
    const lines = enrollments.map((e) =>
      [e.studentName, e.parentEmail, e.status, e.feePaid, e.enrolledAt ?? '', e.waitlistPosition ?? '']
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

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Programs & sessions</h2>
        <p className="text-xs text-[#5A6070]">
          {canManageAll
            ? 'Open/close registration, manage roster/waitlist, sessions, and message a class.'
            : 'Your assigned programs — roster, waitlist, sessions, and class messages.'}
        </p>
        {canManageAll ? (
          <button
            type="button"
            className="text-[11px] underline font-semibold"
            style={{ color: '#085508' }}
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setStatus('')
                try {
                  const r = await fetch('/api/staff/cms/ensure-fields', { method: 'POST' })
                  const d = await r.json()
                  if (!r.ok) throw new Error(d.error ?? 'Could not ensure CMS fields')
                  setStatus('CMS schedule/flyer fields are ready.')
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Could not ensure CMS fields')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Ensure CMS fields (day/time/dates/flyer)
          </button>
        ) : null}
      </div>
      <div className="inline-flex rounded-lg border border-[#E8E4DC] overflow-hidden text-sm">
        {(['programs', 'sessions', 'roster'] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={`px-3 py-1.5 capitalize ${tab === id ? 'bg-[#085508] text-white' : 'bg-white'}`}
            onClick={() => setTab(id)}
          >
            {id}
          </button>
        ))}
      </div>

      {tab === 'programs' ? (
        <div className="space-y-3">
          {programs.length === 0 ? (
            <p className="text-sm text-[#5A6070]">
              No programs in your scope. Ask an admin to assign program IDs on your StaffRoles row.
            </p>
          ) : null}
          {programs.map((p) => (
            <div key={p.id} className="border border-[#E8E4DC] rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-[#5A6070]">
                    ${p.fee} · grades {p.grades || '—'} · seats{' '}
                    {p.capacity
                      ? `${p.seatsTaken ?? 0}/${p.capacity}${
                          p.seatsRemaining != null ? ` (${p.seatsRemaining} open)` : ''
                        }`
                      : 'unlimited'}
                  </p>
                  {canManageAll ? (
                    <p className="text-[11px] text-[#5A6070] mt-0.5 font-mono">
                      ID{' '}
                      <button
                        type="button"
                        className="underline"
                        style={{ color: '#085508' }}
                        onClick={() => {
                          void navigator.clipboard.writeText(p.id)
                          setStatus(`Copied program ID for ${p.name}`)
                        }}
                      >
                        {p.id}
                      </button>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {canManageAll ? (
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={p.registrationOpen}
                        disabled={busy}
                        onChange={(e) => void patchProgram(p.id, { registrationOpen: e.target.checked })}
                      />
                      Registration open
                    </label>
                  ) : (
                    <span className="text-[#5A6070]">
                      Registration {p.registrationOpen ? 'open' : 'closed'}
                    </span>
                  )}
                  {canManageAll ? (
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={p.featured}
                        disabled={busy}
                        onChange={(e) => void patchProgram(p.id, { featured: e.target.checked })}
                      />
                      Featured
                    </label>
                  ) : null}
                  <button
                    type="button"
                    className="underline font-semibold"
                    style={{ color: '#085508' }}
                    onClick={() => {
                      setRosterProgramId(p.id)
                      setTab('roster')
                    }}
                  >
                    Roster
                  </button>
                </div>
              </div>
              {canManageAll ? (
                <input
                  defaultValue={p.cheddarupUrl}
                  placeholder="CheddarUp URL"
                  className="w-full border border-[#E8E4DC] rounded-lg px-3 py-1.5 text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== p.cheddarupUrl) {
                      void patchProgram(p.id, { cheddarupUrl: e.target.value })
                    }
                  }}
                />
              ) : null}

              <div className="grid sm:grid-cols-2 gap-2 pt-1">
                <input
                  defaultValue={p.dayOfWeek}
                  placeholder="Day of week (e.g. Tuesdays)"
                  className="border border-[#E8E4DC] rounded-lg px-3 py-1.5 text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== p.dayOfWeek) {
                      void patchProgram(p.id, { dayOfWeek: e.target.value })
                    }
                  }}
                />
                <input
                  defaultValue={p.classTime}
                  placeholder="Class time (e.g. 3:30–4:30 PM)"
                  className="border border-[#E8E4DC] rounded-lg px-3 py-1.5 text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== p.classTime) {
                      void patchProgram(p.id, { classTime: e.target.value })
                    }
                  }}
                />
                <input
                  type="number"
                  min={0}
                  defaultValue={p.durationWeeks || ''}
                  placeholder="Weeks"
                  className="border border-[#E8E4DC] rounded-lg px-3 py-1.5 text-xs"
                  onBlur={(e) => {
                    const next = Number(e.target.value) || 0
                    if (next !== (p.durationWeeks || 0)) {
                      void patchProgram(p.id, { durationWeeks: next })
                    }
                  }}
                />
                <input
                  type="date"
                  defaultValue={p.startDate || ''}
                  className="border border-[#E8E4DC] rounded-lg px-3 py-1.5 text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== (p.startDate || '')) {
                      void patchProgram(p.id, { startDate: e.target.value })
                    }
                  }}
                />
                <input
                  type="date"
                  defaultValue={p.endDate || ''}
                  className="border border-[#E8E4DC] rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                  onBlur={(e) => {
                    if (e.target.value !== (p.endDate || '')) {
                      void patchProgram(p.id, { endDate: e.target.value })
                    }
                  }}
                />
              </div>
              <p className="text-[11px] text-[#5A6070]">
                Parents see day, time, weeks, and date range on the program card before they register.
              </p>
              <StaffFlyerUpload
                label="Program flyer"
                currentUrl={p.image}
                disabled={busy}
                onUploaded={(url) => void patchProgram(p.id, { image: url })}
              />
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'sessions' ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#E8E4DC] p-3 space-y-2 bg-[#FAFAF8]">
            <p className="text-xs font-bold text-[#5A6070]">Add session</p>
            <select
              value={sessionForm.programId}
              onChange={(e) => {
                const p = programs.find((x) => x.id === e.target.value)
                setSessionForm((f) => ({
                  ...f,
                  programId: e.target.value,
                  programName: p?.name ?? '',
                  title: f.title || p?.name || '',
                }))
              }}
              className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              value={sessionForm.title}
              onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Session title"
              className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={sessionForm.startAt}
                onChange={(e) => setSessionForm((f) => ({ ...f, startAt: e.target.value }))}
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={sessionForm.endAt}
                onChange={(e) => setSessionForm((f) => ({ ...f, endAt: e.target.value }))}
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={sessionForm.location}
                onChange={(e) => setSessionForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Location"
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={sessionForm.instructorName}
                onChange={(e) => setSessionForm((f) => ({ ...f, instructorName: e.target.value }))}
                placeholder="Instructor"
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <Button
              disabled={busy || !sessionForm.programName || !sessionForm.title}
              onClick={() => void addSession()}
              className="text-white"
              style={{ backgroundColor: '#085508' }}
            >
              Add session
            </Button>
          </div>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="border-t border-[#F0EBE3] pt-2 text-sm">
                <p className="font-semibold">
                  {s.title} · {s.programName}
                </p>
                <p className="text-xs text-[#5A6070]">
                  {s.startAt ? new Date(s.startAt).toLocaleString() : 'No start'}
                  {s.location ? ` · ${s.location}` : ''}
                  {s.instructorName ? ` · ${s.instructorName}` : ''}
                  {!s.active ? ' · inactive' : ''}
                </p>
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
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select program…</option>
            {programs.map((p) => (
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
          <div className="space-y-2 max-h-80 overflow-auto">
            {enrollments.map((e) => (
              <div
                key={e.id}
                className="border border-[#E8E4DC] rounded-lg p-2 text-sm flex flex-wrap justify-between gap-2"
              >
                <div>
                  <p className="font-semibold">{e.studentName || 'Student'}</p>
                  <p className="text-xs text-[#5A6070]">
                    {e.parentEmail} · {e.status}
                    {e.waitlistPosition ? ` #${e.waitlistPosition}` : ''}
                    {e.feePaid ? ` · $${e.feePaid}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  {e.status === 'Waitlisted' ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="underline font-semibold"
                      style={{ color: '#085508' }}
                      onClick={() => void updateEnrollment(e.id, 'Enrolled')}
                    >
                      Promote
                    </button>
                  ) : null}
                  {e.status !== 'Cancelled' ? (
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
            ))}
            {rosterProgramId && enrollments.length === 0 ? (
              <p className="text-sm text-[#5A6070]">No enrollments yet.</p>
            ) : null}
          </div>

          <div className="rounded-lg border border-[#E8E4DC] p-3 space-y-2 bg-[#FAFAF8]">
            <p className="text-xs font-bold text-[#5A6070]">Message this class</p>
            <input
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Message to enrolled + waitlisted parents (portal inbox)"
              rows={4}
              className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
            <Button
              disabled={busy || !rosterProgramId || !msgSubject.trim() || !msgBody.trim()}
              onClick={() => void messageClass()}
              className="text-white"
              style={{ backgroundColor: '#085508' }}
            >
              Send to class
            </Button>
          </div>
        </div>
      ) : null}

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
