'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Calendar } from 'lucide-react'
import type { MeetingMinute } from '@/lib/api/meetings'

interface Props {
  meeting: MeetingMinute
  showJoinLink?: boolean
  defaultOpen?: boolean
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function MeetingCard({ meeting, showJoinLink, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const hasContent = meeting.minutesContent || meeting.summary || meeting.takeaways || meeting.callToAction

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DC] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#EEF6EE' }}
          >
            <Calendar className="w-4 h-4" style={{ color: '#085508' }} />
          </div>
          <div>
            <p className="font-semibold text-[#1A1A1A] text-sm">{formatDate(meeting.meetingDate)}</p>
            {meeting.isUpcoming && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                Upcoming
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showJoinLink && meeting.isUpcoming && meeting.joinUrl && (
            <a
              href={meeting.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#085508' }}
            >
              Join Meeting
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {hasContent && (
            <button
              onClick={() => setOpen(o => !o)}
              className="text-[#5A6070] hover:text-[#085508] transition-colors p-1"
              aria-label={open ? 'Collapse' : 'Expand'}
            >
              {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {open && hasContent && (
        <div className="border-t border-[#E8E4DC] px-5 py-5 space-y-5">
          {meeting.minutesContent && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#085508] mb-2">Minutes</h4>
              <div
                className="prose prose-sm max-w-none text-[#3A3A3A]"
                dangerouslySetInnerHTML={{ __html: meeting.minutesContent }}
              />
            </div>
          )}
          {meeting.summary && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#085508] mb-2">Summary</h4>
              <div
                className="prose prose-sm max-w-none text-[#3A3A3A]"
                dangerouslySetInnerHTML={{ __html: meeting.summary }}
              />
            </div>
          )}
          {meeting.takeaways && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#085508] mb-2">Key Takeaways</h4>
              <div
                className="prose prose-sm max-w-none text-[#3A3A3A]"
                dangerouslySetInnerHTML={{ __html: meeting.takeaways }}
              />
            </div>
          )}
          {meeting.callToAction && (
            <div className="rounded-lg px-4 py-3" style={{ backgroundColor: '#EEF6EE' }}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#085508] mb-1">Action for Parents</h4>
              <p className="text-sm text-[#1A1A1A]">{meeting.callToAction}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
