'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Minute = {
  id: string
  committee: string
  meetingDate: string
  joinUrl: string
  minutesContent: string
  summary: string
  takeaways: string
  callToAction: string
  isUpcoming: boolean
  published: boolean
}

export function StaffMinutesPanel() {
  const [minutes, setMinutes] = useState<Minute[]>([])
  const [committees, setCommittees] = useState<string[]>(['PTO', 'SEAC', 'MSAAC', 'LEAF'])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Minute | null>(null)
  const [form, setForm] = useState({
    committee: 'PTO',
    meetingDate: '',
    joinUrl: '',
    summary: '',
    minutesContent: '',
    takeaways: '',
    callToAction: '',
    isUpcoming: false,
    published: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/staff/minutes?all=true')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setMinutes(d.minutes ?? [])
      if (d.committees) setCommittees(d.committees)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function startNew() {
    setEditing(null)
    setForm({
      committee: 'PTO',
      meetingDate: '',
      joinUrl: '',
      summary: '',
      minutesContent: '',
      takeaways: '',
      callToAction: '',
      isUpcoming: false,
      published: true,
    })
  }

  function startEdit(m: Minute) {
    setEditing(m)
    setForm({
      committee: m.committee,
      meetingDate: m.meetingDate ? m.meetingDate.slice(0, 16) : '',
      joinUrl: m.joinUrl,
      summary: m.summary,
      minutesContent: m.minutesContent,
      takeaways: m.takeaways,
      callToAction: m.callToAction,
      isUpcoming: m.isUpcoming,
      published: m.published,
    })
  }

  async function save() {
    setBusy(true)
    setStatus('')
    try {
      const body = {
        ...form,
        meetingDate: form.meetingDate ? new Date(form.meetingDate).toISOString() : '',
        id: editing?.id,
      }
      const r = await fetch('/api/staff/minutes', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setStatus(editing ? 'Minutes updated.' : 'Minutes published.')
      setEditing(null)
      startNew()
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Meeting minutes</h2>
          <p className="text-xs text-[#5A6070]">Publish PTO / SEAC / MSAAC / LEAF minutes for /meetings.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={startNew}>
          New
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <select
          value={form.committee}
          onChange={(e) => setForm((f) => ({ ...f, committee: e.target.value }))}
          className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        >
          {committees.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={form.meetingDate}
          onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
          className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={form.joinUrl}
          onChange={(e) => setForm((f) => ({ ...f, joinUrl: e.target.value }))}
          placeholder="Join / Zoom URL (optional)"
          className="sm:col-span-2 border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={form.summary}
          onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
          placeholder="Short summary"
          className="sm:col-span-2 border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={form.minutesContent}
          onChange={(e) => setForm((f) => ({ ...f, minutesContent: e.target.value }))}
          rows={5}
          placeholder="Full minutes"
          className="sm:col-span-2 border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={form.takeaways}
          onChange={(e) => setForm((f) => ({ ...f, takeaways: e.target.value }))}
          rows={2}
          placeholder="Takeaways"
          className="sm:col-span-2 border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={form.callToAction}
          onChange={(e) => setForm((f) => ({ ...f, callToAction: e.target.value }))}
          placeholder="Call to action"
          className="sm:col-span-2 border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={form.isUpcoming}
            onChange={(e) => setForm((f) => ({ ...f, isUpcoming: e.target.checked }))}
          />
          Upcoming meeting
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
          />
          Published on site
        </label>
      </div>
      <Button
        disabled={busy || !form.meetingDate}
        onClick={() => void save()}
        className="text-white"
        style={{ backgroundColor: '#085508' }}
      >
        {busy ? 'Saving…' : editing ? 'Save changes' : 'Publish minutes'}
      </Button>

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
      {loading ? <p className="text-xs text-[#5A6070]">Loading…</p> : null}
      <div className="space-y-2">
        {minutes.map((m) => (
          <div key={m.id} className="flex items-start justify-between gap-2 border-t border-[#F0EBE3] pt-2">
            <div>
              <p className="text-sm font-semibold">
                {m.committee} · {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : '—'}
                {!m.published ? ' · draft' : ''}
              </p>
              <p className="text-xs text-[#5A6070]">{m.summary || m.minutesContent.slice(0, 80)}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => startEdit(m)}>
              Edit
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
