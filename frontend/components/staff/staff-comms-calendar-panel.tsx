'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  StaffMonthCalendar,
  eventDayKey,
  type MonthCalendarEvent,
  type MonthCalendarTone,
} from '@/components/staff/staff-month-calendar'
import {
  COMMS_AUDIENCE_LABEL,
  COMMS_AUDIENCES,
  COMMS_CHANNEL_LABEL,
  COMMS_CHANNEL_WORKSPACE,
  COMMS_CHANNELS,
  COMMS_PLANNER_KIND_LABEL,
  COMMS_STATUS_LABEL,
  COMMS_STATUSES,
  CONTENT_CHANNELS,
  addDays,
  defaultKindForChannel,
  formatWeekLabel,
  startOfWeekMonday,
  type CommsAudience,
  type CommsCalendarItem,
  type CommsChannel,
  type CommsPlannerKind,
  type CommsStatus,
} from '@/lib/staff/comms-calendar'

type Props = {
  onOpenWorkspace?: (id: string) => void
}

type LayoutMode = 'month' | 'agenda'
type PlannerTab = CommsPlannerKind

function toLocalInputValue(iso: string): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(local: string): string {
  if (!local.trim()) return ''
  const t = Date.parse(local)
  return Number.isNaN(t) ? '' : new Date(t).toISOString()
}

