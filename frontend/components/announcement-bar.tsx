'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className="relative flex items-center justify-center px-4 py-2.5 text-white text-sm font-medium"
      style={{ backgroundColor: '#085508' }}
      role="banner"
    >
      <p className="text-center pr-8 leading-relaxed">
        School Store Open Mon–Fri 8:15–9:00am
        <span className="mx-2 opacity-50">|</span>
        Harris Teeter VIC Card Code:{' '}
        <span className="font-bold tracking-wide">6711</span>
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
