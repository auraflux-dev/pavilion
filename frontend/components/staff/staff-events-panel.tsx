'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type EventRow = {
  id: string
  title: string
  description: string
  location: string
  startDate: string
  endDate: string
  slug: string
}

export function StaffEventsPanel() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [manageUrl, setManageUrl] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/staff/events')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Load failed')
        setEvents(d.events ?? [])
        setManageUrl(d.manageUrl ?? '')
        setNote(d.note ?? '')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Load failed'))
  }, [])

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Events</h2>
          <p className="text-xs text-[#5A6070]">
            {note || 'Upcoming events from the Wix Events app.'}
          </p>
        </div>
        {manageUrl ? (
          <Button asChild className="text-white" style={{ backgroundColor: '#085508' }}>
            <a href={manageUrl} target="_blank" rel="noopener noreferrer">
              Manage in Wix Events
            </a>
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-2">
        {events.length === 0 && !error ? (
          <p className="text-sm text-[#5A6070]">No upcoming scheduled events.</p>
        ) : null}
        {events.map((e) => (
          <div key={e.id || e.title} className="border-t border-[#F0EBE3] pt-2">
            <p className="text-sm font-semibold">{e.title}</p>
            <p className="text-xs text-[#5A6070]">
              {e.startDate ? new Date(e.startDate).toLocaleString() : 'Date TBA'}
              {e.location ? ` · ${e.location}` : ''}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
