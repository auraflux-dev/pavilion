'use client'

import { useEffect, useState } from 'react'

type Snapshot = {
  generatedAt: string
  env: {
    database: boolean
    googleOAuth: boolean
    googleOAuthBlocked: string | null
    openai: boolean
    pagespeed: boolean
    cronSecret: boolean
    composio: boolean
    dataForSeo: boolean
  }
  rows: { seo: { db: boolean; audits: number; gsc: number; bundles: number }; brandKits: number }
  notes: string[]
}

export function StaffSeoDiagnosticsPanel() {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/staff/diagnostics')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Diagnostics failed')
        setSnap(d)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Diagnostics failed'))
  }, [])

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">SEO and brand diagnostics</h1>
        <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
          {`Env probes and stored row counts.
No parent or payment PII.`}
        </p>
      </div>
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
      {!snap ? (
        <p className="text-sm text-[#5A6070]">Loading diagnostics…</p>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm space-y-2">
          <p>Generated {new Date(snap.generatedAt).toLocaleString()}</p>
          <p>Database: {snap.env.database ? 'on' : 'off'}</p>
          <p>Google OAuth: {snap.env.googleOAuth ? 'on' : 'off'}</p>
          <p>OpenAI: {snap.env.openai ? 'on' : 'off'}</p>
          <p>PageSpeed key: {snap.env.pagespeed ? 'on' : 'off'}</p>
          <p>Composio: off (not used)</p>
          <p>DataForSEO: off (omitted)</p>
          <p>
            SEO rows: {snap.rows.seo.bundles} workspaces, {snap.rows.seo.audits} audits, {snap.rows.seo.gsc} GSC
            imports
          </p>
          <p>Brand kits: {snap.rows.brandKits}</p>
          {snap.env.googleOAuthBlocked ? (
            <p className="whitespace-pre-line text-amber-800">{snap.env.googleOAuthBlocked}</p>
          ) : null}
          <ul className="list-disc pl-5 text-xs text-[#5A6070] space-y-1 pt-2">
            {snap.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
