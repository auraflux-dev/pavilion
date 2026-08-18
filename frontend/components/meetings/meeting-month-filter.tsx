'use client'

import { useState, useMemo, useEffect } from 'react'
import type { MeetingMinute } from '@/lib/api/meetings'
import { MeetingCard } from './meeting-card'

interface Props {
  meetings: MeetingMinute[]
  showJoinLink?: boolean
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function MeetingMonthFilter({ meetings, showJoinLink }: Props) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
    // Default to most recent month with data in the most recent year
    const months = meetings.map(m => new Date(m.meetingDate).getMonth())
    return months.length > 0 ? Math.max(...months) : null
  })

  const years = useMemo(() => {
    const seen = new Set<string>()
    meetings.forEach(m => seen.add(new Date(m.meetingDate).getFullYear().toString()))
    return Array.from(seen).sort((a, b) => Number(b) - Number(a))
  }, [meetings])

  const activeYear = selectedYear ?? years[0] ?? null

  const monthsWithData = useMemo(() => {
    if (!activeYear) return []
    const seen = new Set<number>()
    meetings
      .filter(m => new Date(m.meetingDate).getFullYear().toString() === activeYear)
      .forEach(m => seen.add(new Date(m.meetingDate).getMonth()))
    return Array.from(seen).sort((a, b) => b - a)
  }, [meetings, activeYear])

  // When year changes, snap to the most recent month in that year
  useEffect(() => {
    if (monthsWithData.length > 0) setSelectedMonth(monthsWithData[0])
  }, [activeYear]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleMeetings = useMemo(() => {
    if (!activeYear) return []
    return meetings.filter(m => {
      const d = new Date(m.meetingDate)
      const yearMatch = d.getFullYear().toString() === activeYear
      const monthMatch = selectedMonth === null || d.getMonth() === selectedMonth
      return yearMatch && monthMatch
    })
  }, [meetings, activeYear, selectedMonth])

  if (meetings.length === 0) {
    return (
      <p className="text-[#5A6070] text-sm py-4">No records yet.</p>
    )
  }

  return (
    <div className="space-y-5">
      {/* Year tabs */}
      {years.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {years.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                activeYear === y
                  ? 'text-white border-transparent'
                  : 'bg-white text-[#5A6070] border-[var(--border)] hover:border-[var(--brand-green)]'
              }`}
              style={activeYear === y ? { backgroundColor: 'var(--brand-green)', borderColor: 'var(--brand-green)' } : {}}
            >
              {y} to {String(Number(y) + 1).slice(2)}
            </button>
          ))}
        </div>
      )}

      {/* Month pills. months first, All at the end */}
      <div className="flex flex-wrap gap-2">
        {monthsWithData.map(m => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              selectedMonth === m
                ? 'text-white border-transparent'
                : 'bg-white text-[#5A6070] border-[var(--border)] hover:border-[var(--brand-green)]'
            }`}
            style={selectedMonth === m ? { backgroundColor: '#3a7d44', borderColor: '#3a7d44' } : {}}
          >
            {MONTHS[m]}
          </button>
        ))}
        <button
          onClick={() => setSelectedMonth(null)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
            selectedMonth === null
              ? 'text-white border-transparent'
              : 'bg-white text-[#5A6070] border-[var(--border)] hover:border-[var(--brand-green)]'
          }`}
          style={selectedMonth === null ? { backgroundColor: '#3a7d44', borderColor: '#3a7d44' } : {}}
        >
          All
        </button>
      </div>

      {/* Results. most recent past open, rest collapsed */}
      <div className="space-y-3">
        {(() => {
          const firstPastId = visibleMeetings.find(x => !x.isUpcoming)?._id ?? null
          return visibleMeetings.map(m => (
            <MeetingCard
              key={`${m._id}-${m._id === firstPastId}`}
              meeting={m}
              showJoinLink={showJoinLink}
              defaultOpen={m._id === firstPastId}
            />
          ))
        })()}
      </div>
    </div>
  )
}