function formatWhen(iso: string): string {
  if (!iso) return 'No date'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 'No date'
  return new Date(t).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function toneForItem(item: CommsCalendarItem): MonthCalendarTone {
  if (item.status === 'published') return 'green'
  if (item.status === 'cancelled') return 'slate'
  if (item.status === 'review' || item.status === 'scheduled') return 'amber'
  if (item.kind === 'content') return 'blue'
  return 'rose'
}

function defaultChannelForKind(kind: CommsPlannerKind): CommsChannel {
  return kind === 'content' ? 'social' : 'email'
}

export function StaffCommsCalendarPanel({ onOpenWorkspace }: Props) {
  const [items, setItems] = useState<CommsCalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [includeDone, setIncludeDone] = useState(false)
  const [filterAudience, setFilterAudience] = useState<'' | CommsAudience>('')
  const [filterChannel, setFilterChannel] = useState<'' | CommsChannel>('')
  const [plannerTab, setPlannerTab] = useState<PlannerTab>('comms')
  const [layout, setLayout] = useState<LayoutMode>('month')
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audiences, setAudiences] = useState<CommsAudience[]>(['parents'])
  const [channel, setChannel] = useState<CommsChannel>('email')
  const [itemStatus, setItemStatus] = useState<CommsStatus>('idea')
  const [publishLocal, setPublishLocal] = useState('')
  const [assetUrl, setAssetUrl] = useState('')
  const [notes, setNotes] = useState('')

  const weekStart = useMemo(() => {
    const base = startOfWeekMonday()
    return addDays(base, weekOffset * 7)
  }, [weekOffset])
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])

  const load = useCallback(async () => {
    setLoading(true)
    setStatusMsg('')
    try {
      const params = new URLSearchParams()
      if (includeDone) params.set('includeDone', 'true')
      if (filterAudience) params.set('audience', filterAudience)
      if (filterChannel) params.set('channel', filterChannel)
      params.set('kind', plannerTab)
      if (layout === 'month') {
        const wideStart = new Date(month.getFullYear(), month.getMonth(), 1)
        wideStart.setDate(wideStart.getDate() - 7)
        const wideEnd = new Date(month.getFullYear(), month.getMonth() + 1, 8)
        params.set('from', wideStart.toISOString())
        params.set('to', wideEnd.toISOString())
      } else {
        params.set('from', addDays(weekStart, -21).toISOString())
        params.set('to', addDays(weekEnd, 42).toISOString())
      }
      const r = await fetch(`/api/staff/comms-calendar?${params}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load calendar')
      setItems(d.items ?? [])
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Could not load calendar')
    } finally {
      setLoading(false)
    }
  }, [
    includeDone,
    filterAudience,
    filterChannel,
    plannerTab,
    layout,
    month,
    weekStart,
    weekEnd,
  ])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    // When switching planner tab, nudge default channel for new items
    if (!editingId) setChannel(defaultChannelForKind(plannerTab))
  }, [plannerTab, editingId])

  const undated = useMemo(() => items.filter((i) => !i.publishAt), [items])

  const monthEvents: MonthCalendarEvent[] = useMemo(
    () =>
      items
        .filter((i) => i.publishAt)
        .map((i) => ({
          id: i.id,
          date: i.publishAt,
          title: i.title,
          subtitle: `${COMMS_CHANNEL_LABEL[i.channel]} · ${COMMS_STATUS_LABEL[i.status]}`,
          tone: toneForItem(i),
        })),
    [items],
  )

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return []
    return items.filter((i) => i.publishAt && eventDayKey(i.publishAt) === selectedDate)
  }, [items, selectedDate])

  const weekItems = useMemo(() => {
    const startT = weekStart.getTime()
    const endT = weekEnd.getTime()
    return items.filter((i) => {
      if (!i.publishAt) return weekOffset === 0
      const t = Date.parse(i.publishAt)
      return Number.isFinite(t) && t >= startT && t < endT
    })
  }, [items, weekStart, weekEnd, weekOffset])

  const byDay = useMemo(() => {
    const map = new Map<string, CommsCalendarItem[]>()
    for (const item of weekItems) {
      const key = item.publishAt ? new Date(item.publishAt).toISOString().slice(0, 10) : 'undated'
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [weekItems])

  const channelOptions = useMemo(() => {
    if (plannerTab === 'content') {
      return COMMS_CHANNELS.filter((c) => (CONTENT_CHANNELS as readonly string[]).includes(c) || c === 'other')
    }
    return COMMS_CHANNELS.filter((c) => !(CONTENT_CHANNELS as readonly string[]).includes(c) || c === 'other')
  }, [plannerTab])

  function toggleAudience(a: CommsAudience) {
    setAudiences((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))
  }

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setBody('')
    setAudiences(['parents'])
    setChannel(defaultChannelForKind(plannerTab))
    setItemStatus('idea')
    setPublishLocal('')
    setAssetUrl('')
    setNotes('')
  }

  function startEdit(item: CommsCalendarItem) {
    setEditingId(item.id)
    setPlannerTab(item.kind)
    setTitle(item.title)
    setBody(item.body)
    setAudiences(item.audiences.length ? item.audiences : ['parents'])
    setChannel(item.channel)
    setItemStatus(item.status)
    setPublishLocal(toLocalInputValue(item.publishAt))
    setAssetUrl(item.assetUrl)
    setNotes(item.notes)
  }

  function startNewOnDate(isoDate: string) {
    setSelectedDate(isoDate)
    setEditingId(null)
    setTitle('')
    setBody('')
    setAudiences(['parents'])
    setChannel(defaultChannelForKind(plannerTab))
    setItemStatus('scheduled')
    setPublishLocal(`${isoDate}T09:00`)
    setAssetUrl('')
    setNotes('')
  }

  async function saveItem() {
    setBusy(true)
    setStatusMsg('')
    try {
      const payload = {
        title,
        body,
        audiences,
        channel,
        kind: plannerTab,
        status: itemStatus,
        publishAt: fromLocalInputValue(publishLocal),
        assetUrl,
        notes,
      }
      const r = await fetch(
        editingId ? `/api/staff/comms-calendar/${editingId}` : '/api/staff/comms-calendar',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not save')
      resetForm()
      setStatusMsg(editingId ? 'Updated.' : 'Added to the calendar.')
      await load()
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function patchStatus(id: string, status: CommsStatus) {
    setBusy(true)
    setStatusMsg('')
    try {
      const r = await fetch(`/api/staff/comms-calendar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not update')
      setStatusMsg(status === 'published' ? 'Marked published.' : `Status → ${COMMS_STATUS_LABEL[status]}`)
      await load()
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Could not update')
    } finally {
      setBusy(false)
    }
  }

  async function archiveItem(id: string) {
    if (!window.confirm('Remove this item from the calendar?')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/staff/comms-calendar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not remove')
      if (editingId === id) resetForm()
      setStatusMsg('Removed.')
      await load()
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Could not remove')
    } finally {
      setBusy(false)
    }
  }

  function renderItemRow(item: CommsCalendarItem) {
    const publishWs = COMMS_CHANNEL_WORKSPACE[item.channel]
    return (
      <li
        key={item.id}
        className="flex flex-col gap-2 border-b border-[#E8ECF2] p-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-medium text-[#1B2A4A]">{item.title}</span>
            <span className="text-xs text-[#5A6070]">
              {COMMS_STATUS_LABEL[item.status]} · {COMMS_CHANNEL_LABEL[item.channel]}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#5A6070]">
            {item.audiences.map((a) => COMMS_AUDIENCE_LABEL[a]).join(' · ')}
            {item.publishAt ? ` · ${formatWhen(item.publishAt)}` : ''}
            {item.ownerName ? ` · ${item.ownerName}` : ''}
          </p>
          {item.body ? <p className="mt-1 line-clamp-2 text-sm text-[#3D4454]">{item.body}</p> : null}
          {item.notes ? <p className="mt-1 text-xs italic text-[#5A6070]">{item.notes}</p> : null}
          {item.assetUrl ? (
            <a
              href={item.assetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-[#2F6FED] underline"
            >
              Asset / draft link
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => startEdit(item)}>
            Edit
          </Button>
          {item.status !== 'published' && item.status !== 'cancelled' ? (
            <Button type="button" size="sm" disabled={busy} onClick={() => void patchStatus(item.id, 'published')}>
              Mark published
            </Button>
          ) : null}
          {publishWs && onOpenWorkspace ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenWorkspace(publishWs)}>
              Open {publishWs === 'newsletter' ? 'Newsletter / WA' : publishWs}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void archiveItem(item.id)}>
            Remove
          </Button>
        </div>
      </li>
    )
  }

  const weekLabel = formatWeekLabel(weekStart.toISOString().slice(0, 10))
  const heading =
    plannerTab === 'content' ? 'Content planner' : 'Communications calendar'
  const blurb =
    plannerTab === 'content'
      ? 'Plan social posts, flyers, and portal content. Click a day on the month grid to schedule.'
      : 'Track messages to parents, school staff, and the board. Click a day to schedule a send.'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#1B2A4A]">{heading}</h2>
        <p className="mt-1 max-w-2xl text-sm text-[#5A6070]">{blurb}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] text-sm">
          {(['comms', 'content'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-1.5 ${plannerTab === id ? 'bg-[var(--brand-green)] text-white' : 'bg-white text-[#1A1A2E]'}`}
              onClick={() => {
                setPlannerTab(id)
                setSelectedDate(null)
                resetForm()
              }}
            >
              {COMMS_PLANNER_KIND_LABEL[id]}
            </button>
          ))}
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] text-sm">
          {(
            [
              ['month', 'Month'],
              ['agenda', 'Agenda'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-1.5 ${layout === id ? 'bg-[#1B2A4A] text-white' : 'bg-white text-[#1A1A2E]'}`}
              onClick={() => setLayout(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-[#5A6070]">
          <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} />
          Show published / cancelled
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm text-[#5A6070]">
          Audience{' '}
          <select
            className="ml-1 rounded border border-[#D8DEE8] bg-white px-2 py-1"
            value={filterAudience}
            onChange={(e) => setFilterAudience(e.target.value as '' | CommsAudience)}
          >
            <option value="">All</option>
            {COMMS_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {COMMS_AUDIENCE_LABEL[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-[#5A6070]">
          Channel{' '}
          <select
            className="ml-1 rounded border border-[#D8DEE8] bg-white px-2 py-1"
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value as '' | CommsChannel)}
          >
            <option value="">All</option>
            {COMMS_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {COMMS_CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {statusMsg ? <p className="text-sm text-[#1B2A4A]">{statusMsg}</p> : null}
      {loading ? <p className="text-sm text-[#5A6070]">Loading…</p> : null}

      {layout === 'month' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <StaffMonthCalendar
            month={month}
            onMonthChange={(d) => {
              setMonth(d)
              setSelectedDate(null)
            }}
            events={monthEvents}
            selectedDate={selectedDate}
            onSelectDate={(iso) => {
              setSelectedDate(iso)
              if (!editingId) startNewOnDate(iso)
            }}
            onSelectEvent={(id) => {
              const item = items.find((i) => i.id === id)
              if (item) startEdit(item)
            }}
          />
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--border)] bg-white p-3">
              <h3 className="text-sm font-semibold text-[#1B2A4A]">
                {selectedDate
                  ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Select a day'}
              </h3>
              {selectedDate && selectedDayItems.length === 0 ? (
                <p className="mt-2 text-xs text-[#5A6070]">Nothing yet. Use the form below to add one.</p>
              ) : null}
              {selectedDayItems.length > 0 ? (
                <ul className="mt-2 divide-y divide-[#E8ECF2]">{selectedDayItems.map(renderItemRow)}</ul>
              ) : null}
            </div>
            {undated.length > 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[#FAFAF8] p-3">
                <h3 className="text-sm font-semibold text-[#1B2A4A]">No date yet</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {undated.map((i) => (
                    <li key={i.id}>
                      <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => startEdit(i)}>
                        {i.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setWeekOffset((n) => n - 1)}>
              ← Prev week
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
              This week
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setWeekOffset((n) => n + 1)}>
              Next week →
            </Button>
            <span className="text-sm font-medium text-[#1B2A4A]">{weekLabel}</span>
          </div>

          {!loading && byDay.length === 0 ? (
            <p className="text-sm text-[#5A6070]">Nothing scheduled this week. Add an item below.</p>
          ) : null}

          <div className="space-y-4">
            {byDay.map(([day, dayItems]) => (
              <section key={day} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5A6070]">
                  {day === 'undated'
                    ? 'No date yet'
                    : new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                </h3>
                <ul className="border border-[#E8ECF2] bg-white">{dayItems.map(renderItemRow)}</ul>
              </section>
            ))}
          </div>
        </>
      )}

      <form
        className="space-y-3 border border-[#E8ECF2] bg-[#F7F8FA] p-4"
        onSubmit={(e) => {
          e.preventDefault()
          void saveItem()
        }}
      >
        <h3 className="font-semibold text-[#1B2A4A]">
          {editingId
            ? `Edit ${plannerTab === 'content' ? 'content' : 'communication'}`
            : `Add ${plannerTab === 'content' ? 'content' : 'communication'}`}
        </h3>
        <label className="block text-sm">
          <span className="text-[#5A6070]">Title</span>
          <input
            className="mt-1 w-full rounded border border-[#D8DEE8] bg-white px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={
              plannerTab === 'content'
                ? 'e.g. Open House Instagram carousel'
                : 'e.g. Open House reminder. Parents WhatsApp'
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-[#5A6070]">Draft / talking points</span>
          <textarea
            className="mt-1 w-full rounded border border-[#D8DEE8] bg-white px-3 py-2"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Copy draft, key bullets, or CTA"
          />
        </label>
        <fieldset>
          <legend className="text-sm text-[#5A6070]">Audience</legend>
          <div className="mt-1 flex flex-wrap gap-3">
            {COMMS_AUDIENCES.map((a) => (
              <label key={a} className="flex items-center gap-1.5 text-sm text-[#1B2A4A]">
                <input type="checkbox" checked={audiences.includes(a)} onChange={() => toggleAudience(a)} />
                {COMMS_AUDIENCE_LABEL[a]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="text-[#5A6070]">Channel</span>
            <select
              className="mt-1 block rounded border border-[#D8DEE8] bg-white px-2 py-2"
              value={channel}
              onChange={(e) => {
                const next = e.target.value as CommsChannel
                setChannel(next)
                // Keep kind aligned if they switch channel family
                const inferred = defaultKindForChannel(next)
                if (inferred !== plannerTab) setPlannerTab(inferred)
              }}
            >
              {channelOptions.map((c) => (
                <option key={c} value={c}>
                  {COMMS_CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-[#5A6070]">Status</span>
            <select
              className="mt-1 block rounded border border-[#D8DEE8] bg-white px-2 py-2"
              value={itemStatus}
              onChange={(e) => setItemStatus(e.target.value as CommsStatus)}
            >
              {COMMS_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {COMMS_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-[#5A6070]">Publish / send at</span>
            <input
              type="datetime-local"
              className="mt-1 block rounded border border-[#D8DEE8] bg-white px-2 py-2"
              value={publishLocal}
              onChange={(e) => setPublishLocal(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-[#5A6070]">Asset / draft link (Canva, Doc, Drive…)</span>
          <input
            className="mt-1 w-full rounded border border-[#D8DEE8] bg-white px-3 py-2"
            value={assetUrl}
            onChange={(e) => setAssetUrl(e.target.value)}
            placeholder="https://"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[#5A6070]">Internal notes</span>
          <input
            className="mt-1 w-full rounded border border-[#D8DEE8] bg-white px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Needs Grace review · wait for flyer from Events"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || !title.trim() || audiences.length === 0}>
            {editingId ? 'Save changes' : 'Add to calendar'}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" disabled={busy} onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
