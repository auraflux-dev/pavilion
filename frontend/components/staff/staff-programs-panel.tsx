'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

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

export function StaffProgramsPanel() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [tab, setTab] = useState<'programs' | 'sessions'>('programs')
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
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Programs & sessions</h2>
        <p className="text-xs text-[#5A6070]">
          Open/close registration, feature on homepage, and add calendar sessions.
        </p>
      </div>
      <div className="inline-flex rounded-lg border border-[#E8E4DC] overflow-hidden text-sm">
        {(['programs', 'sessions'] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={`px-3 py-1.5 ${tab === id ? 'bg-[#085508] text-white' : 'bg-white'}`}
            onClick={() => setTab(id)}
          >
            {id === 'programs' ? 'Programs' : 'Sessions'}
          </button>
        ))}
      </div>

      {tab === 'programs' ? (
        <div className="space-y-3">
          {programs.map((p) => (
            <div key={p.id} className="border border-[#E8E4DC] rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-[#5A6070]">
                    ${p.fee} · grades {p.grades || '—'} · cap {p.capacity || '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={p.registrationOpen}
                      disabled={busy}
                      onChange={(e) => void patchProgram(p.id, { registrationOpen: e.target.checked })}
                    />
                    Registration open
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={p.featured}
                      disabled={busy}
                      onChange={(e) => void patchProgram(p.id, { featured: e.target.checked })}
                    />
                    Featured
                  </label>
                </div>
              </div>
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
            </div>
          ))}
        </div>
      ) : (
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
      )}
      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
