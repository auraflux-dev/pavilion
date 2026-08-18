'use client'

import { useMemo, useState } from 'react'
import { EventCard } from '@/components/events/event-card'
import type { WixEvent } from '@/lib/api/events'
import { PRIMARY_EVENT_CATEGORIES, sortEventCategoryNames } from '@/lib/events/categories'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'

interface EventsFilterProps {
  events: WixEvent[]
}

export function EventsFilter({ events }: EventsFilterProps) {
  const [active, setActive] = useState<string>('All')

  const categoryOptions = useMemo(() => {
    const fromEvents = events.flatMap((e) => e.tags ?? []).filter(Boolean)
    const primary = isPublicDemoInstance()
      ? PRIMARY_EVENT_CATEGORIES.filter((c) => c === 'PTO led')
      : PRIMARY_EVENT_CATEGORIES
    const ordered = sortEventCategoryNames([
      ...primary,
      ...fromEvents,
    ])
    return ['All', ...Array.from(new Set(ordered))]
  }, [events])

  const filtered =
    active === 'All' ? events : events.filter((e) => (e.tags ?? []).includes(active))

  return (
    <>
      <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Filter by who leads the event">
        {categoryOptions.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              active === cat
                ? 'border-transparent text-white'
                : 'border-[#E8E4DC] bg-white text-[#5A6070] hover:border-[#085508] hover:text-[#085508]'
            }`}
            style={active === cat ? { backgroundColor: '#085508', borderColor: '#085508' } : {}}
            aria-pressed={active === cat}
          >
            {vanillaizeIfDemo(cat)}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-lg text-[#5A6070]">
            No upcoming events in {active === 'All' ? 'this list' : active} yet.
          </p>
          <p className="mt-2 text-sm text-[#5A6070]">Check back soon, or view All events.</p>
        </div>
      )}
    </>
  )
}
