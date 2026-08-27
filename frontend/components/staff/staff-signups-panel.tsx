'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { SignupRegistration } from '@/lib/signups/registrations'
import type { SignupSheetSummary, SignupSlotType } from '@/lib/signups/types'

type SlotDraft = {
  slotType: SignupSlotType
  title: string
  description: string
  quantityNeeded: string
  itemUnit: string
  startsAt: string
  endsAt: string
}

const emptySlot = (): SlotDraft => ({
  slotType: 'quantity',
  title: '',
  description: '',
  quantityNeeded: '1',
  itemUnit: '',
  startsAt: '',
  endsAt: '',
})

const emptyForm = {
  title: '',
  description: '',
  location: '',
  startsAt: '',
  endsAt: '',
  status: 'draft' as 'draft' | 'published',
}

export function StaffSignupsPanel() {
  const [sheets, setSheets] = useState<SignupSheetSummary[]>([])
  const [configured, setConfigured] = useState(true)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [slots, setSlots] = useState<SlotDraft[]>([emptySlot()])
  const [rosterSheetId, setRosterSheetId] = useState<string | null>(null)
  const [roster, setRoster] = useState<SignupRegistration[]>([])
  const [rosterTitle, setRosterTitle] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/signups/sheets')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    setConfigured(d.configured !== false)
    setSheets(d.sheets ?? [])
    setNote(d.note ?? '')
  }, [])

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  async function patchSheetStatus(id: string, next: 'draft' | 'published' | 'closed') {
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`/api/staff/signups/sheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setFlash(`Updated “${d.sheet.title}” → ${next}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function openRoster(id: string, title: string) {
    setRosterSheetId(id)
    setRosterTitle(title)
    setError('')
    try {
      const r = await fetch(`/api/staff/signups/sheets/${id}/registrations`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setRoster(d.registrations ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed')
    }
  }

  function addSlot() {
    setSlots((prev) => [...prev, emptySlot()])
  }

  function updateSlot(index: number, patch: Partial<SlotDraft>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function removeSlot(index: number) {
    setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function save() {
    setBusy(true)
    setFlash('')
    setError('')
    try {
      const payload = {
        ...form,
        slots: slots
          .filter((s) => s.title.trim())
          .map((s) => ({
            slotType: s.slotType,
            title: s.title.trim(),
            description: s.description.trim(),
            quantityNeeded: Math.max(1, Number(s.quantityNeeded) || 1),
            itemUnit: s.itemUnit.trim(),
            startsAt: s.startsAt || null,
            endsAt: s.endsAt || null,
          })),
      }
      const r = await fetch('/api/staff/signups/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setFlash(`Created “${d.sheet.title}”. Public path: ${d.sheet.publicPath}`)
      setShowForm(false)
      setForm(emptyForm)
      setSlots([emptySlot()])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-sm text-[#5A6070]">
        <p className="font-semibold text-[#1A1A1A]">Sign-up sheets (Pavilion platform)</p>
        <p className="mt-2 whitespace-pre-line">{note}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Sign-up sheets</h2>
          <p className="text-sm text-[#5A6070] mt-1">{note}</p>
        </div>
        <Button type="button" onClick={() => setShowForm(true)}>
          New sign-up sheet
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-[#FFF1F0] px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {flash ? (
        <div className="rounded-lg border border-[var(--border)] bg-[#F0FAF4] px-4 py-3 text-sm text-[#1A1A1A] whitespace-pre-line">
          {flash}
        </div>
      ) : null}

      {showForm ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-5">
          <h3 className="font-semibold text-[#1A1A1A]">Create sign-up sheet</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="font-medium">Title</span>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Spring carnival volunteers"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium">Description</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Location</span>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Status</span>
              <select
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'draft' | 'published' })
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published (share link)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Event starts</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Event ends</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium text-[#1A1A1A]">Slots / items</h4>
              <Button type="button" variant="outline" size="sm" onClick={addSlot}>
                Add slot
              </Button>
            </div>
            <p className="text-xs text-[#5A6070]">
              Time = shift window · Item = bring something · Quantity = need N volunteers or units
            </p>
            {slots.map((slot, index) => (
              <div
                key={index}
                className="rounded-lg border border-[var(--border)] p-4 grid gap-3 md:grid-cols-2"
              >
                <label className="block text-sm">
                  <span className="font-medium">Type</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                    value={slot.slotType}
                    onChange={(e) =>
                      updateSlot(index, { slotType: e.target.value as SignupSlotType })
                    }
                  >
                    <option value="quantity">Quantity (volunteers / count)</option>
                    <option value="time">Time slot</option>
                    <option value="item">Item to bring</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Title</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                    value={slot.title}
                    onChange={(e) => updateSlot(index, { title: e.target.value })}
                    placeholder={
                      slot.slotType === 'item' ? 'Bring ice' : 'Setup crew (5 needed)'
                    }
                  />
                </label>
                {slot.slotType === 'quantity' || slot.slotType === 'item' ? (
                  <>
                    <label className="block text-sm">
                      <span className="font-medium">Quantity needed</span>
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                        value={slot.quantityNeeded}
                        onChange={(e) => updateSlot(index, { quantityNeeded: e.target.value })}
                      />
                    </label>
                    {slot.slotType === 'item' ? (
                      <label className="block text-sm">
                        <span className="font-medium">Unit label</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                          value={slot.itemUnit}
                          onChange={(e) => updateSlot(index, { itemUnit: e.target.value })}
                          placeholder="bags, trays, volunteers"
                        />
                      </label>
                    ) : null}
                  </>
                ) : (
                  <>
                    <label className="block text-sm">
                      <span className="font-medium">Slot starts</span>
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                        value={slot.startsAt}
                        onChange={(e) => updateSlot(index, { startsAt: e.target.value })}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">Slot ends</span>
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                        value={slot.endsAt}
                        onChange={(e) => updateSlot(index, { endsAt: e.target.value })}
                      />
                    </label>
                  </>
                )}
                <label className="block text-sm md:col-span-2">
                  <span className="font-medium">Notes</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                    value={slot.description}
                    onChange={(e) => updateSlot(index, { description: e.target.value })}
                  />
                </label>
                <div className="md:col-span-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSlot(index)}>
                    Remove slot
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#5A6070]">
            Default participant fields: name, email, phone. Publish to share the public claim link.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Create sheet'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F5F0] text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Slots</th>
              <th className="px-4 py-2 font-medium">Sign-ups</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sheets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-[#5A6070]">
                  No sign-up sheets yet.
                </td>
              </tr>
            ) : (
              sheets.map((sheet) => (
                <tr key={sheet.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{sheet.title}</td>
                  <td className="px-4 py-3 capitalize">{sheet.status}</td>
                  <td className="px-4 py-3">{sheet.slotCount}</td>
                  <td className="px-4 py-3">{sheet.registrationCount}</td>
                  <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                    {sheet.status !== 'published' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void patchSheetStatus(sheet.id, 'published')}
                      >
                        Publish
                      </Button>
                    ) : (
                      <Link href={sheet.publicPath} className="underline text-sm" target="_blank">
                        Open
                      </Link>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void openRoster(sheet.id, sheet.title)}
                    >
                      Roster
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rosterSheetId ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-[#1A1A1A]">Roster — {rosterTitle}</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => setRosterSheetId(null)}>
              Close
            </Button>
          </div>
          {roster.length === 0 ? (
            <p className="text-sm text-[#5A6070]">No sign-ups yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[#5A6070]">
                <tr>
                  <th className="py-1 font-medium">Name</th>
                  <th className="py-1 font-medium">Email</th>
                  <th className="py-1 font-medium">Slot</th>
                  <th className="py-1 font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    <td className="py-2">{row.participantName}</td>
                    <td className="py-2">{row.participantEmail}</td>
                    <td className="py-2">{row.slotTitle}</td>
                    <td className="py-2">{row.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  )
}
