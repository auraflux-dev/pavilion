'use client'

import { useEffect, useState } from 'react'

export default function SeoConnectPage() {
  const [message, setMessage] = useState('Checking invite…')
  const [href, setHref] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const oauth = params.get('oauth')
    const err = params.get('oauth_error')
    if (oauth === 'connected') {
      setMessage('Search Console connected. You can close this tab.')
      return
    }
    if (oauth === 'error' || oauth === 'partial') {
      setMessage(err || 'Google connect failed.')
      return
    }
    if (!token) {
      setMessage('Missing invite token.')
      return
    }
    fetch(`/api/staff/seo/connect/invite?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Invalid invite')
        setMessage(
          `Connect Google Search Console for workspace ${d.workspaceId}.\nRead-only. You can revoke in Google anytime.`,
        )
        setHref(`/api/staff/seo/oauth/google/start?token=${encodeURIComponent(token)}&tool=gsc`)
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : 'Invalid invite'))
  }, [])

  return (
    <main className="min-h-screen bg-[#FAFAF8] px-4 py-16">
      <div className="max-w-lg mx-auto rounded-xl border border-[var(--border)] bg-white p-6 space-y-4">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Connect Search Console</h1>
        <p className="text-sm text-[#5A6070] whitespace-pre-line">{message}</p>
        {href ? (
          <a
            className="inline-flex rounded-lg bg-[var(--brand-green)] text-white text-sm font-semibold px-4 py-2"
            href={href}
          >
            Continue with Google
          </a>
        ) : null}
      </div>
    </main>
  )
}
