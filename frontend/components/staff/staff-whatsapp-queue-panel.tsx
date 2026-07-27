'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { WhatsAppQueueItem } from '@/lib/staff/whatsapp-queue'

type Links = { grade6: string; grade7: string; grade8: string }

function gradeLabel(grade: string) {
  if (grade === '6') return '6th grade'
  if (grade === '7') return '7th grade'
  if (grade === '8') return '8th grade'
  return 'All grades'
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultSendAtLocal() {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  return toLocalInputValue(d.toISOString())
}

async function openWhatsAppPlan(plan: {
  message: string
  openUrls: string[]
  waMeShare: string
  instructions: string
}) {
  if (plan.message) {
    try {
      await navigator.clipboard.writeText(plan.message)
    } catch {
      // clipboard may be blocked on some mobile browsers
    }
  }
  for (const url of plan.openUrls) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  if (!plan.openUrls.length && plan.waMeShare) {
    window.open(plan.waMeShare, '_blank', 'noopener,noreferrer')
  }
}

export function StaffWhatsAppQueuePanel() {
  const [due, setDue] = useState<WhatsAppQueueItem[]>([])
  const [upcoming, setUpcoming] = useState<WhatsAppQueueItem[]>([])
  const [recent, setRecent] = useState<WhatsAppQueueItem[]>([])
  const [links, setLinks] = useState<Links>({ grade6: '', grade7: '', grade8: '' })
  const [message, setMessage] = useState('')
  const [grade, setGrade] = useState('all')
  const [sendAt, setSendAt] = useState(defaultSendAtLocal)
  const [busyId, setBusyId] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [status, setStatus] = useState('')

  const configuredCount = useMemo(
    () => [links.grade6, links.grade7, links.grade8].filter((u) => u.trim()).length,
    [links],
  )

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/whatsapp-queue')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    setDue(d.due ?? [])
    setUpcoming(d.upcoming ?? [])
    setRecent(d.recent ?? [])
    setLinks(d.whatsapp ?? { grade6: '', grade7: '', grade8: '' })
  }, [])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
    const t = window.setInterval(() => {
      void load().catch(() => {})
    }, 60_000)
    return () => window.clearInterval(t)
  }, [load])

  async function schedule() {
    setScheduling(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/whatsapp-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule',
          message,
          grade,
          sendAt: new Date(sendAt).toISOString(),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not schedule')
      setMessage('')
      setStatus(`Scheduled for ${new Date(d.item.sendAt).toLocaleString()}.`)
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not schedule')
    } finally {
      setScheduling(false)
    }
  }

  async function confirm(id: string) {
    setBusyId(id)
    setStatus('')
    try {
      const r = await fetch('/api/staff/whatsapp-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Confirm failed')
      await openWhatsAppPlan(d.plan)
      setStatus(
        `${d.plan.instructions} Message copied when clipboard allows. Paste in WhatsApp and tap Send.`,
      )
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Confirm failed')
    } finally {
      setBusyId('')
    }
  }

  async function cancel(id: string) {
    setBusyId(id)
    setStatus('')
    try {
      const r = await fetch('/api/staff/whatsapp-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Cancel failed')
      setStatus('Cancelled.')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-4 sm:p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold">WhatsApp grade queue</h2>
        <p className="text-xs text-[#5A6070] mt-1 leading-relaxed">
          Schedule a grade-group message, then any logged-in staffer (phone or desktop) taps
          Confirm when it is due. That copies the text and opens the group link. You still paste
          and Send in WhatsApp. {configuredCount}/3 grade invite links configured in Site Settings.
        </p>
      </div>

      {due.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[#085508]">
            Ready to confirm ({due.length})
          </p>
          {due.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border-2 border-[#085508] bg-[#FAFCF9] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-[#1A1A1A]">{gradeLabel(item.grade)}</p>
                <p className="text-xs text-[#5A6070]">
                  Due {new Date(item.sendAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap leading-relaxed">
                {item.message}
              </p>
              <Button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => void confirm(item.id)}
                className="w-full min-h-12 text-base font-bold text-white"
                style={{ backgroundColor: '#085508' }}
              >
                {busyId === item.id ? 'Opening…' : 'Confirm & open WhatsApp'}
              </Button>
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => void cancel(item.id)}
                className="w-full text-xs text-[#5A6070] underline"
              >
                Cancel this send
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#5A6070] rounded-lg bg-[#F5F0E8] px-3 py-2">
          Nothing due right now. Scheduled messages appear here when their time arrives.
        </p>
      )}

      <div className="space-y-3 border-t border-[#E8E4DC] pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#5A6070]">
          Schedule a message
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Message for the grade WhatsApp group…"
          className="w-full rounded-lg border border-[#E8E4DC] px-3 py-2.5 text-sm"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2.5 text-sm min-h-11"
          >
            <option value="all">All grade groups</option>
            <option value="6">6th grade</option>
            <option value="7">7th grade</option>
            <option value="8">8th grade</option>
          </select>
          <input
            type="datetime-local"
            value={sendAt}
            onChange={(e) => setSendAt(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2.5 text-sm min-h-11"
          />
        </div>
        <Button
          type="button"
          disabled={scheduling || !message.trim() || !sendAt}
          onClick={() => void schedule()}
          className="w-full sm:w-auto text-white"
          style={{ backgroundColor: '#085508' }}
        >
          {scheduling ? 'Saving…' : 'Add to queue'}
        </Button>
      </div>

      {upcoming.length > 0 ? (
        <div className="space-y-2 border-t border-[#E8E4DC] pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5A6070]">
            Upcoming ({upcoming.length})
          </p>
          <ul className="space-y-2">
            {upcoming.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-[#E8E4DC] px-3 py-2.5 text-sm flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#1A1A1A]">
                    {gradeLabel(item.grade)} · {new Date(item.sendAt).toLocaleString()}
                  </p>
                  <p className="text-[#5A6070] line-clamp-2 mt-0.5">{item.message}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(busyId)}
                    onClick={() => void confirm(item.id)}
                    className="text-xs"
                  >
                    Send now
                  </Button>
                  <button
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() => void cancel(item.id)}
                    className="text-xs text-[#5A6070] underline px-1"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recent.length > 0 ? (
        <div className="space-y-2 border-t border-[#E8E4DC] pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5A6070]">Recent</p>
          <ul className="space-y-1.5 text-xs text-[#5A6070]">
            {recent.map((item) => (
              <li key={item.id}>
                {item.status === 'sent' ? 'Sent' : 'Cancelled'} · {gradeLabel(item.grade)} ·{' '}
                {item.confirmedByName || item.confirmedByEmail || 'staff'} ·{' '}
                {new Date(item.confirmedAt || item.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {status ? <p className="text-sm text-[#085508]">{status}</p> : null}
    </section>
  )
}
