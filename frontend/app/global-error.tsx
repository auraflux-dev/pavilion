'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
    }).catch(() => {})
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 560, margin: '40px auto' }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: '#444', lineHeight: 1.5 }}>
          Please try again. If it keeps happening, email president@shmspto.org or paste this reference
          when contacting support:
        </p>
        <pre
          style={{
            background: '#f4f4f4',
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
            overflow: 'auto',
          }}
        >
          {error.digest || error.message}
        </pre>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 16,
            padding: '10px 16px',
            background: '#0B3D2E',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
