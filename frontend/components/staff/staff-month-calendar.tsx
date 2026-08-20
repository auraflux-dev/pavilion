'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'

export type MonthCalendarTone = 'green' | 'blue' | 'amber' | 'slate' | 'rose'

export type MonthCalendarEvent = {
  id: string
  /** ISO datetime or YYYY-MM-DD */
  date: string
  title: string
  subtitle?: string
  tone?: MonthCalendarTone
}

type Props = {
  /** Any date inside the visible month */
  month: Date
  onMonthChange: (next: Date) => void
  events: MonthCalendarEvent[]
  selectedDate?: string | null
  onSelectDate?: (isoDate: string) => void
  onSelectEvent?: (id: string) => void
  /** Max chips shown per cell before "+N more" */
  maxPerDay?: number
  className?: string
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TONE_CLASS: Record<MonthCalendarTone, string> = {
  green: 'bg-[#E8F3E8] text-[var(--brand-green)] border-[#C5DCC5]',
  blue: 'bg-[#E8EEF8] text-[#1B2A4A] border-[#C5D0E8]',
  amber: 'bg-[#FBF3E0] text-[#8A5A00] border-[#E8D4A8]',
  slate: 'bg-[#F0F1F4] text-[#3D4454] border-[#D8DEE8]',
  rose: 'bg-[#F8E8EC] text-[#8A3048] border-[#E8C5D0]',
}

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

/** Monday-start grid covering the month (42 cells). */
export function buildMonthCells(month: Date): Date[] {
  const first = startOfMonth(month)
  const day = first.getDay() // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day
  const gridStart = new Date(first.getFullYear(), first.getMonth(), first.getDate() + mondayOffset)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }
  return cells
}

export function eventDayKey(iso: string): string | null {
  const raw = String(iso ?? '').trim()
  // Date-only must stay calendar-day (Date.parse('YYYY-MM-DD') is UTC midnight and shifts west of UTC).
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const t = Date.parse(raw)
  if (!Number.isFinite(t)) return null
  return ymd(new Date(t))
}

export function StaffMonthCalendar({
  month,
  onMonthChange,
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  maxPerDay = 3,
  className = '',
}: Props) {
  const cells = useMemo(() => buildMonthCells(month), [month])
  const monthIndex = month.getMonth()
  const todayKey = ymd(new Date())

  const byDay = useMemo(() => {
    const map = new Map<string, MonthCalendarEvent[]>()
    for (const ev of events) {
      const key = eventDayKey(ev.date)
      if (!key) continue
      const list = map.get(key) ?? []
      list.push(ev)
      map.set(key, list)
    }
    return map
  }, [events])

  const label = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onMonthChange(addMonths(month, -1))}
        >
          ←
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onMonthChange(startOfMonth(new Date()))}
        >
          Today
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          →
        </Button>
        <h3 className="text-base font-semibold text-[#1B2A4A]">{label}</h3>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
        <div className="grid min-w-[40rem] grid-cols-7 border-b border-[var(--border)] bg-[#FAFAF8]">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[#5A6070]"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-w-[40rem] grid-cols-7">
          {cells.map((cell) => {
            const key = ymd(cell)
            const inMonth = cell.getMonth() === monthIndex
            const dayEvents = byDay.get(key) ?? []
            const shown = dayEvents.slice(0, maxPerDay)
            const more = dayEvents.length - shown.length
            const isSelected = selectedDate === key
            const isToday = key === todayKey

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate?.(key)}
                className={[
                  'min-h-[5.5rem] border-b border-r border-[var(--border)] p-1.5 text-left align-top transition-colors',
                  inMonth ? 'bg-white' : 'bg-[#F7F8FA]',
                  isSelected ? 'ring-2 ring-inset ring-[var(--brand-green)]' : 'hover:bg-[#F3F7F3]',
                ].join(' ')}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={[
                      'inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-semibold',
                      isToday ? 'bg-[var(--brand-green)] text-white' : inMonth ? 'text-[#1B2A4A]' : 'text-[#9AA3B2]',
                    ].join(' ')}
                  >
                    {cell.getDate()}
                  </span>
                  {dayEvents.length > 0 ? (
                    <span className="text-[10px] text-[#5A6070]">{dayEvents.length}</span>
                  ) : null}
                </div>
                <div className="space-y-0.5">
                  {shown.map((ev) => (
                    <span
                      key={ev.id}
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent?.(ev.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          onSelectEvent?.(ev.id)
                        }
                      }}
                      className={[
                        'block truncate rounded border px-1 py-0.5 text-[10px] leading-tight',
                        TONE_CLASS[ev.tone ?? 'slate'],
                      ].join(' ')}
                      title={ev.subtitle ? `${ev.title}. ${ev.subtitle}` : ev.title}
                    >
                      {ev.title}
                    </span>
                  ))}
                  {more > 0 ? (
                    <span className="block px-1 text-[10px] text-[#5A6070]">+{more} more</span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function monthRangeIso(month: Date): { from: string; to: string } {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  return { from: start.toISOString(), to: end.toISOString() }
}
