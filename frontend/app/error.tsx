'use client'

import { useEffect, useState } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [eventId, setEventId] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.eventId) setEventId(String(d.eventId))
      })
      .catch(() => {})
  }, [error])

  const ref = eventId || error.digest || error.message

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-[#0B3D2E]">Something went wrong</h1>
      <p className="mt-3 text-sm text-[#5A6070] leading-relaxed">
        Please try again. If you need help, paste this error reference to staff or in chat with our
        support agent:
      </p>
      <pre className="mt-4 rounded-md bg-[#F4F1EA] px-3 py-3 text-left text-xs text-[#1a1a1a] overflow-auto">
        {ref}
      </pre>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-[#0B3D2E] px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  )
}
