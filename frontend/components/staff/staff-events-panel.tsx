'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffFlyerUpload } from '@/components/staff/staff-flyer-upload'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'

import { vanillaizeIfDemo } from '@/lib/demo/brand'

type EventRow = {
  id: string
  title: string
  description: string
  location: string
  startDate: string
  endDate: string
  slug: string
  image: string
}

const emptyForm = {
  title: '',
  description: '',
  location: vanillaizeIfDemo('School building'),
  startDate: '',
  endDate: '',
  registrationType: 'RSVP',
  ticketPrice: '',
  capacity: '',
  draft: false,
}

export function StaffEventsPanel() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/events')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    setEvents(d.events ?? [])
    setNote(d.note ?? '')
  }, [])

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setStatus('')
  }

  function startEdit(e: EventRow) {
    setEditingId(e.id)
    setForm({
      title: e.title,
      description: e.description,
      location: e.location || vanillaizeIfDemo('School building'),
      startDate: e.startDate ? e.startDate.slice(0, 16) : '',
      endDate: e.endDate ? e.endDate.slice(0, 16) : '',
      registrationType: 'RSVP',
      ticketPrice: '',
      capacity: '',
      draft: false,
    })
    setShowForm(true)
    setStatus('')
  }

  async function save() {
    setBusy(true)
    setStatus('')
    setError('')
    try {
      if (editingId) {
        const r = await fetch('/api/staff/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            title: form.title,
            description: normalizePlainCopy(form.description),
            location: form.location,
            startDate: form.startDate,
            endDate: form.endDate || form.startDate,
          }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Update failed')
        setStatus('Event updated.')
      } else {
        const r = await fetch('/api/staff/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: normalizePlainCopy(form.description),
            location: form.location,
            startDate: form.startDate,
            endDate: form.endDate || form.startDate,
            registrationType: form.registrationType,
            ticketPrice: form.ticketPrice ? Number(form.ticketPrice) : 0,
            capacity: form.capacity ? Number(form.capacity) : 0,
            draft: form.draft,
          }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Create failed')
        setStatus(form.draft ? 'Draft event created.' : 'Event published.')
      }
      setShowForm(false)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function cancelEvent(id: string) {
    if (!confirm('Cancel this event? Registration will close.')) return
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'cancel' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Cancel failed')
      setStatus('Event canceled.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setBusy(false)
    }
  }

  async function setEventImage(id: string, url: string) {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, image: url }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not save flyer')
      setStatus('Event flyer updated.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save flyer')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="staff-events"
      className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
    >
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Events</h2>
          <p className="text-xs text-[#5A6070]">
            {note || 'Create and manage events for the public /events page.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
            onClick={startCreate}
          >
            New event
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {status ? <p className="text-sm text-[var(--brand-green)]">{status}</p> : null}

      {showForm ? (
        <div className="rounded-lg border border-[var(--border)] bg-[#FAF8F4] p-4 space-y-3">
          <p className="text-sm font-bold">{editingId ? 'Edit event' : 'Create event'}</p>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
          />
          <StaffPlainCopyField
            label="Description"
            value={form.description}
            rows={3}
            textareaClassName="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
            onChange={(next) => setForm({ ...form, description: next })}
            onCommit={(next) =>
              setForm((f) => ({ ...f, description: normalizePlainCopy(next) }))
            }
          />
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Location"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
          />
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs text-[#5A6070] space-y-1">
              <span>Start</span>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
              />
            </label>
            <label className="text-xs text-[#5A6070] space-y-1">
              <span>End</span>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
              />
            </label>
          </div>
          {!editingId ? (
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={form.registrationType}
                onChange={(e) => setForm({ ...form, registrationType: e.target.value })}
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="RSVP">RSVP (free)</option>
                <option value="TICKETING">Ticketed</option>
              </select>
              {form.registrationType === 'TICKETING' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.ticketPrice}
                    onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
                    placeholder="Ticket price ($)"
                    className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="Capacity (0 = unlimited)"
                    className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ) : null}
              <label className="flex items-center gap-2 text-xs text-[#5A6070]">
                <input
                  type="checkbox"
                  checked={form.draft}
                  onChange={(e) => setForm({ ...form, draft: e.target.checked })}
                />
                Save as draft (not public yet)
              </label>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || !form.title.trim() || !form.startDate}
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
              onClick={() => void save()}
            >
              {editingId ? 'Save changes' : form.draft ? 'Create draft' : 'Publish event'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {events.length === 0 && !error ? (
          <p className="text-sm text-[#5A6070]">No upcoming scheduled events.</p>
        ) : null}
        {events.map((e) => (
          <div
            key={e.id || e.title}
            className="border-t border-[#F0EBE3] pt-3 space-y-2"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{e.title}</p>
                <p className="text-xs text-[#5A6070]">
                  {e.startDate ? new Date(e.startDate).toLocaleString() : 'Date TBA'}
                  {e.location ? ` · ${e.location}` : ''}
                </p>
                {e.description ? (
                  <p className="text-xs text-[#5A6070] mt-1 line-clamp-2">{e.description}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button type="button" variant="outline" className="text-xs" onClick={() => startEdit(e)}>
                  Edit
                </Button>
                {e.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs text-red-700"
                    disabled={busy}
                    onClick={() => void cancelEvent(e.id)}
                  >
                    Cancel event
                  </Button>
                ) : null}
              </div>
            </div>
            {e.id ? (
              <StaffFlyerUpload
                label="Event flyer"
                currentUrl={e.image}
                disabled={busy}
                onUploaded={(url) => void setEventImage(e.id, url)}
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
